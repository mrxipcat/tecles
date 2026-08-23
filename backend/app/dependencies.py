from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models import User, UserRole
from app.security import decode_token


def get_current_user(
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
    db: DbSession = Depends(get_db),
) -> User:
    # Es fa servir una capçalera pròpia ("X-Auth-Token") en lloc de la
    # "Authorization" estàndard perquè Azure Static Web Apps sobreescriu
    # aquesta última amb el seu propi token intern abans d'arribar a les
    # Managed Functions (comportament conegut i documentat de la plataforma).
    if not x_auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticat")

    payload = decode_token(x_auth_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")

    user = db.get(User, payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari no trobat")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aquest compte ha estat desactivat")

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
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
    db: DbSession = Depends(get_db),
) -> User | None:
    if not x_auth_token:
        return None

    payload = decode_token(x_auth_token)
    if not payload:
        return None

    user = db.get(User, payload.get("user_id"))
    if user and not user.is_active:
        return None
    return user
