const CATALAN_MONTHS = [
  "gener", "febrer", "març", "abril", "maig", "juny",
  "juliol", "agost", "setembre", "octubre", "novembre", "desembre",
];

export const WEEKDAY_LABELS = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mondayOffset(date) {
  return (date.getDay() + 6) % 7; // Monday=0 .. Sunday=6
}

export function buildMonthDays(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = mondayOffset(firstOfMonth);
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month, 1 - leading);
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function buildWeekDays(referenceDate) {
  const start = new Date(referenceDate);
  start.setDate(referenceDate.getDate() - mondayOffset(referenceDate));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatRangeLabel(referenceDate, granularity) {
  if (granularity === "month") {
    return `${CATALAN_MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
  }
  const days = buildWeekDays(referenceDate);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = sameMonth
    ? `${start.getDate()}`
    : `${start.getDate()} de ${CATALAN_MONTHS[start.getMonth()]}`;
  const endLabel = `${end.getDate()} de ${CATALAN_MONTHS[end.getMonth()]} de ${end.getFullYear()}`;
  return `Setmana del ${startLabel} al ${endLabel}`;
}
