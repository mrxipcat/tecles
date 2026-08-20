from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Entity, User
from app.schemas import EntityPublicRead, EntityRead, EntitySelfUpdate

router = APIRouter(prefix="/entities", tags=["entities"])


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
    entity = db.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entitat no trobada")
    if admin.entity_id != entity.id:
        raise HTTPException(status_code=403, detail="No pots modificar una altra entitat")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entity, field, value)

    db.commit()
    db.refresh(entity)
    return entity
