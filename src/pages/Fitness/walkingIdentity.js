import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

const PROFILE_LOOKUPS = [
  {
    collection: "InstituteTrainers",
    role: "trainer",
    names: ["trainerName", "name", "fullName", "firstName"],
  },
  {
    collection: "trainers",
    role: "trainer",
    names: ["trainerName", "name", "fullName", "firstName"],
  },
  {
    collection: "institutes",
    role: "institute",
    names: ["instituteName", "name", "fullName"],
  },
  {
    collection: "families",
    role: "family",
    names: ["name", "parentName", "fullName"],
  },
  {
    collection: "students",
    role: "student",
    names: ["name", "studentName", "fullName", "firstName"],
  },
  {
    collection: "users",
    role: "user",
    names: ["name", "fullName", "firstName"],
  },
];

function pickName(data = {}, fields = []) {
  for (const field of fields) {
    const value = String(data[field] || "").trim();
    if (value) return value;
  }

  const combined = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  return combined || "";
}

export function waitForAuthUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

export async function resolveWalkingUser() {
  const firebaseUser = await waitForAuthUser();
  if (!firebaseUser?.uid) return null;

  const uid = firebaseUser.uid;
  let matched = {
    uid,
    email: firebaseUser.email || "",
    role: "user",
    displayName: firebaseUser.displayName || "User",
    source: "auth",
  };

  for (const lookup of PROFILE_LOOKUPS) {
    try {
      const snap = await getDoc(doc(db, lookup.collection, uid));
      if (!snap.exists()) continue;

      const data = snap.data() || {};
      matched = {
        uid,
        email: firebaseUser.email || data.email || "",
        role: lookup.role,
        displayName:
          pickName(data, lookup.names) ||
          firebaseUser.displayName ||
          "User",
        source: lookup.collection,
      };
      break;
    } catch (error) {
      console.error(`Walking profile lookup failed for ${lookup.collection}`, error);
    }
  }

  return matched;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function yearKey(date = new Date()) {
  return String(date.getFullYear());
}

export function weekKey(date = new Date()) {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function dateKeysBetween(start, end) {
  const keys = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export const STEP_LENGTH_METERS = 0.762;
export const CALORIES_PER_STEP = 0.04;
export const DEFAULT_GOAL = 10000;
export const IDLE_MS = 4000;

export function stepsToDistanceKm(steps) {
  return Number(((Number(steps) || 0) * STEP_LENGTH_METERS) / 1000);
}

export function stepsToCalories(steps) {
  return Math.round((Number(steps) || 0) * CALORIES_PER_STEP);
}

export function formatDuration(totalSeconds = 0) {
  const value = Math.max(0, Number(totalSeconds) || 0);
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatClock(totalSeconds = 0) {
  const value = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(value / 3600)).padStart(2, "0");
  const m = String(Math.floor((value % 3600) / 60)).padStart(2, "0");
  const s = String(value % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
