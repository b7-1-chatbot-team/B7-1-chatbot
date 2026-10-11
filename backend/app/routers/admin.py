"""관리자 API — /api/admin/* (03-api 4절). 조회 전용이며 모든 경로가 require_admin 을 거친다.

- 401: 토큰 없음·만료 / 403: 일반 사용자 (+ admin_forbidden 감사 로그)
- 응답에는 hashed_password·토큰·API 키를 넣지 않는다 (필요한 필드만 골라 dict 로 만든다)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud
from app.core.dependencies import require_admin
from app.core.responses import AppError, ok
from app.core.timeutil import to_kst_iso
from app.database import get_db

# dependencies=[...]: 이 라우터의 모든 경로에 관리자 확인과 감사 로그를 한 번에 적용한다 (경로마다 빠뜨릴 위험 제거)
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

# 목록 한 번에 최대 개수 (03-api 4-0) — 내 대화 로그 API 와 같은 기준
MAX_LIMIT = 100


def _page(limit: int = Query(20, ge=1), offset: int = Query(0, ge=0)) -> tuple[int, int]:
    """목록 공통 쿼리 ?limit=&offset=. 100 초과 요청은 오류 대신 100 으로 제한한다."""
    return min(limit, MAX_LIMIT), offset


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    """요약 통계 — 사용자 수, 대화 수(전체·성공·실패), 실패 종류별 건수, 성공 평균 응답시간."""
    return ok({"users": crud.user.count(db), **crud.chat_log.stats(db)})


@router.get("/users")
def users(q: str | None = None, page: tuple[int, int] = Depends(_page), db: Session = Depends(get_db)):
    """사용자 목록 · 이메일 부분 검색(?q=). 최근 활동 순."""
    limit, offset = page
    rows = crud.user.list_with_stats(db, q, limit=limit, offset=offset)
    return ok(
        {
            "total": crud.user.count(db, q),
            "items": [
                {
                    "id": user.id,
                    "email": user.email,
                    "nickname": user.nickname,
                    "role": user.role,
                    "created_at": to_kst_iso(user.created_at),
                    "chat_count": chat_count,
                    "last_chat_at": to_kst_iso(last_chat_at),
                }
                for user, chat_count, last_chat_at in rows
            ],
        }
    )


@router.get("/users/{user_id}/chats")
def user_chats(user_id: int, page: tuple[int, int] = Depends(_page), db: Session = Depends(get_db)):
    """사용자별 대화 기록 — 성공·실패 모두 최신순. 없는 사용자는 404."""
    user = crud.user.get(db, user_id)
    if user is None:
        raise AppError(404, "사용자를 찾을 수 없습니다.")
    limit, offset = page
    return ok(
        {
            "user": {"id": user.id, "email": user.email, "nickname": user.nickname},
            "total": crud.chat_log.count_for_user(db, user.id),
            "items": [
                {
                    "chat_id": c.id,
                    "question": c.question,
                    "answer": c.answer,
                    "status": c.status,
                    "error_code": c.error_code,
                    "latency_ms": c.latency_ms,
                    "request_id": c.request_id,
                    "created_at": to_kst_iso(c.created_at),
                }
                for c in crud.chat_log.list_for_user(db, user.id, limit=limit, offset=offset)
            ],
        }
    )


@router.get("/failures")
def failures(page: tuple[int, int] = Depends(_page), db: Session = Depends(get_db)):
    """AI 실패 기록 — status=error 만 최신순. request_id 로 요청 흐름을 이어 볼 수 있다."""
    limit, offset = page
    return ok(
        {
            "total": crud.chat_log.count_failures(db),
            "items": [
                {
                    "chat_id": c.id,
                    "user_id": c.user_id,
                    "email": email,
                    "question": c.question,
                    "error_code": c.error_code,
                    "latency_ms": c.latency_ms,
                    "request_id": c.request_id,
                    "created_at": to_kst_iso(c.created_at),
                }
                for c, email in crud.chat_log.list_failures(db, limit=limit, offset=offset)
            ],
        }
    )


@router.get("/requests/{request_id}/logs")
def request_logs(request_id: str, db: Session = Depends(get_db)):
    """요청 흐름 — 한 request_id 의 server_logs 이벤트를 시간순으로. 기록이 없으면 404."""
    rows = crud.server_log.list_by_request(db, request_id)
    if not rows:
        raise AppError(404, "해당 요청의 로그가 없습니다.")
    return ok(
        {
            "request_id": request_id,
            "items": [
                {
                    "event": r.event,
                    "level": r.level,
                    "user_id": r.user_id,
                    "detail": r.detail or "",  # 프론트 타입이 문자열이라 없으면 빈 문자열
                    "created_at": to_kst_iso(r.created_at),
                }
                for r in rows
            ],
        }
    )
