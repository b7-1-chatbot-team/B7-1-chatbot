"""앱 전체 설정 테스트 — API 문서 화면 노출(13-security-review S03), 요청 본문 크기 상한(S04), JWT 서명 키 강도(S05)."""

import importlib

import pytest
from fastapi.testclient import TestClient

import app.main
from app.config import settings

DOC_PATHS = ["/docs", "/redoc", "/openapi.json"]


@pytest.mark.parametrize("path", DOC_PATHS)
def test_docs_off_by_default(client, path):
    """ENABLE_DOCS 기본값(false)이면 API 문서 화면 세 경로 모두 404 봉투"""
    body = client.get(path).json()
    assert body["code"] == 404


def test_docs_on_when_enabled(client, monkeypatch):
    """ENABLE_DOCS=true 면 세 경로가 열린다 (로컬 개발용). 앱은 설정을 읽어 만들어지므로 다시 불러와 확인한다"""
    monkeypatch.setattr(settings, "enable_docs", True)
    try:
        enabled = importlib.reload(app.main).app
        with TestClient(enabled) as c:
            for path in DOC_PATHS:
                assert c.get(path).status_code == 200
    finally:
        monkeypatch.undo()
        importlib.reload(app.main)  # 다음 테스트를 위해 기본 설정의 앱으로 되돌린다


# ---------- 요청 본문 크기 상한 (S04) ----------
def test_body_over_limit_rejected_without_reading(client):
    """Content-Length 가 64KB 를 넘으면 본문을 읽지 않고 413 봉투, CORS 헤더도 붙는다"""
    big = '{"email":"a@example.com","password":"' + "a" * (64 * 1024) + '"}'
    r = client.post(
        "/api/auth/login",
        content=big,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"},
    )
    assert r.json() == {"code": 413, "data": {"message": "요청 내용이 너무 큽니다."}}
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_chunked_body_over_limit_rejected(client):
    """Content-Length 없이 나눠 보내도(chunked) 읽은 양이 64KB 를 넘는 순간 413"""

    def chunks():
        yield b'{"message":"'
        for _ in range(20):
            yield b"a" * 8 * 1024  # 160KB
        yield b'"}'

    r = client.post("/api/chat", content=chunks(), headers={"Content-Type": "application/json"})
    assert r.json()["code"] == 413


def test_body_under_limit_reaches_validation(client):
    """상한 아래 본문은 평소대로 검증까지 간다 — 60KB 비밀번호는 413 이 아니라 최대 길이 검증에서 422"""
    r = client.post("/api/auth/login", json={"email": "a@example.com", "password": "a" * (60 * 1024)})
    assert r.json() == {"code": 422, "data": {"message": "비밀번호는 128자 이하로 입력해 주세요."}}


# ---------- JWT 서명 키 강도 (S05) ----------
@pytest.mark.parametrize("key", ["", "short-key", "a" * 31])
def test_weak_jwt_secret_key_refuses_start(monkeypatch, key):
    """서명 키가 비었거나 32바이트보다 짧으면 서버가 시작하지 않는다"""
    monkeypatch.setattr(settings, "jwt_secret_key", key)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        with TestClient(app.main.app):
            pass


def test_jwt_secret_key_32_bytes_starts(monkeypatch):
    """32바이트 키는 시작된다 (경계값)"""
    monkeypatch.setattr(settings, "jwt_secret_key", "a" * 32)
    with TestClient(app.main.app) as c:
        assert c.get("/api/auth/me").json()["code"] == 401
