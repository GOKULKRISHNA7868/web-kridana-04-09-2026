import { parseFirestoreDate, isSameDay } from "./calendarHelpers";

const pad = (n) => String(n).padStart(2, "0");

export const toMinutes = (date) => date.getHours() * 60 + date.getMinutes();

export const minutesToTime = (mins) =>
  `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

export const getEventRange = (item) => {
  const start = parseFirestoreDate(item.start);
  const end = parseFirestoreDate(item.end);
  if (!start || !end) return null;
  return { start, end, startMin: toMinutes(start), endMin: toMinutes(end) };
};

export const detectConflicts = (schedule, candidate, excludeId = null) => {
  const start = parseFirestoreDate(candidate.start);
  const end = parseFirestoreDate(candidate.end);
  if (!start || !end) return [];

  return schedule.filter((item) => {
    if (excludeId && item.id === excludeId) return false;
    if (candidate.trainerId && item.trainerId !== candidate.trainerId) {
      return false;
    }
    const range = getEventRange(item);
    if (!range) return false;
    return start < range.end && end > range.start;
  });
};

export const suggestFreeSlots = (
  schedule,
  date,
  { durationMinutes = 60, trainerId, dayStart = 6 * 60, dayEnd = 21 * 60 } = {},
) => {
  const day = parseFirestoreDate(date);
  if (!day) return [];

  const dayItems = schedule
    .filter((item) => {
      const range = getEventRange(item);
      if (!range || !isSameDay(range.start, day)) return false;
      if (trainerId && item.trainerId !== trainerId) return false;
      return true;
    })
    .map(getEventRange)
    .filter(Boolean)
    .sort((a, b) => a.startMin - b.startMin);

  const slots = [];
  let cursor = dayStart;

  dayItems.forEach((item) => {
    if (item.startMin - cursor >= durationMinutes) {
      slots.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + durationMinutes),
        label: `${minutesToTime(cursor)} – ${minutesToTime(cursor + durationMinutes)}`,
      });
    }
    cursor = Math.max(cursor, item.endMin);
  });

  if (dayEnd - cursor >= durationMinutes) {
    slots.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(dayEnd),
      label: `${minutesToTime(cursor)} – ${minutesToTime(cursor + durationMinutes)}`,
    });
  }

  return slots.slice(0, 4);
};

export const buildScheduleInsights = (schedule = []) => {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeek = schedule.filter((item) => {
    const start = parseFirestoreDate(item.start);
    return start && start >= weekStart && start < weekEnd;
  });

  const dayCounts = {};
  thisWeek.forEach((item) => {
    const start = parseFirestoreDate(item.start);
    if (!start) return;
    const key = start.toLocaleDateString("en-IN", { weekday: "long" });
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });

  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  const conflicts = [];
  for (let i = 0; i < schedule.length; i += 1) {
    for (let j = i + 1; j < schedule.length; j += 1) {
      const a = getEventRange(schedule[i]);
      const b = getEventRange(schedule[j]);
      if (!a || !b) continue;
      if (schedule[i].trainerId !== schedule[j].trainerId) continue;
      if (a.start < b.end && a.end > b.start) {
        conflicts.push({ a: schedule[i], b: schedule[j] });
      }
    }
  }

  const todayCount = schedule.filter((item) =>
    isSameDay(parseFirestoreDate(item.start), now),
  ).length;

  const insights = [];

  if (todayCount > 0) {
    insights.push({
      type: "info",
      text: `${todayCount} class${todayCount === 1 ? "" : "es"} scheduled for today.`,
    });
  }

  if (busiestDay) {
    insights.push({
      type: "tip",
      text: `Busiest day this week: ${busiestDay[0]} (${busiestDay[1]} classes).`,
    });
  }

  if (conflicts.length > 0) {
    insights.push({
      type: "warn",
      text: `${conflicts.length} trainer time conflict${conflicts.length === 1 ? "" : "s"} detected. Review overlapping sessions.`,
    });
  }

  if (thisWeek.length === 0) {
    insights.push({
      type: "tip",
      text: "No classes this week yet. Tap a time slot or use Add class to schedule.",
    });
  }

  return { insights, todayCount, weekCount: thisWeek.length, conflicts };
};

export const classAccent = (category, cancelled) => {
  if (cancelled) {
    return { bar: "bg-red-500", tag: "bg-red-50 text-red-700", chip: "bg-red-100 text-red-800 border-red-200" };
  }
  const map = {
    "Martial Arts": { bar: "bg-sky-500", tag: "bg-sky-50 text-sky-700", chip: "bg-sky-100 text-sky-900 border-sky-200" },
    Fitness: { bar: "bg-violet-500", tag: "bg-violet-50 text-violet-700", chip: "bg-violet-100 text-violet-900 border-violet-200" },
    "Racket Sports": { bar: "bg-emerald-500", tag: "bg-emerald-50 text-emerald-700", chip: "bg-emerald-100 text-emerald-900 border-emerald-200" },
    Dance: { bar: "bg-pink-500", tag: "bg-pink-50 text-pink-700", chip: "bg-pink-100 text-pink-900 border-pink-200" },
    Wellness: { bar: "bg-teal-500", tag: "bg-teal-50 text-teal-700", chip: "bg-teal-100 text-teal-900 border-teal-200" },
    "Team Ball Sports": { bar: "bg-indigo-500", tag: "bg-indigo-50 text-indigo-700", chip: "bg-indigo-100 text-indigo-900 border-indigo-200" },
    "Aquatic Sports": { bar: "bg-cyan-500", tag: "bg-cyan-50 text-cyan-700", chip: "bg-cyan-100 text-cyan-900 border-cyan-200" },
  };
  return map[category] || { bar: "bg-[#ff6a00]", tag: "bg-orange-50 text-[#ff6a00]", chip: "bg-orange-100 text-orange-900 border-orange-200" };
};
