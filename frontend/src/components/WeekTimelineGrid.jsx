import { useTranslation } from "react-i18next";
import { isBeforeDay, isSameDay, toISODate, getWeekdayLabels } from "../utils/calendarGrid.js";
import { layoutDayEvents, toMinutes } from "../utils/timeLayout.js";
import { availabilityClass } from "../utils/availability.js";

const HOUR_HEIGHT = 48;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

function computeHourRange(days, sessionsByDate) {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const day of days) {
    const daySessions = sessionsByDate[toISODate(day)] ?? [];
    for (const session of daySessions) {
      startHour = Math.min(startHour, Math.floor(toMinutes(session.start_time) / 60));
      endHour = Math.max(endHour, Math.ceil(toMinutes(session.end_time) / 60));
    }
  }
  return { startHour, endHour };
}

export default function WeekTimelineGrid({ days, sessionsByDate, selectedId, onSelectSession }) {
  const { i18n } = useTranslation();
  const weekdayLabels = getWeekdayLabels(i18n.language);
  const { startHour, endHour } = computeHourRange(days, sessionsByDate);
  const hourCount = endHour - startHour;
  const totalHeight = hourCount * HOUR_HEIGHT;
  const hours = Array.from({ length: hourCount + 1 }, (_, i) => startHour + i);
  const today = new Date();

  return (
    <div className="week-timeline">
      <div className="week-timeline-header">
        <div className="week-timeline-gutter" />
        {days.map((day) => {
          const dayLabelClasses = ["week-timeline-daylabel"];
          if (isSameDay(day, today)) dayLabelClasses.push("is-today");
          if (isBeforeDay(day, today)) dayLabelClasses.push("is-past");
          return (
            <div key={toISODate(day)} className={dayLabelClasses.join(" ")}>
              <span className="week-timeline-weekday">{weekdayLabels[(day.getDay() + 6) % 7]}</span>
              <span className="week-timeline-daynum">{day.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="week-timeline-body">
        <div className="week-timeline-hours" style={{ height: totalHeight }}>
          {hours.map((h, i) => (
            <div key={h} className="week-timeline-hour-label" style={{ top: i * HOUR_HEIGHT }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="week-timeline-days">
          {days.map((day) => {
            const daySessions = sessionsByDate[toISODate(day)] ?? [];
            const placements = layoutDayEvents(daySessions);
            return (
              <div
                key={toISODate(day)}
                className="week-timeline-day-column"
                style={{ height: totalHeight, backgroundSize: `100% ${HOUR_HEIGHT}px` }}
              >
                {placements.map(({ session, col, startMin, endMin, totalCols }) => {
                  const top = (startMin - startHour * 60) * (HOUR_HEIGHT / 60);
                  const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 20);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      className={`week-event-block ${availabilityClass(session)} ${
                        session.id === selectedId ? "is-selected" : ""
                      }`}
                      style={{
                        top,
                        height,
                        left: `${(col / totalCols) * 100}%`,
                        width: `${100 / totalCols}%`,
                      }}
                      onClick={() => onSelectSession(session)}
                    >
                      <span className="week-event-time">{session.start_time?.slice(0, 5)}</span>
                      <span className="week-event-title">{session.display_title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
