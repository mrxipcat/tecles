import SessionChip from "./SessionChip.jsx";
import { WEEKDAY_LABELS, isSameDay, toISODate } from "../utils/calendarGrid.js";

export default function CalendarGrid({ days, sessionsByDate, selectedId, onSelectSession, currentMonth }) {
  const today = new Date();

  return (
    <div className="calendar">
      <div className="calendar-weekday-header">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday-label">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-body">
        {days.map((day) => {
          const daySessions = sessionsByDate[toISODate(day)] ?? [];
          const outsideMonth = currentMonth != null && day.getMonth() !== currentMonth;
          const cellClasses = ["calendar-cell"];
          if (outsideMonth) cellClasses.push("is-outside-month");
          if (isSameDay(day, today)) cellClasses.push("is-today");

          return (
            <div key={toISODate(day)} className={cellClasses.join(" ")}>
              <span className="calendar-cell-daynum">{day.getDate()}</span>
              <div className="calendar-cell-sessions">
                {daySessions.map((session) => (
                  <SessionChip
                    key={session.id}
                    session={session}
                    selected={session.id === selectedId}
                    onSelect={onSelectSession}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
