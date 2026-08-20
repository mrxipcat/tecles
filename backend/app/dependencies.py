from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models import User, UserRole
from app.security import decode_token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: DbSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticat")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")

    user = db.get(User, payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari no trobat")

    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requereix rol administrador")
    return user


def get_current_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPERADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requereix rol superadministrador")
    return user


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: DbSession = Depends(get_db),
) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None

    return db.get(User, payload.get("user_id"))
