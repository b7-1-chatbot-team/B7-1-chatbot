"""인증 API — /api/auth/* (03-api §1)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.responses import ok
from app.core.timeutil import to_kst_iso
from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest, SignupRequest
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    user = auth_service.signup(db, body.email, body.password, body.nickname)
    return ok(
        {"id": user.id, "email": user.email, "nickname": user.nickname, "created_at": to_kst_iso(user.created_at)},
        code=201,
    )


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return ok(auth_service.login(db, body.email, body.password))


@router.post("/refresh")
def refresh(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    return ok(auth_service.refresh(db, body.refresh_token))


@router.post("/logout")
def logout(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    auth_service.logout(db, body.refresh_token)
    return ok({})


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok({"id": user.id, "email": user.email, "nickname": user.nickname, "role": user.role})
