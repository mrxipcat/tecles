import { useEffect, useState } from "react";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { CalendarXIcon, SaveIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  pending: "Pendent",
  confirmed: "Confirmada",
  rejected: "Rebutjada",
  cancelled: "Cancel·lada",
};

const DOWNLOADABLE_STATUSES = ["pending", "confirmed"];

export default function MyReservationsPage() {
  const { user, entity } = useAuth();
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

  async function handleDownloadPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const rows = reservations
      .filter((r) => DOWNLOADABLE_STATUSES.includes(r.status))
      .sort((a, b) => (a.session_date + a.session_start_time).localeCompare(b.session_date + b.session_start_time))
      .map((r) => [
        r.session_title,
        r.session_date,
        `${r.session_start_time.slice(0, 5)}–${r.session_end_time.slice(0, 5)}`,
        STATUS_LABELS[r.status] || r.status,
      ]);

    const entityName = entity?.name || "";
    const userName = user?.full_name || user?.username || "";
    const printedAt = new Date().toLocaleString("ca-ES");

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();

    autoTable(doc, {
      startY: 28,
      head: [[singular, "Data", "Horari", "Estat"]],
      body: rows,
      didDrawPage: () => {
        doc.setFontSize(14);
        doc.text(entityName, 14, 14);
        doc.setFontSize(10);
        doc.text(`Les meves reserves — ${userName}`, 14, 20);

        doc.setFontSize(8);
        doc.text(`Imprès el ${printedAt}`, 14, pageHeight - 10);
      },
    });
    doc.save("les-meves-reserves.pdf");
  }

  const hasDownloadable = reservations.some((r) => DOWNLOADABLE_STATUSES.includes(r.status));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Les meves reserves</h1>
        {hasDownloadable && (
          <Button icon={SaveIcon} onClick={handleDownloadPdf}>
            Descarrega PDF
          </Button>
        )}
      </div>
      <table className="my-reservations-table">
        <thead>
          <tr>
            <th>{singular}</th>
            <th>Data</th>
            <th>Horari</th>
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
              <td>{reservation.session_date}</td>
              <td>
                {reservation.session_start_time.slice(0, 5)}–{reservation.session_end_time.slice(0, 5)}
              </td>
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
