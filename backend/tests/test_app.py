"""앱 전체 설정 테스트 — API 문서 화면 노출(13-security-review S03)."""

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
