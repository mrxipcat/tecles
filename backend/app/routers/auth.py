import html
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
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


def _well_formed_origin(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value)
    if parsed.scheme in ("http", "https") and parsed.hostname:
        return f"{parsed.scheme}://{parsed.netloc}"
    return None


def _resolve_login_origin(*, header_origin: str | None, referer: str | None, payload_origin: str | None) -> str:
    """Origen (protocol+domini) fet servir a l'enllaç de login del correu d'autoregistre,
    en ordre de preferència: la capçalera `Origin`, la capçalera `Referer`, l'origen que
    envia el frontend al cos de la petició (`window.location.origin`), i `FRONTEND_ORIGIN`
    com a última reserva. Les capçaleres es prioritzen perquè les estableix el navegador
    (no es poden falsejar des de JavaScript en una petició real); el camp del cos només
    fa de reserva per si algun proxy intermedi les elimina (les Managed Functions d'Azure
    Static Web Apps ja sobreescriuen `Authorization` abans de reenviar la petició, vegeu
    `app/dependencies.py::get_current_user`, així que no es pot donar per fet que totes
    les capçaleres arribin intactes). No es valida contra `FRONTEND_ORIGIN`: aquest valor
    és exactament el que pot estar mal configurat en desplegaments amb subdomini per
    entitat, que és el problema que aquesta funció soluciona."""
    for candidate in (header_origin, referer, payload_origin):
        resolved = _well_formed_origin(candidate)
        if resolved:
            return resolved
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
def register(
    payload: SelfRegisterRequest,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
    origin_header: str | None = Header(default=None, alias="Origin"),
    referer_header: str | None = Header(default=None, alias="Referer"),
):
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
    login_origin = _resolve_login_origin(
        header_origin=origin_header, referer=referer_header, payload_origin=payload.origin
    )
    login_url = f"{login_origin}/login?entitat={entity.code}"
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
