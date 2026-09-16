"""인증 API — /api/auth/* (03-api §1)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import ok
from app.core.timeutil import to_kst_iso
from app.database import get_db
from app.schemas.auth import SignupRequest
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    user = auth_service.signup(db, body.email, body.password, body.nickname)
    return ok(
        {"id": user.id, "email": user.email, "nickname": user.nickname, "created_at": to_kst_iso(user.created_at)},
        code=201,
    )
