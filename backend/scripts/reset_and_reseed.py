"""Manteniment: esborra totes les dades d'entitat (entitats, grups, usuaris
d'entitat, sessions, reserves) i torna a executar la llavor (`app.seed.run_seed`).
El superadministrador (`entity_id` nul) no es toca.

Actua sobre la base de dades apuntada per la variable d'entorn `DATABASE_URL`
(la mateixa que fa servir `app/config.py`), així que per executar-ho contra
Azure cal exportar-la abans amb la cadena de connexió de producció:

    DATABASE_URL="mssql+pymssql://..." python scripts/reset_and_reseed.py
"""

from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.seed import run_seed


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM reservations"))
        db.execute(text("DELETE FROM sessions"))
        db.execute(text("DELETE FROM user_rooms"))
        db.execute(text("DELETE FROM rooms"))
        db.execute(text("DELETE FROM users WHERE entity_id IS NOT NULL"))
        db.execute(text("DELETE FROM entities"))
        db.commit()
        run_seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
