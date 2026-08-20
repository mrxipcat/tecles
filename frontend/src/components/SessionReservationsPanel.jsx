import { useCallback, useEffect, useState } from "react";
import client from "../api/client.js";

export default function SessionReservationsPanel({ sessionId, autoConfirm }) {
  const [reservations, setReservations] = useState([]);

  const load = useCallback(async () => {
    const { data } = await client.get("/reservations", { params: { session_id: sessionId } });
    setReservations(data);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(reservationId, status) {
    await client.patch(`/reservations/${reservationId}`, { status });
    load();
  }

  const pending = reservations.filter((r) => r.status === "pending");
  const confirmed = reservations.filter((r) => r.status === "confirmed");

  return (
    <div className="reservations-panel">
      {!autoConfirm && (
        <section>
          <h4>Sol·licituds pendents</h4>
          {pending.length === 0 && <p>Cap sol·licitud pendent.</p>}
          {pending.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Usuari</th>
                  <th>Sol·licitat el</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>{r.user.full_name || r.user.username}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>
                      <button onClick={() => decide(r.id, "confirmed")}>Confirmar</button>
                      <button onClick={() => decide(r.id, "rejected")}>Rebutjar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      <section>
        <h4>Reserves confirmades</h4>
        {confirmed.length === 0 && <p>Cap reserva confirmada.</p>}
        {confirmed.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Usuari</th>
                <th>Sol·licitat el</th>
                <th>Confirmat el</th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((r) => (
                <tr key={r.id}>
                  <td>{r.user.full_name || r.user.username}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
