"""테스트 공통 설정.

app 을 import 하기 전에 환경변수를 지정해 임시 SQLite 파일과 테스트용 키를 쓰게 한다.
(환경변수가 backend/.env 보다 우선하므로 로컬 .env 값에 영향받지 않는다.)
"""

import os
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="chatlog-test-"))
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

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = "password1234"


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as c:  # lifespan 실행 → create_all + 관리자 시드
        yield c


@pytest.fixture()
def db():
    with SessionLocal() as session:
        yield session


def signup(client, email="user@example.com", password=PASSWORD, nickname="어썸체크"):
    return client.post("/api/auth/signup", json={"email": email, "password": password, "nickname": nickname}).json()


def login(client, email="user@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password}).json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}
