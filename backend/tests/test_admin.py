"""관리자 API 테스트 — 07-verification V31~V38."""

import os

import pytest
from sqlalchemy import select

from app import crud
from app.models import ServerLog
from app.services import ai_service
from tests.conftest import auth_header, login, signup

ADMIN_PATHS = [
    "/api/admin/stats",
    "/api/admin/users",
    "/api/admin/users/1/chats",
    "/api/admin/failures",
    "/api/admin/requests/abc/logs",
]


@pytest.fixture()
def admin_h(client):
    """서버 시작 때 시드된 관리자 계정(conftest 의 ADMIN_EMAIL)으로 로그인한 헤더."""
    token = login(client, email=os.environ["ADMIN_EMAIL"], password=os.environ["ADMIN_PASSWORD"])["data"]["access_token"]
    return auth_header(token)


def _user(client, db, email):
    """가입·로그인한 일반 사용자와 헤더."""
    signup(client, email=email)
    token = login(client, email=email)["data"]["access_token"]
    return crud.user.get_by_email(db, email), auth_header(token)


def _chat(db, user_id, n, status="success", error_code=None, latency_ms=100):
    """AI 호출 없이 대화 기록을 직접 넣는 헬퍼."""
    return crud.chat_log.create(
        db,
        user_id=user_id,
        question=f"질문 {n}",
        answer=f"답변 {n}" if status == "success" else None,
        status=status,
        error_code=error_code,
        latency_ms=latency_ms,
        request_id=f"req{n}",
    )


def _events(db, event):
    db.expire_all()
    return list(db.scalars(select(ServerLog).where(ServerLog.event == event).order_by(ServerLog.id)).all())


# ---------- 권한 · 감사 로그 ----------
def test_v32_requires_login(client):
    """토큰 없이 5종 모두 401"""
    assert [client.get(p).json()["code"] for p in ADMIN_PATHS] == [401] * 5


def test_v31_user_forbidden_and_logged(client, db):
    """일반 사용자는 5종 모두 403, 시도마다 admin_forbidden(WARN) 기록"""
    user, user_h = _user(client, db, "user@example.com")
    assert [client.get(p, headers=user_h).json()["code"] for p in ADMIN_PATHS] == [403] * 5

    rows = _events(db, "admin_forbidden")
    assert len(rows) == 5
    assert {r.level for r in rows} == {"WARN"} and {r.user_id for r in rows} == {user.id}
    assert rows[0].detail == "path=/api/admin/stats"


def test_v38_admin_access_logged(client, db, admin_h):
    """관리자 호출마다 admin_access admin_id= path= 기록"""
    client.get("/api/admin/users", headers=admin_h)
    admin = crud.user.get_by_email(db, os.environ["ADMIN_EMAIL"])
    (row,) = _events(db, "admin_access")
    assert (row.level, row.user_id, row.detail) == ("INFO", admin.id, f"admin_id={admin.id} path=/api/admin/users")


# ---------- 통계 ----------
def test_v33_stats(client, db, admin_h):
    """사용자 수·대화 수·실패 종류별 건수·성공 평균 응답시간이 DB 와 일치"""
    alice, _ = _user(client, db, "alice@example.com")
    bob, _ = _user(client, db, "bob@example.com")
    _chat(db, alice.id, 1, latency_ms=100)
    _chat(db, alice.id, 2, latency_ms=301)
    _chat(db, bob.id, 3, "error", "AI_TIMEOUT", 30000)
    _chat(db, bob.id, 4, "error", "AI_CALL_FAILED", 50)

    data = client.get("/api/admin/stats", headers=admin_h).json()["data"]
    assert data == {
        "users": 3,  # 관리자 + alice + bob
        "chats": {"total": 4, "success": 2, "failed": 2},
        "failures": {"AI_TIMEOUT": 1, "AI_CALL_FAILED": 1},
        "avg_latency_ms": 200,  # 성공 기록만 평균 (실패의 30000 은 제외), 반올림
    }


def test_stats_without_success_is_null(client, admin_h):
    """성공 기록이 없으면 평균은 0 이 아니라 null"""
    data = client.get("/api/admin/stats", headers=admin_h).json()["data"]
    assert data["avg_latency_ms"] is None
    assert data["failures"] == {"AI_TIMEOUT": 0, "AI_CALL_FAILED": 0}


# ---------- 사용자 목록 ----------
def test_v34_users_search_and_counts(client, db, admin_h):
    """이메일 부분 검색, 대화 수는 성공+실패 전체, 비밀번호 해시는 응답에 없음"""
    alice, _ = _user(client, db, "alice@example.com")
    _user(client, db, "bob@example.com")
    _chat(db, alice.id, 1)
    _chat(db, alice.id, 2, "error", "AI_TIMEOUT")

    data = client.get("/api/admin/users?q=ALI", headers=admin_h).json()["data"]
    assert data["total"] == 1
    (item,) = data["items"]
    assert item["email"] == "alice@example.com" and item["chat_count"] == 2
    assert item["last_chat_at"].endswith("+09:00")
    assert set(item) == {"id", "email", "nickname", "role", "created_at", "chat_count", "last_chat_at"}

    # 검색어의 % 는 와일드카드가 아니라 글자 그대로
    assert client.get("/api/admin/users?q=%25", headers=admin_h).json()["data"]["total"] == 0


def test_users_order_recent_activity_first(client, db, admin_h):
    """최근 대화한 사용자 먼저, 대화 없는 사용자는 뒤에서 최근 가입 순"""
    alice, _ = _user(client, db, "alice@example.com")
    bob, _ = _user(client, db, "bob@example.com")
    _user(client, db, "carol@example.com")
    _chat(db, bob.id, 1)
    _chat(db, alice.id, 2)  # alice 가 가장 최근

    emails = [u["email"] for u in client.get("/api/admin/users", headers=admin_h).json()["data"]["items"]]
    assert emails == ["alice@example.com", "bob@example.com", "carol@example.com", os.environ["ADMIN_EMAIL"]]
    assert client.get("/api/admin/users?limit=1&offset=1", headers=admin_h).json()["data"]["items"][0]["email"] == (
        "bob@example.com"
    )


def test_page_params(client, admin_h):
    """limit 0 → 422, 100 초과는 오류 없이 처리"""
    assert client.get("/api/admin/users?limit=0", headers=admin_h).json()["code"] == 422
    assert client.get("/api/admin/failures?limit=1000", headers=admin_h).json()["code"] == 200


# ---------- 사용자별 대화 ----------
def test_v35_user_chats(client, db, admin_h):
    """성공·실패 모두 최신순, 사용자 정보 포함 / 없는 사용자 404"""
    alice, _ = _user(client, db, "alice@example.com")
    _chat(db, alice.id, 1)
    _chat(db, alice.id, 2, "error", "AI_TIMEOUT", 30000)

    data = client.get(f"/api/admin/users/{alice.id}/chats", headers=admin_h).json()["data"]
    assert data["user"] == {"id": alice.id, "email": "alice@example.com", "nickname": "어썸체크"}
    assert data["total"] == 2
    assert [(c["question"], c["status"], c["error_code"]) for c in data["items"]] == [
        ("질문 2", "error", "AI_TIMEOUT"),
        ("질문 1", "success", None),
    ]
    assert data["items"][0]["answer"] is None and data["items"][0]["request_id"] == "req2"

    assert client.get("/api/admin/users/9999/chats", headers=admin_h).json() == {
        "code": 404,
        "data": {"message": "사용자를 찾을 수 없습니다."},
    }


# ---------- 실패 기록 ----------
def test_v36_failures(client, db, admin_h):
    """status=error 만 최신순, 이메일·error_code·request_id 포함"""
    alice, _ = _user(client, db, "alice@example.com")
    bob, _ = _user(client, db, "bob@example.com")
    _chat(db, alice.id, 1)
    _chat(db, alice.id, 2, "error", "AI_TIMEOUT", 30000)
    _chat(db, bob.id, 3, "error", "AI_CALL_FAILED", 50)

    data = client.get("/api/admin/failures", headers=admin_h).json()["data"]
    assert data["total"] == 2
    assert [(f["email"], f["error_code"], f["request_id"]) for f in data["items"]] == [
        ("bob@example.com", "AI_CALL_FAILED", "req3"),
        ("alice@example.com", "AI_TIMEOUT", "req2"),
    ]


# ---------- 요청 흐름 ----------
def test_v37_request_logs_from_real_failure(client, db, admin_h, monkeypatch):
    """실제 챗 실패 → 실패 기록의 request_id 로 요청 흐름 4단계를 시간순 조회 / 없는 id 404"""

    async def timeout(_messages):
        raise ai_service.AIError(ai_service.AI_TIMEOUT, "timeout")

    monkeypatch.setattr(ai_service, "ask", timeout)
    _, user_h = _user(client, db, "alice@example.com")
    assert client.post("/api/chat", json={"message": "긴 글 요약해줘"}, headers=user_h).json()["code"] == 504

    (failure,) = client.get("/api/admin/failures", headers=admin_h).json()["data"]["items"]
    data = client.get(f"/api/admin/requests/{failure['request_id']}/logs", headers=admin_h).json()["data"]
    assert data["request_id"] == failure["request_id"]
    assert [(e["event"], e["level"]) for e in data["items"]] == [
        ("request_received", "INFO"),
        ("ai_call_start", "INFO"),
        ("ai_call_failed", "ERROR"),
        ("db_save_success", "INFO"),
    ]
    assert data["items"][3]["detail"] == f"chat_id={failure['chat_id']} status=error"

    assert client.get("/api/admin/requests/nope/logs", headers=admin_h).json() == {
        "code": 404,
        "data": {"message": "해당 요청의 로그가 없습니다."},
    }
