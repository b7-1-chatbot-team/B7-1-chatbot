from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutil import utcnow
from app.database import Base


class User(Base):
    """사용자 계정 (04-database users)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # JWT payload 의 sub 에 담기는 값
    # 로그인 ID. unique+index → UNIQUE INDEX ix_users_email (중복 가입 방지 + 로그인 조회 속도)
    email: Mapped[str] = mapped_column(Text, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(Text)  # bcrypt 해시 ($2b$..., 60자). 평문 저장 금지
    nickname: Mapped[str] = mapped_column(Text)  # 화면 표시용 이름. 중복 허용이라 UNIQUE 없음
    # 권한. DB 가 'user'/'admin' 외 값을 거부(CHECK)하고, 값을 안 주면 'user'
    # server_default: DB 레벨 기본값(DDL 에 DEFAULT 'user') / default: 파이썬에서 객체를 만들 때 기본값
    role: Mapped[str] = mapped_column(
        Text, CheckConstraint("role IN ('user', 'admin')"), server_default=text("'user'"), default="user"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)  # 가입 시각 (naive UTC)
