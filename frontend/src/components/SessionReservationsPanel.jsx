import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import client from "../api/client.js";
import Button from "./Button.jsx";
import { CalendarXIcon, CheckIcon, XIcon } from "./icons.jsx";

export default function SessionReservationsPanel({ sessionId, autoConfirm, onChanged }) {
  const { t } = useTranslation("reservationsPanels");
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
    await load();
    onChanged?.();
  }

  async function cancelConfirmed(reservation) {
    if (
      !window.confirm(
        t("cancelReservationForUser", { name: reservation.user.full_name || reservation.user.username })
      )
    ) {
      return;
    }
    await client.delete(`/reservations/${reservation.id}`);
    await load();
    onChanged?.();
  }

  const pending = reservations.filter((r) => r.status === "pending");
  const confirmed = reservations.filter((r) => r.status === "confirmed");

  return (
    <div className="reservations-panel">
      {!autoConfirm && (
        <section>
          <h4>{t("pendingHeading")}</h4>
          {pending.length === 0 && <p>{t("noPending")}</p>}
          {pending.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>{t("userColumn")}</th>
                  <th>{t("requestedAtColumn")}</th>
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
                          {t("confirmAction")}
                        </Button>
                        <Button icon={XIcon} variant="danger" onClick={() => decide(r.id, "rejected")}>
                          {t("rejectAction")}
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
        <h4>{t("confirmedHeading")}</h4>
        {confirmed.length === 0 && <p>{t("noConfirmed")}</p>}
        {confirmed.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t("userColumn")}</th>
                <th>{t("requestedAtColumn")}</th>
                <th>{t("confirmedAtColumn")}</th>
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
                      {t("cancelAction")}
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
