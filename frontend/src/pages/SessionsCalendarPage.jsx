import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSessions } from "../hooks/useSessions.js";
import CalendarGrid from "../components/CalendarGrid.jsx";
import WeekTimelineGrid from "../components/WeekTimelineGrid.jsx";
import SessionDetailPanel from "../components/SessionDetailPanel.jsx";
import RoomFilterBar from "../components/RoomFilterBar.jsx";
import { buildMonthDays, buildWeekDays, formatRangeLabel } from "../utils/calendarGrid.js";

export default function SessionsCalendarPage() {
  const { user, entity } = useAuth();
  const { sessions, rooms, activeRoomIds, toggleRoom, message, reserve, cancel } = useSessions(user.entity_id);
  const [granularity, setGranularity] = useState("month");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState(null);
  const plural = entity?.slot_label_plural ?? "Sessions";

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
      <h1>Calendari de {plural.toLowerCase()}</h1>
      {entity?.is_multiroom && !user.assigned_room_id && (
        <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />
      )}
      {message && <p className="info">{message}</p>}
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" onClick={() => shift(-1)}>
            ‹ Anterior
          </button>
          <button type="button" onClick={() => setReferenceDate(new Date())}>
            Avui
          </button>
          <button type="button" onClick={() => shift(1)}>
            Següent ›
          </button>
        </div>
        <span className="calendar-range-label">{formatRangeLabel(referenceDate, granularity)}</span>
        <div className="calendar-granularity">
          <button
            type="button"
            className={granularity === "week" ? "active" : ""}
            onClick={() => setGranularity("week")}
          >
            Setmana
          </button>
          <button
            type="button"
            className={granularity === "month" ? "active" : ""}
            onClick={() => setGranularity("month")}
          >
            Mes
          </button>
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
