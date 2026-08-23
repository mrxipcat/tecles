import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { useSessions } from "../hooks/useSessions.js";
import CalendarGrid from "../components/CalendarGrid.jsx";
import WeekTimelineGrid from "../components/WeekTimelineGrid.jsx";
import SessionDetailPanel from "../components/SessionDetailPanel.jsx";
import RoomFilterBar from "../components/RoomFilterBar.jsx";
import Button from "../components/Button.jsx";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ColumnsIcon, RefreshIcon } from "../components/icons.jsx";
import { buildMonthDays, buildWeekDays, formatRangeLabel } from "../utils/calendarGrid.js";
import { resolveSlotLabel } from "../utils/entityLabels.js";

// L'alies del slot s'interpola en minúscules dins la frase ("Calendari de
// sessions"), però segons l'idioma el títol el pot posar al principi
// ("{{plural}} calendar" en anglès) — capitalitzem la primera lletra del
// resultat perquè el títol comenci sempre en majúscula, sigui quin sigui
// l'ordre de la plantilla.
function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function SessionsCalendarPage() {
  const { t, i18n } = useTranslation("calendar");
  const { user, entity, isAdmin } = useAuth();
  const { sessions, rooms, activeRoomIds, toggleRoom, message, reload, reserve, cancel } = useSessions(
    user.entity_id,
    isAdmin ? null : user.visible_room_ids
  );
  const [granularity, setGranularity] = useState("month");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState(null);
  const plural = resolveSlotLabel(entity?.slot_label_plural, i18n.language) ?? t("sessionsFallback");
  const showRoomFilter = entity?.is_multiroom && (isAdmin || (user.visible_room_ids?.length ?? 0) !== 1);

  const days = useMemo(
    () => (granularity === "month" ? buildMonthDays(referenceDate) : buildWeekDays(referenceDate)),
    [granularity, referenceDate]
  );

  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const session of sessions) {
      (map[session.date] ??= []).push(session);
    }
    return map;
  }, [sessions]);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  function shift(step) {
    const next = new Date(referenceDate);
    if (granularity === "month") next.setMonth(next.getMonth() + step);
    else next.setDate(next.getDate() + step * 7);
    setReferenceDate(next);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{capitalizeFirst(t("title", { plural: plural.toLowerCase() }))}</h1>
        <Button icon={RefreshIcon} onClick={reload}>
          {t("refresh")}
        </Button>
      </div>
      {showRoomFilter && <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />}
      {message && <p className="info">{message}</p>}
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <Button icon={ChevronLeftIcon} onClick={() => shift(-1)}>
            {t("previous")}
          </Button>
          <Button icon={CalendarIcon} onClick={() => setReferenceDate(new Date())}>
            {t("today")}
          </Button>
          <Button icon={ChevronRightIcon} onClick={() => shift(1)}>
            {t("next")}
          </Button>
        </div>
        <span className="calendar-range-label">{formatRangeLabel(referenceDate, granularity)}</span>
        <div className="calendar-granularity">
          <Button
            icon={ColumnsIcon}
            className={granularity === "week" ? "active" : ""}
            onClick={() => setGranularity("week")}
          >
            {t("week")}
          </Button>
          <Button
            icon={CalendarIcon}
            className={granularity === "month" ? "active" : ""}
            onClick={() => setGranularity("month")}
          >
            {t("month")}
          </Button>
        </div>
      </div>
      {granularity === "week" ? (
        <WeekTimelineGrid
          days={days}
          sessionsByDate={sessionsByDate}
          selectedId={selectedId}
          onSelectSession={(session) => setSelectedId(session.id)}
        />
      ) : (
        <CalendarGrid
          days={days}
          sessionsByDate={sessionsByDate}
          selectedId={selectedId}
          onSelectSession={(session) => setSelectedId(session.id)}
          currentMonth={referenceDate.getMonth()}
        />
      )}
      <SessionDetailPanel
        session={selectedSession}
        onReserve={reserve}
        onCancel={cancel}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
