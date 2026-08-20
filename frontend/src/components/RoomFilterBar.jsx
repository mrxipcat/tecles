export default function RoomFilterBar({ rooms, activeRoomIds, onToggle }) {
  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="room-filter-bar">
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          className={`room-filter-button ${activeRoomIds?.has(room.id) ? "is-active" : ""}`}
          onClick={() => onToggle(room.id)}
        >
          {room.name}
        </button>
      ))}
    </div>
  );
}
