"""챗 처리 흐름 — 컨텍스트 구성 → AI 호출 → 결과 저장 (03-api 2절 동작 흐름 4~6단계).

인증(1단계)은 라우터의 Depends(get_current_user), 입력 검증(3단계)은 schemas/chat.py 가 먼저 끝낸다.
각 단계마다 이벤트를 남겨 request_id 하나로 흐름을 따라갈 수 있게 한다 (03-api 6절):
request_received → ai_call_start → ai_call_success / ai_call_failed → db_save_success / db_save_failed
"""

import time
import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.core.logging import log_event
from app.core.responses import AppError
from app.models import ChatLog, User
from app.services import ai_service


def new_request_id() -> str:
    """요청 추적 ID (12자리 16진수). chat_logs·server_logs 에 같이 저장해 한 요청의 흐름을 이어 본다."""
    return uuid.uuid4().hex[:12]


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)


def _save(db: Session, request_id: str, user_id: int, **fields) -> ChatLog | None:
    """대화 1건을 저장하고 결과를 이벤트로 남긴다. 저장에 실패하면 None (예외를 밖으로 던지지 않음).

    DB 오류(디스크 가득 참, 잠김 등)가 나도 서버가 멈추지 않고 db_save_failed 를 남긴 뒤
    호출한 쪽이 사용자에게 알맞은 응답을 고르게 한다.
    """
    try:
        log = crud.chat_log.create(db, user_id=user_id, request_id=request_id, **fields)
    except SQLAlchemyError as exc:
        db.rollback()  # 실패한 INSERT 를 되돌려 세션을 정리
        # 예외 메시지에는 SQL 과 질문 원문이 섞일 수 있어 예외 종류 이름만 남긴다
        log_event(request_id, "db_save_failed", "ERROR", user_id, reason=type(exc).__name__)
        return None
    log_event(request_id, "db_save_success", user_id=user_id, chat_id=log.id, status=log.status)
    return log


async def answer(db: Session, user: User, question: str) -> ChatLog:
    """질문에 대한 AI 답변을 받아 저장하고, 저장된 기록을 돌려준다.

    AI 가 실패해도 기록을 status='error' 로 **먼저 저장한 뒤** 504/502 를 던진다.
    관리자 화면의 'AI 실패 기록'은 이 저장분으로 만들어지므로, 실패 저장을 빼먹으면 그 화면이 비게 된다.
    """
    request_id = new_request_id()
    log_event(request_id, "request_received", user_id=user.id, path="/api/chat")

    # 컨텍스트: 이 사용자(토큰의 user.id)의 최근 성공 Q/A 만, 오래된 순으로. 실패 기록은 답이 없으므로 제외된다
    history = crud.chat_log.recent_success_for_context(db, user.id, settings.ai_context_turns)
    messages = ai_service.build_messages(history, question)

    log_event(request_id, "ai_call_start", user_id=user.id, context_turns=len(history))
    started = time.perf_counter()
    try:
        reply = await ai_service.ask(messages)
    except ai_service.AIError as exc:
        latency_ms = _elapsed_ms(started)
        log_event(request_id, "ai_call_failed", "ERROR", user.id, reason=exc.reason, latency_ms=latency_ms)
        _save(db, request_id, user.id, question=question, answer=None, status="error",
              error_code=exc.error_code, latency_ms=latency_ms)  # 실패 저장까지 실패해도 사용자에게는 AI 실패를 알린다
        # 타임아웃은 504, 그 밖의 실패는 502. 안내 문구는 core/responses.py 의 기본 문구를 쓴다
        raise AppError(504 if exc.error_code == ai_service.AI_TIMEOUT else 502) from None

    latency_ms = _elapsed_ms(started)
    log_event(request_id, "ai_call_success", user_id=user.id, latency_ms=latency_ms)
    log = _save(db, request_id, user.id, question=question, answer=reply, status="success", latency_ms=latency_ms)
    if log is None:
        # 답은 받았지만 저장하지 못함 — 저장되지 않은 답을 보여주면 '내 대화 로그'와 어긋나므로 500 으로 알린다
        raise AppError(500)
    return log
