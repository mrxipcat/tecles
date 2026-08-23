import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "./Button.jsx";
import RichTextContent from "./RichTextContent.jsx";
import { CalendarPlusIcon, CalendarXIcon, XIcon } from "./icons.jsx";
import { availabilityClass, availabilityText, isExpiredSession } from "../utils/availability.js";
import { resolveSlotLabel } from "../utils/entityLabels.js";

export default function SessionDetailPanel({ session, onReserve, onCancel, onClose }) {
  const { t, i18n } = useTranslation("sessionDisplay");
  const { entity } = useAuth();
  const singular = resolveSlotLabel(entity?.slot_label_singular, i18n.language) ?? t("sessionFallback");
  const singularLower = singular.toLowerCase();

  if (!session) {
    return (
      <p className="calendar-detail-placeholder">
        {t("selectPlaceholder", { slot: singularLower })}
      </p>
    );
  }
  const full = session.is_available === false;
  const canReserve = !full && !isExpiredSession(session);

  function handleCancelClick() {
    if (window.confirm(t("cancelConfirm", { title: session.display_title }))) {
      onCancel(session);
    }
  }

  return (
    <div className={`session-detail-panel ${availabilityClass(session)}`}>
      <div className="session-detail-header">
        <h2>{session.display_title}</h2>
        <Button icon={XIcon} onClick={onClose}>
          {t("close")}
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
  );
}
