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

# 이 파일의 모든 경로 앞에 /api/auth 가 붙는다. tags 는 Swagger(/docs) 화면의 그룹 이름
router = APIRouter(prefix="/api/auth", tags=["auth"])

# 라우터 함수는 ① 스키마로 요청 검증(실패 시 자동 422) ② 서비스 호출 ③ ok() 로 봉투 응답만 담당한다.
# 서비스가 raise 한 AppError(401·409 등)는 예외 핸들러가 봉투로 바꿔준다.


@router.post("/signup")
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    """회원가입. 성공 code:201 / 이메일 중복 409 / 입력 오류 422"""
    user = auth_service.signup(db, body.email, body.password, body.nickname)
    # 응답에 hashed_password 는 넣지 않는다. created_at 은 +09:00 문자열로 변환
    return ok(
        {"id": user.id, "email": user.email, "nickname": user.nickname, "created_at": to_kst_iso(user.created_at)},
        code=201,
    )


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """로그인. 성공 시 access·refresh token 발급 / 실패 401"""
    return ok(auth_service.login(db, body.email, body.password))


@router.post("/refresh")
def refresh(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """토큰 재발급(회전). 인증 헤더 없이 body 의 refresh token 으로만 처리 / 무효 401"""
    return ok(auth_service.refresh(db, body.refresh_token))


@router.post("/logout")
def logout(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """로그아웃. body 의 refresh token 행만 삭제(이 기기만). 이미 폐기된 토큰이어도 200"""
    auth_service.logout(db, body.refresh_token)
    return ok({})


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """현재 로그인 사용자. 프론트가 새로고침 후 상태 복원·관리자 메뉴 표시 여부(role)에 사용 / 토큰 문제 401"""
    return ok({"id": user.id, "email": user.email, "nickname": user.nickname, "role": user.role})
