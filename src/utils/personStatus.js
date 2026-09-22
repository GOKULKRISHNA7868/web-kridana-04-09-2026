/**
 * Soft-leave model for institute trainers & students:
 *   status: "Active" | "Left"  (missing → treat as Active)
 *   leftDate: Timestamp | Date | string
 *   joiningDate / createdAt: when they joined
 *
 * Rule of thumb:
 *   - Operational lists (access, pickers, chat): hide people who have Left.
 *   - History (fees/salary/attendance by past day or month): show them only
 *     for periods on or before their leftDate (and on/after joining).
 */

/** Parse Firestore Timestamp, seconds object, Date, or date string → Date | null */
export const parsePersonDate = (raw) => {
  if (!raw) return null;
  try {
    if (typeof raw?.toDate === "function") return raw.toDate();
    if (typeof raw === "object" && raw.seconds != null) {
      return new Date(Number(raw.seconds) * 1000);
    }
    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? null : raw;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

export const isPersonLeft = (person) =>
  String(person?.status || "").toLowerCase() === "left";

/** Currently active for live operational UIs (access, chat, pickers). */
export const isPersonCurrentlyActive = (person) => {
  if (!person) return false;
  if (!isPersonLeft(person)) return true;
  const left = parsePersonDate(person.leftDate);
  if (!left) return false;
  // Left earlier today still counts as left for "current" lists
  return startOfDay(left) > startOfDay(new Date());
};

/**
 * Was this person active on a specific calendar day?
 * Inclusive of joining day and left day.
 */
export const isPersonActiveOnDate = (person, dateInput) => {
  if (!person) return false;
  const view = parsePersonDate(dateInput) || new Date();
  const day = startOfDay(view);

  const joined =
    parsePersonDate(person.joiningDate) ||
    parsePersonDate(person.createdAt) ||
    parsePersonDate(person.joinDate);
  if (joined && startOfDay(joined) > day) return false;

  if (isPersonLeft(person) || person.leftDate) {
    const left = parsePersonDate(person.leftDate);
    if (left) {
      if (day > startOfDay(left)) return false;
    } else if (isPersonLeft(person)) {
      // Left without a date → hide from current/future; allow past days
      if (day >= startOfDay(new Date())) return false;
    }
  }

  return true;
};

/**
 * Was this person active during a calendar month?
 * @param {number|string} year
 * @param {number|string} month 1–12
 */
export const isPersonActiveInMonth = (person, year, month) => {
  if (!person) return false;
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) {
    // No month context → only show currently active
    return isPersonCurrentlyActive(person);
  }

  const viewMonth = new Date(y, m - 1, 1);

  const joined =
    parsePersonDate(person.joiningDate) ||
    parsePersonDate(person.createdAt) ||
    parsePersonDate(person.joinDate);
  if (joined && startOfMonth(joined) > viewMonth) return false;

  if (isPersonLeft(person) || person.leftDate) {
    const left = parsePersonDate(person.leftDate);
    if (left) {
      if (viewMonth > startOfMonth(left)) return false;
    } else if (isPersonLeft(person)) {
      const now = new Date();
      const thisMonth = startOfMonth(now);
      if (viewMonth >= thisMonth) return false;
    }
  }

  return true;
};

/** Filter helpers */
export const filterCurrentlyActive = (list = []) =>
  list.filter(isPersonCurrentlyActive);

export const filterActiveOnDate = (list = [], dateInput) =>
  list.filter((p) => isPersonActiveOnDate(p, dateInput));

export const filterActiveInMonth = (list = [], year, month) =>
  list.filter((p) => isPersonActiveInMonth(p, year, month));

/** Short badge label for UI */
export const personStatusLabel = (person) => {
  if (isPersonLeft(person)) return "Left";
  return "Active";
};
