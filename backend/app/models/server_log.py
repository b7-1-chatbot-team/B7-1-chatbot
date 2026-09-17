from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutil import utcnow
from app.database import Base


class ServerLog(Base):
    """요청 흐름 이벤트 로그 (04-database server_logs). 파일/콘솔 로그와 같은 이벤트를 DB 에도 남긴다."""

    __tablename__ = "server_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[str] = mapped_column(Text, index=True)  # 한 요청의 이벤트들을 묶는 ID, 흐름 조회용 인덱스
    level: Mapped[str] = mapped_column(Text)  # INFO / WARN / ERROR
    event: Mapped[str] = mapped_column(Text)  # request_received, ai_call_start, db_save_success 등 (03-api §6)
    # 인증 전 요청이면 NULL. 사용자가 삭제돼도 로그는 남기고 user_id 만 NULL 로 바꾼다(SET NULL)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    detail: Mapped[str | None] = mapped_column(Text)  # key=value 부가 정보. 질문 원문·비밀번호·API 키·토큰 금지
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)  # 기록 시각
