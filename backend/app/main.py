"""FastAPI 앱 진입점.

실행: uvicorn app.main:app --reload  (backend/ 에서)
"""

import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (Base.metadata 에 테이블 등록)
from app.config import settings
from app.core.responses import register_exception_handlers
from app.database import Base, SessionLocal, engine
from app.routers import auth
from app.services import auth_service

logger = logging.getLogger("app")

REFRESH_TOKEN_CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60


def _cleanup_expired_refresh_tokens() -> None:
    with SessionLocal() as db:
        deleted = auth_service.delete_expired_refresh_tokens(db)
    logger.info("refresh_token_cleanup deleted=%s", deleted)


async def _refresh_token_cleanup_loop() -> None:
    """시작 시 1회 + 이후 24시간마다 만료 refresh token 행 삭제 (A7-6)."""
    while True:
        try:
            await asyncio.to_thread(_cleanup_expired_refresh_tokens)
        except Exception:
            logger.exception("refresh_token_cleanup_failed")
        await asyncio.sleep(REFRESH_TOKEN_CLEANUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY 가 설정되지 않았습니다. backend/.env 또는 Railway Variables 를 확인하세요.")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        auth_service.ensure_admin(db)
    cleanup_task = asyncio.create_task(_refresh_token_cleanup_loop())
    yield
    cleanup_task.cancel()
    with suppress(asyncio.CancelledError):
        await cleanup_task


# 앱 생성. title·version 은 Swagger(/docs) 화면에 표시된다.
app = FastAPI(title="Chatlog API", version="0.1.0", lifespan=lifespan)

# 모든 오류 응답을 {code, data:{message}} 봉투 형식으로 바꾸는 예외 핸들러 등록 (app/core/responses.py)
register_exception_handlers(app)

# 프론트·백엔드가 Railway 에서 서로 다른 도메인이므로 CORS 필수
# JWT 를 Authorization 헤더로 보내므로 쿠키(credentials)는 쓰지 않는다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # CORS_ORIGINS 에 등록된 Origin 만 허용 ("*" 전체 허용은 쓰지 않음)
    allow_credentials=False,  # 쿠키·인증정보 자동 전송 안 함
    allow_methods=["GET", "POST", "OPTIONS"],  # 우리 API 가 쓰는 메서드 + preflight(OPTIONS)
    allow_headers=["Authorization", "Content-Type"],  # 토큰 헤더와 JSON 본문 헤더만 허용
)

app.include_router(auth.router)
