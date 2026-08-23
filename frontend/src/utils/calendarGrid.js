import i18n from "../i18n/index.js";

// 2024-01-01 és un dilluns: es fa servir com a referència per generar noms de
// dia en l'ordre Dilluns→Diumenge amb el locale actiu, sense mantenir una
// traducció manual per idioma.
export function getWeekdayLabels(locale = i18n.language) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
}

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

export function isBeforeDay(a, b) {
  const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDate < bDate;
}

// Capitalitza la primera lletra de cada paraula (incloent-hi després d'un
// apòstrof, com a "d'Agost"): els noms de mes d'`Intl` venen en minúscules
// per a ca/es, i `text-transform: capitalize` de CSS no ho fa bé amb
// apòstrofs, així que ho resolem aquí a nivell de text.
function capitalizeWords(text) {
  return text.replace(/(^|[^\p{L}])(\p{L})/gu, (_, boundary, letter) => boundary + letter.toUpperCase());
}

export function formatRangeLabel(referenceDate, granularity, locale = i18n.language) {
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long" });
  if (granularity === "month") {
    return capitalizeWords(`${monthFormatter.format(referenceDate)} ${referenceDate.getFullYear()}`);
  }
  const days = buildWeekDays(referenceDate);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = sameMonth
    ? `${start.getDate()}`
    : i18n.t("calendar:dayMonth", { day: start.getDate(), month: monthFormatter.format(start) });
  const endLabel = i18n.t("calendar:dayMonthYear", {
    day: end.getDate(),
    month: monthFormatter.format(end),
    year: end.getFullYear(),
  });
  return capitalizeWords(i18n.t("calendar:weekRange", { start: startLabel, end: endLabel }));
}
