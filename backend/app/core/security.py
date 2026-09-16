"""비밀번호 해시와 토큰 유틸 (02-architecture §4, 12-decisions §9)."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

# bcrypt 는 앞 72바이트만 사용한다. bcrypt 5.x 는 초과 입력에 예외를 내므로 해시·검증 모두 같은 규칙으로 자른다.
_BCRYPT_MAX_BYTES = 72


def _pw_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(password), hashed_password.encode("ascii"))
    except ValueError:
        return False


# 없는 이메일로 로그인할 때도 bcrypt 비교를 한 번 수행해 응답 시간으로 계정 존재를 추측하지 못하게 한다.
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(16))


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),  # role 은 넣지 않는다 — 권한은 매 요청 DB 로 확인
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """유효하면 user_id, 만료·서명 오류·형식 오류면 None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],  # alg 혼동 공격 방지 — 허용 알고리즘 고정
            options={"require": ["exp", "sub"]},
        )
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        return None


def new_refresh_token() -> str:
    """384비트 무작위 문자열. 원문은 클라이언트에만 주고 DB 에는 해시만 저장한다."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
