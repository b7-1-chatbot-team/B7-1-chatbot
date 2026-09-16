"""인증 비즈니스 로직 — 가입, 로그인, 토큰 발급·재발급·폐기."""

from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.core.responses import AppError
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from app.core.timeutil import utcnow
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


LOGIN_FAILED_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다."


def _issue_tokens(db: Session, user_id: int, commit: bool = True) -> dict:
    """access token 발급 + refresh token 생성·해시 저장. 응답 data 형태로 반환한다."""
    refresh = new_refresh_token()
    crud.refresh_token.create(
        db,
        user_id=user_id,
        token_hash=hash_refresh_token(refresh),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_expire_days),
        commit=commit,
    )
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": settings.jwt_expire_minutes * 60,
        "refresh_expires_in": settings.refresh_token_expire_days * 86400,
    }


def login(db: Session, email: str, password: str) -> dict:
    """이메일·비밀번호 중 무엇이 틀렸는지 구분하지 않고 같은 401 메시지를 준다."""
    user = crud.user.get_by_email(db, email)
    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)  # 응답 시간 맞추기
        raise AppError(401, LOGIN_FAILED_MESSAGE)
    if not verify_password(password, user.hashed_password):
        raise AppError(401, LOGIN_FAILED_MESSAGE)
    return _issue_tokens(db, user.id)
