import Button from "../components/Button.jsx";
import { RefreshIcon } from "../components/icons.jsx";
import RoomFilterBar from "../components/RoomFilterBar.jsx";
import SessionCard from "../components/SessionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSessions } from "../hooks/useSessions.js";

export default function SessionsListPage() {
  const { user, entity, isAdmin } = useAuth();
  const { sessions, rooms, activeRoomIds, toggleRoom, message, reload, reserve, cancel } = useSessions(
    user.entity_id,
    isAdmin ? null : user.visible_room_ids
  );
  const plural = entity?.slot_label_plural ?? "Sessions";
  const showRoomFilter = entity?.is_multiroom && (isAdmin || (user.visible_room_ids?.length ?? 0) !== 1);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{plural} disponibles</h1>
        <Button icon={RefreshIcon} onClick={reload}>
          Actualitza
        </Button>
      </div>
      {showRoomFilter && (
        <RoomFilterBar rooms={rooms} activeRoomIds={activeRoomIds} onToggle={toggleRoom} />
      )}
      {message && <p className="info">{message}</p>}
      {sessions.length > 0 ? (
        <div className="session-list">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} onReserve={reserve} onCancel={cancel} />
          ))}
        </div>
      ) : (
        <p>No hi ha {plural} disponibles.</p>
      )}
    </div>
  );
}
