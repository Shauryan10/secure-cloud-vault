import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user_schema import (
    UserRegister,
    EmailLoginRequest,
    SendLoginOtpRequest,
    VerifyLoginOtpRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token,
    oauth2_scheme,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EXPIRY_MINUTES   = 10
OTP_MAX_ATTEMPTS     = 3
OTP_LOCKOUT_MINUTES  = 15


# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _send_email(to_email: str, subject: str, html_body: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.SMTP_FROM
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
        srv.ehlo()
        srv.starttls()
        srv.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        srv.sendmail(settings.SMTP_FROM, to_email, msg.as_string())


def _otp_email_html(otp: str, purpose: str, expiry_mins: int) -> str:
    return f"""
    <html><body style="font-family:Arial,sans-serif;background:#f5f7f5;padding:30px;">
      <div style="max-width:420px;margin:auto;background:#fff;border:2px solid #a3e635;
                  border-radius:12px;padding:32px;text-align:center;">
        <h2 style="color:#3f6212;margin-bottom:6px;">Secure Vault</h2>
        <p style="color:#666;margin-bottom:24px;">{purpose}</p>
        <div style="background:#a3e635;border-radius:8px;padding:14px 28px;
                    display:inline-block;letter-spacing:10px;font-size:1.8rem;
                    font-weight:700;color:#1a1a1a;">{otp}</div>
        <p style="color:#888;margin-top:20px;font-size:0.9rem;">
          Expires in <strong>{expiry_mins} minutes</strong>.<br>
          Never share this code with anyone.
        </p>
      </div>
    </body></html>
    """


# ── register ──────────────────────────────────────────────────────────────────

@router.post("/register")
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken.")

    db.add(User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    ))
    db.commit()
    return {"message": "Account created successfully. You can now log in."}


# ── step 1: verify email + password ──────────────────────────────────────────

@router.post("/login")
def login(body: EmailLoginRequest, db: Session = Depends(get_db)):
    """
    Validates email + password.
    Returns a short-lived 'pre-auth' flag so the frontend knows
    credentials are correct and can proceed to captcha → OTP.
    Does NOT return the real access token yet.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {"message": "Credentials verified. Proceed to OTP verification."}


# ── step 2: send login OTP ────────────────────────────────────────────────────

@router.post("/send-login-otp")
def send_login_otp(body: SendLoginOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    # Always return same message (prevents user enumeration)
    if not user:
        return {"message": "If that email is registered, an OTP has been sent."}

    # Check lockout
    if user.otp_locked_until and _now() < user.otp_locked_until:
        remaining = int((user.otp_locked_until - _now()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Try again in {remaining} minute(s)."
        )

    otp    = _generate_otp()
    expiry = _now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    user.otp_code        = otp
    user.otp_expiry      = expiry
    user.otp_attempts    = 0
    user.otp_locked_until = None
    db.commit()

    try:
        _send_email(
            user.email,
            "Your Secure Vault Login OTP",
            _otp_email_html(otp, "Use this code to complete your login.", OTP_EXPIRY_MINUTES)
        )
    except Exception as e:
        user.otp_code = None
        user.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=502, detail=f"Failed to send OTP email: {str(e)}")

    return {"message": "If that email is registered, an OTP has been sent."}


# ── step 3: verify login OTP → issue access token ────────────────────────────

@router.post("/verify-login-otp")
def verify_login_otp(body: VerifyLoginOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.otp_code:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    # Lockout check
    if user.otp_locked_until and _now() < user.otp_locked_until:
        remaining = int((user.otp_locked_until - _now()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Account locked. Try again in {remaining} minute(s)."
        )

    # Expiry check
    if _now() > user.otp_expiry:
        user.otp_code    = None
        user.otp_expiry  = None
        user.otp_attempts = 0
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Wrong OTP
    if user.otp_code != body.otp.strip():
        user.otp_attempts += 1

        if user.otp_attempts >= OTP_MAX_ATTEMPTS:
            user.otp_locked_until = _now() + timedelta(minutes=OTP_LOCKOUT_MINUTES)
            user.otp_code         = None
            user.otp_expiry       = None
            user.otp_attempts     = 0
            db.commit()
            raise HTTPException(
                status_code=429,
                detail=f"Too many incorrect attempts. Account locked for {OTP_LOCKOUT_MINUTES} minutes."
            )

        db.commit()
        remaining_attempts = OTP_MAX_ATTEMPTS - user.otp_attempts
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect OTP. {remaining_attempts} attempt(s) remaining."
        )

    # ✅ Correct — issue access token
    user.otp_code         = None
    user.otp_expiry       = None
    user.otp_attempts     = 0
    user.otp_locked_until = None
    db.commit()

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


# ── /me ───────────────────────────────────────────────────────────────────────

@router.get("/me")
def me(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    email = payload.get("sub")
    user  = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id":       user.id,
        "username": user.username,
        "email":    user.email,
        "role":     user.role,
    }


# ── forgot password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user:
        return {"message": "If that email is registered, a reset OTP has been sent."}

    otp    = _generate_otp()
    expiry = _now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    user.reset_otp_code   = otp
    user.reset_otp_expiry = expiry
    db.commit()

    try:
        _send_email(
            user.email,
            "Your Secure Vault Password Reset OTP",
            _otp_email_html(otp, "Use this code to reset your password.", OTP_EXPIRY_MINUTES)
        )
    except Exception as e:
        user.reset_otp_code   = None
        user.reset_otp_expiry = None
        db.commit()
        raise HTTPException(status_code=502, detail=f"Failed to send email: {str(e)}")

    return {"message": "If that email is registered, a reset OTP has been sent."}


# ── reset password ────────────────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.reset_otp_code or not user.reset_otp_expiry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if _now() > user.reset_otp_expiry:
        user.reset_otp_code   = None
        user.reset_otp_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if user.reset_otp_code != body.otp.strip():
        raise HTTPException(status_code=400, detail="Incorrect OTP.")

    user.password_hash    = hash_password(body.new_password)
    user.reset_otp_code   = None
    user.reset_otp_expiry = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}
