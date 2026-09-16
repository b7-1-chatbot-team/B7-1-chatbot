"""인증·권한 의존성 (02-architecture §5-3).

라우터는 Depends(get_current_user) 로 받은 user.id 만 사용하고, 클라이언트가 보낸 user_id 는 쓰지 않는다.
"""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import crud
from app.core.responses import AppError
from app.core.security import decode_access_token
from app.database import get_db
from app.models import User

# auto_error=False: 헤더가 없을 때 FastAPI 기본 403 대신 우리 봉투 401 을 준다. Swagger Authorize 버튼도 생긴다.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401)
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise AppError(401)
    user = crud.user.get(db, user_id)
    if user is None:
        raise AppError(401)
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """토큰에 role 을 넣지 않고 매 요청 DB 의 role 로 확인한다 → 권한 회수가 즉시 반영된다."""
    if user.role != "admin":
        raise AppError(403)
    return user
