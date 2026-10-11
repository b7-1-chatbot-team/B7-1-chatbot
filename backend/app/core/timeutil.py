"""시각 처리 규칙.

DB 에는 timezone 정보 없는 UTC 로 저장하고, API 응답은 한국 시간(+09:00) ISO 8601 문자열로 내보낸다.
"""

from datetime import datetime, timedelta, timezone

# 한국 표준시(UTC+9). zoneinfo 는 서버에 tzdata 가 없으면 실패할 수 있어 고정 오프셋으로 둔다 (한국은 서머타임 없음)
KST = timezone(timedelta(hours=9))


def utcnow() -> datetime:
    """현재 UTC 시각을 timezone 정보 없이(naive) 반환한다.

    SQLite DATETIME 은 timezone 을 저장하지 않으므로, 저장·비교를 모두 naive UTC 로 통일한다.
    (datetime.utcnow() 는 Python 3.12 부터 deprecated 라 now(timezone.utc) 를 쓴다)
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_kst_iso(value: datetime | None) -> str | None:
    """DB 에서 읽은 UTC 시각을 응답용 한국 시간 문자열로 바꾼다.

    예) datetime(2026, 9, 14, 1, 0) → "2026-09-14T10:00:00+09:00"
    """
    if value is None:
        return None
    if value.tzinfo is None:  # DB 값은 naive → UTC 라고 명시한 뒤 변환
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(KST).isoformat(timespec="seconds")
