export function availabilityClass(session) {
  if (session.my_reservation_id) return "is-mine";
  if (session.available_places == null) return "";
  return session.available_places > 0 ? "is-available" : "is-full";
}

export function availabilityText(session) {
  if (session.available_places == null) return `Capacitat: ${session.capacity}`;
  if (session.capacity === 1) return session.available_places === 1 ? "Disponible" : "No disponible";
  return `Places lliures: ${session.available_places} / ${session.capacity}`;
}
