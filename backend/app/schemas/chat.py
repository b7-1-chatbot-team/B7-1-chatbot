"""챗 요청 스키마. 검증 실패는 code:422 로 응답되고, **AI 를 부르기 전에** 걸러진다 (AI 비용·대기 시간 절약)."""

from pydantic import BaseModel, field_validator

from app.config import settings


class ChatRequest(BaseModel):
    """POST /api/chat 요청 body. 필드 누락·문자열이 아닌 값도 code:422."""

    message: str

    @field_validator("message")
    @classmethod
    def message_length(cls, v: str) -> str:
        # 앞뒤 공백을 지운 뒤 길이를 잰다 → 공백·줄바꿈만 보낸 질문은 0자로 거부된다
        v = v.strip()
        # 최대 길이는 MAX_MESSAGE_LENGTH 환경변수(기본 1000)를 따른다 — 프론트의 입력 제한과 같은 값
        if not 1 <= len(v) <= settings.max_message_length:
            raise ValueError(f"질문은 1~{settings.max_message_length}자로 입력해 주세요.")
        return v
