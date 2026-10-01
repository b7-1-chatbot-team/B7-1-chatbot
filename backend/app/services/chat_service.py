"""챗 처리 흐름 — 컨텍스트 구성 → AI 호출 → 결과 저장 (03-api 2절 동작 흐름 4~6단계).

인증(1단계)은 라우터의 Depends(get_current_user), 입력 검증(3단계)은 schemas/chat.py 가 먼저 끝낸다.
"""

import logging
import time
import uuid

from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.core.responses import AppError
from app.models import ChatLog, User
from app.services import ai_service

logger = logging.getLogger("app")


def new_request_id() -> str:
    """요청 추적 ID (12자리 16진수). chat_logs·server_logs 에 같이 저장해 한 요청의 흐름을 이어 본다."""
    return uuid.uuid4().hex[:12]


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)


async def answer(db: Session, user: User, question: str) -> ChatLog:
    """질문에 대한 AI 답변을 받아 저장하고, 저장된 기록을 돌려준다.

    AI 가 실패해도 기록을 status='error' 로 **먼저 저장한 뒤** 504/502 를 던진다.
    관리자 화면의 'AI 실패 기록'은 이 저장분으로 만들어지므로, 실패 저장을 빼먹으면 그 화면이 비게 된다.
    """
    request_id = new_request_id()

    # 컨텍스트: 이 사용자(토큰의 user.id)의 최근 성공 Q/A 만, 오래된 순으로. 실패 기록은 답이 없으므로 제외된다
    history = crud.chat_log.recent_success_for_context(db, user.id, settings.ai_context_turns)
    messages = ai_service.build_messages(history, question)

    started = time.perf_counter()
    try:
        reply = await ai_service.ask(messages)
    except ai_service.AIError as exc:
        latency_ms = _elapsed_ms(started)
        crud.chat_log.create(
            db,
            user_id=user.id,
            question=question,
            answer=None,  # 실패면 답변 없음 (NULL)
            status="error",
            error_code=exc.error_code,
            latency_ms=latency_ms,
            request_id=request_id,
        )
        logger.error("ai_call_failed request_id=%s user_id=%s reason=%s", request_id, user.id, exc.reason)
        # 타임아웃은 504, 그 밖의 실패는 502. 안내 문구는 core/responses.py 의 기본 문구를 쓴다
        raise AppError(504 if exc.error_code == ai_service.AI_TIMEOUT else 502) from None

    return crud.chat_log.create(
        db,
        user_id=user.id,
        question=question,
        answer=reply,
        status="success",
        latency_ms=_elapsed_ms(started),
        request_id=request_id,
    )
