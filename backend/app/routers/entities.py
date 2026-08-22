from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.email_service import EmailError, send_email_now
from app.models import Entity, User
from app.sanitize import sanitize_rich_text
from app.schemas import (
    EntityEmailConfig,
    EntityEmailConfigRead,
    EntityEmailTestRequest,
    EntityEmailTestResult,
    EntityPublicRead,
    EntityRead,
    EntitySelfUpdate,
)

router = APIRouter(prefix="/entities", tags=["entities"])


def _get_owned_entity(entity_id: int, admin: User, db: DbSession) -> Entity:
    entity = db.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    if admin.entity_id != entity.id:
        raise HTTPException(status_code=403, detail="No pots modificar una altra entitat")
    return entity


@router.get("", response_model=list[EntityRead])
def list_entities(db: DbSession = Depends(get_db)):
    return db.query(Entity).all()


@router.get("/by-code/{code}", response_model=EntityPublicRead)
def get_entity_by_code(code: str, db: DbSession = Depends(get_db)):
    entity = db.query(Entity).filter(Entity.code == code).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    return entity


@router.get("/{entity_id}", response_model=EntityRead)
def get_entity(entity_id: int, db: DbSession = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    return entity


@router.patch("/{entity_id}", response_model=EntityRead)
def update_entity(
    entity_id: int,
    payload: EntitySelfUpdate,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    entity = _get_owned_entity(entity_id, admin, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)

    db.commit()
    db.refresh(entity)
    return entity


def _serialize_email_config(entity: Entity) -> EntityEmailConfigRead:
    data = EntityEmailConfigRead.model_validate(entity)
    data.smtp_password_set = bool(entity.smtp_password)
    return data


@router.get("/{entity_id}/email-config", response_model=EntityEmailConfigRead)
def get_entity_email_config(
    entity_id: int,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    entity = _get_owned_entity(entity_id, admin, db)
    return _serialize_email_config(entity)


@router.patch("/{entity_id}/email-config", response_model=EntityEmailConfigRead)
def update_entity_email_config(
    entity_id: int,
    payload: EntityEmailConfig,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    entity = _get_owned_entity(entity_id, admin, db)

    fields = payload.model_dump(exclude_unset=True)
    new_password = fields.pop("smtp_password", None)
    if "email_signature" in fields:
        fields["email_signature"] = sanitize_rich_text(fields["email_signature"])
    for field, value in fields.items():
        setattr(entity, field, value)
    if new_password:
        entity.smtp_password = new_password

    db.commit()
    db.refresh(entity)
    return _serialize_email_config(entity)


@router.post("/{entity_id}/email-config/test", response_model=EntityEmailTestResult)
def test_entity_email_config(
    entity_id: int,
    payload: EntityEmailTestRequest,
    db: DbSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    entity = _get_owned_entity(entity_id, admin, db)

    try:
        send_email_now(
            entity,
            payload.to_email,
            f"{entity.name}: Correu de prova",
            "<p>Aquest és un correu de prova de la configuració SMTP del portal.</p>"
            "<p>Si l'has rebut, l'enviament de notificacions per correu funciona correctament.</p>",
        )
    except EmailError as exc:
        return EntityEmailTestResult(success=False, detail=str(exc))
    return EntityEmailTestResult(success=True, detail=f"Correu de prova enviat a {payload.to_email}.")
