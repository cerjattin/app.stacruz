from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import AppUser
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.deps.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token(db: Session, username: str, password: str) -> TokenResponse:
    user = db.query(AppUser).filter(AppUser.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    token = create_access_token(subject=user.username, extra_claims={"role": user.role.value})

    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=str(user.id),
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
        ),
    )


# ✅ Login para tu frontend (JSON)
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return _issue_token(db, payload.username, payload.password)


# ✅ Token OAuth2 para Swagger (form-data)
@router.post("/token", response_model=TokenResponse)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return _issue_token(db, form_data.username, form_data.password)


@router.get("/me", response_model=UserOut)
def me(user: AppUser = Depends(get_current_user)):
    return UserOut(
        id=str(user.id),
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )