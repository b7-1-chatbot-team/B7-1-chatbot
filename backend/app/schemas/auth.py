"""인증 요청 스키마. 검증 실패 메시지는 한국어 ValueError 로 올려 code:422 data.message 로 전달된다."""

from pydantic import BaseModel, field_validator
from pydantic.networks import validate_email

PASSWORD_MIN_LENGTH = 8
NICKNAME_MAX_LENGTH = 20


def _check_email(value: str) -> str:
    try:
        _, email = validate_email(value.strip())
    except Exception:
        raise ValueError("올바른 이메일 형식이 아닙니다.") from None
    return email.lower()


class SignupRequest(BaseModel):
    email: str
    password: str
    nickname: str

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
        v = v.strip()
        if not 1 <= len(v) <= NICKNAME_MAX_LENGTH:
            raise ValueError(f"닉네임은 1~{NICKNAME_MAX_LENGTH}자로 입력해 주세요.")
        return v


class LoginRequest(BaseModel):
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
        if not v.strip():
            raise ValueError("refresh_token 이 필요합니다.")
        return v.strip()
