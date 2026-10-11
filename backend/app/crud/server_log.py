from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ServerLog


def create(
    db: Session,
    request_id: str,
    level: str,
    event: str,
    user_id: int | None = None,
    detail: str | None = None,
    commit: bool = True,
) -> ServerLog:
    """이벤트 1건 저장. detail 에 질문 원문·비밀번호·API 키·토큰을 넣지 않는다."""
    # 사용 예) create(db, request_id="abc123", level="INFO", event="db_save_success", user_id=12, detail="chat_id=987")
    row = ServerLog(request_id=request_id, level=level, event=event, user_id=user_id, detail=detail)
    db.add(row)
    if commit:
        db.commit()
    else:
        db.flush()
    return row


def list_by_request(db: Session, request_id: str) -> list[ServerLog]:
    """관리자 요청 흐름 — 한 요청의 이벤트를 기록된 순서(시간순)대로."""
    return list(db.scalars(select(ServerLog).where(ServerLog.request_id == request_id).order_by(ServerLog.id)).all())
