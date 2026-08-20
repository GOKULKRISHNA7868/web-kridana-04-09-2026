export function getChatDayKey(createdAt) {
  const date = toChatDate(createdAt);
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getChatDayLabel(createdAt) {
  const date = toChatDate(createdAt);
  if (!date) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function toChatDate(createdAt) {
  if (!createdAt) return null;
  if (createdAt?.toDate) return createdAt.toDate();
  if (createdAt?.seconds) return new Date(createdAt.seconds * 1000);
  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
