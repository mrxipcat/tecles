import { useTranslation } from "react-i18next";

export default function RoomFilterBar({ rooms, activeRoomIds, onToggle }) {
  const { t } = useTranslation("calendar");

  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="room-filter-bar">
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          className={`room-filter-button ${activeRoomIds?.has(room.id) ? "is-active" : ""}`}
          onClick={() => onToggle(room.id)}
          aria-label={t("filterByRoom", { room: room.name })}
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}
