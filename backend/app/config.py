"""환경변수 설정.

backend/.env (또는 Railway Variables) 에서 값을 읽는다.
비밀값(COPA_API_KEY, JWT_SECRET_KEY, ADMIN_PASSWORD)은 코드에 기본값을 두지 않는다.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # AI
    copa_api_key: str = ""
    ai_timeout_seconds: int = Field(default=30, gt=0)
    ai_context_turns: int = Field(default=5, ge=0)
    max_message_length: int = Field(default=1000, gt=0)

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = Field(default=15, gt=0)
    refresh_token_expire_days: int = Field(default=1, gt=0)

    # DB
    database_url: str = "sqlite:///./data/app.db"

    # CORS — 쉼표 구분 문자열
    cors_origins: str = ""

    # 관리자 시드
    admin_email: str = ""
    admin_password: str = ""
    admin_nickname: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
