from datetime import date as date_, datetime, time as time_

from pydantic import BaseModel, ConfigDict, Field

from app.models import ReservationStatus, UserRole, VisibilityMode


# ---------- Entity ----------


class SlotLabelTranslations(BaseModel):
    """Alies del "slot" (sessió/torn/reserva...) per idioma. `ca` és obligatori
    (és el valor de reserva quan `es`/`en` no s'han configurat, vegeu
    `Entity.slot_label()`); `es`/`en` són opcionals."""

    ca: str
    es: str | None = None
    en: str | None = None


class EntityBase(BaseModel):
    name: str
    code: str
    slot_label_singular: SlotLabelTranslations = Field(default_factory=lambda: SlotLabelTranslations(ca="Sessió"))
    slot_label_plural: SlotLabelTranslations = Field(default_factory=lambda: SlotLabelTranslations(ca="Sessions"))
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode = VisibilityMode.ALWAYS
    show_available_places: bool = True
    auto_confirm_reservations: bool = True
    is_multiroom: bool = False
    allow_self_registration: bool = False


class EntityCreate(EntityBase):
    pass


class EntityUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    slot_label_singular: SlotLabelTranslations | None = None
    slot_label_plural: SlotLabelTranslations | None = None
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode | None = None
    show_available_places: bool | None = None
    auto_confirm_reservations: bool | None = None
    is_multiroom: bool | None = None
    allow_self_registration: bool | None = None


class EntitySelfUpdate(BaseModel):
    # Sense name/slot_label_*: només un superadministrador els pot canviar.
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode | None = None
    show_available_places: bool | None = None
    auto_confirm_reservations: bool | None = None
    is_multiroom: bool | None = None
    allow_self_registration: bool | None = None
    # Grups assignats als nous usuaris autoregistrats (només rellevant si is_multiroom).
    self_registration_room_ids: list[int] | None = None


class EntityRead(EntityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    self_registration_room_ids: list[int] = []


class EntityPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    code: str
    allow_self_registration: bool = False


# Camps SMTP fora d'`EntityBase`/`EntityRead` a propòsit: aquests es serialitzen
# des d'endpoints sense autenticació (`GET /entities`, `GET /entities/{id}`), i
# `smtp_password` mai s'hi pot exposar.
class EntityEmailConfig(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_username: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    # Buit o absent = no modificar la contrasenya ja desada.
    smtp_password: str | None = None
    # Peu de text (HTML) afegit a tots els correus enviats des del portal.
    email_signature: str | None = None


class EntityEmailConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_username: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    smtp_password_set: bool = False
    email_signature: str | None = None


class EntityEmailTestRequest(BaseModel):
    to_email: str


class EntityEmailTestResult(BaseModel):
    success: bool
    detail: str


# ---------- User ----------


class UserBase(BaseModel):
    username: str
    full_name: str | None = None
    email: str | None = None
    role: UserRole = UserRole.USER


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_id: int | None
    must_change_password: bool
    is_active: bool = True
    language: str | None = None
    visible_room_ids: list[int] = []
    visible_room_names: list[str] = []
    created_at: datetime


class UserSelfUpdate(BaseModel):
    language: str | None = None


class UserCreate(BaseModel):
    username: str
    full_name: str | None = None
    email: str | None = None
    role: UserRole = UserRole.USER
    initial_password: str
    is_active: bool = True
    visible_room_ids: list[int] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    visible_room_ids: list[int] | None = None


class UserBulkActiveUpdate(BaseModel):
    user_ids: list[int]
    is_active: bool


class UserBulkDelete(BaseModel):
    user_ids: list[int]


class UserBulkRoomAction(BaseModel):
    user_ids: list[int]
    room_id: int


class PasswordResetRequest(BaseModel):
    new_password: str


class EntityAdminCreate(BaseModel):
    username: str
    full_name: str | None = None
    initial_password: str


class EntityAdminUpdate(BaseModel):
    full_name: str | None = None


# ---------- Auth ----------


class LoginRequest(BaseModel):
    entity_code: str | None = None
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class SelfRegisterRequest(BaseModel):
    entity_code: str
    email: str
    # Origen (`window.location.origin`) de la pàgina de login des d'on s'envia la
    # sol·licitud, per construir l'enllaç del correu amb el mateix domini/subdomini
    # que l'usuari ja estava fent servir (`routers/auth.py::_resolve_login_origin`).
    origin: str | None = None


class SelfRegisterResponse(BaseModel):
    detail: str


# ---------- Room ----------


class RoomBase(BaseModel):
    name: str


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: str | None = None


class RoomRead(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_id: int
    created_at: datetime


# ---------- SlotSession ----------


class SlotSessionBase(BaseModel):
    title: str | None = None
    description: str | None = None
    date: date_
    start_time: time_
    end_time: time_
    capacity: int = 1
    is_active: bool = True


class SlotSessionCreate(SlotSessionBase):
    entity_id: int
    room_id: int | None = None


class SlotSessionPackCreate(BaseModel):
    title: str | None = None
    room_id: int | None = None
    capacity: int = 1
    is_active: bool = True
    start_date: date_
    end_date: date_
    duration_hours: float
    # Llista de cadenes ("8:00", "08:00"...) en lloc de `time`: pydantic exigeix hores
    # amb zero a l'esquerra ("08:00") i volem acceptar totes dues notacions.
    start_times: list[str]


class SlotSessionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    date: date_ | None = None
    start_time: time_ | None = None
    end_time: time_ | None = None
    capacity: int | None = None
    room_id: int | None = None
    is_active: bool | None = None


class SlotSessionBulkActiveUpdate(BaseModel):
    session_ids: list[int]
    is_active: bool


class SlotSessionBulkDelete(BaseModel):
    session_ids: list[int]


class SlotSessionBulkRoomUpdate(BaseModel):
    session_ids: list[int]
    room_id: int


class SlotSessionBulkCapacityIncrement(BaseModel):
    session_ids: list[int]
    amount: int


class SlotSessionExportRequest(BaseModel):
    session_ids: list[int]


class SlotSessionDeleteExpiredResult(BaseModel):
    deleted_count: int


class SlotSessionRead(SlotSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_id: int
    room_id: int
    room_name: str | None = None
    display_title: str
    created_at: datetime
    # None per a usuaris no administradors quan l'entitat té
    # `show_available_places=False` (no se'ls ha d'informar ni de la
    # capacitat ni de l'ocupació, només de `is_available`).
    capacity: int | None = None
    available_places: int | None = None
    is_available: bool = True
    pending_count: int | None = None
    confirmed_count: int | None = None
    my_reservation_id: int | None = None
    my_reservation_status: ReservationStatus | None = None


# ---------- Reservation ----------


class ReservationCreate(BaseModel):
    session_id: int


class ReservationBulkSessionAction(BaseModel):
    session_ids: list[int]


class ReservationBulkUserAction(BaseModel):
    user_ids: list[int]


class ReservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    user_id: int
    status: ReservationStatus
    created_at: datetime
    confirmed_at: datetime | None = None
    session_title: str
    session_date: date_
    session_start_time: time_
    session_end_time: time_


class ReservationAdminRead(ReservationRead):
    user: UserRead


class ReservationDecision(BaseModel):
    status: ReservationStatus


class ReservationsEmailResult(BaseModel):
    success: bool
    detail: str
