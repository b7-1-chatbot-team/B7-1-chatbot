from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutil import utcnow
from app.database import Base


class RefreshToken(Base):
    """refresh token 은 원문이 아닌 SHA-256 해시만 저장한다 (04-database)."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 토큰 소유자. 한 사용자가 여러 기기에서 로그인하면 행이 여러 개 생긴다 (기기별 로그아웃)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # 토큰 원문의 SHA-256 해시. DB 가 유출돼도 해시로는 재발급 요청을 할 수 없다
    token_hash: Mapped[str] = mapped_column(Text, unique=True, index=True)
    # 만료 시각 = 발급 + REFRESH_TOKEN_EXPIRE_DAYS. 스케줄러가 이 컬럼만 보고 만료 행을 지운다
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)  # 발급 시각
