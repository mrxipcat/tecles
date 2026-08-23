import i18n from "../i18n/index.js";

export function isExpiredSession(session) {
  return new Date(`${session.date}T${session.end_time}`) < new Date();
}

export function availabilityClass(session) {
  if (isExpiredSession(session)) return "is-expired";
  if (session.my_reservation_id) return "is-mine";
  if (session.is_available == null) return "";
  return session.is_available ? "is-available" : "is-full";
}

export function availabilityText(session) {
  let text;
  if (session.my_reservation_status === "confirmed") text = i18n.t("sessionDisplay:reservationConfirmed");
  else if (session.my_reservation_status === "pending") text = i18n.t("sessionDisplay:reservationPending");
  // available_places és null quan l'entitat té "Mostrar les places lliures"
  // desactivat: només s'informa de disponible/no disponible, sense capacitat ni ocupació.
  else if (session.available_places == null)
    text = i18n.t(session.is_available ? "sessionDisplay:available" : "sessionDisplay:notAvailable");
  else if (session.capacity === 1)
    text = i18n.t(session.available_places === 1 ? "sessionDisplay:available" : "sessionDisplay:notAvailable");
  else
    text = i18n.t("sessionDisplay:freePlaces", {
      available: session.available_places,
      capacity: session.capacity,
    });

  return isExpiredSession(session) ? `${text} · ${i18n.t("sessionDisplay:expiredLabel")}` : text;
}
