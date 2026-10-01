"""챗 API — POST /api/chat (03-api 2절)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.responses import ok
from app.core.timeutil import to_kst_iso
from app.database import get_db
from app.models import User
from app.schemas.chat import ChatRequest
from app.services import chat_service

router = APIRouter(prefix="/api", tags=["chat"])


# async def 인 이유: AI 응답을 기다리는 동안(최대 30초) 서버가 다른 요청을 처리할 수 있게 하려고.
# 처리 순서: 로그인 확인(401) → 입력 검증(422) → AI 호출 → 저장 → 응답. 검증이 AI 호출보다 먼저다.
@router.post("/chat")
async def chat(
    body: ChatRequest,  # 검증 실패 시 이 함수에 들어오기 전에 자동 422
    user: User = Depends(get_current_user),  # 토큰 검증 → 실패 시 401
    db: Session = Depends(get_db),
):
    """로그인한 사용자의 질문에 AI 답변을 돌려준다. AI 실패는 504(타임아웃)·502(그 밖의 실패)."""
    log = await chat_service.answer(db, user, body.message)
    return ok(
        {
            "chat_id": log.id,
            "question": log.question,
            "answer": log.answer,
            "created_at": to_kst_iso(log.created_at),
        }
    )
