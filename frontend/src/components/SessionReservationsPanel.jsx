import { useCallback, useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "./Button.jsx";
import { CalendarXIcon, CheckIcon, XIcon } from "./icons.jsx";

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

  async function cancelConfirmed(reservation) {
    if (!window.confirm(`Vols cancel·lar la reserva de "${reservation.user.full_name || reservation.user.username}"?`)) {
      return;
    }
    await client.delete(`/reservations/${reservation.id}`);
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
                      <div className="table-actions">
                        <Button icon={CheckIcon} variant="primary" onClick={() => decide(r.id, "confirmed")}>
                          Confirmar
                        </Button>
                        <Button icon={XIcon} variant="danger" onClick={() => decide(r.id, "rejected")}>
                          Rebutjar
                        </Button>
                      </div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((r) => (
                <tr key={r.id}>
                  <td>{r.user.full_name || r.user.username}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : ""}</td>
                  <td>
                    <Button icon={CalendarXIcon} variant="danger" onClick={() => cancelConfirmed(r)}>
                      Cancel·la
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
