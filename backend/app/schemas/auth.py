"""인증 요청 스키마. 검증 실패 메시지는 한국어 ValueError 로 올려 code:422 data.message 로 전달된다."""

from pydantic import BaseModel, field_validator
from pydantic.networks import validate_email

# 계정 규칙 (03-api). 서비스·관리자 시드에서도 같은 값을 쓰도록 상수로 둔다
PASSWORD_MIN_LENGTH = 8  # NIST SP 800-63B 권고 최소 길이 (12-decisions)
NICKNAME_MAX_LENGTH = 20


def _check_email(value: str) -> str:
    """이메일 형식을 검사하고 소문자로 정규화한다. 가입·로그인 스키마가 함께 사용한다.

    - pydantic 의 EmailStr 을 쓰면 영어 오류 문구가 나가므로, 같은 검증 함수를 직접 호출해 한국어 문구로 바꾼다
    - 소문자 정규화: User@Example.com 과 user@example.com 을 같은 계정으로 취급 (대소문자만 다른 중복 가입 방지)
    """
    try:
        _, email = validate_email(value.strip())
    except Exception:
        # from None: 내부 예외 체인을 숨기고 한국어 메시지만 전달 → responses.py 가 data.message 로 내보냄
        raise ValueError("올바른 이메일 형식이 아닙니다.") from None
    return email.lower()


class SignupRequest(BaseModel):
    """POST /api/auth/signup 요청 body. 필드 누락·타입 오류·아래 검증 실패는 모두 code:422."""

    email: str
    password: str
    nickname: str

    # @field_validator: 해당 필드 값이 들어올 때 자동 실행. 반환값이 최종 필드 값이 된다
    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        return _check_email(v)

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"비밀번호는 {PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.")
        return v

    @field_validator("nickname")
    @classmethod
    def nickname_length(cls, v: str) -> str:
        v = v.strip()  # 앞뒤 공백 제거 후 길이 검사 → 공백만 입력한 닉네임은 0자로 거부
        if not 1 <= len(v) <= NICKNAME_MAX_LENGTH:
            raise ValueError(f"닉네임은 1~{NICKNAME_MAX_LENGTH}자로 입력해 주세요.")
        return v


class LoginRequest(BaseModel):
    """POST /api/auth/login 요청 body. 비밀번호 길이는 검사하지 않는다 (틀리면 401 로 처리)."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        return _check_email(v)

    @field_validator("password")
    @classmethod
    def password_required(cls, v: str) -> str:
        if not v:
            raise ValueError("비밀번호를 입력해 주세요.")
        return v


class RefreshTokenRequest(BaseModel):
    """재발급·로그아웃 공용. refresh token 은 쿠키가 아닌 body 로 받는다."""

    refresh_token: str

    @field_validator("refresh_token")
    @classmethod
    def token_required(cls, v: str) -> str:
        if not v.strip():  # 빈 문자열·공백만 보낸 경우 DB 조회 없이 422
            raise ValueError("refresh_token 이 필요합니다.")
        return v.strip()
