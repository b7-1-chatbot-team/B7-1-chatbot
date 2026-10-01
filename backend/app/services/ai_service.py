"""Codyssey AI API 호출 전담 — 서버에서만 AI 를 부르고, API 키는 이 파일 밖으로 나가지 않는다.

- 왜 httpx.AsyncClient 인가: AI 응답은 최대 30초까지 기다릴 수 있다. 동기 방식(requests)으로 기다리면
  그동안 서버가 다른 사용자의 요청을 처리하지 못한다. async 로 기다리면 대기 중에 다른 요청을 처리할 수 있다.
- 왜 클라이언트를 1개만 만들어 재사용하나: 요청마다 새로 만들면 매번 서버와 연결(TLS 협상)을 다시 맺어 느려진다.
- 왜 자동 재시도를 하지 않나: 타임아웃 뒤에 다시 부르면 사용자는 최대 60초 이상 기다리게 된다.
  재시도는 사용자가 화면의 [다시 시도] 버튼으로 직접 결정한다 (03-api).
"""

import asyncio
import logging
from collections.abc import Sequence

import httpx

from app.config import settings
from app.models import ChatLog

logger = logging.getLogger("app")

# OpenAI 호환 형식의 Codyssey AI 엔드포인트와 모델 (02-architecture 6절)
AI_API_URL = "https://copa.codyssey.kr/v1/chat/completions"
AI_MODEL = "gpt-5-mini"

# chat_logs.error_code 에 저장하는 값 — 관리자 화면의 실패 기록·통계가 이 두 값으로 나뉜다
AI_TIMEOUT = "AI_TIMEOUT"  # 상한 시간 안에 응답이 오지 않음 → 사용자에게 504
AI_CALL_FAILED = "AI_CALL_FAILED"  # 그 밖의 모든 실패(키 오류·호출 제한·AI 서버 오류·연결 실패·빈 응답) → 502

# 앱 전체에서 함께 쓰는 클라이언트. 첫 호출 때 만들고, 서버 종료 시 close_client() 로 닫는다
_client: httpx.AsyncClient | None = None


class AIError(Exception):
    """AI 호출 실패. error_code 는 DB 저장용, reason 은 원인 추적용(로그)이다.

    reason 에는 API 키·질문 원문을 넣지 않는다 — 예) "timeout", "http_429", "connect_error", "empty_response"
    """

    def __init__(self, error_code: str, reason: str):
        super().__init__(reason)
        self.error_code = error_code
        self.reason = reason


def _get_client() -> httpx.AsyncClient:
    """공용 클라이언트를 돌려준다. 아직 없거나 닫혀 있으면 새로 만든다."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient()
    return _client


async def close_client() -> None:
    """서버 종료 시 열린 연결을 정리한다 (main.py lifespan 에서 호출)."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


def build_messages(history: Sequence[ChatLog], question: str) -> list[dict[str, str]]:
    """이전 대화와 현재 질문을 AI 가 읽는 messages 형식으로 만든다.

    history 는 **오래된 순**이어야 한다 (crud.chat_log.recent_success_for_context 가 그렇게 돌려준다).
    질문(user)·답변(assistant)을 번갈아 나열해야 AI 가 대화의 흐름으로 이해한다.
    """
    messages: list[dict[str, str]] = []
    for log in history:
        messages.append({"role": "user", "content": log.question})
        messages.append({"role": "assistant", "content": log.answer or ""})
    messages.append({"role": "user", "content": question})
    return messages


async def ask(messages: list[dict[str, str]]) -> str:
    """AI 에게 messages 를 보내고 답변 문자열을 돌려준다. 실패하면 AIError 를 던진다.

    시간 상한을 asyncio.wait_for 로 거는 이유: httpx 의 timeout 은 연결·읽기 같은 **단계별** 상한이라,
    AI 서버가 조금씩 끊어서 보내면 전체 시간이 30초를 넘을 수 있다. wait_for 는 호출 **전체**를 30초로 자른다.
    """
    if not settings.copa_api_key:
        # 키가 없으면 AI 서버가 401 을 줄 것이 뻔하므로 부르지 않고 바로 실패 처리
        raise AIError(AI_CALL_FAILED, "missing_api_key")

    try:
        response = await asyncio.wait_for(
            _get_client().post(
                AI_API_URL,
                headers={"Authorization": f"Bearer {settings.copa_api_key}"},
                json={"model": AI_MODEL, "messages": messages},
                timeout=settings.ai_timeout_seconds,  # 단계별 상한도 같은 값으로 둔다
            ),
            timeout=settings.ai_timeout_seconds,
        )
    except (asyncio.TimeoutError, httpx.TimeoutException):
        raise AIError(AI_TIMEOUT, "timeout") from None
    except httpx.HTTPError as exc:
        # 연결 거부·DNS 실패 등 응답 자체를 받지 못한 경우. 예외 클래스 이름만 남긴다 (메시지에 주소·헤더가 섞일 수 있음)
        raise AIError(AI_CALL_FAILED, f"connect_error:{type(exc).__name__}") from None

    if response.status_code == 429:
        # 교육 환경의 호출 제한. 사용자에게는 502 와 같지만 로그에서는 구분한다 (02-architecture 6절)
        raise AIError(AI_CALL_FAILED, "rate_limited")
    if response.status_code != 200:
        raise AIError(AI_CALL_FAILED, f"http_{response.status_code}")

    # 응답 형식: {"choices": [{"message": {"content": "..."}}]} — 형식이 다르거나 내용이 비면 실패로 본다
    try:
        answer = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise AIError(AI_CALL_FAILED, "invalid_response") from None
    if not isinstance(answer, str) or not answer.strip():
        raise AIError(AI_CALL_FAILED, "empty_response")
    return answer.strip()
