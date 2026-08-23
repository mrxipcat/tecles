"""Fix puntual: `entities.room_label_singular`/`room_label_plural` són restes
d'un rename antic ("room" -> "slot") — no existeixen al model actual
(`app/models.py`), són `NOT NULL` sense valor per defecte, i per tant
bloquegen qualsevol inserció nova d'entitat (`INSERT ... entities`) tant des
del seed com des de `POST /superadmin/entities`. Les elimina si existeixen."""

from sqlalchemy import inspect, text

from app.database import engine

LEGACY_COLUMNS = ["room_label_singular", "room_label_plural"]


def main() -> None:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("entities")}
    with engine.begin() as conn:
        for column in LEGACY_COLUMNS:
            if column not in existing:
                print(f"skip (ja no existeix): {column}")
                continue
            conn.execute(text(f"ALTER TABLE entities DROP COLUMN {column}"))
            print(f"eliminada: {column}")


if __name__ == "__main__":
    main()
