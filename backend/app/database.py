"""SQLAlchemy 엔진·세션·Base 와 get_db 의존성."""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _ensure_sqlite_dir(url: str) -> None:
    """sqlite 파일 경로의 상위 폴더(./data, Railway /data)가 없으면 만든다."""
    parsed = make_url(url)
    if parsed.get_backend_name() == "sqlite" and parsed.database not in (None, "", ":memory:"):
        Path(parsed.database).parent.mkdir(parents=True, exist_ok=True)


def build_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        _ensure_sqlite_dir(url)
        # FastAPI 는 요청을 여러 스레드에서 처리하므로 같은 연결 공유를 허용
        connect_args["check_same_thread"] = False
    eng = create_engine(url, connect_args=connect_args)

    if url.startswith("sqlite"):
        # SQLite 는 FK 제약이 기본 비활성 → 연결마다 활성화 (04-database)
        @event.listens_for(eng, "connect")
        def _fk_on(dbapi_conn, _):
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

    return eng


engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
