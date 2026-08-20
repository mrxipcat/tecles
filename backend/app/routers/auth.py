from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Entity, User
from app.schemas import ChangePasswordRequest, LoginRequest, LoginResponse, UserRead
from app.security import encode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: DbSession = Depends(get_db)):
    """Login amb verificació real de contrasenya.

    Els comptes ja no s'autoregistren: només un administrador de l'entitat
    els pot crear (vegeu `app/routers/users.py`), o un superadministrador
    (vegeu `app/routers/superadmin.py`). Si no s'indica `entity_code`, es
    tracta d'un login de superadministrador (usuari sense entitat). El token
    retornat segueix sent provisional (sense signatura), vegeu `app/security.py`.
    """
    if payload.entity_code:
        entity = db.query(Entity).filter(Entity.code == payload.entity_code).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Entitat no trobada")
        user = (
            db.query(User)
            .filter(User.entity_id == entity.id, User.username == payload.username)
            .first()
        )
    else:
        user = (
            db.query(User)
            .filter(User.entity_id.is_(None), User.username == payload.username)
            .first()
        )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credencials incorrectes")

    token = encode_token(user)
    return LoginResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", response_model=UserRead)
def change_password(
    payload: ChangePasswordRequest,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contrasenya actual no és correcta")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return current_user
