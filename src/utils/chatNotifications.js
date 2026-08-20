import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const CHAT_CHANNEL_BASE = "kridana_chat";
export const WALK_CHANNEL_BASE = "kridana_walk";
export const CHAT_MUTE_KEY = "chatMuted";
const SETTINGS_COL = "notificationSettings";
const SENDER_CACHE = new Map();

/**
 * Classic alert tones (WAV in res/raw + public/sounds).
 * Packaged in the APK so they work on installed Android devices.
 */
export const NOTIFICATION_SOUNDS = [
  {
    id: "default",
    label: "System",
    file: "default",
    hint: "Phone default tone",
    previewSrc: null,
  },
  {
    id: "ding",
    label: "Classic",
    file: "classic_ding",
    hint: "Simple two-note alert",
    previewSrc: "/sounds/classic_ding.wav",
  },
  {
    id: "note",
    label: "Note",
    file: "classic_note",
    hint: "Single clear note",
    previewSrc: "/sounds/classic_note.wav",
  },
  {
    id: "pop",
    label: "Pop",
    file: "classic_pop",
    hint: "Short classic pop",
    previewSrc: "/sounds/classic_pop.wav",
  },
  {
    id: "silent",
    label: "Silent",
    file: null,
    hint: "No sound",
    previewSrc: null,
  },
];

const LEGACY_SOUND_MAP = {
  message: "ding",
  beep: "note",
  message1: "ding",
  beep1: "note",
  chime: "ding",
  ping: "note",
  soft: "pop",
};

let previewAudio = null;

function normalizeSoundId(value) {
  const raw = String(value || "default");
  const mapped = LEGACY_SOUND_MAP[raw] || raw;
  const match = NOTIFICATION_SOUNDS.find((item) => item.id === mapped);
  return match ? match.id : "default";
}

function soundMeta(soundId) {
  return (
    NOTIFICATION_SOUNDS.find((item) => item.id === soundId) ||
    NOTIFICATION_SOUNDS[0]
  );
}

/** Play a short preview so users can pick a tone confidently */
export async function previewNotificationSound(soundId) {
  const meta = soundMeta(normalizeSoundId(soundId));
  if (!meta?.previewSrc) return false;

  try {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    previewAudio = new Audio(meta.previewSrc);
    previewAudio.volume = 0.8;
    await previewAudio.play();
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_SETTINGS = {
  globalMute: false,
  walkingMute: false,
  mutedChats: {},
  chatSound: "ding",
  walkingSound: "ding",
  chatVibrate: true,
  walkingVibrate: true,
  walkingReminders: true,
  preferCloudPush: true,
};

let activeChatId = null;
let appIsActive = true;
let chatChannelReadyKey = "";
let walkChannelReadyKey = "";
let appStateHooked = false;
let settingsCache = { ...DEFAULT_SETTINGS, mutedChats: {} };

const USER_COLLECTIONS = [
  "users",
  "students",
  "institutes",
  "trainers",
  "trainerstudents",
  "InstituteTrainers",
];

export function getNotificationSettings() {
  return settingsCache;
}

export function getChatChannelId(soundId = settingsCache.chatSound) {
  return `${CHAT_CHANNEL_BASE}_v6_${normalizeSoundId(soundId)}`;
}

export function getWalkChannelId(soundId = settingsCache.walkingSound) {
  return `${WALK_CHANNEL_BASE}_v6_${normalizeSoundId(soundId)}`;
}

/** Alias kept for older imports */
export const CHAT_CHANNEL_ID = getChatChannelId("default");

export function isChatMuted() {
  return Boolean(settingsCache.globalMute);
}

export function isWalkingMuted() {
  return Boolean(settingsCache.walkingMute);
}

export function isConversationMuted(chatId) {
  if (!chatId) return isChatMuted();
  if (settingsCache.globalMute) return true;
  return settingsCache.mutedChats?.[chatId] === true;
}

export function setChatMuted(muted) {
  settingsCache = { ...settingsCache, globalMute: Boolean(muted) };
  try {
    localStorage.setItem(CHAT_MUTE_KEY, String(Boolean(muted)));
  } catch {
    /* ignore */
  }
}

async function persistSettings(uid, patch) {
  settingsCache = {
    ...settingsCache,
    ...patch,
    mutedChats: {
      ...(settingsCache.mutedChats || {}),
      ...(patch.mutedChats || {}),
    },
  };

  if (patch.globalMute !== undefined) {
    setChatMuted(patch.globalMute);
  }

  if (!uid) {
    try {
      localStorage.setItem(
        "kridana_notif_prefs",
        JSON.stringify({
          chatSound: settingsCache.chatSound,
          walkingSound: settingsCache.walkingSound,
          walkingMute: settingsCache.walkingMute,
          chatVibrate: settingsCache.chatVibrate,
          walkingVibrate: settingsCache.walkingVibrate,
          walkingReminders: settingsCache.walkingReminders,
          preferCloudPush: settingsCache.preferCloudPush,
        }),
      );
    } catch {
      /* ignore */
    }
    return settingsCache;
  }

  await setDoc(
    doc(db, SETTINGS_COL, uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return settingsCache;
}

export async function setGlobalMute(uid, muted) {
  return persistSettings(uid, { globalMute: Boolean(muted) });
}

export async function setWalkingMute(uid, muted) {
  return persistSettings(uid, { walkingMute: Boolean(muted) });
}

export async function setConversationMute(uid, chatId, muted) {
  if (!uid || !chatId) return settingsCache;
  return persistSettings(uid, {
    mutedChats: { [chatId]: Boolean(muted) },
  });
}

export async function setChatSound(uid, soundId) {
  const next = normalizeSoundId(soundId);
  chatChannelReadyKey = "";
  await persistSettings(uid, { chatSound: next });
  await ensureChatNotifications(true);
  return settingsCache;
}

export async function setWalkingSound(uid, soundId) {
  const next = normalizeSoundId(soundId);
  walkChannelReadyKey = "";
  await persistSettings(uid, { walkingSound: next });
  await ensureWalkingNotifications(true);
  return settingsCache;
}

/** One tone for chat + walking — keeps settings simple for users */
export async function setAlertSound(uid, soundId) {
  const next = normalizeSoundId(soundId);
  chatChannelReadyKey = "";
  walkChannelReadyKey = "";
  await persistSettings(uid, { chatSound: next, walkingSound: next });
  await Promise.all([
    ensureChatNotifications(true),
    ensureWalkingNotifications(true),
  ]);
  await previewNotificationSound(next);
  return settingsCache;
}

export async function setChatVibrate(uid, enabled) {
  chatChannelReadyKey = "";
  await persistSettings(uid, { chatVibrate: Boolean(enabled) });
  await ensureChatNotifications(true);
  return settingsCache;
}

export async function setWalkingVibrate(uid, enabled) {
  walkChannelReadyKey = "";
  await persistSettings(uid, { walkingVibrate: Boolean(enabled) });
  await ensureWalkingNotifications(true);
  return settingsCache;
}

export async function setWalkingReminders(uid, enabled) {
  return persistSettings(uid, { walkingReminders: Boolean(enabled) });
}

export async function loadNotificationSettings(uid) {
  let localPrefs = {};
  try {
    localPrefs = JSON.parse(
      localStorage.getItem("kridana_notif_prefs") || "{}",
    );
  } catch {
    localPrefs = {};
  }

  if (!uid) {
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...localPrefs,
      globalMute: localStorage.getItem(CHAT_MUTE_KEY) === "true",
      mutedChats: {},
      chatSound: normalizeSoundId(localPrefs.chatSound),
      walkingSound: normalizeSoundId(localPrefs.walkingSound),
    };
    return settingsCache;
  }

  try {
    const snap = await getDoc(doc(db, SETTINGS_COL, uid));
    const data = snap.data() || {};
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...localPrefs,
      globalMute: Boolean(data.globalMute),
      walkingMute: Boolean(
        data.walkingMute ?? localPrefs.walkingMute ?? false,
      ),
      mutedChats: data.mutedChats || {},
      chatSound: normalizeSoundId(data.chatSound || localPrefs.chatSound),
      walkingSound: normalizeSoundId(
        data.walkingSound || localPrefs.walkingSound,
      ),
      chatVibrate:
        data.chatVibrate !== undefined
          ? Boolean(data.chatVibrate)
          : localPrefs.chatVibrate !== undefined
            ? Boolean(localPrefs.chatVibrate)
            : true,
      walkingVibrate:
        data.walkingVibrate !== undefined
          ? Boolean(data.walkingVibrate)
          : localPrefs.walkingVibrate !== undefined
            ? Boolean(localPrefs.walkingVibrate)
            : true,
      walkingReminders:
        data.walkingReminders !== undefined
          ? Boolean(data.walkingReminders)
          : localPrefs.walkingReminders !== undefined
            ? Boolean(localPrefs.walkingReminders)
            : true,
      preferCloudPush:
        data.preferCloudPush !== undefined
          ? Boolean(data.preferCloudPush)
          : true,
    };
    try {
      localStorage.setItem(CHAT_MUTE_KEY, String(settingsCache.globalMute));
    } catch {
      /* ignore */
    }
  } catch {
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...localPrefs,
      globalMute: localStorage.getItem(CHAT_MUTE_KEY) === "true",
      mutedChats: {},
      chatSound: normalizeSoundId(localPrefs.chatSound),
      walkingSound: normalizeSoundId(localPrefs.walkingSound),
    };
  }

  return settingsCache;
}

export function getActiveChatId() {
  return activeChatId;
}

export function setActiveChatId(chatId) {
  activeChatId = chatId || null;
}

export function isAppForeground() {
  return appIsActive;
}

export function previewChatBody(data = {}) {
  if (data.text) return String(data.text);
  if (data.audio) return "Voice message";
  if (data.image || data.photoUrl) return "Photo";
  if (data.file) return "File";
  return "New message";
}

export function chatNotificationId(chatId) {
  const value = String(chatId || "chat");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647 || 41001;
}

export async function resolveChatSenderName(uid, fallback = "New message") {
  if (!uid) return fallback;
  if (SENDER_CACHE.has(uid)) return SENDER_CACHE.get(uid);

  for (const collectionName of USER_COLLECTIONS) {
    try {
      const snap = await getDoc(doc(db, collectionName, uid));
      if (!snap.exists()) continue;
      const data = snap.data() || {};
      const name =
        data.name ||
        data.instituteName ||
        data.trainerName ||
        data.organization ||
        data.displayName ||
        `${data.firstName || data.ownerFirstName || ""} ${
          data.lastName || data.ownerLastName || ""
        }`.trim() ||
        data.email ||
        fallback;
      SENDER_CACHE.set(uid, name);
      return name;
    } catch {
      /* try next collection */
    }
  }

  SENDER_CACHE.set(uid, fallback);
  return fallback;
}

async function createAndroidChannel({
  id,
  name,
  description,
  soundId,
  vibrate,
  importance = 5,
}) {
  const meta = soundMeta(soundId);
  const payload = {
    id,
    name,
    description,
    importance,
    visibility: 1,
    vibration: vibrate !== false,
    lights: true,
  };

  if (meta.id === "silent") {
    payload.sound = undefined;
    payload.importance = Math.min(importance, 3);
  } else if (meta.file && meta.file !== "default") {
    payload.sound = meta.file;
  } else {
    payload.sound = "default";
  }

  await LocalNotifications.createChannel(payload);
}

export async function ensureChatNotifications(force = false) {
  if (!Capacitor.isNativePlatform()) {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    return { display: "granted" };
  }

  hookAppState();

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    permission = await LocalNotifications.requestPermissions();
  }

  const channelId = getChatChannelId();
  if (
    permission.display === "granted" &&
    (force || chatChannelReadyKey !== channelId)
  ) {
    await createAndroidChannel({
      id: channelId,
      name: "Chat messages",
      description: "Kridana chat message alerts",
      soundId: settingsCache.chatSound,
      vibrate: settingsCache.chatVibrate,
      importance: 5,
    });
    chatChannelReadyKey = channelId;
  }

  return permission;
}

export async function ensureWalkingNotifications(force = false) {
  if (!Capacitor.isNativePlatform()) return { display: "granted" };

  hookAppState();

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    permission = await LocalNotifications.requestPermissions();
  }

  const channelId = getWalkChannelId();
  if (
    permission.display === "granted" &&
    (force || walkChannelReadyKey !== channelId)
  ) {
    await createAndroidChannel({
      id: channelId,
      name: "Walking",
      description: "Live walk updates and goal reminders",
      soundId: settingsCache.walkingSound,
      vibrate: settingsCache.walkingVibrate,
      importance: 4,
    });
    walkChannelReadyKey = channelId;
  }

  return permission;
}

export function isOwnChatMessage(senderId, uid) {
  if (!senderId || !uid) return false;
  return String(senderId) === String(uid);
}

export function isViewingChat(chatId) {
  return Boolean(chatId && getActiveChatId() && getActiveChatId() === chatId);
}

export function shouldNotifyChat(chatId) {
  if (isConversationMuted(chatId)) return false;
  if (isAppForeground() && isViewingChat(chatId)) return false;
  return true;
}

export async function showChatMessageNotification({
  chatId,
  senderName,
  body,
  count = 1,
  extra = {},
}) {
  if (!chatId || !shouldNotifyChat(chatId)) return false;

  const title = senderName || "New message";
  const text =
    count > 1 ? `${count} new messages` : body || "You have a new message";

  if (Capacitor.isNativePlatform()) {
    const permission = await ensureChatNotifications();
    if (permission.display !== "granted") return false;

    const silent = settingsCache.chatSound === "silent";

    await LocalNotifications.schedule({
      notifications: [
        {
          id: chatNotificationId(chatId),
          title,
          body: text,
          largeBody: text,
          summaryText: "Kridana chat",
          channelId: getChatChannelId(),
          smallIcon: "ic_launcher",
          group: "kridana_chats",
          sound: silent ? undefined : soundMeta(settingsCache.chatSound).file || "default",
          extra: {
            chatId,
            type: "chat",
            ...extra,
          },
        },
      ],
    });
    return true;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: text,
      icon: "/Kridana logo.png",
      tag: chatId,
      silent: settingsCache.chatSound === "silent",
    });
    return true;
  }

  return false;
}

export function emitIncomingChatEvent(detail) {
  window.dispatchEvent(
    new CustomEvent("kridana-incoming-chat", { detail }),
  );
}

export function chatPathForRoute(chatRoute, chatId) {
  const base = chatRoute || "/ChatBox";
  if (!chatId) return base;
  if (base.includes("/chat/")) return `/chat/${encodeURIComponent(chatId)}`;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}chatId=${encodeURIComponent(chatId)}`;
}

/**
 * Internal helper for push readiness. User-facing copy stays plan-free.
 */
export function getCloudPushInfo() {
  return {
    readyInApp: true,
    preferCloudPush: settingsCache.preferCloudPush !== false,
    title: "Smart delivery",
    body: "Alerts are delivered securely on your device so you stay connected with your academy, trainer, and teammates.",
  };
}

/** Tiny free on-device tip for More menu */
export function getSmartMoreTip({
  unread = 0,
  role = "user",
  walkingMute = false,
  chatMute = false,
} = {}) {
  if (unread > 0) {
    return {
      title: "Unread chats waiting",
      body: `You have ${unread} unread message${unread === 1 ? "" : "s"}. Open Chat to catch up.`,
      action: "chat",
    };
  }
  if (chatMute) {
    return {
      title: "Chat alerts muted",
      body: "Turn alerts back on so you don’t miss important messages.",
      action: "notifications",
    };
  }
  if (walkingMute) {
    return {
      title: "Walk alerts muted",
      body: "Turn walking notifications back on to track goals live.",
      action: "notifications",
    };
  }
  if (role === "institute") {
    return {
      title: "Grow your academy",
      body: "Share a reel or check chat with students and trainers.",
      action: "upload",
    };
  }
  if (role === "trainer") {
    return {
      title: "Stay visible",
      body: "Post a short reel or reply to student chats today.",
      action: "upload",
    };
  }
  return {
    title: "Keep moving",
    body: "A short walk keeps your fitness streak accurate.",
    action: "walk",
  };
}

function hookAppState() {
  if (appStateHooked || !Capacitor.isNativePlatform()) return;
  appStateHooked = true;
  App.addListener("appStateChange", ({ isActive }) => {
    appIsActive = Boolean(isActive);
  }).catch(() => {});
}
