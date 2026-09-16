"""인증 비즈니스 로직 — 가입, 로그인, 토큰 발급·재발급·폐기."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud
from app.core.responses import AppError
from app.core.security import hash_password
from app.models import User


def signup(db: Session, email: str, password: str, nickname: str) -> User:
    """이메일 중복이면 409. 닉네임은 중복 검사하지 않는다. 가입 계정은 항상 role=user."""
    if crud.user.get_by_email(db, email):
        raise AppError(409)
    try:
        return crud.user.create(db, email=email, hashed_password=hash_password(password), nickname=nickname)
    except IntegrityError:
        # 동시에 같은 이메일로 가입한 경우 UNIQUE 제약에서 걸린다
        db.rollback()
        raise AppError(409) from None
