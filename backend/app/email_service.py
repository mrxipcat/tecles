"""Enviament de correus de notificació (reserves) i del correu de prova de
configuració SMTP de `routers/entities.py`.

La preparació del missatge (lectura de l'entitat/usuari via l'ORM) es fa sempre de
manera síncrona abans de tancar la sessió de BD; només l'enviament SMTP en si
(`send_prepared_email`) es delega a un `BackgroundTasks` de FastAPI, ja que un cop
enviada la resposta la sessió de BD de la petició ja està tancada i no es pot fer
servir des d'una tasca en segon pla.
"""

import html
import logging
import smtplib
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.models import Entity, Reservation, ReservationStatus, User
from app.translations import t

logger = logging.getLogger(__name__)


class EmailError(Exception):
    pass


@dataclass
class SmtpConfig:
    host: str
    port: int
    username: str | None
    password: str | None
    use_tls: bool
    from_email: str


@dataclass
class PreparedEmail:
    smtp: SmtpConfig
    to_email: str
    subject: str
    html_body: str


def is_email_configured(entity: Entity) -> bool:
    return bool(entity.smtp_host and entity.smtp_port and entity.smtp_from_email)


def _smtp_config(entity: Entity) -> SmtpConfig | None:
    if not is_email_configured(entity):
        return None
    return SmtpConfig(
        host=entity.smtp_host,
        port=entity.smtp_port,
        username=entity.smtp_username or None,
        password=entity.smtp_password,
        use_tls=entity.smtp_use_tls,
        from_email=entity.smtp_from_email,
    )


def _append_signature(html_body: str, entity: Entity) -> str:
    if not entity.email_signature:
        return html_body
    return f"{html_body}<hr>{entity.email_signature}"


def _send(smtp: SmtpConfig, to_email: str, subject: str, html_body: str) -> None:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = smtp.from_email
    message["To"] = to_email
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp.host, smtp.port, timeout=15) as server:
            if smtp.use_tls:
                server.starttls()
            if smtp.username:
                server.login(smtp.username, smtp.password or "")
            server.sendmail(smtp.from_email, [to_email], message.as_string())
    except (smtplib.SMTPException, OSError) as exc:
        raise EmailError(str(exc)) from exc


def send_email_now(entity: Entity, to_email: str, subject: str, html_body: str) -> None:
    """Enviament síncron amb propagació d'errors, per a l'endpoint de prova."""
    smtp = _smtp_config(entity)
    if not smtp:
        raise EmailError("Aquesta entitat no té l'enviament de correus configurat")
    _send(smtp, to_email, subject, _append_signature(html_body, entity))


def prepare_email(entity: Entity, to_email: str | None, action_label: str, html_body: str) -> PreparedEmail | None:
    """Construeix el missatge (llegint dades de l'ORM) sense enviar-lo encara."""
    smtp = _smtp_config(entity)
    if not smtp or not to_email:
        return None
    subject = f"{entity.name}: {action_label}"
    return PreparedEmail(
        smtp=smtp,
        to_email=to_email,
        subject=subject,
        html_body=_append_signature(html_body, entity),
    )


def send_prepared_email(prepared: PreparedEmail | None) -> None:
    """Pensat per a `BackgroundTasks.add_task`: no llegeix l'ORM, només fa I/O de xarxa."""
    if not prepared:
        return
    try:
        _send(prepared.smtp, prepared.to_email, prepared.subject, prepared.html_body)
    except EmailError:
        logger.warning("No s'ha pogut enviar el correu de notificació a %s", prepared.to_email, exc_info=True)


def _reservation_email_body(reservation: Reservation, event: str) -> str:
    session = reservation.session
    entity = session.entity
    user = reservation.user
    lang = user.language
    greeting = html.escape(user.full_name or user.username)
    title = html.escape(reservation.session_title)
    date_str = session.date.strftime("%d/%m/%Y")
    start_str = session.start_time.strftime("%H:%M")
    end_str = session.end_time.strftime("%H:%M")
    label = html.escape(entity.slot_label(lang))

    return (
        f"<p>{t(lang, 'greeting', name=greeting)}</p>"
        f"<p>{t(lang, f'intro_{event}')}</p>"
        "<ul>"
        f"<li><strong>{label}:</strong> {title}</li>"
        f"<li><strong>{t(lang, 'label_date')}</strong> {date_str}</li>"
        f"<li><strong>{t(lang, 'label_time')}</strong> {start_str} - {end_str}</li>"
        "</ul>"
    )


def prepare_reservation_email(reservation: Reservation, event: str) -> PreparedEmail | None:
    """`event` és "requested"/"confirmed"/"cancelled_by_admin"/"cancelled_by_user"
    (claus `action_*`/`intro_*` de `app/translations.py`). Retorna `None` si
    l'usuari no té correu o l'entitat no té l'enviament configurat (comprovat
    dins `prepare_email`)."""
    user = reservation.user
    if not user.email:
        return None
    entity = reservation.session.entity
    return prepare_email(
        entity,
        user.email,
        t(user.language, f"action_{event}"),
        _reservation_email_body(reservation, event),
    )


def _reservation_list_item(reservation: Reservation) -> str:
    return (
        "<li>"
        f"{html.escape(reservation.session_title)} — "
        f"{reservation.session_date.strftime('%d/%m/%Y')} "
        f"{reservation.session_start_time.strftime('%H:%M')}-{reservation.session_end_time.strftime('%H:%M')}"
        "</li>"
    )


def build_confirmed_reservations_email_body(user: User, reservations: list[Reservation]) -> str:
    """Cos de correu de "Enviar-m'ho per correu" a `MyReservationsPage.jsx`: llistat
    en text (no PDF) de les reserves confirmades i pendents de confirmació de l'usuari,
    en seccions separades perquè quedi clar quines encara no estan confirmades."""
    lang = user.language
    greeting = html.escape(user.full_name or user.username)
    confirmed = [r for r in reservations if r.status == ReservationStatus.CONFIRMED]
    pending = [r for r in reservations if r.status == ReservationStatus.PENDING]

    if not confirmed and not pending:
        sections = f"<p>{t(lang, 'my_reservations_empty')}</p>"
    else:
        sections = ""
        if confirmed:
            rows = "".join(_reservation_list_item(r) for r in confirmed)
            sections += f"<p>{t(lang, 'my_reservations_confirmed_header')}</p><ul>{rows}</ul>"
        if pending:
            rows = "".join(_reservation_list_item(r) for r in pending)
            sections += f"<p>{t(lang, 'my_reservations_pending_header')}</p><ul>{rows}</ul>"

    return f"<p>{t(lang, 'greeting', name=greeting)}</p><p>{t(lang, 'my_reservations_intro')}</p>{sections}"
