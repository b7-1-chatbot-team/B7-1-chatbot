"""환경변수 설정.

backend/.env (또는 Railway Variables) 에서 값을 읽는다.
비밀값(COPA_API_KEY, JWT_SECRET_KEY, ADMIN_PASSWORD)은 코드에 기본값을 두지 않는다.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """환경변수 이름(대문자)과 속성 이름(소문자)이 자동으로 매칭된다. 예) JWT_SECRET_KEY → jwt_secret_key"""

    # env_file: backend/ 에서 실행할 때 .env 를 읽는다. 같은 키가 OS 환경변수에도 있으면 OS 환경변수가 우선한다.
    # extra="ignore": .env 에 여기 정의되지 않은 키가 있어도 오류 없이 무시한다.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---------- AI (챗 트랙에서 사용) ----------
    copa_api_key: str = ""  # Codyssey AI API 키 — 서버에서만 사용, 기본값 없음
    ai_timeout_seconds: int = Field(default=30, gt=0)  # AI 호출 전체 대기 상한(초), 0 이하 금지
    ai_context_turns: int = Field(default=5, ge=0)  # 프롬프트에 붙일 최근 성공 Q/A 개수
    max_message_length: int = Field(default=1000, gt=0)  # 질문 최대 글자 수

    # ---------- JWT ----------
    jwt_secret_key: str = ""  # 토큰 서명 키 — 기본값 없음, 반드시 .env 로 주입
    jwt_algorithm: str = "HS256"  # 서명 알고리즘. 디코드할 때도 이 값 하나로 고정한다
    jwt_expire_minutes: int = Field(default=15, gt=0)  # access token 수명(분)
    refresh_token_expire_days: int = Field(default=1, gt=0)  # refresh token 수명(일)

    # ---------- DB ----------
    # 로컬: backend/data/app.db (슬래시 3개 = 상대경로) / Railway: sqlite:////data/app.db (슬래시 4개 = 절대경로)
    database_url: str = "sqlite:///./data/app.db"

    # ---------- CORS ----------
    # 허용할 프론트 Origin 을 쉼표로 구분한 문자열. 예) http://localhost:<숫자>,https://<프론트>.up.railway.app
    cors_origins: str = ""

    # ---------- 관리자 시드 (서버 시작 시 관리자 계정 생성·승격에 사용) ----------
    admin_email: str = ""
    admin_password: str = ""  # 비밀값 — 기본값 없음
    admin_nickname: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS_ORIGINS 문자열을 리스트로 변환한다.

        - 앞뒤 공백 제거, 빈 항목 제외
        - 끝의 '/' 제거: 브라우저가 보내는 Origin 헤더에는 '/' 가 없어서, 붙어 있으면 일치하지 않는다
        """
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Settings 를 한 번만 만들어 재사용한다 (.env 파일을 매번 다시 읽지 않도록 캐시)."""
    return Settings()


# 다른 모듈에서는 `from app.config import settings` 로 가져다 쓴다.
settings = get_settings()
