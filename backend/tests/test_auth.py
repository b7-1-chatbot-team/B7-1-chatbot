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
# 테스트 함수 이름의 v01·v02 … 는 docs/07-verification.md 검증 ID 와 대응한다
def test_v01_signup_success(client, db):
    """가입 성공: HTTP 200 + code 201, 해시 미노출, 이메일 소문자·닉네임 공백 정리, role=user"""
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
    """같은 이메일(대소문자만 다른 경우 포함) 재가입 → 409"""
    signup(client)
    assert signup(client)["code"] == 409
    assert signup(client, email="USER@example.com")["code"] == 409


def test_v02b_duplicate_nickname_allowed(client):
    """닉네임은 중복 허용"""
    signup(client, email="a@example.com", nickname="같은닉")
    assert signup(client, email="b@example.com", nickname="같은닉")["code"] == 201


def test_v03_validation_422(client):
    """입력 검증 실패는 모두 422 + 한국어 data.message, FastAPI 기본 detail 키는 없어야 함"""
    # (요청 body, 메시지에 포함돼야 할 문구) — None 이면 문구는 검사하지 않음(필드 누락)
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
    """DB 에 bcrypt 해시($2b$, 60자)로 저장되고 평문이 들어 있지 않음"""
    signup(client)
    user = crud.user.get_by_email(db, "user@example.com")
    assert user.hashed_password.startswith("$2b$") and len(user.hashed_password) == 60
    assert PASSWORD not in user.hashed_password


# ---------- 로그인 ----------
def test_v05_login_success(client, db):
    """로그인 응답 필드·수명(900초·86400초), refresh 는 원문이 아닌 해시로 1행 저장"""
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
    """틀린 비밀번호·없는 이메일 모두 401 + 같은 메시지 (계정 존재 추측 방지)"""
    signup(client)
    wrong_pw = login(client, password="wrong-password")
    no_user = login(client, email="nobody@example.com")
    assert wrong_pw["code"] == no_user["code"] == 401
    assert wrong_pw["data"]["message"] == no_user["data"]["message"]


def test_multi_device_login_creates_rows(client, db):
    """여러 기기 로그인 허용 — 로그인할 때마다 refresh 행이 따로 생김"""
    signup(client)
    login(client)
    login(client)
    assert len(db.scalars(select(RefreshToken)).all()) == 2


# ---------- 재발급 · 로그아웃 ----------
def test_v05b_refresh_rotates(client):
    """재발급 시 새 토큰 쌍 발급(회전), 새 access 로 인증 성공, 이전 refresh 는 즉시 무효"""
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
    """만료·위조 refresh → 401, body 누락 → 422"""
    signup(client)
    token = login(client)["data"]["refresh_token"]
    row = db.scalar(select(RefreshToken))
    row.expires_at = utcnow() - timedelta(seconds=1)  # DB 값을 직접 과거로 바꿔 만료 상황을 만든다
    db.commit()
    assert client.post("/api/auth/refresh", json={"refresh_token": token}).json()["code"] == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": "forged"}).json()["code"] == 401
    assert client.post("/api/auth/refresh", json={}).json()["code"] == 422


def test_v05d_e_logout(client, db):
    """로그아웃 → 행 삭제·재발급 불가, 같은 요청 반복해도 200, body 누락 422"""
    signup(client)
    token = login(client)["data"]["refresh_token"]
    assert client.post("/api/auth/logout", json={"refresh_token": token}).json() == {"code": 200, "data": {}}
    assert db.scalars(select(RefreshToken)).all() == []
    assert client.post("/api/auth/refresh", json={"refresh_token": token}).json()["code"] == 401
    assert client.post("/api/auth/logout", json={"refresh_token": token}).json()["code"] == 200
    assert client.post("/api/auth/logout", json={}).json()["code"] == 422


def test_v05f_delete_expired(client, db):
    """스케줄러 정리 함수는 만료된 행만 지우고 유효한 행은 남긴다"""
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
    """유효한 토큰으로 /me → id·email·nickname·role"""
    signup(client)
    token = login(client)["data"]["access_token"]
    body = client.get("/api/auth/me", headers=auth_header(token)).json()
    assert body["code"] == 200
    assert set(body["data"]) == {"id", "email", "nickname", "role"}
    assert body["data"]["role"] == "user"


def test_v08_me_unauthorized(client):
    """헤더 없음·쓰레기 값·Basic 방식·만료·다른 키 서명·alg=none 토큰은 모두 401"""
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
    """서버 시작 시 ADMIN_EMAIL 관리자 생성, 재실행해도 중복 생성 없음, 로그인하면 role=admin"""
    admin = crud.user.get_by_email(db, "admin@example.com")
    assert admin is not None and admin.role == "admin"
    auth_service.ensure_admin(db)  # 재시작 가정
    assert len(db.scalars(select(User).where(User.email == "admin@example.com")).all()) == 1
    body = login(client, email="admin@example.com", password="admin-password-1234")
    me = client.get("/api/auth/me", headers=auth_header(body["data"]["access_token"])).json()
    assert me["data"]["role"] == "admin"


def test_admin_seed_promotes_existing_user(client, db):
    """이미 일반 계정이면 시드가 role 만 admin 으로 승격"""
    user = crud.user.get_by_email(db, "admin@example.com")
    user.role = "user"
    db.commit()
    auth_service.ensure_admin(db)
    db.refresh(user)
    assert user.role == "admin"


def test_require_admin_uses_db_role(client, db):
    """require_admin: 비로그인 401, 일반 사용자 403, DB role 변경이 토큰 재발급 없이 즉시 반영"""
    # 관리자 라우터가 아직 없어서 테스트 안에서만 쓰는 임시 경로를 등록해 검증한다
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
    client.app.router.routes.pop()  # 임시 경로 제거 (다른 테스트에 영향 없도록)


# ---------- 공통 봉투 · CORS ----------
def test_v23_envelope_for_framework_errors(client):
    """프레임워크 기본 오류(404·405)도 봉투 형식"""
    assert client.get("/api/nope").json() == {"code": 404, "data": {"message": "요청한 정보를 찾을 수 없습니다."}}
    assert client.get("/api/auth/login").json()["code"] == 405


def test_v22_cors_preflight(client):
    """허용 Origin 은 access-control-allow-origin 헤더가 있고, 미허용 Origin 은 없다"""
    headers = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization"}
    ok = client.options("/api/auth/login", headers={**headers, "Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options("/api/auth/login", headers={**headers, "Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in bad.headers
