"""내 대화 로그 API — /api/me/* (03-api §3)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.core.dependencies import get_current_user
from app.core.responses import ok
from app.core.timeutil import to_kst_iso
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/me", tags=["me"])

MAX_LIMIT = 100


@router.get("/chats")
def my_chats(
    limit: int = Query(20, ge=1),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """토큰의 사용자 기준 **성공** 기록만 최신순으로 반환한다. 다른 사용자 기록은 조회할 방법이 없다."""
    limit = min(limit, MAX_LIMIT)
    items = crud.chat_log.list_success_for_user(db, user.id, limit=limit, offset=offset)
    return ok(
        {
            "total": crud.chat_log.count_success_for_user(db, user.id),
            "items": [
                {
                    "chat_id": c.id,
                    "question": c.question,
                    "answer": c.answer,
                    "created_at": to_kst_iso(c.created_at),
                }
                for c in items
            ],
        }
    )
