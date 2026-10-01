"""서버 로그 — 같은 이벤트를 콘솔·파일(logs/app.log)과 server_logs 테이블에 함께 남긴다 (03-api 6절).

- 콘솔: Railway 대시보드의 Logs 화면에서 바로 보인다
- 파일: 로컬에서 `grep <request_id> logs/app.log` 로 한 요청의 흐름을 따라갈 수 있다
- server_logs 테이블: 관리자 화면의 '요청 흐름'이 이 기록을 request_id 로 묶어 보여준다

질문 원문·비밀번호·API 키·토큰은 어떤 경로로도 남기지 않는다. detail 에는 id·숫자·사유 코드만 넣는다.
"""

import logging
from pathlib import Path

from app import crud
from app.config import settings
from app.database import SessionLocal

logger = logging.getLogger("app")

# server_logs.level 에 저장하는 이름 → 파이썬 로그 레벨
_LEVELS = {"INFO": logging.INFO, "WARN": logging.WARNING, "ERROR": logging.ERROR}


def setup_logging() -> None:
    """"app" 로거에 콘솔·파일 출력을 붙인다. 서버 시작 시 한 번 호출 (main.py lifespan)."""
    if logger.handlers:  # 테스트처럼 앱이 여러 번 시작돼도 같은 줄이 중복 출력되지 않게
        return
    formatter = logging.Formatter("%(asctime)s %(levelname)-5s %(message)s", "%Y-%m-%d %H:%M:%S")
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    if settings.log_file:  # LOG_FILE 을 비우면 콘솔에만 남긴다
        path = Path(settings.log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(path, encoding="utf-8"))
    for handler in handlers:
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False  # uvicorn 로거로 한 번 더 넘어가 같은 줄이 두 번 찍히는 것을 막는다


def log_event(request_id: str, event: str, level: str = "INFO", user_id: int | None = None, **detail) -> None:
    """이벤트 1건을 콘솔·파일과 server_logs 에 함께 기록한다.

    예) log_event(rid, "ai_call_failed", "ERROR", user.id, reason="timeout", latency_ms=30000)
        → 콘솔: ERROR ai_call_failed request_id=… user_id=1 reason=timeout latency_ms=30000
        → server_logs: event=ai_call_failed, detail="reason=timeout latency_ms=30000"

    server_logs 는 요청 처리용 세션과 **별도 세션**으로 저장한다. 대화 저장이 실패해 요청 세션이 망가진 경우에도
    db_save_failed 를 남길 수 있게 하기 위해서다. 로그 저장 자체가 실패해도 요청은 계속 진행한다 (로그 때문에 서비스가 멈추면 안 됨).
    """
    detail_text = " ".join(f"{key}={value}" for key, value in detail.items()) or None
    parts = [event, f"request_id={request_id}"]
    if user_id is not None:
        parts.append(f"user_id={user_id}")
    if detail_text:
        parts.append(detail_text)
    logger.log(_LEVELS[level], " ".join(parts))

    try:
        with SessionLocal() as db:
            crud.server_log.create(
                db, request_id=request_id, level=level, event=event, user_id=user_id, detail=detail_text
            )
    except Exception:
        # DB 가 잠기거나 디스크 오류가 나도 콘솔·파일에는 이미 남았으므로 원인만 기록하고 넘어간다
        logger.exception("server_log_save_failed request_id=%s event=%s", request_id, event)
