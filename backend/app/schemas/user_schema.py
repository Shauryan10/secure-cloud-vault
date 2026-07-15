import re
from pydantic import BaseModel, EmailStr, field_validator


# ── helpers ──────────────────────────────────────────────────────────────────

PASSWORD_RULES = (
    "Password must be at least 8 characters and include "
    "an uppercase letter, a lowercase letter, and a special character "
    "(e.g. @, #, $, !, %, &)."
)

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError(PASSWORD_RULES)
    if not re.search(r"[A-Z]", v):
        raise ValueError(PASSWORD_RULES)
    if not re.search(r"[a-z]", v):
        raise ValueError(PASSWORD_RULES)
    if not re.search(r"[^A-Za-z0-9]", v):
        raise ValueError(PASSWORD_RULES)
    return v


# ── schemas ───────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return validate_password_strength(v)


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SendLoginOtpRequest(BaseModel):
    email: EmailStr


class VerifyLoginOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return validate_password_strength(v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
