"""SQLAlchemy 엔진·세션·Base 와 get_db 의존성."""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """모든 모델(User, ChatLog …)이 상속하는 부모 클래스. Base.metadata 에 테이블 정의가 모인다."""

    pass


def _ensure_sqlite_dir(url: str) -> None:
    """sqlite 파일 경로의 상위 폴더(./data, Railway /data)가 없으면 만든다."""
    parsed = make_url(url)  # 문자열 URL 을 드라이버·DB 경로 등으로 분해
    # 파일 DB 일 때만 폴더를 만든다 (메모리 DB ':memory:' 는 파일이 없으므로 제외)
    if parsed.get_backend_name() == "sqlite" and parsed.database not in (None, "", ":memory:"):
        Path(parsed.database).parent.mkdir(parents=True, exist_ok=True)  # 이미 있으면 그냥 넘어감


def build_engine(url: str):
    """DB URL 로 SQLAlchemy 엔진(연결 관리자)을 만든다. SQLite 일 때만 필요한 설정을 추가한다."""
    connect_args = {}
    if url.startswith("sqlite"):
        _ensure_sqlite_dir(url)
        # FastAPI 는 요청을 여러 스레드에서 처리하므로 같은 연결 공유를 허용
        connect_args["check_same_thread"] = False
    eng = create_engine(url, connect_args=connect_args)

    if url.startswith("sqlite"):
        # SQLite 는 FK 제약이 기본 비활성 → 연결마다 활성화 (04-database)
        # 새 DB 연결이 만들어질 때마다 아래 함수가 자동 실행된다
        @event.listens_for(eng, "connect")
        def _fk_on(dbapi_conn, _):
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()

    return eng


# 앱 전체에서 공유하는 엔진 1개 (import 시점에 DATABASE_URL 로 생성)
engine = build_engine(settings.database_url)

# 세션(=DB 작업 단위)을 찍어내는 공장
# - autoflush=False: 조회할 때마다 변경사항을 자동으로 DB 에 보내지 않음 (commit·flush 시점을 코드에서 명확히)
# - expire_on_commit=False: commit 후에도 객체 속성을 다시 조회하지 않고 바로 읽을 수 있게 함 (응답 만들 때 편의)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """요청마다 세션을 하나 열어 라우터에 넘기고, 응답이 끝나면 반드시 닫는다.

    사용 예) def signup(body: SignupRequest, db: Session = Depends(get_db)): ...
    """
    db = SessionLocal()
    try:
        yield db  # 라우터 함수가 실행되는 동안 이 세션을 사용
    finally:
        db.close()  # 오류가 나도 연결을 풀에 돌려준다
