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

    # ---------- 로그 ----------
    # 이벤트 로그 파일 경로 (backend/ 기준 상대경로). 비우면 콘솔에만 남긴다. 테스트는 임시 폴더로 바꾼다
    log_file: str = "logs/app.log"

    # ---------- CORS ----------
    # 허용할 프론트 Origin 을 쉼표로 구분한 문자열. 예) http://localhost:<숫자>,https://<프론트>.up.railway.app
    cors_origins: str = ""

    # ---------- 관리자 시드 (서버 시작 시 관리자 계정 생성·승격에 사용) ----------
    admin_email: str = ""
    admin_password: str = ""  # 비밀값 — 기본값 없음
    admin_nickname: str = ""

    # API 문서 화면(/docs · /redoc · /openapi.json)을 켤지. 기본은 꺼짐 — 운영에 전체 API 목록이 공개되지 않게 (S03).
    # 로컬 개발에서 Swagger 로 확인할 때만 backend/.env 에 ENABLE_DOCS=true
    enable_docs: bool = False

    # ---------- 요청 횟수 제한 (13-security-review S01·S02·S09) ----------
    chat_rate_limit_per_minute: int = Field(default=10, gt=0)  # 사용자별 챗 요청, 1분에 이 횟수까지
    login_fail_limit_per_email: int = Field(default=5, gt=0)  # 로그인 실패, 이메일별 10분에 이 횟수까지
    # IP 별은 더 넉넉하게 — 교육장·회사처럼 여러 사람이 같은 공인 IP 를 쓰면 실패가 합쳐서 세어진다
    login_fail_limit_per_ip: int = Field(default=20, gt=0)  # 로그인 실패, IP 별 10분에 이 횟수까지
    signup_rate_limit: int = Field(default=20, gt=0)  # 가입 요청, IP 별 10분에 이 횟수까지
    # 프록시(Railway) 뒤에서만 true — X-Forwarded-For 로 실제 사용자 IP 를 읽는다 (core/rate_limit.client_ip)
    trust_forwarded_for: bool = False

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
