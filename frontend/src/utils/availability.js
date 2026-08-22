export function availabilityClass(session) {
  if (session.my_reservation_id) return "is-mine";
  if (session.is_available == null) return "";
  return session.is_available ? "is-available" : "is-full";
}

export function availabilityText(session) {
  if (session.my_reservation_status === "confirmed") return "Reserva Confirmada";
  if (session.my_reservation_status === "pending") return "Reserva Sol·licitada";
  // available_places és null quan l'entitat té "Mostrar les places lliures"
  // desactivat: només s'informa de disponible/no disponible, sense capacitat ni ocupació.
  if (session.available_places == null) return session.is_available ? "Disponible" : "No disponible";
  if (session.capacity === 1) return session.available_places === 1 ? "Disponible" : "No disponible";
  return `Places lliures: ${session.available_places} / ${session.capacity}`;
}
