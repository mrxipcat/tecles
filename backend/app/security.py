"""Seguretat de l'aplicació.

La verificació de contrasenya és real (PBKDF2-HMAC-SHA256, stdlib, sense
dependències noves). El que segueix sent provisional és el "token" retornat
pel login: un JSON codificat en base64, sense signatura ni caducitat.

TODO(sprint4): substituir el token per un mecanisme de sessió real (p. ex.
login via GitHub / Azure Static Web Apps) tal com preveu el disseny
d'arquitectura.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import string

from app.models import User

TOKEN_PREFIX = "dev."
_PBKDF2_ITERATIONS = 200_000
_TEMP_PASSWORD_ALPHABET = string.ascii_letters + string.digits


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def generate_temporary_password(length: int = 10) -> str:
    """Contrasenya inicial d'un sol ús per a l'autoregistre (`routers/auth.py::register`);
    l'usuari l'ha de canviar en el primer login (`must_change_password`)."""
    return "".join(secrets.choice(_TEMP_PASSWORD_ALPHABET) for _ in range(length))


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def encode_token(user: User) -> str:
    payload = {"user_id": user.id, "entity_id": user.entity_id, "role": user.role.value}
    raw = json.dumps(payload).encode("utf-8")
    return TOKEN_PREFIX + base64.urlsafe_b64encode(raw).decode("utf-8")


def decode_token(token: str) -> dict | None:
    if not token.startswith(TOKEN_PREFIX):
        return None
    try:
        raw = base64.urlsafe_b64decode(token[len(TOKEN_PREFIX):].encode("utf-8"))
        return json.loads(raw)
    except Exception:
        return None
