export const IGUARD_TIME_ZONE = "America/Sao_Paulo";

type DateTimeInput = string | number | Date | null | undefined;

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: IGUARD_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toValidDate(value: DateTimeInput) {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toTimestamp(value: DateTimeInput) {
  return toValidDate(value)?.getTime() ?? null;
}

export function getDurationMilliseconds(
  startedAt: DateTimeInput,
  finishedAt: DateTimeInput,
) {
  const start = toTimestamp(startedAt);
  const finish = toTimestamp(finishedAt);
  if (start === null || finish === null) return null;

  return Math.max(0, finish - start);
}

export function formatDateTime(value: DateTimeInput, fallback = "—") {
  const date = toValidDate(value);
  if (!date) return fallback;

  const parts = dateTimeFormatter.formatToParts(date);
  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${readPart("day")}/${readPart("month")}/${readPart("year")}, ${readPart("hour")}:${readPart("minute")}`;
}
