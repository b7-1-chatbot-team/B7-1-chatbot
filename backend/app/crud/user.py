from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get(db: Session, user_id: int) -> User | None:
    """PK 로 사용자 1명 조회. 없으면 None (토큰의 sub → 사용자)."""
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    """이메일로 사용자 조회. 로그인·가입 중복 검사·관리자 시드에서 사용."""
    return db.scalar(select(User).where(User.email == email))


def create(
    db: Session, email: str, hashed_password: str, nickname: str, role: str = "user", commit: bool = True
) -> User:
    """사용자 생성. 비밀번호는 호출하는 쪽에서 해시한 값을 넘긴다 (CRUD 는 평문을 다루지 않음)."""
    user = User(email=email, hashed_password=hashed_password, nickname=nickname, role=role)
    db.add(user)
    if commit:
        db.commit()
        db.refresh(user)  # DB 가 채운 id·created_at 을 객체에 반영
    else:
        db.flush()  # commit 없이 INSERT 만 보내 id 를 받아 둔다 (호출한 쪽이 나중에 commit)
    return user
