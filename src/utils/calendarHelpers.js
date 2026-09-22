export const parseFirestoreDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object" && value.seconds != null) {
    return new Date(Number(value.seconds) * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatCalendarTime = (date, is24Hour = false) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !is24Hour,
  }).format(date);
};

export const formatCalendarDate = (date, withWeekday = false) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: withWeekday ? "short" : undefined,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const isToday = (date) => isSameDay(date, new Date());

export const isThisWeek = (date) => {
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
};

export const uniqueValues = (items, getter) =>
  [...new Set(items.map(getter).filter(Boolean))].sort();

export const normalizeAttendanceStatus = (status = "") => {
  const value = String(status).toLowerCase();
  if (value === "present") return "present";
  if (value === "absent") return "absent";
  return "unknown";
};
