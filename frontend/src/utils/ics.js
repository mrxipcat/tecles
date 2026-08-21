function pad(n) {
  return String(n).padStart(2, "0");
}

function toIcsLocalDateTime(date, time) {
  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");
  return `${year}${month}${day}T${pad(hour)}${pad(minute)}00`;
}

function toIcsTimestamp(d) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildReservationIcs(reservation, entityName) {
  const dtStart = toIcsLocalDateTime(reservation.session_date, reservation.session_start_time.slice(0, 5));
  const dtEnd = toIcsLocalDateTime(reservation.session_date, reservation.session_end_time.slice(0, 5));
  const summary = escapeIcsText(reservation.session_title);
  const description = entityName ? escapeIcsText(entityName) : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WebAules//Reserves//CA",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:reserva-${reservation.id}@webaules`,
    `DTSTAMP:${toIcsTimestamp(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    ...(description ? [`DESCRIPTION:${description}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function downloadReservationIcs(reservation, entityName) {
  const content = buildReservationIcs(reservation, entityName);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reserva-${reservation.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
