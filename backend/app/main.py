"""FastAPI 앱 진입점.

실행: uvicorn app.main:app --reload  (backend/ 에서)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="Chatlog API", version="0.1.0")

# 프론트·백엔드가 Railway 에서 서로 다른 도메인이므로 CORS 필수 (06-deployment §5)
# JWT 를 Authorization 헤더로 보내므로 쿠키(credentials)는 쓰지 않는다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
