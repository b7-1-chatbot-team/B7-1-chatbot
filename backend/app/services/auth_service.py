"""인증 비즈니스 로직 — 가입, 로그인, 토큰 발급·재발급·폐기, 관리자 시드."""

import logging
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
from app.schemas.auth import PASSWORD_MIN_LENGTH

logger = logging.getLogger("app")

# 라우터는 요청·응답만 다루고, 판단 로직은 이 서비스 계층에 둔다 (02-architecture).
# 실패는 AppError 를 raise 하면 responses.py 가 {code, data:{message}} 로 변환한다.


def signup(db: Session, email: str, password: str, nickname: str) -> User:
    """이메일 중복이면 409. 닉네임은 중복 검사하지 않는다. 가입 계정은 항상 role=user."""
    if crud.user.get_by_email(db, email):  # 1차 검사: 이미 가입된 이메일
        raise AppError(409)
    try:
        return crud.user.create(db, email=email, hashed_password=hash_password(password), nickname=nickname)
    except IntegrityError:
        # 동시에 같은 이메일로 가입한 경우 UNIQUE 제약에서 걸린다
        db.rollback()  # 실패한 INSERT 를 되돌려 세션을 다시 쓸 수 있게 한다
        raise AppError(409) from None


# 로그인 실패 문구는 하나로 통일 — 무엇이 틀렸는지 알려주면 가입된 이메일을 알아낼 수 있다 (12-decisions)
LOGIN_FAILED_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다."


def _issue_tokens(db: Session, user_id: int, commit: bool = True) -> dict:
    """access token 발급 + refresh token 생성·해시 저장. 응답 data 형태로 반환한다."""
    refresh = new_refresh_token()  # 원문은 응답으로만 내보내고
    crud.refresh_token.create(  # DB 에는 해시만 저장한다
        db,
        user_id=user_id,
        token_hash=hash_refresh_token(refresh),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_expire_days),
        commit=commit,  # 재발급(회전)에서는 False 로 받아 기존 행 삭제와 한 트랜잭션으로 묶는다
    )
    # 03-api 로그인 응답 data 형태. expires_in 은 초 단위
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
        # 없는 이메일이어도 bcrypt 비교를 한 번 수행 → 응답 시간 차이로 계정 존재를 추측하지 못하게 함
        verify_password(password, DUMMY_PASSWORD_HASH)  # 응답 시간 맞추기
        raise AppError(401, LOGIN_FAILED_MESSAGE)
    if not verify_password(password, user.hashed_password):
        raise AppError(401, LOGIN_FAILED_MESSAGE)
    return _issue_tokens(db, user.id)


def refresh(db: Session, refresh_token: str) -> dict:
    """회전: 유효한 기존 행을 지우고 새 토큰 쌍을 발급한다. 삭제·추가는 한 트랜잭션."""
    token_hash = hash_refresh_token(refresh_token)  # DB 에는 해시로 저장돼 있으므로 해시로 찾는다
    row = crud.refresh_token.get_valid(db, token_hash, utcnow())
    if row is None:  # 없음·만료·이미 회전/로그아웃으로 폐기됨 → 다시 로그인 필요
        raise AppError(401)
    user_id = row.user_id  # 행을 지우기 전에 소유자 id 를 보관
    # 동시에 같은 토큰으로 두 번 요청하면 한쪽만 삭제에 성공한다 → 나머지는 401
    if crud.refresh_token.delete(db, token_hash, commit=False) != 1:
        db.rollback()
        raise AppError(401)
    tokens = _issue_tokens(db, user_id, commit=False)  # 새 refresh 행 추가 (아직 commit 안 함)
    db.commit()  # 삭제 + 추가를 한 번에 확정 → 중간에 실패하면 둘 다 반영되지 않는다
    return tokens


def logout(db: Session, refresh_token: str) -> None:
    """해당 refresh token 행만 삭제(이 기기만 로그아웃). 이미 없어도 성공으로 본다."""
    # 반환값(삭제 행 수)을 보지 않는다 — 같은 로그아웃 요청을 여러 번 보내도 결과가 같아야 하므로 (03-api)
    crud.refresh_token.delete(db, hash_refresh_token(refresh_token))


def delete_expired_refresh_tokens(db: Session) -> int:
    """스케줄러용. 만료 판단은 expires_at 컬럼으로만 한다."""
    return crud.refresh_token.delete_expired(db, utcnow())


def ensure_admin(db: Session) -> None:
    """ADMIN_EMAIL/ADMIN_PASSWORD 로 관리자 계정을 만들거나, 이미 있으면 role=admin 으로 승격한다.

    회원가입 API 로는 관리자를 만들 수 없고 이 시드가 유일한 경로다. 기존 계정의 비밀번호는 바꾸지 않는다.
    """
    email = settings.admin_email.strip().lower()  # 가입 스키마와 같은 규칙으로 소문자 정규화
    # 관리자 값을 설정하지 않은 환경(로컬 개발 등)에서는 조용히 건너뛴다
    if not email or not settings.admin_password:
        logger.info("admin_seed_skipped reason=not_configured")
        return
    # 일반 가입과 같은 비밀번호 규칙을 지키지 않으면 약한 관리자 계정이 생기므로 만들지 않는다
    if len(settings.admin_password) < PASSWORD_MIN_LENGTH:
        logger.warning("admin_seed_skipped reason=password_too_short")
        return

    user = crud.user.get_by_email(db, email)
    if user is None:  # 계정이 없으면 관리자로 새로 생성
        user = crud.user.create(
            db,
            email=email,
            hashed_password=hash_password(settings.admin_password),
            nickname=(settings.admin_nickname.strip() or "관리자")[:20],  # 미설정이면 '관리자', 닉네임 최대 20자
            role="admin",
        )
        logger.info("admin_seed_created user_id=%s", user.id)
    elif user.role != "admin":  # 일반 계정으로 이미 가입돼 있으면 권한만 승격 (재시작해도 중복 생성 없음)
        user.role = "admin"
        db.commit()
        logger.info("admin_seed_promoted user_id=%s", user.id)
