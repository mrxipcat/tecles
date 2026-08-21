import { useCallback, useEffect, useMemo, useState } from "react";
import client from "../api/client.js";

export function useSessions(entityId, visibleRoomIds) {
  const [allSessions, setAllSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomIds, setActiveRoomIds] = useState(null);
  const [message, setMessage] = useState(null);

  const reload = useCallback(async () => {
    if (!entityId) return;
    const { data } = await client.get("/sessions", { params: { entity_id: entityId } });
    setAllSessions(data);
  }, [entityId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!entityId) return;
    client.get("/rooms", { params: { entity_id: entityId } }).then(({ data }) => {
      // Cap grup assignat (visibleRoomIds buit/null) = sense restricció, veu tots.
      const visible =
        visibleRoomIds && visibleRoomIds.length > 0
          ? data.filter((room) => visibleRoomIds.includes(room.id))
          : data;
      setRooms(visible);
      setActiveRoomIds(new Set(visible.map((room) => room.id)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, JSON.stringify(visibleRoomIds)]);

  function toggleRoom(roomId) {
    setActiveRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  async function reserve(session) {
    setMessage(null);
    try {
      const { data } = await client.post("/reservations", { session_id: session.id });
      setMessage(
        data.status === "confirmed"
          ? `Reserva confirmada per a "${session.display_title}".`
          : `Sol·licitud de reserva enviada per a "${session.display_title}", pendent de confirmació.`
      );
      await reload();
    } catch (err) {
      window.alert(err.response?.data?.detail || "No s'ha pogut reservar.");
    }
  }

  async function cancel(session) {
    if (!session.my_reservation_id) return;
    setMessage(null);
    try {
      await client.delete(`/reservations/${session.my_reservation_id}`);
      setMessage(`Reserva cancel·lada per a "${session.display_title}".`);
      await reload();
    } catch (err) {
      window.alert(err.response?.data?.detail || "No s'ha pogut cancel·lar la reserva.");
    }
  }

  const sessions = useMemo(() => {
    const filtered = activeRoomIds ? allSessions.filter((s) => activeRoomIds.has(s.room_id)) : allSessions;
    // Amb el filtre reduït a una sola sala, repetir-ne el nom al títol és redundant.
    if (activeRoomIds && activeRoomIds.size === 1) {
      return filtered.map((s) => ({ ...s, display_title: s.title || "(sense títol)" }));
    }
    return filtered;
  }, [allSessions, activeRoomIds]);

  return { sessions, rooms, activeRoomIds, toggleRoom, message, reload, reserve, cancel };
}

export default useSessions;
