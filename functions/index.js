const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const USER_COLLECTIONS = [
  "users",
  "students",
  "institutes",
  "trainers",
  "trainerstudents",
  "InstituteTrainers",
];

function previewBody(data = {}) {
  if (data.text) return String(data.text).slice(0, 180);
  if (data.audio) return "Voice message";
  if (data.image || data.photoUrl) return "Photo";
  if (data.file) return "File";
  return "New message";
}

async function resolveName(db, uid) {
  if (!uid) return "New message";
  for (const collectionName of USER_COLLECTIONS) {
    const snap = await db.collection(collectionName).doc(uid).get();
    if (!snap.exists) continue;
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
      data.email;
    if (name) return name;
  }
  return "New message";
}

function collectTokens(data = {}) {
  const tokens = new Set();
  if (data.token) tokens.add(String(data.token));
  if (Array.isArray(data.tokens)) {
    data.tokens.forEach((token) => token && tokens.add(String(token)));
  }
  return [...tokens];
}

exports.onChatMessageCreated = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
    region: "asia-south1",
  },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const senderId = message.senderId;
    if (!senderId || senderId === "SYSTEM") return;

    const chatId = event.params.chatId;
    const db = getFirestore();
    const chatSnap = await db.collection("chats").doc(chatId).get();
    if (!chatSnap.exists) return;

    const members = chatSnap.data().members || [];
    const recipients = members.filter((uid) => uid && uid !== senderId);
    if (recipients.length === 0) return;

    const senderName = await resolveName(db, senderId);
    const body = previewBody(message);
    const messaging = getMessaging();

    await Promise.all(
      recipients.map(async (uid) => {
        const settingsSnap = await db
          .collection("notificationSettings")
          .doc(uid)
          .get();
        const settings = settingsSnap.data() || {};
        if (settings.globalMute) return;
        if (settings.mutedChats && settings.mutedChats[chatId] === true) return;
        if (settings.preferCloudPush === false) return;

        const tokenSnap = await db.collection("deviceTokens").doc(uid).get();
        if (!tokenSnap.exists) return;
        const tokens = collectTokens(tokenSnap.data());
        if (tokens.length === 0) return;

        const rawSound = String(settings.chatSound || "ding");
        const soundId =
          rawSound === "message" ||
          rawSound === "message1" ||
          rawSound === "chime"
            ? "ding"
            : rawSound === "beep" ||
                rawSound === "beep1" ||
                rawSound === "ping"
              ? "note"
              : rawSound === "soft"
                ? "pop"
                : rawSound;
        const channelId = `kridana_chat_v6_${soundId}`;
        const androidSound =
          soundId === "silent"
            ? undefined
            : soundId === "ding"
              ? "classic_ding"
              : soundId === "note"
                ? "classic_note"
                : soundId === "pop"
                  ? "classic_pop"
                  : "default";

        try {
          await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: senderName,
              body,
            },
            data: {
              chatId: String(chatId),
              senderId: String(senderId),
              type: "chat",
              body,
            },
            android: {
              priority: "high",
              notification: {
                channelId,
                ...(androidSound ? { sound: androidSound } : { defaultSound: false }),
              },
            },
          });
        } catch (error) {
          console.error("Chat push failed", uid, error);
        }
      }),
    );
  },
);
