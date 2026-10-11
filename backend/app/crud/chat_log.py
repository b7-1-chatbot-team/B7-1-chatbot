from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ChatLog, User


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


# ---------- 관리자 조회 (03-api 4-1 · 4-3 · 4-4) ----------
def stats(db: Session) -> dict:
    """요약 통계 — 대화 수(전체·성공·실패), 실패 종류별 건수, 성공 기록의 평균 응답시간.

    평균은 성공 기록이 없으면 None 으로 둔다 (0 으로 바꾸면 '0ms, 아주 빠름'으로 읽힘).
    """
    by_status = dict(db.execute(select(ChatLog.status, func.count()).group_by(ChatLog.status)).all())
    by_error = dict(
        db.execute(
            select(ChatLog.error_code, func.count()).where(ChatLog.status == "error").group_by(ChatLog.error_code)
        ).all()
    )
    avg = db.scalar(select(func.avg(ChatLog.latency_ms)).where(ChatLog.status == "success"))
    success, failed = by_status.get("success", 0), by_status.get("error", 0)
    return {
        "chats": {"total": success + failed, "success": success, "failed": failed},
        # 화면이 두 항목을 항상 그리므로 0 건이어도 키를 둔다
        "failures": {"AI_TIMEOUT": by_error.get("AI_TIMEOUT", 0), "AI_CALL_FAILED": by_error.get("AI_CALL_FAILED", 0)},
        "avg_latency_ms": round(avg) if avg is not None else None,
    }


def count_for_user(db: Session, user_id: int) -> int:
    """관리자 사용자별 대화 total — 성공·실패 전체."""
    return db.scalar(select(func.count()).select_from(ChatLog).where(ChatLog.user_id == user_id)) or 0


def list_for_user(db: Session, user_id: int, limit: int, offset: int) -> list[ChatLog]:
    """관리자 사용자별 대화 items — 성공·실패 모두 최신순."""
    return list(
        db.scalars(
            select(ChatLog).where(ChatLog.user_id == user_id).order_by(ChatLog.id.desc()).limit(limit).offset(offset)
        ).all()
    )


def count_failures(db: Session) -> int:
    """관리자 AI 실패 기록 total."""
    return db.scalar(select(func.count()).select_from(ChatLog).where(ChatLog.status == "error")) or 0


def list_failures(db: Session, limit: int, offset: int) -> list[tuple[ChatLog, str]]:
    """관리자 AI 실패 기록 items — (실패 기록, 사용자 이메일) 최신순. 이메일을 함께 보여주려고 users 를 join."""
    rows = db.execute(
        select(ChatLog, User.email)
        .join(User, User.id == ChatLog.user_id)
        .where(ChatLog.status == "error")
        .order_by(ChatLog.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return [tuple(row) for row in rows]
