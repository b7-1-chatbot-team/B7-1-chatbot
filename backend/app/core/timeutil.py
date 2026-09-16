"""시각 처리 규칙.

DB 에는 timezone 정보 없는 UTC 로 저장하고, API 응답은 한국 시간(+09:00) ISO 8601 문자열로 내보낸다.
"""

from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_kst_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(KST).isoformat(timespec="seconds")
