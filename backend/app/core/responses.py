"""공통 응답 봉투 {code, data} 와 예외 처리 (03-api §0).

서버가 처리한 응답은 성공·실패 모두 HTTP 200 이고, 결과는 body 의 code 로 판단한다.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")

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
    return JSONResponse(status_code=200, content={"code": code, "data": data if data is not None else {}})


def fail(code: int, message: str | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={"code": code, "data": {"message": message or MESSAGES.get(code, MESSAGES[500])}},
    )


class AppError(Exception):
    """라우터·서비스에서 raise 하면 {code, data:{message}} 로 변환된다."""

    def __init__(self, code: int, message: str | None = None):
        super().__init__(message)
        self.code = code
        self.message = message or MESSAGES.get(code, MESSAGES[500])


def _validation_message(exc: RequestValidationError) -> str:
    # 스키마 validator 가 ValueError("한국어 안내") 로 올린 메시지를 우선 사용한다.
    for err in exc.errors():
        if err.get("type") == "value_error":
            msg = str(err.get("msg", ""))
            return msg.removeprefix("Value error, ") or MESSAGES[422]
    return MESSAGES[422]


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return fail(exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        return fail(422, _validation_message(exc))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) and exc.status_code not in MESSAGES else None
        return fail(exc.status_code, message)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception("unhandled_error path=%s", request.url.path)
        return fail(500)
