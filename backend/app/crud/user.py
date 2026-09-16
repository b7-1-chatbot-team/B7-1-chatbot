from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def create(
    db: Session, email: str, hashed_password: str, nickname: str, role: str = "user", commit: bool = True
) -> User:
    user = User(email=email, hashed_password=hashed_password, nickname=nickname, role=role)
    db.add(user)
    if commit:
        db.commit()
        db.refresh(user)
    else:
        db.flush()
    return user
