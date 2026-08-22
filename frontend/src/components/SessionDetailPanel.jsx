import { useAuth } from "../context/AuthContext.jsx";
import Button from "./Button.jsx";
import RichTextContent from "./RichTextContent.jsx";
import { CalendarPlusIcon, CalendarXIcon, XIcon } from "./icons.jsx";
import { availabilityClass, availabilityText } from "../utils/availability.js";

export default function SessionDetailPanel({ session, onReserve, onCancel, onClose }) {
  const { entity } = useAuth();
  const singular = entity?.slot_label_singular ?? "Sessió";
  const singularLower = singular.toLowerCase();

  if (!session) {
    return (
      <p className="calendar-detail-placeholder">
        Selecciona {singularLower} del calendari per veure'n el detall.
      </p>
    );
  }
  const full = session.is_available === false;

  function handleCancelClick() {
    if (window.confirm(`Vols cancel·lar la reserva de "${session.display_title}"?`)) {
      onCancel(session);
    }
  }

  return (
    <div className={`session-detail-panel ${availabilityClass(session)}`}>
      <div className="session-detail-header">
        <h2>{session.display_title}</h2>
        <Button icon={XIcon} onClick={onClose}>
          Tanca
        </Button>
      </div>
      <p className="session-card-date">
        {session.date} · {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
      </p>
      <RichTextContent html={session.description} />
      <div className="session-card-footer">
        <span>{availabilityText(session)}</span>
        {session.my_reservation_id ? (
          onCancel && (
            <Button icon={CalendarXIcon} variant="danger" onClick={handleCancelClick}>
              Cancel·la la reserva
            </Button>
          )
        ) : (
          onReserve && (
            <Button icon={CalendarPlusIcon} variant="primary" disabled={full} onClick={() => onReserve(session)}>
              {full ? "Completa" : "Reservar"}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
