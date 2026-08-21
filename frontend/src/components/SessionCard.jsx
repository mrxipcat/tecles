import { useState } from "react";
import Button from "./Button.jsx";
import { CalendarPlusIcon, CalendarXIcon, ChevronDownIcon } from "./icons.jsx";
import { availabilityClass, availabilityText } from "../utils/availability.js";

export default function SessionCard({ session, onReserve, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const full = session.available_places === 0;

  function handleCancelClick() {
    if (window.confirm(`Vols cancel·lar la reserva de "${session.display_title}"?`)) {
      onCancel(session);
    }
  }

  return (
    <div className={`session-card ${availabilityClass(session)}`}>
      <div className="session-card-row">
        <div className="session-card-lines">
          <p className="session-card-line1">
            <strong>{session.display_title}</strong> · {session.date} ·{" "}
            {session.start_time?.slice(0, 5)}–{session.end_time?.slice(0, 5)}
          </p>
          <p className="session-card-line2">{availabilityText(session)}</p>
        </div>
        <div className="session-card-actions">
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
      {expanded && session.description && <p className="session-card-description">{session.description}</p>}
    </div>
  );
}
