import RoomFilterBar from "../components/RoomFilterBar.jsx";
import SessionCard from "../components/SessionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSessions } from "../hooks/useSessions.js";

export default function SessionsListPage() {
  const { user, entity, isAdmin } = useAuth();
  const { sessions, rooms, activeRoomIds, toggleRoom, message, reserve, cancel } = useSessions(user.entity_id);
  const plural = entity?.slot_label_plural ?? "Sessions";

  return (
    <div className="page">
      <h1>{plural} disponibles</h1>
      {entity?.is_multiroom && !user.assigned_room_id && (
        <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />
      )}
      {message && <p className="info">{message}</p>}
      <div className="session-list">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onReserve={isAdmin ? undefined : reserve}
            onCancel={isAdmin ? undefined : cancel}
          />
        ))}
        {sessions.length === 0 && <p>No hi ha {plural} disponibles.</p>}
      </div>
    </div>
  );
}
