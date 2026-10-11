"""요청 횟수 제한 (13-security-review S01·S02·S09).

정해진 시간(window) 안에 같은 키(사용자 id·이메일·IP)로 들어온 횟수를 메모리에서 센다.
최근 window 초 안의 시각만 남겨 세는 방식(슬라이딩 윈도우)이라, 분이 바뀌는 순간 몰아서 보내는 우회가 안 된다.

메모리에 두는 이유: 서버가 하나(Railway 1개 인스턴스)라 Redis 같은 외부 저장소 없이 충분하다.
대가: 재배포·재시작하면 횟수가 초기화된다. 서버를 여러 개로 늘리면 저장소를 Redis 등으로 옮겨야 한다.
"""

import threading
import time
from collections import deque

from fastapi import Request

from app.config import settings

_MAX_KEYS = 10_000  # 키가 이만큼 쌓이면 지난 기록을 한 번에 정리한다 (이메일을 바꿔 가며 보내 메모리를 채우는 것 방지)


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        # 로그인·가입은 동기 함수라 여러 스레드에서 동시에 불린다 → 세는 동안 잠근다
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float] | None:
        """key 의 window 안 기록만 남기고 돌려준다. 남은 게 없으면 키를 지운다. (잠근 상태에서 호출)"""
        hits = self._hits.get(key)
        if hits is None:
            return None
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if not hits:
            del self._hits[key]
            return None
        return hits

    def is_limited(self, key: str) -> bool:
        """이미 limit 번 기록돼 있으면 True. 기록은 늘리지 않는다."""
        with self._lock:
            hits = self._recent(key, time.monotonic())
            return hits is not None and len(hits) >= self.limit

    def hit(self, key: str) -> None:
        """기록 1건 추가."""
        now = time.monotonic()
        with self._lock:
            hits = self._recent(key, now)
            if hits is None:
                hits = self._hits[key] = deque()
            hits.append(now)
            if len(self._hits) > _MAX_KEYS:
                for old_key in list(self._hits):
                    self._recent(old_key, now)

    def try_acquire(self, key: str) -> bool:
        """제한 안이면 기록하고 True, 넘었으면 기록하지 않고 False. 확인과 기록을 한 번에 해 동시 요청에도 정확하다."""
        now = time.monotonic()
        with self._lock:
            hits = self._recent(key, now)
            if hits is not None and len(hits) >= self.limit:
                return False
            if hits is None:
                hits = self._hits[key] = deque()
            hits.append(now)
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


# S01: 사용자별 챗 요청 — 1분에 CHAT_RATE_LIMIT_PER_MINUTE 회
chat_limiter = RateLimiter(settings.chat_rate_limit_per_minute, 60)
# S02: 로그인 실패 — 10분 기준. 이메일별(한 계정 집중 공격)과 IP 별(여러 계정 돌아가며 공격)을 따로 센다
login_fail_by_email = RateLimiter(settings.login_fail_limit_per_email, 600)
login_fail_by_ip = RateLimiter(settings.login_fail_limit_per_ip, 600)
# S09: 가입 요청 — IP 별 10분에 SIGNUP_RATE_LIMIT 회 (가입 여부 대량 확인·계정 대량 생성 방지)
signup_limiter = RateLimiter(settings.signup_rate_limit, 600)

ALL_LIMITERS = (chat_limiter, login_fail_by_email, login_fail_by_ip, signup_limiter)


def client_ip(request: Request) -> str:
    """요청을 보낸 사용자의 IP.

    Railway 처럼 프록시 뒤에서는 request.client.host 가 프록시 주소라 모든 사용자가 같은 IP 로 보인다.
    TRUST_FORWARDED_FOR=true 면 X-Forwarded-For 의 **마지막** 값을 쓴다. Railway 엣지 프록시는 실제 접속 IP 를
    이 헤더 끝에 덧붙이고, 앞쪽 값은 사용자가 마음대로 넣을 수 있기 때문이다.
    (uvicorn --forwarded-allow-ips="*" 는 맨 앞 값을 쓰므로, 헤더를 바꿔 보내면 IP 제한을 피할 수 있다 → 쓰지 않는다)
    프록시 없이 직접 받는 환경(로컬)에서는 이 헤더를 사용자가 꾸밀 수 있으므로 false 로 둔다.
    """
    if settings.trust_forwarded_for:
        forwarded = request.headers.get("x-forwarded-for", "")
        last = forwarded.split(",")[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"
