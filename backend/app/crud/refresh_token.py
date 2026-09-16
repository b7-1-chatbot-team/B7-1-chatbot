from datetime import datetime

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RefreshToken


def create(db: Session, user_id: int, token_hash: str, expires_at: datetime, commit: bool = True) -> RefreshToken:
    row = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(row)
    if commit:
        db.commit()
    else:
        db.flush()
    return row


def get_valid(db: Session, token_hash: str, now: datetime) -> RefreshToken | None:
    """해시가 일치하고 만료되지 않은 행만 반환한다."""
    return db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash, RefreshToken.expires_at > now)
    )


def delete(db: Session, token_hash: str, commit: bool = True) -> int:
    """해시가 일치하는 행 삭제 (로그아웃·회전). 삭제된 행 수를 반환한다."""
    result = db.execute(sa_delete(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if commit:
        db.commit()
    return result.rowcount or 0


def delete_expired(db: Session, now: datetime) -> int:
    """스케줄러용 — expires_at 이 지난 행 일괄 삭제. 삭제된 행 수를 반환한다."""
    result = db.execute(sa_delete(RefreshToken).where(RefreshToken.expires_at < now))
    db.commit()
    return result.rowcount or 0
