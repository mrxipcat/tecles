import { useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { CalendarXIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  pending: "Pendent",
  confirmed: "Confirmada",
  rejected: "Rebutjada",
  cancelled: "Cancel·lada",
};

export default function MyReservationsPage() {
  const { entity } = useAuth();
  const singular = entity?.slot_label_singular ?? "Sessió";
  const [reservations, setReservations] = useState([]);

  async function load() {
    const { data } = await client.get("/reservations");
    setReservations(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(reservation) {
    if (!window.confirm(`Vols cancel·lar la reserva de "${reservation.session_title}"?`)) {
      return;
    }
    try {
      await client.delete(`/reservations/${reservation.id}`);
      load();
    } catch (err) {
      window.alert(err.response?.data?.detail || "No s'ha pogut cancel·lar la reserva.");
    }
  }

  return (
    <div className="page">
      <h1>Les meves reserves</h1>
      <table className="my-reservations-table">
        <thead>
          <tr>
            <th>{singular}</th>
            <th>Estat</th>
            <th>Sol·licitada</th>
            <th>Confirmada el</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr
              key={reservation.id}
              className={
                reservation.status === "pending" || reservation.status === "confirmed" ? "is-mine" : ""
              }
            >
              <td>{reservation.session_title}</td>
              <td>{STATUS_LABELS[reservation.status] || reservation.status}</td>
              <td>{new Date(reservation.created_at).toLocaleString()}</td>
              <td>{reservation.confirmed_at ? new Date(reservation.confirmed_at).toLocaleString() : ""}</td>
              <td>
                {(reservation.status === "pending" || reservation.status === "confirmed") && (
                  <Button icon={CalendarXIcon} variant="danger" onClick={() => handleCancel(reservation)}>
                    Cancel·la la reserva
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reservations.length === 0 && <p>No tens cap reserva.</p>}
    </div>
  );
}
