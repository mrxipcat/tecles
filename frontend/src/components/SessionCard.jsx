import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button.jsx";
import { CalendarPlusIcon, CalendarXIcon, ChevronDownIcon } from "./icons.jsx";
import { availabilityClass, availabilityText, isExpiredSession } from "../utils/availability.js";

export default function SessionCard({ session, onReserve, onCancel }) {
  const { t } = useTranslation("sessionDisplay");
  const [expanded, setExpanded] = useState(false);
  const full = session.is_available === false;
  const canReserve = !full && !isExpiredSession(session);

  function handleCancelClick() {
    if (window.confirm(t("cancelConfirm", { title: session.display_title }))) {
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
              aria-label={expanded ? t("hideDescription") : t("showDescription")}
              aria-expanded={expanded}
            />
          )}
          {session.my_reservation_id ? (
            onCancel && (
              <Button icon={CalendarXIcon} variant="danger" onClick={handleCancelClick}>
                {t("cancelReservation")}
              </Button>
            )
          ) : (
            onReserve && (
              <Button
                icon={CalendarPlusIcon}
                variant="primary"
                disabled={!canReserve}
                onClick={() => onReserve(session)}
              >
                {full ? t("full") : t("reserve")}
              </Button>
            )
          )}
        </div>
      </div>
      {expanded && session.description && <p className="session-card-description">{session.description}</p>}
    </div>
  );
}
