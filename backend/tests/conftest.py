"""테스트 공통 설정.

app 을 import 하기 전에 환경변수를 지정해 임시 SQLite 파일과 테스트용 키를 쓰게 한다.
(환경변수가 backend/.env 보다 우선하므로 로컬 .env 값에 영향받지 않는다.)
"""

import os
import tempfile
from pathlib import Path

# 테스트마다 실제 data/app.db 를 건드리지 않도록 OS 임시 폴더에 테스트 전용 DB 파일을 둔다
_TMP = Path(tempfile.mkdtemp(prefix="chatlog-test-"))
# app.config 의 settings 는 import 시점에 한 번 만들어지므로, 반드시 app import 보다 먼저 환경변수를 넣는다
os.environ.update(
    {
        "DATABASE_URL": f"sqlite:///{_TMP / 'test.db'}",
        "JWT_SECRET_KEY": "test-secret-key-for-pytest-only-0123456789abcdef",
        "JWT_ALGORITHM": "HS256",
        "JWT_EXPIRE_MINUTES": "15",
        "REFRESH_TOKEN_EXPIRE_DAYS": "1",
        "CORS_ORIGINS": "http://localhost:5173",
        "ADMIN_EMAIL": "admin@example.com",
        "ADMIN_PASSWORD": "admin-password-1234",
        "ADMIN_NICKNAME": "관리자",
    }
)

# E402(import 가 파일 맨 위에 없음) 경고 무시 — 위에서 환경변수를 먼저 설정해야 하기 때문
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = "password1234"  # 테스트용 공통 비밀번호 (8자 이상 규칙 충족)


@pytest.fixture()
def client():
    """테스트 함수마다 깨끗한 DB 로 앱을 띄운 TestClient 를 준다 (테스트끼리 데이터가 섞이지 않게)."""
    Base.metadata.drop_all(bind=engine)  # 이전 테스트가 만든 테이블·데이터 전부 삭제
    with TestClient(app) as c:  # lifespan 실행 → create_all + 관리자 시드
        yield c


@pytest.fixture()
def db():
    """API 를 거치지 않고 DB 상태를 직접 확인·조작할 때 쓰는 세션."""
    with SessionLocal() as session:
        yield session


# ---- 반복되는 요청을 줄이기 위한 헬퍼 (응답 JSON 을 그대로 반환) ----
def signup(client, email="user@example.com", password=PASSWORD, nickname="어썸체크"):
    return client.post("/api/auth/signup", json={"email": email, "password": password, "nickname": nickname}).json()


def login(client, email="user@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password}).json()


def auth_header(token):
    """access token 으로 Authorization 헤더 dict 를 만든다."""
    return {"Authorization": f"Bearer {token}"}
