from datetime import date as date_, datetime, time as time_

from pydantic import BaseModel, ConfigDict

from app.models import ReservationStatus, UserRole, VisibilityMode


# ---------- Entity ----------


class EntityBase(BaseModel):
    name: str
    code: str
    slot_label_singular: str = "Sessió"
    slot_label_plural: str = "Sessions"
    room_label_singular: str = "Sala"
    room_label_plural: str = "Sales"
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode = VisibilityMode.ALWAYS
    show_available_places: bool = True
    auto_confirm_reservations: bool = True
    is_multiroom: bool = False


class EntityCreate(EntityBase):
    pass


class EntityUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    slot_label_singular: str | None = None
    slot_label_plural: str | None = None
    room_label_singular: str | None = None
    room_label_plural: str | None = None
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode | None = None
    show_available_places: bool | None = None
    auto_confirm_reservations: bool | None = None
    is_multiroom: bool | None = None


class EntitySelfUpdate(BaseModel):
    # Sense name/slot_label_*/room_label_*: només un superadministrador els pot canviar.
    max_reservations_per_day: int | None = None
    max_reservations_per_week: int | None = None
    max_reservations_per_month: int | None = None
    visibility_mode: VisibilityMode | None = None
    show_available_places: bool | None = None
    auto_confirm_reservations: bool | None = None
    is_multiroom: bool | None = None


class EntityRead(EntityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class EntityPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    code: str


# ---------- User ----------


class UserBase(BaseModel):
    username: str
    full_name: str | None = None
    role: UserRole = UserRole.USER


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_id: int | None
    must_change_password: bool
    assigned_room_id: int | None = None
    assigned_room_name: str | None = None
    created_at: datetime


class UserCreate(BaseModel):
    username: str
    full_name: str | None = None
    role: UserRole = UserRole.USER
    initial_password: str
    assigned_room_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    assigned_room_id: int | None = None


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


class SlotSessionCreate(SlotSessionBase):
    entity_id: int
    room_id: int | None = None


class SlotSessionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    date: date_ | None = None
    start_time: time_ | None = None
    end_time: time_ | None = None
    capacity: int | None = None
    room_id: int | None = None


class SlotSessionRead(SlotSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_id: int
    room_id: int
    room_name: str | None = None
    display_title: str
    created_at: datetime
    available_places: int | None = None
    pending_count: int | None = None
    confirmed_count: int | None = None
    my_reservation_id: int | None = None
    my_reservation_status: ReservationStatus | None = None


# ---------- Reservation ----------


class ReservationCreate(BaseModel):
    session_id: int


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
