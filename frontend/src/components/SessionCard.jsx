import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "./Button.jsx";
import { CalendarPlusIcon, CalendarXIcon, ChevronDownIcon } from "./icons.jsx";
import { availabilityClass, availabilityText } from "../utils/availability.js";

export default function SessionCard({ session, onReserve, onCancel }) {
  const { entity } = useAuth();
  const singularLower = (entity?.slot_label_singular ?? "Sessió").toLowerCase();
  const [expanded, setExpanded] = useState(false);
  const full = session.available_places === 0;

  function handleCancelClick() {
    if (window.confirm(`Vols cancel·lar la reserva de "${session.display_title}"?`)) {
      onCancel(session);
    }
  }

  return (
    <div className={`session-card ${availabilityClass(session)}`}>
      <div className="session-card-header">
        <div className="session-card-heading">
          <h3>{session.display_title}</h3>
          <span className="session-card-date">
            {session.date} · {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
          </span>
        </div>
        {session.description && (
          <Button
            icon={ChevronDownIcon}
            iconOnly
            expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Amaga la descripció" : "Mostra la descripció"}
            aria-expanded={expanded}
          />
        )}
      </div>
      {expanded && session.description && <p className="session-card-description">{session.description}</p>}
      {session.my_reservation_status && (
        <p className="my-reservation-note">
          {session.my_reservation_status === "pending"
            ? `Sol·licitud pendent per a ${singularLower}.`
            : `Reserva confirmada per a ${singularLower}.`}
        </p>
      )}
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
