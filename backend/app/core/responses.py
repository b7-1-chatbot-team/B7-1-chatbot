"""공통 응답 구성 형식 {code, data} 와 예외 처리
서버가 처리한 응답은 성공·실패 모두 HTTP 200 이고, 결과는 body 의 code 로 판단한다.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")

# 결과 코드별 기본 안내 문구 (별도 메시지를 주지 않으면 이 문구를 사용함)
MESSAGES = {
    400: "잘못된 요청입니다.",
    401: "로그인이 필요합니다.",
    403: "관리자만 접근할 수 있습니다.",
    404: "요청한 정보를 찾을 수 없습니다.",
    405: "허용되지 않은 요청 방식입니다.",
    409: "이미 가입된 이메일입니다.",
    422: "입력값이 올바르지 않습니다.",
    500: "서버 내부 오류가 발생했습니다.",
}


def ok(data: Any = None, code: int = 200) -> JSONResponse:
    """성공 응답. 예) ok({"id": 1}, code=201) → HTTP 200 + {"code": 201, "data": {"id": 1}}

    data 를 생략하면 빈 객체 {} 를 넣는다 (로그아웃처럼 돌려줄 데이터가 없는 경우).
    """
    return JSONResponse(status_code=200, content={"code": code, "data": data if data is not None else {}})


def fail(code: int, message: str | None = None) -> JSONResponse:
    """실패 응답. 예) fail(409) → HTTP 200 + {"code": 409, "data": {"message": "이미 가입된 이메일입니다."}}

    message 를 주지 않으면 MESSAGES 의 기본 문구, 목록에 없는 code 면 500 문구를 쓴다.
    """
    return JSONResponse(
        status_code=200,
        content={"code": code, "data": {"message": message or MESSAGES.get(code, MESSAGES[500])}},
    )


class AppError(Exception):
    """라우터·서비스에서 raise 하면 {code, data:{message}} 로 변환된다.

    사용 예) raise AppError(409)                       → 기본 문구
            raise AppError(504, "현재 응답이 지연되고 있어요.") → 직접 지정한 문구
    """

    def __init__(self, code: int, message: str | None = None):
        super().__init__(message)
        self.code = code
        self.message = message or MESSAGES.get(code, MESSAGES[500])


def _validation_message(exc: RequestValidationError) -> str:
    """입력 검증 실패(422) 시 사용자에게 보여줄 문구를 고른다."""
    # 스키마 validator 가 ValueError("한국어 안내") 로 올린 메시지를 우선 사용한다.
    for err in exc.errors():
        if err.get("type") == "value_error":
            msg = str(err.get("msg", ""))
            # Pydantic 이 앞에 붙이는 "Value error, " 접두어를 떼고 한국어 문구만 남긴다
            return msg.removeprefix("Value error, ") or MESSAGES[422]
    # 필드 누락·타입 오류 등 직접 만든 문구가 없는 경우 → 영어 기술 메시지 대신 기본 문구
    return MESSAGES[422]


def register_exception_handlers(app: FastAPI) -> None:
    """FastAPI 기본 오류 형식({"detail": ...})을 우리 봉투 형식으로 바꾸는 핸들러 4종을 등록한다."""

    # ① 우리 코드에서 raise AppError(...) 한 경우
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return fail(exc.code, exc.message)

    # ② 요청 body·쿼리 파라미터가 스키마 검증을 통과하지 못한 경우 → 422
    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        return fail(422, _validation_message(exc))

    # ③ 없는 경로(404)·허용되지 않은 메서드(405) 등 프레임워크가 내는 HTTP 오류
    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        # MESSAGES 에 있는 코드는 한국어 기본 문구, 없는 코드는 프레임워크가 준 detail 문자열 사용
        message = exc.detail if isinstance(exc.detail, str) and exc.status_code not in MESSAGES else None
        return fail(exc.status_code, message)

    # ④ 위에서 잡지 못한 모든 예외 → 서버를 멈추지 않고 500 봉투로 응답
    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        # 원인 추적용으로 스택 트레이스를 서버 로그에 남긴다 (응답에는 내부 정보를 노출하지 않음)
        logger.exception("unhandled_error path=%s", request.url.path)
        return fail(500)
