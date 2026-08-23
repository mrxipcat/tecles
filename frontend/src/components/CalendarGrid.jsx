import { useTranslation } from "react-i18next";
import SessionChip from "./SessionChip.jsx";
import { getWeekdayLabels, isBeforeDay, isSameDay, toISODate } from "../utils/calendarGrid.js";

export default function CalendarGrid({ days, sessionsByDate, selectedId, onSelectSession, currentMonth }) {
  const { i18n } = useTranslation();
  const today = new Date();
  const weekdayLabels = getWeekdayLabels(i18n.language);

  return (
    <div className="calendar">
      <div className="calendar-weekday-header">
        {weekdayLabels.map((label, index) => (
          <div key={index} className="calendar-weekday-label">
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
          if (isBeforeDay(day, today)) cellClasses.push("is-past");

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
