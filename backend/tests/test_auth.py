"""인증 API 테스트 — 07-verification V01~V08, V05b~V05f, V30, V22·V23."""

from datetime import timedelta

import jwt
from sqlalchemy import select

from app import crud
from app.core.security import hash_refresh_token
from app.core.timeutil import utcnow
from app.models import RefreshToken, User
from app.services import auth_service
from tests.conftest import PASSWORD, auth_header, login, signup


# ---------- 회원가입 ----------
def test_v01_signup_success(client, db):
    res = client.post("/api/auth/signup", json={"email": "User@Example.com", "password": PASSWORD, "nickname": " 어썸체크 "})
    assert res.status_code == 200
    body = res.json()
    assert body["code"] == 201
    assert set(body["data"]) == {"id", "email", "nickname", "created_at"}
    assert body["data"]["email"] == "user@example.com"
    assert body["data"]["nickname"] == "어썸체크"
    assert body["data"]["created_at"].endswith("+09:00")
    assert db.scalar(select(User).where(User.email == "user@example.com")).role == "user"


def test_v02_duplicate_email_409(client):
    signup(client)
    assert signup(client)["code"] == 409
    assert signup(client, email="USER@example.com")["code"] == 409


def test_v02b_duplicate_nickname_allowed(client):
    signup(client, email="a@example.com", nickname="같은닉")
    assert signup(client, email="b@example.com", nickname="같은닉")["code"] == 201


def test_v03_validation_422(client):
    cases = [
        ({"email": "a@example.com", "password": "1234567", "nickname": "n"}, "비밀번호는 8자 이상"),
        ({"email": "not-an-email", "password": PASSWORD, "nickname": "n"}, "이메일 형식"),
        ({"email": "a@example.com", "password": PASSWORD, "nickname": "가" * 21}, "닉네임은 1~20자"),
        ({"email": "a@example.com", "password": PASSWORD, "nickname": "   "}, "닉네임은 1~20자"),
        ({"email": "a@example.com"}, None),
    ]
    for payload, msg in cases:
        body = client.post("/api/auth/signup", json=payload).json()
        assert body["code"] == 422
        assert "detail" not in body and body["data"]["message"]
        if msg:
            assert msg in body["data"]["message"]


def test_v04_password_hashed(client, db):
    signup(client)
    user = crud.user.get_by_email(db, "user@example.com")
    assert user.hashed_password.startswith("$2b$") and len(user.hashed_password) == 60
    assert PASSWORD not in user.hashed_password


# ---------- 로그인 ----------
def test_v05_login_success(client, db):
    signup(client)
    body = login(client)
    assert body["code"] == 200
    data = body["data"]
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900 and data["refresh_expires_in"] == 86400
    rows = db.scalars(select(RefreshToken)).all()
    assert len(rows) == 1
    assert rows[0].token_hash == hash_refresh_token(data["refresh_token"])
    assert rows[0].token_hash != data["refresh_token"]


def test_v06_login_failure_same_message(client):
    signup(client)
    wrong_pw = login(client, password="wrong-password")
    no_user = login(client, email="nobody@example.com")
    assert wrong_pw["code"] == no_user["code"] == 401
    assert wrong_pw["data"]["message"] == no_user["data"]["message"]


def test_multi_device_login_creates_rows(client, db):
    signup(client)
    login(client)
    login(client)
    assert len(db.scalars(select(RefreshToken)).all()) == 2


# ---------- 재발급 · 로그아웃 ----------
def test_v05b_refresh_rotates(client):
    signup(client)
    old = login(client)["data"]
    body = client.post("/api/auth/refresh", json={"refresh_token": old["refresh_token"]}).json()
    assert body["code"] == 200
    new = body["data"]
    assert new["refresh_token"] != old["refresh_token"]
    assert client.get("/api/auth/me", headers=auth_header(new["access_token"])).json()["code"] == 200
    # 이전 refresh token 은 즉시 무효
    assert client.post("/api/auth/refresh", json={"refresh_token": old["refresh_token"]}).json()["code"] == 401


def test_v05c_refresh_invalid(client, db):
    signup(client)
    token = login(client)["data"]["refresh_token"]
    row = db.scalar(select(RefreshToken))
    row.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    assert client.post("/api/auth/refresh", json={"refresh_token": token}).json()["code"] == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": "forged"}).json()["code"] == 401
    assert client.post("/api/auth/refresh", json={}).json()["code"] == 422


def test_v05d_e_logout(client, db):
    signup(client)
    token = login(client)["data"]["refresh_token"]
    assert client.post("/api/auth/logout", json={"refresh_token": token}).json() == {"code": 200, "data": {}}
    assert db.scalars(select(RefreshToken)).all() == []
    assert client.post("/api/auth/refresh", json={"refresh_token": token}).json()["code"] == 401
    assert client.post("/api/auth/logout", json={"refresh_token": token}).json()["code"] == 200
    assert client.post("/api/auth/logout", json={}).json()["code"] == 422


def test_v05f_delete_expired(client, db):
    signup(client)
    login(client)
    login(client)
    rows = db.scalars(select(RefreshToken).order_by(RefreshToken.id)).all()
    rows[0].expires_at = utcnow() - timedelta(minutes=1)
    db.commit()
    assert auth_service.delete_expired_refresh_tokens(db) == 1
    assert [r.id for r in db.scalars(select(RefreshToken)).all()] == [rows[1].id]


# ---------- 인증 확인 ----------
def test_v07_me(client):
    signup(client)
    token = login(client)["data"]["access_token"]
    body = client.get("/api/auth/me", headers=auth_header(token)).json()
    assert body["code"] == 200
    assert set(body["data"]) == {"id", "email", "nickname", "role"}
    assert body["data"]["role"] == "user"


def test_v08_me_unauthorized(client):
    signup(client)
    assert client.get("/api/auth/me").json()["code"] == 401  # 헤더 없음
    assert client.get("/api/auth/me", headers=auth_header("garbage")).json()["code"] == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Basic abc"}).json()["code"] == 401

    now = utcnow()
    expired = jwt.encode({"sub": "1", "exp": now - timedelta(minutes=1)}, "test-secret-key-for-pytest-only-0123456789abcdef", algorithm="HS256")
    assert client.get("/api/auth/me", headers=auth_header(expired)).json()["code"] == 401
    forged = jwt.encode({"sub": "1", "exp": now + timedelta(minutes=5)}, "another-secret-key-0123456789abcdefghij", algorithm="HS256")
    assert client.get("/api/auth/me", headers=auth_header(forged)).json()["code"] == 401
    none_alg = jwt.encode({"sub": "1", "exp": now + timedelta(minutes=5)}, None, algorithm="none")
    assert client.get("/api/auth/me", headers=auth_header(none_alg)).json()["code"] == 401


# ---------- 관리자 시드 · 권한 ----------
def test_v30_admin_seed(client, db):
    admin = crud.user.get_by_email(db, "admin@example.com")
    assert admin is not None and admin.role == "admin"
    auth_service.ensure_admin(db)  # 재시작 가정
    assert len(db.scalars(select(User).where(User.email == "admin@example.com")).all()) == 1
    body = login(client, email="admin@example.com", password="admin-password-1234")
    me = client.get("/api/auth/me", headers=auth_header(body["data"]["access_token"])).json()
    assert me["data"]["role"] == "admin"


def test_admin_seed_promotes_existing_user(client, db):
    user = crud.user.get_by_email(db, "admin@example.com")
    user.role = "user"
    db.commit()
    auth_service.ensure_admin(db)
    db.refresh(user)
    assert user.role == "admin"


def test_require_admin_uses_db_role(client, db):
    from fastapi import Depends

    from app.core.dependencies import require_admin

    @client.app.get("/_test/admin-only")
    def _admin_only(_=Depends(require_admin)):
        return {"code": 200, "data": {}}

    signup(client)
    user_token = login(client)["data"]["access_token"]
    assert client.get("/_test/admin-only").json()["code"] == 401
    assert client.get("/_test/admin-only", headers=auth_header(user_token)).json()["code"] == 403

    # 토큰 재발급 없이 DB role 만 바꿔도 즉시 반영
    user = crud.user.get_by_email(db, "user@example.com")
    user.role = "admin"
    db.commit()
    assert client.get("/_test/admin-only", headers=auth_header(user_token)).json()["code"] == 200
    client.app.router.routes.pop()


# ---------- 공통 봉투 · CORS ----------
def test_v23_envelope_for_framework_errors(client):
    assert client.get("/api/nope").json() == {"code": 404, "data": {"message": "요청한 정보를 찾을 수 없습니다."}}
    assert client.get("/api/auth/login").json()["code"] == 405


def test_v22_cors_preflight(client):
    headers = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization"}
    ok = client.options("/api/auth/login", headers={**headers, "Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options("/api/auth/login", headers={**headers, "Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in bad.headers
