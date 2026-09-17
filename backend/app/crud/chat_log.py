from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ChatLog


def create(
    db: Session,
    user_id: int,
    question: str,
    answer: str | None,
    status: str,
    request_id: str,
    error_code: str | None = None,
    latency_ms: int | None = None,
    commit: bool = True,
) -> ChatLog:
    """대화 저장. AI 실패도 status='error' + error_code 로 저장한다."""
    log = ChatLog(
        user_id=user_id,
        question=question,
        answer=answer,
        status=status,
        error_code=error_code,
        latency_ms=latency_ms,
        request_id=request_id,
    )
    db.add(log)
    if commit:
        db.commit()
        db.refresh(log)  # DB 가 채운 id(chat_id)·created_at 반영
    else:
        db.flush()
    return log


def recent_success_for_context(db: Session, user_id: int, n: int) -> list[ChatLog]:
    """컨텍스트용 최근 성공 Q/A n개를 **오래된 순**으로 반환한다."""
    if n <= 0:  # AI_CONTEXT_TURNS=0 이면 컨텍스트 없이 질문만 보낸다
        return []
    # 최신 n개를 id 역순으로 가져온 뒤, 프롬프트에는 오래된 대화부터 넣어야 하므로 뒤집는다
    rows = db.scalars(
        select(ChatLog)
        .where(ChatLog.user_id == user_id, ChatLog.status == "success")
        .order_by(ChatLog.id.desc())
        .limit(n)
    ).all()
    return list(reversed(rows))


def count_success_for_user(db: Session, user_id: int) -> int:
    """내 로그 total — 해당 사용자의 성공 기록 수."""
    return db.scalar(
        select(func.count()).select_from(ChatLog).where(ChatLog.user_id == user_id, ChatLog.status == "success")
    ) or 0


def list_success_for_user(db: Session, user_id: int, limit: int, offset: int) -> list[ChatLog]:
    """내 로그 items — 해당 사용자의 성공 기록을 최신순으로 limit 개, offset 부터.

    user_id 는 반드시 토큰의 사용자 id 를 넘긴다 (다른 사용자 기록 조회 방지).
    """
    return list(
        db.scalars(
            select(ChatLog)
            .where(ChatLog.user_id == user_id, ChatLog.status == "success")
            .order_by(ChatLog.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
