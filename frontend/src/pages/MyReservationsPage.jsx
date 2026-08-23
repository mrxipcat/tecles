import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "../components/Button.jsx";
import { CalendarPlusIcon, CalendarXIcon, MailIcon, SaveIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { downloadReservationIcs } from "../utils/ics.js";
import { resolveSlotLabel } from "../utils/entityLabels.js";

const DOWNLOADABLE_STATUSES = ["pending", "confirmed"];

export default function MyReservationsPage() {
  const { t, i18n } = useTranslation("myReservations");
  const { user, entity } = useAuth();
  const STATUS_LABELS = {
    pending: t("status.pending"),
    confirmed: t("status.confirmed"),
    rejected: t("status.rejected"),
    cancelled: t("status.cancelled"),
    cancelled_by_admin: t("status.cancelled_by_admin"),
  };
  const singular = resolveSlotLabel(entity?.slot_label_singular, i18n.language) ?? t("sessionFallback");
  const [reservations, setReservations] = useState([]);

  async function load() {
    const { data } = await client.get("/reservations");
    setReservations(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(reservation) {
    if (!window.confirm(t("confirmCancel", { title: reservation.session_title }))) {
      return;
    }
    try {
      await client.delete(`/reservations/${reservation.id}`);
      load();
    } catch (err) {
      window.alert(err.response?.data?.detail || t("cancelError"));
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
      head: [[singular, t("columns.date"), t("columns.schedule"), t("columns.status")]],
      body: rows,
      didDrawPage: () => {
        doc.setFontSize(14);
        doc.text(entityName, 14, 14);
        doc.setFontSize(10);
        doc.text(t("pdf.subtitle", { userName }), 14, 20);

        doc.setFontSize(8);
        doc.text(t("pdf.printedAt", { date: printedAt }), 14, pageHeight - 10);
      },
    });
    doc.save(t("pdf.fileName"));
  }

  async function handleSendEmail() {
    try {
      const { data } = await client.post("/reservations/send-my-list-email");
      window.alert(data.detail);
    } catch (err) {
      window.alert(err.response?.data?.detail || t("sendEmailError"));
    }
  }

  const hasDownloadable = reservations.some((r) => DOWNLOADABLE_STATUSES.includes(r.status));

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("title")}</h1>
        <div className="table-actions">
          {hasDownloadable && (
            <Button icon={SaveIcon} onClick={handleDownloadPdf}>
              {t("downloadPdf")}
            </Button>
          )}
          {user?.email && hasDownloadable && (
            <Button icon={MailIcon} onClick={handleSendEmail}>
              {t("sendEmail")}
            </Button>
          )}
        </div>
      </div>
      <table className="my-reservations-table">
        <thead>
          <tr>
            <th>{singular}</th>
            <th>{t("columns.date")}</th>
            <th>{t("columns.schedule")}</th>
            <th>{t("columns.status")}</th>
            <th>{t("columns.requested")}</th>
            <th>{t("columns.confirmed")}</th>
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
                <div className="table-actions">
                  {reservation.status === "confirmed" && (
                    <Button
                      icon={CalendarPlusIcon}
                      onClick={() => downloadReservationIcs(reservation, entity?.name)}
                    >
                      {t("addToCalendar")}
                    </Button>
                  )}
                  {(reservation.status === "pending" || reservation.status === "confirmed") && (
                    <Button icon={CalendarXIcon} variant="danger" onClick={() => handleCancel(reservation)}>
                      {t("cancelReservation")}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reservations.length === 0 && <p>{t("empty")}</p>}
    </div>
  );
}
