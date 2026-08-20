from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_superadmin
from app.models import Entity, Room, User, UserRole
from app.schemas import (
    EntityAdminCreate,
    EntityAdminUpdate,
    EntityCreate,
    EntityRead,
    EntityUpdate,
    PasswordResetRequest,
    UserRead,
)
from app.security import hash_password

router = APIRouter(prefix="/superadmin", tags=["superadmin"], dependencies=[Depends(get_current_superadmin)])


def _get_entity(entity_id: int, db: DbSession) -> Entity:
    entity = db.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    return entity


def _get_admin_user(user_id: int, db: DbSession) -> User:
    user = db.get(User, user_id)
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="Administrador no trobat")
    return user


@router.get("/entities", response_model=list[EntityRead])
def list_entities(db: DbSession = Depends(get_db)):
    return db.query(Entity).all()


@router.post("/entities", response_model=EntityRead, status_code=201)
def create_entity(payload: EntityCreate, db: DbSession = Depends(get_db)):
    existing = db.query(Entity).filter(Entity.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ja existeix una entitat amb aquest codi")

    entity = Entity(**payload.model_dump())
    db.add(entity)
    db.flush()
    db.add(Room(entity_id=entity.id, name="Principal"))
    db.commit()
    db.refresh(entity)
    return entity


@router.patch("/entities/{entity_id}", response_model=EntityRead)
def update_entity(entity_id: int, payload: EntityUpdate, db: DbSession = Depends(get_db)):
    entity = _get_entity(entity_id, db)
    data = payload.model_dump(exclude_unset=True)

    new_code = data.get("code")
    if new_code and new_code != entity.code:
        existing = db.query(Entity).filter(Entity.code == new_code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ja existeix una entitat amb aquest codi")

    for field, value in data.items():
        setattr(entity, field, value)
    db.commit()
    db.refresh(entity)
    return entity


@router.delete("/entities/{entity_id}", status_code=204)
def delete_entity(entity_id: int, db: DbSession = Depends(get_db)):
    entity = _get_entity(entity_id, db)
    db.delete(entity)
    db.commit()


@router.get("/entities/{entity_id}/admins", response_model=list[UserRead])
def list_entity_admins(entity_id: int, db: DbSession = Depends(get_db)):
    _get_entity(entity_id, db)
    return db.query(User).filter(User.entity_id == entity_id, User.role == UserRole.ADMIN).all()


@router.post("/entities/{entity_id}/admins", response_model=UserRead, status_code=201)
def create_entity_admin(entity_id: int, payload: EntityAdminCreate, db: DbSession = Depends(get_db)):
    _get_entity(entity_id, db)
    existing = (
        db.query(User)
        .filter(User.entity_id == entity_id, User.username == payload.username)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ja existeix un usuari amb aquest nom d'usuari")

    user = User(
        entity_id=entity_id,
        username=payload.username,
        full_name=payload.full_name,
        role=UserRole.ADMIN,
        password_hash=hash_password(payload.initial_password),
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admins/{user_id}", response_model=UserRead)
def update_entity_admin(user_id: int, payload: EntityAdminUpdate, db: DbSession = Depends(get_db)):
    user = _get_admin_user(user_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/admins/{user_id}/reset-password", response_model=UserRead)
def reset_entity_admin_password(user_id: int, payload: PasswordResetRequest, db: DbSession = Depends(get_db)):
    user = _get_admin_user(user_id, db)
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admins/{user_id}", status_code=204)
def delete_entity_admin(user_id: int, db: DbSession = Depends(get_db)):
    user = _get_admin_user(user_id, db)
    db.delete(user)
    db.commit()
