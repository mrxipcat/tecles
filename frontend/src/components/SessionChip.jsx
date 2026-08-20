import { availabilityClass } from "../utils/availability.js";

export default function SessionChip({ session, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`session-chip ${availabilityClass(session)} ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(session)}
    >
      <span className="session-chip-time">{session.start_time?.slice(0, 5)}</span>
      <span className="session-chip-title">{session.display_title}</span>
    </button>
  );
}
