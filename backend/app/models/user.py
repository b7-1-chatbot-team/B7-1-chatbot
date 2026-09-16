from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timeutil import utcnow
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(Text)
    nickname: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(
        Text, CheckConstraint("role IN ('user', 'admin')"), server_default=text("'user'"), default="user"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
