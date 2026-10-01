"""챗 API 테스트 — 07-verification V09~V17.

실제 AI 서버는 부르지 않는다. httpx.MockTransport 로 AI 서버 역할을 하는 가짜 응답을 끼워 넣고,
우리 서버가 AI 에게 무엇을 보냈는지(payload)도 함께 검사한다.
"""

import asyncio
import json

import httpx
import pytest
from sqlalchemy import select

from app.config import settings
from app.models import ChatLog
from app.services import ai_service
from tests.conftest import auth_header, login, signup


class FakeAI:
    """가짜 AI 서버. mode 로 성공·타임아웃·오류를 바꾸고, 받은 요청 body 를 requests 에 쌓는다."""

    def __init__(self):
        self.mode = "ok"
        self.requests: list[dict] = []

    async def handler(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        self.requests.append({"body": body, "auth": request.headers.get("Authorization")})
        if self.mode == "timeout":
            raise httpx.ReadTimeout("timeout", request=request)
        if self.mode == "slow":
            await asyncio.sleep(1)  # 테스트에서는 상한을 0.1초로 줄여 둔다
        if self.mode == "connect_error":
            raise httpx.ConnectError("refused", request=request)
        if self.mode.startswith("http_"):
            return httpx.Response(int(self.mode[5:]), json={"error": "x"})
        if self.mode == "empty":
            return httpx.Response(200, json={"choices": [{"message": {"content": "  "}}]})
        question = body["messages"][-1]["content"]
        return httpx.Response(200, json={"choices": [{"message": {"content": f"답변: {question}"}}]})

    @property
    def last_messages(self) -> list[dict]:
        return self.requests[-1]["body"]["messages"]


@pytest.fixture()
def fake_ai(monkeypatch):
    """AI 클라이언트를 가짜 서버에 연결된 것으로 바꾸고, 테스트용 API 키를 넣는다."""
    fake = FakeAI()
    monkeypatch.setattr(settings, "copa_api_key", "test-ai-key")
    monkeypatch.setattr(ai_service, "_client", httpx.AsyncClient(transport=httpx.MockTransport(fake.handler)))
    return fake


@pytest.fixture()
def user_h(client):
    """가입·로그인을 마친 사용자의 Authorization 헤더."""
    signup(client)
    return auth_header(login(client)["data"]["access_token"])


def _ask(client, headers, message):
    return client.post("/api/chat", json={"message": message}, headers=headers).json()


def _all_logs(db):
    """저장된 대화 기록 전체를 id 순으로. API 가 다른 세션에서 저장한 값을 다시 읽도록 캐시를 먼저 비운다."""
    db.expire_all()
    return list(db.scalars(select(ChatLog).order_by(ChatLog.id)).all())


# ---------- 인증 ----------
def test_v09_requires_login(client, fake_ai):
    """토큰 없이 질문 → 401, AI 는 불리지 않는다"""
    assert client.post("/api/chat", json={"message": "안녕"}).json()["code"] == 401
    assert fake_ai.requests == []


# ---------- 성공 ----------
def test_v10_success_saved(client, db, fake_ai, user_h):
    """성공 응답 형식과 chat_logs 저장(status=success), 앞뒤 공백 제거, API 키는 서버에서만 사용"""
    res = _ask(client, user_h, "  FastAPI CORS 설정?  ")
    assert res["code"] == 200
    data = res["data"]
    assert set(data) == {"chat_id", "question", "answer", "created_at"}
    assert data["question"] == "FastAPI CORS 설정?"
    assert data["answer"] == "답변: FastAPI CORS 설정?"
    assert data["created_at"].endswith("+09:00")
    assert fake_ai.requests[-1]["auth"] == "Bearer test-ai-key"
    assert "test-ai-key" not in json.dumps(res)

    (log,) = _all_logs(db)
    assert (log.id, log.status, log.error_code) == (data["chat_id"], "success", None)
    assert len(log.request_id) == 12 and log.latency_ms is not None


# ---------- 컨텍스트 ----------
def test_v11_previous_turn_in_context(client, fake_ai, user_h):
    """두 번째 질문에는 직전 Q/A 가 user·assistant 순서로 함께 간다"""
    _ask(client, user_h, "첫 질문")
    _ask(client, user_h, "두 번째 질문")
    assert fake_ai.last_messages == [
        {"role": "user", "content": "첫 질문"},
        {"role": "assistant", "content": "답변: 첫 질문"},
        {"role": "user", "content": "두 번째 질문"},
    ]


def test_v12_context_limited_and_failures_excluded(client, fake_ai, user_h):
    """7번째 질문 → 최근 성공 5턴만 오래된 순으로, 실패 기록은 빠진다"""
    for i in range(1, 7):
        _ask(client, user_h, f"q{i}")
    fake_ai.mode = "http_500"
    _ask(client, user_h, "실패한 질문")
    fake_ai.mode = "ok"
    _ask(client, user_h, "q7")

    sent = [m["content"] for m in fake_ai.last_messages if m["role"] == "user"]
    assert sent == ["q2", "q3", "q4", "q5", "q6", "q7"]  # 5턴 + 현재 질문


def test_context_is_per_user(client, db, fake_ai, user_h):
    """다른 사용자의 대화는 내 컨텍스트에 들어가지 않는다"""
    signup(client, email="other@example.com")
    other_h = auth_header(login(client, email="other@example.com")["data"]["access_token"])
    _ask(client, other_h, "다른 사람 질문")
    _ask(client, user_h, "내 질문")
    assert fake_ai.last_messages == [{"role": "user", "content": "내 질문"}]


# ---------- 입력 검증 ----------
@pytest.mark.parametrize("message", ["", "   ", "\n\t "])
def test_v13_empty_message_422(client, fake_ai, user_h, message):
    """빈 문자열·공백만 → 422, AI 호출 없음, 저장 없음"""
    res = _ask(client, user_h, message)
    assert res == {"code": 422, "data": {"message": "질문은 1~1000자로 입력해 주세요."}}
    assert fake_ai.requests == []


def test_v14_length_boundary(client, fake_ai, user_h):
    """1000자 → 200, 1001자 → 422"""
    assert _ask(client, user_h, "가" * 1000)["code"] == 200
    assert _ask(client, user_h, "가" * 1001)["code"] == 422
    assert len(fake_ai.requests) == 1


@pytest.mark.parametrize("body", [{}, {"message": 123}, {"msg": "안녕"}])
def test_bad_body_422(client, fake_ai, user_h, body):
    """필드 누락·문자열이 아닌 값 → 422"""
    assert client.post("/api/chat", json=body, headers=user_h).json()["code"] == 422


# ---------- AI 실패 ----------
@pytest.mark.parametrize("mode", ["timeout", "slow"])
def test_v15_timeout_504_saved(client, db, fake_ai, user_h, monkeypatch, mode):
    """httpx 타임아웃·전체 상한 초과 모두 → 504, status=error·error_code=AI_TIMEOUT 로 저장"""
    monkeypatch.setattr(settings, "ai_timeout_seconds", 0.1)
    fake_ai.mode = mode
    res = _ask(client, user_h, "긴 글 요약해줘")
    assert res == {"code": 504, "data": {"message": "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요."}}

    (log,) = _all_logs(db)
    assert (log.status, log.error_code, log.answer) == ("error", "AI_TIMEOUT", None)
    assert log.question == "긴 글 요약해줘"


@pytest.mark.parametrize("mode", ["http_500", "http_429", "http_401", "connect_error", "empty"])
def test_v16_call_failed_502_saved(client, db, fake_ai, user_h, mode):
    """AI 서버 오류·호출 제한·키 오류·연결 실패·빈 응답 → 502, error_code=AI_CALL_FAILED"""
    fake_ai.mode = mode
    res = _ask(client, user_h, "질문")
    assert res == {"code": 502, "data": {"message": "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."}}
    (log,) = _all_logs(db)
    assert (log.status, log.error_code) == ("error", "AI_CALL_FAILED")


def test_missing_api_key_502_without_call(client, fake_ai, user_h, monkeypatch):
    """COPA_API_KEY 가 없으면 AI 를 부르지 않고 502"""
    monkeypatch.setattr(settings, "copa_api_key", "")
    assert _ask(client, user_h, "질문")["code"] == 502
    assert fake_ai.requests == []


def test_v17_recovers_after_failure(client, fake_ai, user_h):
    """장애 직후 정상 질문 → 200 (서버 유지), 실패와 재시도는 별도 기록"""
    fake_ai.mode = "timeout"
    assert _ask(client, user_h, "질문")["code"] == 504
    fake_ai.mode = "ok"
    assert _ask(client, user_h, "질문")["code"] == 200
