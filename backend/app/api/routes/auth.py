import io
import base64
import pyotp
import qrcode

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user_schema import (
    UserRegister,
    EmailLoginRequest,
    VerifyTotpRequest,
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

router = APIRouter(prefix="/auth", tags=["Authentication"])

TOTP_MAX_ATTEMPTS    = 3
TOTP_LOCKOUT_MINUTES = 15
APP_NAME             = "SecureVault"


# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _check_lockout(user: User):
    """Raise 429 if the account is currently locked out."""
    if user.otp_locked_until and _now() < user.otp_locked_until:
        remaining = int((user.otp_locked_until - _now()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Try again in {remaining} minute(s)."
        )


def _record_failed_attempt(user: User, db: Session):
    """Increment attempt counter; lock account after max attempts."""
    user.otp_attempts += 1
    if user.otp_attempts >= TOTP_MAX_ATTEMPTS:
        user.otp_locked_until = _now() + timedelta(minutes=TOTP_LOCKOUT_MINUTES)
        user.otp_attempts     = 0
        db.commit()
        raise HTTPException(
            status_code=429,
            detail=f"Too many incorrect attempts. Account locked for {TOTP_LOCKOUT_MINUTES} minutes."
        )
    db.commit()
    remaining = TOTP_MAX_ATTEMPTS - user.otp_attempts
    raise HTTPException(
        status_code=400,
        detail=f"Incorrect code. {remaining} attempt(s) remaining."
    )


def _qr_base64(totp_uri: str) -> str:
    """Generate a QR code for a provisioning URI and return as base64 PNG."""
    img = qrcode.make(totp_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


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
    Returns whether the user has already set up Google Authenticator
    so the frontend knows whether to show the QR setup screen or just
    the code input.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "message":      "Credentials verified.",
        "totp_enabled": user.totp_enabled,
    }


# ── step 2a: first-time setup — generate secret + QR ─────────────────────────

@router.post("/setup-totp")
def setup_totp(body: EmailLoginRequest, db: Session = Depends(get_db)):
    """
    Called after captcha passes when the user has NOT yet set up 2FA.
    Generates a new TOTP secret, persists it (not yet enabled), and
    returns a base64-encoded QR image for scanning.
    Requires email + password again to prevent unauthenticated setup.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="Google Authenticator is already configured.")

    # Generate a fresh secret each time setup is called
    secret   = pyotp.random_base32()
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name=APP_NAME
    )

    user.totp_secret  = secret
    user.totp_enabled = False          # will be flipped True after first verify
    db.commit()

    return {
        "qr_base64": _qr_base64(totp_uri),
        "secret":    secret,           # shown as manual fallback
    }


# ── step 2b / step 3: verify TOTP code → issue access token ──────────────────

@router.post("/verify-totp")
def verify_totp(body: VerifyTotpRequest, db: Session = Depends(get_db)):
    """
    Verifies the 6-digit TOTP code from Google Authenticator.
    - First call (totp_enabled=False): confirms setup and marks it enabled.
    - Subsequent calls: normal login 2FA check.
    Issues the real JWT access token on success.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP is not configured for this account.")

    _check_lockout(user)

    totp  = pyotp.TOTP(user.totp_secret)
    valid = totp.verify(body.code.strip(), valid_window=1)

    if not valid:
        _record_failed_attempt(user, db)   # raises HTTPException inside

    # ✅ Code is correct — reset counters
    user.otp_attempts     = 0
    user.otp_locked_until = None

    # First successful verify activates TOTP
    if not user.totp_enabled:
        user.totp_enabled = True

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


# ── forgot password (TOTP-verified reset) ─────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    If the user has TOTP enabled, they can reset their password using
    their authenticator app. Returns whether TOTP is configured.
    """
    user = db.query(User).filter(User.email == body.email).first()

    # Don't reveal whether the email is registered
    if not user:
        return {"message": "If that account exists, proceed with your authenticator app.", "totp_enabled": False}

    return {
        "message":      "Use your authenticator app to verify and reset your password.",
        "totp_enabled": user.totp_enabled,
    }


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Verifies the TOTP code then sets the new password.
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.totp_secret or not user.totp_enabled:
        raise HTTPException(status_code=400, detail="TOTP is not set up for this account.")

    _check_lockout(user)

    totp  = pyotp.TOTP(user.totp_secret)
    valid = totp.verify(body.code.strip(), valid_window=1)

    if not valid:
        _record_failed_attempt(user, db)

    # ✅ Code correct
    user.password_hash    = hash_password(body.new_password)
    user.otp_attempts     = 0
    user.otp_locked_until = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}
