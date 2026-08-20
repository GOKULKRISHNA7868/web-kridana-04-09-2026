import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  ensureWalkingNotifications,
  getNotificationSettings,
  getWalkChannelId,
  isWalkingMuted,
  NOTIFICATION_SOUNDS,
} from "../../utils/chatNotifications";

const LIVE_ID = 41001;
const GOAL_ID = 41002;
const MILESTONE_ID = 41003;
const DAILY_ID = 41010;

function soundFile() {
  const settings = getNotificationSettings();
  const meta =
    NOTIFICATION_SOUNDS.find((item) => item.id === settings.walkingSound) ||
    NOTIFICATION_SOUNDS[0];
  if (meta.id === "silent") return undefined;
  return meta.file || "default";
}

async function notify({ id, title, body, ongoing = false }) {
  if (isWalkingMuted()) return;
  if (!Capacitor.isNativePlatform()) return;

  const permission = await ensureWalkingNotifications();
  if (permission?.display !== "granted") return;

  const settings = getNotificationSettings();
  const silent = settings.walkingSound === "silent";

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        channelId: getWalkChannelId(),
        smallIcon: "ic_launcher",
        ongoing,
        autoCancel: !ongoing,
        sound: silent ? undefined : soundFile(),
        extra: { type: "walking" },
      },
    ],
  });
}

export async function requestWalkNotificationPermission() {
  try {
    const permission = await ensureWalkingNotifications(true);
    return permission?.display === "granted";
  } catch (error) {
    console.error("Walking notification permission error:", error);
    return false;
  }
}

export async function notifyWalkStarted() {
  await notify({
    id: LIVE_ID,
    title: "Walk in progress",
    body: "Steps count only when you actually walk.",
    ongoing: true,
  });
}

export async function updateLiveWalkNotification({ steps, goal, moving }) {
  const remaining = Math.max(0, Number(goal || 0) - Number(steps || 0));
  await notify({
    id: LIVE_ID,
    title: moving ? "Walking now" : "Waiting for steps",
    body: moving
      ? `${Number(steps || 0).toLocaleString()} steps · ${remaining.toLocaleString()} to goal`
      : "Walk to continue counting. Standing still is not added.",
    ongoing: true,
  });
}

export async function notifyWalkMilestone(percent) {
  await notify({
    id: MILESTONE_ID,
    title: percent >= 100 ? "Daily goal complete" : "Halfway there",
    body:
      percent >= 100
        ? "Great work. Your walk is saved to your account."
        : "Keep walking. Only real steps are counted.",
  });
}

export async function notifyWalkSaved({ steps, distance, calories }) {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: LIVE_ID }] });
  } catch {
    /* ignore */
  }

  await notify({
    id: GOAL_ID,
    title: steps > 0 ? "Walk saved" : "Walk ended",
    body:
      steps > 0
        ? `${steps.toLocaleString()} steps · ${Number(distance).toFixed(2)} km · ${calories} kcal`
        : "No steps were counted because the phone stayed still.",
  });
}

export async function scheduleDailyWalkReminder(hour = 19) {
  const settings = getNotificationSettings();
  if (isWalkingMuted() || settings.walkingReminders === false) return;
  if (!Capacitor.isNativePlatform()) return;

  const permission = await ensureWalkingNotifications();
  if (permission?.display !== "granted") return;

  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  if (at.getTime() <= Date.now()) {
    at.setDate(at.getDate() + 1);
  }

  const silent = settings.walkingSound === "silent";

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_ID,
        title: "Time for a walk",
        body: "A short walk today keeps your progress accurate and on track.",
        channelId: getWalkChannelId(),
        smallIcon: "ic_launcher",
        sound: silent ? undefined : soundFile(),
        schedule: {
          at,
          repeats: true,
          every: "day",
        },
        extra: { type: "walking_reminder" },
      },
    ],
  });
}
