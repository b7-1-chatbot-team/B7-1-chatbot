"""요청 본문 크기 상한 (13-security-review S04).

수 MB 짜리 JSON 을 보내면 서버가 끝까지 읽어 메모리에 올린 뒤에야 검증(질문 1000자 등)을 한다.
본문을 읽는 순간 크기를 확인해, 상한을 넘으면 더 읽지 않고 413 으로 끝낸다.

- Content-Length 가 상한보다 크면 본문을 한 바이트도 읽지 않고 거절한다.
- Content-Length 없이 나눠 보내는 요청(chunked)은 읽은 양을 세다가 상한을 넘는 순간 거절한다.
거절은 HTTPException(413) 으로 던져 앱의 예외 핸들러가 공통 봉투({code: 413, ...})로 바꾸게 한다
→ 다른 오류와 같은 형식이고, CORS 헤더도 그대로 붙는다.
"""

from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = dict(scope["headers"]).get(b"content-length", b"")
        if declared.isdigit() and int(declared) > self.max_bytes:

            async def reject() -> Message:
                raise HTTPException(status_code=413)

            await self.app(scope, reject, send)
            return

        received = 0

        async def limited() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(status_code=413)
            return message

        await self.app(scope, limited, send)
