import html
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.email_service import is_email_configured, prepare_email, send_prepared_email
from app.models import Entity, User, UserRole
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    SelfRegisterRequest,
    SelfRegisterResponse,
    UserRead,
    UserSelfUpdate,
)
from app.security import encode_token, generate_temporary_password, hash_password, verify_password
from app.translations import t

router = APIRouter(prefix="/auth", tags=["auth"])

SUPPORTED_LANGUAGES = {"ca", "es", "en"}


def _resolve_login_origin(origin: str | None) -> str:
    """Fa servir `origin` (l'origen real de la pàgina de login, `window.location.origin`)
    per a l'enllaç del correu d'autoregistre quan el seu domini coincideix amb
    `FRONTEND_ORIGIN` o n'és un subdomini (p. ex. `https://canrahull.tecles.com` quan
    `FRONTEND_ORIGIN` és `https://tecles.com`) — així l'enllaç manté el subdomini de
    l'entitat en lloc de l'origen genèric configurat al backend. Si no coincideix (o no
    se n'ha rebut cap), es fa servir `FRONTEND_ORIGIN` com a reserva, per evitar que una
    petició pugui fer que el correu inclogui un enllaç cap a un domini arbitrari."""
    configured = urlparse(settings.frontend_origin)
    if not origin or not configured.hostname:
        return settings.frontend_origin
    parsed = urlparse(origin)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return settings.frontend_origin
    host = parsed.hostname.lower()
    base_host = configured.hostname.lower()
    if host == base_host or host.endswith(f".{base_host}"):
        return f"{parsed.scheme}://{parsed.netloc}"
    return settings.frontend_origin


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: DbSession = Depends(get_db)):
    """Login amb verificació real de contrasenya.

    Els comptes normalment només els pot crear un administrador de l'entitat
    (vegeu `app/routers/users.py`) o un superadministrador (vegeu
    `app/routers/superadmin.py`); si l'entitat ho permet, també es poden
    autoregistrar amb rol USER des de `POST /auth/register` més avall. Si no
    s'indica `entity_code`, es tracta d'un login de superadministrador (usuari
    sense entitat). El token retornat segueix sent provisional (sense
    signatura), vegeu `app/security.py`.
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
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Aquest compte ha estat desactivat")

    token = encode_token(user)
    return LoginResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/register", response_model=SelfRegisterResponse, status_code=201)
def register(payload: SelfRegisterRequest, background_tasks: BackgroundTasks, db: DbSession = Depends(get_db)):
    """Autoregistre d'un nou usuari (rol USER forçat, sense contrasenya pròpia): cal que
    l'entitat ho tingui activat (`Entity.allow_self_registration`) i tingui l'enviament de
    correus configurat, ja que la contrasenya inicial d'un sol ús només s'entrega per correu.
    """
    entity = db.query(Entity).filter(Entity.code == payload.entity_code).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    if not entity.allow_self_registration:
        raise HTTPException(status_code=403, detail="Aquesta entitat no permet l'autoregistre")

    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Correu electrònic no vàlid")
    if not is_email_configured(entity):
        raise HTTPException(
            status_code=503,
            detail="Aquesta entitat no té l'enviament de correus configurat; contacta amb l'administrador",
        )

    existing = db.query(User).filter(User.entity_id == entity.id, User.username == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ja existeix un usuari registrat amb aquest correu")

    temp_password = generate_temporary_password()
    user = User(
        entity_id=entity.id,
        username=email,
        email=email,
        role=UserRole.USER,
        password_hash=hash_password(temp_password),
        must_change_password=True,
        is_active=True,
        visible_rooms=entity.self_registration_rooms,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    lang = user.language
    login_url = f"{_resolve_login_origin(payload.origin)}/login?entitat={entity.code}"
    body = (
        f"<p>{t(lang, 'self_register_intro')}</p>"
        "<ul>"
        f"<li><strong>{t(lang, 'self_register_username_label')}</strong> {html.escape(email)}</li>"
        f"<li><strong>{t(lang, 'self_register_password_label')}</strong> {html.escape(temp_password)}</li>"
        "</ul>"
        f'<p><a href="{login_url}">{t(lang, "self_register_login_link_label")}</a></p>'
    )
    prepared = prepare_email(entity, email, t(lang, "self_register_subject"), body)
    if prepared:
        background_tasks.add_task(send_prepared_email, prepared)

    return SelfRegisterResponse(detail="T'hem enviat un correu amb les instruccions d'accés.")


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


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserSelfUpdate,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualització del propi perfil (de moment només l'idioma d'interfície)."""
    if payload.language is not None and payload.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Idioma no suportat")

    current_user.language = payload.language
    db.commit()
    db.refresh(current_user)
    return current_user
