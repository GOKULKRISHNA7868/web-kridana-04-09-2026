import React, { useState, useEffect } from "react";
import { MoreVertical, Smile, Send, Mic, ArrowLeft } from "lucide-react";
import { db, auth } from "../../firebase";
import { Capacitor } from "@capacitor/core";

import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { Check, CheckCheck } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import { useRef } from "react";
const ChatBox = () => {
  const [activeTab, setActiveTab] = useState("chats");
  const [screen, setScreen] = useState("chat");
  const [showMenu, setShowMenu] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [instituteId, setInstituteId] = useState(null);
  const notifiedRequests = useRef(new Set());
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [showUpcomingPopup, setShowUpcomingPopup] = useState(false);
  const appState = useRef(true);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const touchStartPosition = useRef({ x: 0, y: 0 });

  // Prevent the same message from being processed repeatedly
  const notifiedMessages = useRef(new Set());

  // Pending notification data per chat
  const pendingNotifications = useRef(new Map());

  // Timer used to combine messages arriving close together
  const notificationTimers = useRef(new Map());

  // Stable notification ID for each chat
  const notificationIds = useRef(new Map());
  const notificationAudio = useRef(
    new Audio(
      "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
    ),
  );
  const previousRequestCount = useRef(0);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatName, setActiveChatName] = useState("");
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [renameValue, setRenameValue] = useState("");
  const { chatId } = useParams();
  const location = useLocation();
  const [recentChats, setRecentChats] = useState([]);
  const initialChatName = location.state?.chatName || "Chat";

  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatFilter, setChatFilter] = useState("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState([]);
  const messagesEndRef = useRef(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const initializedNotificationChats = useRef(new Set());

  const getValidImage = (url, name) => {
    if (!url)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    if (url.startsWith("blob:"))
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    return url;
  };

  const updatePresence = async (online) => {
    if (!auth.currentUser) return;

    try {
      await setDoc(
        doc(db, "presence", auth.currentUser.uid),
        {
          online,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.log(e);
    }
  };
  useEffect(() => {
    if (!user) return;

    const handleAppState = ({ isActive }) => {
      appState.current = isActive;

      if (isActive) {
        updatePresence(true);
      } else {
        updatePresence(false);
      }
    };

    updatePresence(true);

    const listener = App.addListener("appStateChange", handleAppState);

    return () => {
      updatePresence(false);
      listener.remove();
    };
  }, [user]);
  useEffect(() => {
    if (!user || !instituteId) return;

    const fetchUpcomingClasses = async () => {
      try {
        const snap = await getDocs(
          collection(db, "institutes", instituteId, "timetable"),
        );

        const now = new Date();
        const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const classes = [];

        snap.forEach((docSnap) => {
          const data = docSnap.data();

          if (!data.start) return;

          const start = data.start.toDate();

          // only next 24 hours
          if (start >= now && start <= next24) {
            // Show only for students in this class
            if (
              data.students?.includes(user.uid) ||
              data.trainerId === user.uid
            ) {
              classes.push({
                id: docSnap.id,
                ...data,
                start,
              });
            }
          }
        });

        classes.sort((a, b) => a.start - b.start);

        setUpcomingClasses(classes);
      } catch (err) {
        console.log(err);
      }
    };

    fetchUpcomingClasses();
  }, [user, instituteId]);
  useEffect(() => {
    if (!user) return;

    const beforeUnload = () => {
      navigator.sendBeacon(
        "/",
        JSON.stringify({
          uid: user.uid,
        }),
      );

      updatePresence(false);
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [user]);
  useEffect(() => {
    if (!friends.length) return;

    const unsubscribers = [];

    friends.forEach((friend) => {
      const unsub = onSnapshot(doc(db, "presence", friend.uid), (snap) => {
        if (!snap.exists()) return;

        setOnlineUsers((prev) => ({
          ...prev,
          [friend.uid]: snap.data(),
        }));
      });

      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [friends]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener;

    const setup = async () => {
      try {
        listener = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (notification) => {
            const chatId = notification.notification?.extra?.chatId;

            if (chatId) {
              navigate(`/chat/${chatId}`);
            } else {
              navigate("/chat");
            }
          },
        );
      } catch (error) {
        console.error("Notification action listener failed:", error);
      }
    };

    setup();

    return () => {
      listener?.remove();
    };
  }, [navigate]);

  /* ================= GROUPED CHAT NOTIFICATIONS ================= */

  useEffect(() => {
    if (!user) return;

    const chatUnsubscribers = [];

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
    );

    const unsubChats = onSnapshot(chatsQuery, (chatSnap) => {
      chatSnap.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;

        const messagesQuery = query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "desc"),
        );

        const unsubMessages = onSnapshot(messagesQuery, async (msgSnap) => {
          if (msgSnap.empty) return;

          const docs = msgSnap.docs;

          /*
           * First snapshot only initializes the listener.
           * Existing Firebase messages are NOT notifications.
           */
          if (!initializedNotificationChats.current.has(chatId)) {
            docs.forEach((messageDoc) => {
              notifiedMessages.current.add(messageDoc.id);
            });

            initializedNotificationChats.current.add(chatId);

            return;
          }

          /*
           * Only process genuinely new messages
           */
          const newIncomingMessages = docs.filter((messageDoc) => {
            const data = messageDoc.data();

            // Don't notify yourself
            if (data.senderId === user.uid) return false;

            // Already notified
            if (notifiedMessages.current.has(messageDoc.id)) {
              return false;
            }

            return true;
          });

          if (newIncomingMessages.length === 0) return;

          /*
           * Mark messages as processed
           */
          newIncomingMessages.forEach((messageDoc) => {
            notifiedMessages.current.add(messageDoc.id);
          });

          /*
           * Don't notify if this chat is currently open
           */
          const isCurrentChatOpen = activeChat?.id === chatId;

          if (isCurrentChatOpen) {
            return;
          }

          /*
           * Only show notification when app is not active
           */
          if (appState.current) {
            return;
          }

          /*
           * Get sender from newest incoming message
           */
          const newestMessage = newIncomingMessages[0];
          const newestData = newestMessage.data();

          let senderName = "New Message";

          try {
            const sender = await getUserDetails(newestData.senderId);
            senderName = sender.name;
          } catch (error) {
            console.log("Could not get sender:", error);
          }

          /*
           * Get existing pending notification
           */
          const existing = pendingNotifications.current.get(chatId) || {
            count: 0,
            senderName,
            lastMessage: "",
          };

          /*
           * Add newly received messages
           */
          existing.count += newIncomingMessages.length;
          existing.senderName = senderName;

          /*
           * Keep latest message text
           */
          existing.lastMessage = newestData.text || "New message";

          pendingNotifications.current.set(chatId, existing);

          /*
           * Clear previous timer
           */
          if (notificationTimers.current.has(chatId)) {
            clearTimeout(notificationTimers.current.get(chatId));
          }

          /*
           * Wait 1 second before showing/updating notification.
           *
           * This allows:
           *
           * Message 1
           * Message 2
           * Message 3
           *
           * to become ONE notification.
           */
          const timer = setTimeout(async () => {
            const pending = pendingNotifications.current.get(chatId);

            if (!pending) return;

            /*
             * Create one stable notification ID for this chat
             */
            if (!notificationIds.current.has(chatId)) {
              notificationIds.current.set(
                chatId,
                Math.floor(
                  Math.abs(
                    [...chatId].reduce(
                      (hash, char) => (hash << 5) - hash + char.charCodeAt(0),
                      0,
                    ),
                  ) % 2147483647,
                ),
              );
            }

            const notificationId = notificationIds.current.get(chatId);

            let body = "";

            if (pending.count === 1) {
              body = pending.lastMessage;
            } else {
              body = `${pending.count} new messages`;
            }

            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: notificationId,

                    title: pending.senderName,

                    body,

                    channelId: "chat",

                    sound: "beep.wav",

                    smallIcon: "ic_stat_icon_config_sample",

                    extra: {
                      chatId,
                    },

                    schedule: {
                      at: new Date(Date.now() + 100),
                    },
                  },
                ],
              });

              console.log(
                `Grouped notification: ${pending.count} message(s) from ${pending.senderName}`,
              );
            } catch (error) {
              console.error("Grouped notification error:", error);
            }

            /*
             * Clear this pending batch after notification
             */
            pendingNotifications.current.delete(chatId);
            notificationTimers.current.delete(chatId);
          }, 1000);

          notificationTimers.current.set(chatId, timer);
        });

        chatUnsubscribers.push(unsubMessages);
      });
    });

    return () => {
      unsubChats();

      chatUnsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });

      notificationTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });

      notificationTimers.current.clear();
      pendingNotifications.current.clear();
    };
  }, [user, activeChat]);
  useEffect(() => {
    const setup = async () => {
      await LocalNotifications.requestPermissions();

      await LocalNotifications.createChannel({
        id: "chat",
        name: "Chat",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        sound: "beep.wav",
      });
    };

    setup();
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  /* ================= AUTH + INSTITUTE ================= */
  /* ================= AUTH + INSTITUTE (FIXED) ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);

      /* -------- 1. Check Institute Owner -------- */
      const instRef = doc(db, "institutes", u.uid);
      const instSnap = await getDoc(instRef);
      if (instSnap.exists()) {
        setInstituteId(u.uid);
        return;
      }

      /* -------- 2. Check Student -------- */
      const studentRef = doc(db, "students", u.uid);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        setInstituteId(data.instituteId); // ✅ IMPORTANT
        return;
      }

      /* -------- 3. Check Trainer -------- */
      const trainerQ = query(
        collection(db, "InstituteTrainers"),
        where("trainerUid", "==", u.uid),
      );
      const trainerSnap = await getDocs(trainerQ);

      if (!trainerSnap.empty) {
        const data = trainerSnap.docs[0].data();
        setInstituteId(data.instituteId); // ✅ IMPORTANT
        return;
      }
    });

    return () => unsub();
  }, []);
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "friends", user.uid), async (snap) => {
      if (!snap.exists()) {
        setFriends([]);
        return;
      }

      const ids = snap.data().friends || [];

      const usersData = [];

      for (const uid of ids) {
        let found = null;

        const collections = [
          "users",
          "students",
          "trainerstudents",
          "institutes",
        ];

        for (const col of collections) {
          const docSnap = await getDoc(doc(db, col, uid));

          if (docSnap.exists()) {
            const d = docSnap.data();

            found = {
              uid,
              name:
                d.name ||
                `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
                d.instituteName,
              photo:
                d.profileImageUrl || d.studentPhotoUrl || d.ownerPhotoUrl || "",
            };

            break;
          }
        }

        if (found) usersData.push(found);
      }

      const validFriends = usersData.filter(
        (friend) => friend.uid !== user.uid,
      );

      setFriends(validFriends);
    });

    return () => unsub();
  }, [user]);
  useEffect(() => {
    const setupNotifications = async () => {
      await LocalNotifications.requestPermissions();
    };

    setupNotifications();
  }, []);
  const getUserDetails = async (uid) => {
    const collections = [
      "users",
      "students",
      "institutes",
      "trainerstudents",
      "InstituteTrainers",
      "trainers",
    ];

    for (const col of collections) {
      const snap = await getDoc(doc(db, col, uid));

      if (snap.exists()) {
        const d = snap.data();

        return {
          uid,

          name:
            d.name ||
            d.instituteName ||
            d.trainerName ||
            `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
            "User",

          photo:
            d.profileImageUrl || d.studentPhotoUrl || d.ownerPhotoUrl || "",

          role: col,
        };
      }
    }

    return {
      uid,
      name: "Unknown User",
      photo: "",
      role: "",
    };
  };
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendRequests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending"),
    );

    const unsub = onSnapshot(q, async (snap) => {
      const requests = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          const sender = await getUserDetails(data.fromUid);

          return {
            id: d.id,
            ...data,
            senderName: sender.name,
            senderPhoto: sender.photo,
            senderRole: sender.role,
          };
        }),
      );

      setFriendRequests(requests);

      setFriendRequests(requests);

      for (const request of requests) {
        if (!notifiedRequests.current.has(request.id)) {
          notifiedRequests.current.add(request.id);

          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),
                title: "Friend Request",
                body: `${request.fromName} sent you a friend request`,
                channelId: "chat",
                sound: "beep.wav",
                schedule: {
                  at: new Date(Date.now() + 100),
                },
              },
            ],
          });
        }
      }
    });

    return () => unsub();
  }, [user]);
  const searchFriend = async () => {
    const keyword = searchEmail.trim().toLowerCase();

    if (!keyword) return;

    setSearchLoading(true);

    try {
      let results = [];

      const collectionsToSearch = [
        {
          collection: "users",
          field: "emailOrPhone",
        },
        {
          collection: "students",
          field: "email",
        },
        {
          collection: "trainerstudents",
          field: "email",
        },
      ];

      for (const item of collectionsToSearch) {
        const q = query(
          collection(db, item.collection),
          where(item.field, "==", keyword),
        );

        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          const d = docSnap.data();

          let requestStatus = null;

          const reqQuery = query(
            collection(db, "friendRequests"),
            where("fromUid", "==", user.uid),
            where("toUid", "==", docSnap.id),
          );

          const reqSnap = await getDocs(reqQuery);

          let requestId = null;

          if (!reqSnap.empty) {
            requestStatus = reqSnap.docs[0].data().status;
            requestId = reqSnap.docs[0].id;
          }

          results.push({
            uid: docSnap.id,
            name: d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim(),
            photo: d.profileImageUrl || d.studentPhotoUrl || "",
            requestStatus,
            requestId,
          });
        }
      }

      setSearchedUser(results);
    } finally {
      setSearchLoading(false);
    }
  };
  const sendFriendRequest = async (person) => {
    const me = await getUserDetails(user.uid);

    await addDoc(collection(db, "friendRequests"), {
      fromUid: user.uid,
      fromName: me.name,
      fromPhoto: me.photo,
      fromRole: me.role,
      toUid: person.uid,
      toName: person.name,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Close popup
    setShowFriendModal(false);

    // Clear search
    setSearchEmail("");
    setSearchedUser([]);

    alert("Friend request sent successfully");
  };
  const acceptRequest = async (request) => {
    await updateDoc(doc(db, "friendRequests", request.id), {
      status: "accepted",
    });

    const myRef = doc(db, "friends", user.uid);
    const friendRef = doc(db, "friends", request.fromUid);

    const mySnap = await getDoc(myRef);

    if (!mySnap.exists()) {
      await setDoc(myRef, {
        friends: [request.fromUid],
      });
    } else {
      await updateDoc(myRef, {
        friends: [
          ...new Set([...(mySnap.data().friends || []), request.fromUid]),
        ],
      });
    }

    const friendSnap = await getDoc(friendRef);

    if (!friendSnap.exists()) {
      await setDoc(friendRef, {
        friends: [user.uid],
      });
    } else {
      await updateDoc(friendRef, {
        friends: [...new Set([...(friendSnap.data().friends || []), user.uid])],
      });
    }

    // Create chat after acceptance
    const chatId = [user.uid, request.fromUid].sort().join("_");

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        type: "individual",
        instituteId,
        members: [user.uid, request.fromUid],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastAt: serverTimestamp(),
      });
    }

    setShowRequestsModal(false);
  };
  const declineRequest = async (request) => {
    try {
      await updateDoc(doc(db, "friendRequests", request.id), {
        status: "declined",
        declinedAt: serverTimestamp(),
      });

      // Remove it from the current list immediately
      setFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error("Error declining request:", error);
    }
  };
  useEffect(() => {
    if (!user) return;

    const getUserInfo = async (uid) => {
      // USERS
      let snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        const d = snap.data();

        return {
          uid,
          name: `${d.name || "User"} (User)`,
          photo: d.profileImageUrl || "",
          role: "user",
        };
      }

      // STUDENTS
      snap = await getDoc(doc(db, "students", uid));

      if (snap.exists()) {
        const d = snap.data();

        return {
          uid,
          name:
            `${d.firstName || ""} ${d.lastName || ""}`.trim() + " (Student)",
          photo: d.profileImageUrl || d.studentPhotoUrl || "",
          role: "student",
        };
      }

      // INSTITUTES
      snap = await getDoc(doc(db, "institutes", uid));

      if (snap.exists()) {
        const d = snap.data();

        return {
          uid,
          name: `${d.instituteName || "Institute"} (Institute)`,
          photo: d.profileImageUrl || "",
          role: "institute",
        };
      }

      // INSTITUTE TRAINERS
      snap = await getDoc(doc(db, "InstituteTrainers", uid));

      if (snap.exists()) {
        const d = snap.data();

        return {
          uid,
          name:
            `${d.firstName || ""} ${d.lastName || ""}`.trim() + " (Trainer)",
          photo: d.profileImageUrl || "",
          role: "trainer",
        };
      }

      // TRAINERS COLLECTION
      snap = await getDoc(doc(db, "trainers", uid));

      if (snap.exists()) {
        const d = snap.data();

        const trainerName =
          d.trainerName || `${d.firstName || ""} ${d.lastName || ""}`.trim();

        return {
          uid,
          name: `${trainerName} (Trainer${
            d.instituteName ? ` - ${d.instituteName}` : ""
          })`,
          photo: d.profileImageUrl || "",
          role: "trainer",
        };
      }

      return {
        uid,
        name: "Unknown User",
        photo: "",
      };
    };

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const chats = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();

          if (data.type === "group") {
            return {
              id: chatDoc.id,
              ...data,
              displayName: data.name,
              photo: "",
              isChat: true,
            };
          }
          const otherUid = data.members?.find((u) => u !== user.uid);

          if (!otherUid) return null;

          const otherUser = await getUserInfo(otherUid);

          return {
            id: chatDoc.id,
            ...data,
            displayName: otherUser.name,
            photo: otherUser.photo,
            uid: otherUid,
            isChat: true,
          };
        }),
      );

      // Add friends who don't have chats yet
      const merged = chats
        .filter(Boolean)
        .filter((chat) => chat.members?.length > 0);

      merged.sort(
        (a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0),
      );

      setRecentChats(merged);
    });

    return () => unsub();
  }, [user, friends]);
  useEffect(() => {
    if (!chatId) return; // 🔥 prevents crash

    setActiveChat({ id: chatId, type: "individual" });
    setActiveChatName(initialChatName);
    setScreen("chat");
  }, [chatId]);
  /* ================= USERS ================= */
  useEffect(() => {
    if (!instituteId) return;

    const unsubStudents = onSnapshot(
      query(
        collection(db, "students"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const s = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: d.id,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
            role: "student",
            profileImageUrl: data.studentPhotoUrl || data.profileImageUrl || "", // ✅ FETCH CLOUDINARY URL
          };
        });
        setUsers((prev) => [...prev.filter((u) => u.role !== "student"), ...s]);
      },
    );

    const unsubTrainers = onSnapshot(
      query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", instituteId),
      ),
      (snap) => {
        const t = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.trainerUid,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
            role: "trainer",
            profileImageUrl: data.profileImageUrl || "", // ✅ FETCH CLOUDINARY URL
          };
        });
        setUsers((prev) => [...prev.filter((u) => u.role !== "trainer"), ...t]);
      },
    );

    return () => {
      unsubStudents();
      unsubTrainers();
    };
  }, [instituteId]);

  /* ================= GROUPS ================= */
  /* ================= GROUPS ================= */
  useEffect(() => {
    if (!user || !instituteId) return;

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
      where("instituteId", "==", instituteId),
    );

    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user, instituteId]);

  /* ================= MESSAGES ================= */
  useEffect(() => {
    if (!activeChat?.id) return;

    const chatRef = doc(db, "chats", activeChat.id);

    const unsubChat = onSnapshot(chatRef, (chatSnap) => {
      if (!chatSnap.exists()) return;

      const chatData = chatSnap.data();

      const reminder = chatData.systemReminder;

      setMessages((prev) => {
        const normalMessages = prev.filter((m) => m.type !== "classReminder");

        if (!reminder) return normalMessages;

        return [
          {
            id: "system-reminder",
            text: reminder.text,
            type: "classReminder",
            senderId: "SYSTEM",
            createdAt: reminder.createdAt,
          },
          ...normalMessages,
        ];
      });
    });

    const msgQuery = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubMessages = onSnapshot(msgQuery, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setMessages((prev) => {
        const reminder = prev.find((m) => m.type === "classReminder");

        if (reminder) {
          return [reminder, ...msgs];
        }

        return msgs;
      });
    });

    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [activeChat]);

  const isAdmin = () => {
    const g = groups.find((g) => g.id === activeChat?.id);
    return g?.adminId === user?.uid;
  };

  /* ================= START CHAT ================= */
  const startChat = async (friend) => {
    if (!user) return;

    const chatId = [user.uid, friend.uid].sort().join("_");

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        type: "individual",
        instituteId,
        members: [user.uid, friend.uid],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastAt: serverTimestamp(),
      });
    }

    setActiveChat({
      id: chatId,
      type: "individual",
      uid: friend.uid,
    });

    setActiveChatName(friend.name);
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: 0,
    }));
  };

  /* ================= GROUP RENAME ================= */
  const renameGroup = async () => {
    if (!activeChat?.id || !renameValue.trim()) return;

    const gRef = doc(db, "groups", activeChat.id);
    const gSnap = await getDoc(gRef);
    if (!gSnap.exists()) return;
    if (gSnap.data().adminId !== user.uid) return;

    await updateDoc(gRef, { name: renameValue });
    await updateDoc(doc(db, "chats", activeChat.id), { name: renameValue });

    setActiveChatName(renameValue);
    setRenameValue("");
  };

  /* ================= GROUP DELETE ================= */
  const deleteGroup = async () => {
    if (!activeChat?.id) return;

    const gRef = doc(db, "groups", activeChat.id);
    const gSnap = await getDoc(gRef);
    if (!gSnap.exists()) return;
    if (gSnap.data().adminId !== user.uid) return;

    const msgs = await getDocs(
      collection(db, "chats", activeChat.id, "messages"),
    );
    for (let m of msgs.docs) {
      await deleteDoc(doc(db, "chats", activeChat.id, "messages", m.id));
    }

    await deleteDoc(doc(db, "chats", activeChat.id));
    await deleteDoc(gRef);

    setActiveChat(null);
    setActiveChatName("");
    setMessages([]);
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    const message = text.trim();

    if (!message || !activeChat?.id || !user) return;

    // Clear input immediately
    setText("");

    try {
      const msgRef = collection(db, "chats", activeChat.id, "messages");

      await addDoc(msgRef, {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });

      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: message,
        lastAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);

      // Optional: restore message if sending failed
      setText(message);
    }
  };
  /* ================= AUTO READ ================= */
  useEffect(() => {
    if (!activeChat?.id || !user) return;

    const markRead = async () => {
      const msgs = await getDocs(
        collection(db, "chats", activeChat.id, "messages"),
      );
      for (let m of msgs.docs) {
        const data = m.data();
        if (!data.readBy?.includes(user.uid)) {
          if (!data.readBy?.includes(user.uid)) {
            await updateDoc(doc(db, "chats", activeChat.id, "messages", m.id), {
              readBy: [...new Set([...(data.readBy || []), user.uid])],
            });
          }
        }
      }
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChat.id]: 0,
      }));
    };

    markRead();
  }, [activeChat, user]);

  /* ================= UNREAD COUNT ================= */
  useEffect(() => {
    if (!user || !instituteId) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
    );

    const unsub = onSnapshot(q, async (snap) => {
      let counts = {};

      for (let d of snap.docs) {
        const chatId = d.id;
        const msgs = await getDocs(collection(db, "chats", chatId, "messages"));

        let unread = 0;
        msgs.forEach((m) => {
          const data = m.data();
          if (data.senderId !== user.uid && !data.readBy?.includes(user.uid)) {
            unread++;
          }
        });

        counts[chatId] = unread;
      }

      setUnreadCounts(counts);
    });

    return () => unsub();
  }, [user, instituteId]);
  /* ================= AUTO CLASS REMINDER ================= */

  useEffect(() => {
    if (!user || !instituteId) return;

    const checkUpcomingClasses = async () => {
      try {
        const timetableRef = collection(
          db,
          "institutes",
          instituteId,
          "timetable",
        );

        const timetableSnap = await getDocs(timetableRef);

        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        for (const classDoc of timetableSnap.docs) {
          const data = classDoc.data();

          if (!data.start) continue;

          const classStart = data.start.toDate();

          // Only upcoming within next 24 hrs
          if (
            classStart >= now &&
            classStart <= next24Hours &&
            !data.reminderSent
          ) {
            const students = data.students || [];

            // Message Text
            const reminderMessage = `📢 Upcoming Class Reminder

Class : ${data.title}
Category : ${data.category}
Sub Category : ${data.subCategory}
Trainer : ${data.trainerName}
Branch : ${data.branch}

Date : ${classStart.toLocaleDateString()}

Time :
${classStart.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
})}

Please attend your class on time.`;

            for (const studentId of students) {
              const chatId = [studentId, data.trainerId].sort().join("_");

              const chatRef = doc(db, "chats", chatId);

              const chatSnap = await getDoc(chatRef);

              if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                  type: "individual",
                  instituteId,
                  members: [studentId, data.trainerId],
                  createdAt: serverTimestamp(),
                  lastMessage: reminderMessage,
                  lastAt: serverTimestamp(),
                });
              }

              await updateDoc(chatRef, {
                systemReminder: {
                  text: reminderMessage,
                  createdAt: serverTimestamp(),
                  classId: classDoc.id,
                  type: "classReminder",
                },
                lastAt: serverTimestamp(),
              });
            }

            // Prevent duplicate reminders
            await updateDoc(classDoc.ref, {
              reminderSent: true,
              reminderSentAt: serverTimestamp(),
            });
          }
        }
      } catch (e) {
        console.log(e);
      }
    };

    checkUpcomingClasses();

    // check every 15 minutes
    const interval = setInterval(checkUpcomingClasses, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, instituteId]);

  /* ================= CREATE GROUP ================= */
  const submitCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const members = [...new Set([user.uid, ...selectedMembers])].filter(
      (m) => m,
    ); // 🔥 REMOVE UNDEFINED USERS

    const ref = await addDoc(collection(db, "groups"), {
      name: groupName,
      instituteId,
      members,
      adminId: user.uid,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "chats", ref.id), {
      type: "group",
      instituteId,
      members,
      createdAt: serverTimestamp(),
      name: groupName,
    });

    setActiveChat({ id: ref.id, type: "group" });
    setActiveChatName(groupName);
    setGroupName("");
    setSelectedMembers([]);
    setScreen("chat");
  };

  /* ================= REMOVE PARTICIPANT ================= */
  const removeParticipant = async (uid) => {
    if (!activeChat?.id) return;

    const gRef = doc(db, "groups", activeChat.id);
    const snap = await getDoc(gRef);
    if (!snap.exists()) return;
    if (snap.data().adminId !== user.uid) return;

    await updateDoc(gRef, { members: arrayRemove(uid) });
    await updateDoc(doc(db, "chats", activeChat.id), {
      members: arrayRemove(uid),
    });
  };

  const memberObjects = (
    groups.find((g) => g.id === activeChat?.id)?.members || []
  )
    .map(
      (uid) =>
        users.find((u) => u.uid === uid) || { uid, name: "Unknown User" },
    )
    .filter(Boolean);
  const filteredChats = recentChats.filter((chat) => {
    const matchesSearch =
      (chat.displayName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (chat.lastMessage || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (chatFilter === "chats") return chat.type !== "group";

    if (chatFilter === "groups") return chat.type === "group";

    return true;
  });

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const resendFriendRequest = async (person) => {
    if (person.requestId) {
      await updateDoc(doc(db, "friendRequests", person.requestId), {
        status: "pending",
        createdAt: serverTimestamp(),
        declinedAt: null,
      });
    } else {
      await sendFriendRequest(person);
    }

    alert("Friend request resent.");
  };
  const formatMessageTime = (timestamp) => {
    if (!timestamp?.toDate) return "";

    return timestamp.toDate().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  /* ================= MESSAGE SELECTION ================= */
  /* ================= MULTIPLE MESSAGE SELECTION ================= */

  const isMessageSelectable = (message) => {
    return (
      user &&
      message.senderId === user.uid &&
      message.type !== "classReminder" &&
      message.senderId !== "SYSTEM"
    );
  };

  const isMessageSelected = (messageId) => {
    return selectedMessages.some((m) => m.id === messageId);
  };

  const toggleMessageSelection = (message) => {
    if (!isMessageSelectable(message)) return;

    setSelectedMessages((prev) => {
      const alreadySelected = prev.some((m) => m.id === message.id);

      if (alreadySelected) {
        return prev.filter((m) => m.id !== message.id);
      }

      return [...prev, message];
    });

    setShowMessageMenu(false);
  };

  /* ================= LONG PRESS ================= */

  const startMessageLongPress = (e, message) => {
    if (!isMessageSelectable(message)) return;

    // Prevent browser context menu on mobile
    if (e.cancelable) {
      e.preventDefault();
    }

    longPressTriggered.current = false;

    clearTimeout(longPressTimer.current);

    if (e.touches?.length) {
      touchStartPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;

      toggleMessageSelection(message);
    }, 600);
  };

  const moveMessageLongPress = (e) => {
    if (!e.touches?.length) return;

    const touch = e.touches[0];

    const dx = touch.clientX - touchStartPosition.current.x;

    const dy = touch.clientY - touchStartPosition.current.y;

    // If user is scrolling, cancel long press
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(longPressTimer.current);
    }
  };

  const endMessageLongPress = () => {
    clearTimeout(longPressTimer.current);
  };

  /* ================= DESKTOP RIGHT CLICK ================= */

  const handleMessageContextMenu = (e, message) => {
    if (!isMessageSelectable(message)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    toggleMessageSelection(message);
  };

  /* ================= MESSAGE TAP ================= */

  const handleMessageTap = (message) => {
    // If selection mode is active,
    // tapping your own messages selects/deselects them.
    if (selectedMessages.length > 0) {
      if (isMessageSelectable(message)) {
        toggleMessageSelection(message);
      }

      return;
    }

    // Normal message tap does nothing
  };

  /* ================= DELETE SELECTED ================= */

  const deleteSelectedMessages = async () => {
    if (!user || !activeChat?.id || selectedMessages.length === 0) {
      return;
    }

    // Security check before deletion
    const messagesToDelete = selectedMessages.filter(
      (message) =>
        message.senderId === user.uid && message.type !== "classReminder",
    );

    if (messagesToDelete.length === 0) {
      setSelectedMessages([]);
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await Promise.all(
        messagesToDelete.map((message) =>
          deleteDoc(doc(db, "chats", activeChat.id, "messages", message.id)),
        ),
      );

      /*
       * Update chat preview after deleting messages.
       * Find the newest remaining message.
       */
      const remainingSnapshot = await getDocs(
        query(
          collection(db, "chats", activeChat.id, "messages"),
          orderBy("createdAt", "desc"),
        ),
      );

      if (!remainingSnapshot.empty) {
        const latestMessage = remainingSnapshot.docs[0].data();

        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: latestMessage.text || "Message",
          lastAt: latestMessage.createdAt || serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: "",
          lastAt: serverTimestamp(),
        });
      }

      setSelectedMessages([]);
      setShowMessageMenu(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting selected messages:", error);

      alert("Unable to delete messages. Please try again.");
    }
  };
  return (
    <div
      className="
  flex
  h-[100dvh]
  md:h-[60vh]
  w-full
  bg-[#f3f3f3]
  overflow-hidden
  md:rounded-xl
"
    >
      {/* ================= CHAT LIST ================= */}
      <div
        className={`
        ${activeChat ? "hidden md:flex" : "flex"}
        flex-col
        w-full
        md:w-[380px]
        bg-[#F8F8F8]
        border-r
        border-gray-100
        h-full
      `}
      >
        {/* HEADER */}
        {showFriendModal && (
          <div
            className="
      fixed inset-0 z-[999]
      bg-black/50
      flex items-end sm:items-center justify-center
    "
          >
            <div
              className="
        bg-white
        w-full
        sm:max-w-md
        rounded-t-3xl sm:rounded-3xl
        p-5
        max-h-[85vh]
        flex flex-col
        shadow-2xl
      "
            >
              {/* HEADER */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Connect With Friends</h2>

                <button
                  onClick={() => {
                    setShowFriendModal(false);
                    setSearchedUser([]);
                    setSearchEmail("");
                  }}
                  className="
            w-8 h-8
            rounded-full
            bg-gray-100
            flex items-center justify-center
            text-gray-600
          "
                >
                  ✕
                </button>
              </div>

              {/* SEARCH */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="
            flex-1
            border
            border-gray-300
            rounded-xl
            p-3
            outline-none
            text-sm
          "
                />

                <button
                  onClick={searchFriend}
                  disabled={searchLoading}
                  className="
            bg-orange-500
            text-white
            px-5
            py-3
            rounded-xl
            font-medium
            disabled:opacity-60
          "
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </div>

              {/* RESULTS */}
              <div className="flex-1 overflow-y-auto mt-4">
                {!searchLoading && searchedUser.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    Search users by email address
                  </div>
                )}

                {searchedUser.map((person) => (
                  <div
                    key={person.uid}
                    className="
              flex
              items-center
              justify-between
              gap-3
              py-3
              border-b
            "
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={getValidImage(person.photo, person.name)}
                        alt=""
                        className="
                  w-12 h-12
                  rounded-full
                  object-cover
                  shrink-0
                "
                      />

                      <div className="min-w-0">
                        <p className="font-medium truncate">{person.name}</p>
                      </div>
                    </div>

                    {person.requestStatus === "pending" ? (
                      <button
                        disabled
                        className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm shrink-0"
                      >
                        Pending
                      </button>
                    ) : person.requestStatus === "accepted" ? (
                      <button
                        disabled
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm shrink-0"
                      >
                        Connected
                      </button>
                    ) : person.requestStatus === "declined" ? (
                      <button
                        onClick={() => resendFriendRequest(person)}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm shrink-0"
                      >
                        Resend Request
                      </button>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(person)}
                        className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm shrink-0"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {showRequestsModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div
              className="
bg-white
w-full
sm:max-w-sm
rounded-t-3xl
sm:rounded-3xl
p-5
max-h-[80vh]
overflow-y-auto
"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Friend Requests</h2>

                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="
      w-8
      h-8
      rounded-full
      bg-gray-100
      flex
      items-center
      justify-center
      font-bold
    "
                >
                  ✕
                </button>
              </div>

              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between border-b py-3"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={getValidImage(req.senderPhoto, req.senderName)}
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      <div>
                        <p className="font-medium">{req.senderName}</p>

                        <p className="text-xs text-gray-500">
                          {req.senderRole}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(req)}
                      className="bg-green-500 text-white px-3 py-2 rounded-lg"
                    >
                      Accept
                    </button>

                    <button
                      onClick={() => declineRequest(req)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="
        w-10
        h-10
        rounded-full
        bg-white
        shadow-sm
        border
        border-gray-200
        flex
        items-center
        justify-center
      "
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-3xl font-bold text-black">Chat</h1>
            <button
              onClick={() => navigate("/Howitworkdchatbox")}
              className="
      bg-orange-500
      text-white
      px-10
      py-2
      rounded-xl
      text-sm
      font-medium
      shadow-sm
    "
            >
              How It Works
            </button>
          </div>
          <div className="mt-4">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chats, groups, friends..."
              className="
    w-full
    bg-white
    rounded-2xl
    px-4
    py-3
    text-sm
    outline-none
    border
    border-gray-200
    shadow-sm
  "
            />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {[
              { id: "all", label: "All" },
              { id: "chats", label: "Chats" },
              { id: "groups", label: "Groups" },
              { id: "friends", label: "Friends" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChatFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition
        ${
          chatFilter === tab.id
            ? "bg-orange-500 text-white"
            : "bg-white text-gray-600 border"
        }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* FRIEND CARDS */}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => setShowFriendModal(true)}
              className="
      bg-white
      rounded-3xl
      border
      border-orange-200
      p-4
      text-left
      shadow-sm
    "
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
                👥
              </div>

              <h3 className="font-semibold text-sm">Connect with Friends</h3>

              <p className="text-xs text-gray-500 mt-1">
                Send connection requests
              </p>
            </button>

            <button
              onClick={() => setShowRequestsModal(true)}
              className="
      bg-white
      rounded-3xl
      border
      border-orange-200
      p-4
      text-left
      relative
      shadow-sm
    "
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
                📩
              </div>

              <h3 className="font-semibold text-sm">Connection Requests</h3>

              <p className="text-xs text-gray-500 mt-1">View requests</p>

              {friendRequests.length > 0 && (
                <span
                  className="
          absolute
          top-3
          right-3
          bg-orange-500
          text-white
          w-6
          h-6
          rounded-full
          flex
          items-center
          justify-center
          text-xs
        "
                >
                  {friendRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* CHAT LIST */}
        {/* CHAT LIST */}
        <div className="flex-1 overflow-y-auto px-3 pb-6 min-h-0">
          {/* Existing Chats */}
          {/* Upcoming Classes */}
          {upcomingClasses.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowUpcomingPopup(true)}
                className="
        relative
        w-full
        overflow-hidden
        rounded-2xl
        bg-gradient-to-r
        from-orange-500
        to-orange-600
        text-white
        shadow-md
        py-3
        px-4
      "
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">📅</div>

                  <div className="flex-1 overflow-hidden">
                    <div className="whitespace-nowrap animate-animate-marquee font-medium">
                      {upcomingClasses.map((cls) => (
                        <span key={cls.id} className="mr-16">
                          {cls.title} • {cls.start.toLocaleDateString()} •{" "}
                          {cls.start.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                    View
                  </span>
                </div>
              </button>
            </div>
          )}
          {chatFilter !== "friends" && filteredChats.length > 0 && (
            <>
              <p className="px-2 mb-3 text-xs font-semibold text-gray-500 uppercase">
                Recent Chats
              </p>

              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChat({
                      id: chat.id,
                      type: chat.type,
                      uid: chat.uid,
                    });

                    setActiveChatName(chat.displayName);

                    // Remove unread badge immediately
                    setUnreadCounts((prev) => ({
                      ...prev,
                      [chat.id]: 0,
                    }));
                  }}
                  className="bg-white rounded-3xl px-4 py-4 mb-3 flex items-center gap-4 shadow-sm cursor-pointer"
                >
                  <img
                    src={getValidImage(chat.photo, chat.displayName)}
                    className="w-14 h-14 rounded-full object-cover"
                  />

                  {chat.uid && onlineUsers[chat.uid]?.online && (
                    <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}

                  <div className="flex-1">
                    <h3 className="font-semibold">{chat.displayName}</h3>

                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage || "Start conversation"}
                    </p>
                  </div>

                  {unreadCounts[chat.id] > 0 && (
                    <div className="bg-orange-500 text-white min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs">
                      {unreadCounts[chat.id]}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Friends */}
          {(chatFilter === "all" || chatFilter === "friends") &&
            filteredFriends.length > 0 && (
              <>
                <p className="px-2 my-3 text-xs font-semibold text-gray-500 uppercase">
                  Friends
                </p>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    onClick={() => startChat(friend)}
                    className="
            bg-white
            rounded-3xl
            px-4
            py-4
            mb-3
            flex
            items-center
            gap-4
            shadow-sm
            cursor-pointer
          "
                  >
                    <div className="relative">
                      <img
                        src={getValidImage(friend.photo, friend.name)}
                        className="w-14 h-14 rounded-full object-cover"
                      />

                      {onlineUsers[friend.uid]?.online && (
                        <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{friend.name}</h3>
                      <p className="text-sm text-gray-400">
                        Start conversation
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
        </div>
      </div>

      {/* ================= ACTIVE CHAT ================= */}
      <div
        className={`
        ${activeChat ? "flex" : "hidden md:flex"}
        flex-1
        flex-col
        bg-[#F4F4F4]
        h-full
        overflow-hidden
      `}
      >
        {/* TOP HEADER */}
        <div
          className="
          sticky
          top-0
          bg-white
          border-b
          border-gray-100
          px-4
          py-3
          flex
          items-center
          justify-between
          flex-shrink-0
          z-20
        "
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveChat(null);
                setActiveChatName("");
                setMessages([]);
                setSelectedMessages([]);
              }}
              className="md:hidden text-xl"
            >
              ←
            </button>

            <div className="relative">
              <img
                src={getValidImage("", activeChatName)}
                className="w-11 h-11 rounded-full object-cover"
              />

              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            <div>
              <h2 className="font-semibold text-[15px]">
                {activeChatName || "Chat"}
              </h2>

              <p
                className={`text-xs ${
                  activeChat?.uid && onlineUsers[activeChat.uid]?.online
                    ? "text-green-500"
                    : "text-gray-400"
                }`}
              >
                {activeChat?.uid && onlineUsers[activeChat.uid]?.online
                  ? "Online"
                  : onlineUsers[activeChat?.uid]?.lastSeen?.toDate
                  ? `Last seen ${onlineUsers[activeChat.uid].lastSeen
                      .toDate()
                      .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                  : "Offline"}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                if (selectedMessages.length > 0) {
                  setShowMessageMenu((prev) => !prev);
                }
              }}
              className={`
      w-10
      h-10
      rounded-full
      flex
      items-center
      justify-center
      transition
      ${
        selectedMessages.length > 0
          ? "bg-orange-50 text-orange-600"
          : "text-gray-500"
      }
    `}
              aria-label="Message options"
            >
              <MoreVertical size={21} />
            </button>

            {selectedMessages.length > 0 && showMessageMenu && (
              <div
                className="
          absolute
          right-0
          top-11
          z-[100]
          w-48
          bg-white
          rounded-2xl
          shadow-2xl
          border
          border-gray-100
          overflow-hidden
        "
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400">
                    {selectedMessages.length} selected
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowMessageMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="
            w-full
            flex
            items-center
            gap-3
            px-4
            py-3
            text-left
            text-red-600
            hover:bg-red-50
            active:bg-red-100
            text-sm
            font-semibold
          "
                >
                  <span className="text-lg">🗑️</span>

                  <span>
                    Delete{" "}
                    {selectedMessages.length > 1
                      ? `${selectedMessages.length} messages`
                      : "message"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        <div
          className="
          flex-1
          overflow-y-auto
          px-4
          py-5
          space-y-4
          min-h-0
          pb-[50px]
        "
        >
          <div className="flex justify-center">
            <div className="bg-white text-gray-400 text-xs px-4 py-1 rounded-full shadow-sm">
              Today
            </div>
          </div>

          {messages.length === 0 && activeChat && (
            <div className="flex justify-center mt-8">
              <div className="bg-white rounded-3xl p-6 shadow-sm max-w-sm text-center">
                <img
                  src={getValidImage("", activeChatName)}
                  alt=""
                  className="w-16 h-16 rounded-full mx-auto mb-3"
                />

                <h3 className="font-semibold text-lg">{activeChatName}</h3>

                <p className="text-sm text-gray-500 mt-2">
                  Start your conversation with {activeChatName}.
                </p>
              </div>
            </div>
          )}

          {messages
            .sort((a, b) => {
              if (a.type === "classReminder") return -1;
              if (b.type === "classReminder") return 1;

              const ta = a.createdAt?.seconds || 0;
              const tb = b.createdAt?.seconds || 0;

              return ta - tb;
            })
            .map((m) => {
              const sender =
                m.senderId === "SYSTEM"
                  ? { name: "Class Reminder" }
                  : users.find((u) => u.uid === m.senderId);

              const isMine = m.senderId === user?.uid;

              const canSelect =
                isMine && m.type !== "classReminder" && m.senderId !== "SYSTEM";

              const isSelected = isMessageSelected(m.id);

              return (
                <div
                  key={m.id}
                  className={`
          flex
          ${isMine ? "justify-end" : "justify-start"}
          relative
          transition-all
          duration-150
        `}
                  onContextMenu={(e) => handleMessageContextMenu(e, m)}
                  onTouchStart={(e) => {
                    if (canSelect) {
                      startMessageLongPress(e, m);
                    }
                  }}
                  onTouchMove={moveMessageLongPress}
                  onTouchEnd={endMessageLongPress}
                  onTouchCancel={endMessageLongPress}
                  onMouseDown={(e) => {
                    if (e.button === 0 && canSelect) {
                      longPressTimer.current = setTimeout(() => {
                        longPressTriggered.current = true;

                        toggleMessageSelection(m);
                      }, 600);
                    }
                  }}
                  onMouseUp={endMessageLongPress}
                  onMouseLeave={endMessageLongPress}
                  onClick={() => {
                    if (!longPressTriggered.current) {
                      handleMessageTap(m);
                    }

                    longPressTriggered.current = false;
                  }}
                >
                  {/* Selection background */}
                  {isSelected && (
                    <div
                      className="
              absolute
              -inset-2
              rounded-3xl
              bg-orange-100/70
              pointer-events-none
            "
                    />
                  )}

                  <div
                    className={`
            relative
            max-w-[78%]
            px-4
            py-3
            text-sm
            shadow-sm
            select-none
            transition-all
            duration-150

            ${
              m.type === "classReminder"
                ? "bg-blue-50 border border-blue-300 rounded-2xl"
                : isMine
                ? "bg-[#FFE2CF] rounded-2xl rounded-tr-sm"
                : "bg-white rounded-2xl rounded-tl-sm"
            }

            ${
              isSelected
                ? "ring-2 ring-orange-500 ring-offset-2 scale-[0.98]"
                : ""
            }
          `}
                  >
                    {/* Sender */}
                    {!isMine && (
                      <p
                        className="
                text-[11px]
                font-semibold
                text-[#FF6B00]
                mb-1
              "
                      >
                        {m.type === "classReminder"
                          ? "📅 Upcoming Class"
                          : sender?.name || "User"}
                      </p>
                    )}

                    {/* Message */}
                    <p
                      className="
              whitespace-pre-wrap
              break-words
            "
                    >
                      {m.text}
                    </p>

                    {/* Time + read status */}
                    <div
                      className="
              flex
              justify-end
              items-center
              gap-1
              mt-2
            "
                    >
                      <span
                        className="
                text-[10px]
                text-gray-500
              "
                      >
                        {formatMessageTime(m.createdAt)}
                      </span>

                      {isMine && (m.readBy?.length || 0) > 1 ? (
                        <CheckCheck size={15} className="text-blue-500" />
                      ) : (
                        isMine && <Check size={15} className="text-gray-400" />
                      )}
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <div
                        className="
                absolute
                -top-2
                -right-2
                w-6
                h-6
                rounded-full
                bg-orange-500
                text-white
                flex
                items-center
                justify-center
                text-xs
                font-bold
                shadow-md
              "
                      >
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div
          className="
          bg-[#F4F4F4]
          border-t
          border-gray-100
          px-3
          pt-2
          pb-[calc(env(safe-area-inset-bottom)+12px)]
          flex-shrink-0
        "
        >
          <div className="flex items-end gap-3">
            <div
              className="
              flex-1
              bg-white
              rounded-full
              px-4
              py-3
              flex
              items-center
              gap-3
              shadow-sm
            "
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message"
                className="flex-1 outline-none text-sm bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
            </div>

            <button
              onClick={sendMessage}
              className="
              w-14
              h-12
              rounded-full
              bg-[#FF6B00]
              flex
              items-center
              justify-center
              shadow-lg
              shrink-0
            "
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>
      {showUpcomingPopup && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="bg-orange-500 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Upcoming Classes</h2>
                <p className="text-sm opacity-90">Next scheduled sessions</p>
              </div>

              <button
                onClick={() => setShowUpcomingPopup(false)}
                className="text-2xl"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto max-h-[65vh] p-5 space-y-4">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="
              border
              border-orange-100
              rounded-2xl
              p-4
              hover:shadow-md
              transition
            "
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{cls.title}</h3>

                      <p className="text-sm text-gray-500">
                        {cls.category}
                        {cls.subCategory && ` • ${cls.subCategory}`}
                      </p>
                    </div>

                    <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-semibold">
                      Upcoming
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-gray-400">Trainer</p>

                      <p className="font-medium">{cls.trainerName}</p>
                    </div>

                    <div>
                      <p className="text-gray-400">Branch</p>

                      <p className="font-medium">{cls.branch}</p>
                    </div>

                    <div>
                      <p className="text-gray-400">Date</p>

                      <p className="font-medium">
                        {cls.start.toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Time</p>

                      <p className="font-medium">
                        {cls.start.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ================= DELETE MESSAGE CONFIRMATION ================= */}

      {showDeleteConfirm && (
        <div
          className="
      fixed
      inset-0
      z-[2000]
      bg-black/50
      backdrop-blur-[2px]
      flex
      items-end
      sm:items-center
      justify-center
      p-0
      sm:p-4
    "
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="
        bg-white
        w-full
        sm:max-w-sm
        rounded-t-3xl
        sm:rounded-3xl
        p-6
        shadow-2xl
      "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="
            w-16
            h-16
            rounded-full
            bg-red-50
            flex
            items-center
            justify-center
            text-2xl
          "
              >
                🗑️
              </div>
            </div>

            {/* Title */}
            <h2
              className="
          text-lg
          font-bold
          text-gray-900
          text-center
        "
            >
              Delete{" "}
              {selectedMessages.length === 1
                ? "message?"
                : `${selectedMessages.length} messages?`}
            </h2>

            {/* Description */}
            <p
              className="
          text-sm
          text-gray-500
          text-center
          mt-2
          leading-relaxed
        "
            >
              Are you sure you want to delete{" "}
              {selectedMessages.length === 1
                ? "this message"
                : `these ${selectedMessages.length} messages`}
              ?
              <br />
              This action cannot be undone.
            </p>

            {/* Selected messages preview */}
            <div
              className="
          mt-4
          bg-gray-50
          rounded-2xl
          p-3
          max-h-28
          overflow-y-auto
          space-y-2
        "
            >
              {selectedMessages.map((message) => (
                <div
                  key={message.id}
                  className="
                bg-white
                rounded-xl
                px-3
                py-2
                border
                border-gray-100
              "
                >
                  <p
                    className="
                  text-xs
                  text-gray-600
                  whitespace-pre-wrap
                  break-words
                "
                  >
                    {message.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div
              className="
          grid
          grid-cols-2
          gap-3
          mt-5
        "
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="
            h-12
            rounded-xl
            bg-gray-100
            text-gray-700
            font-semibold
            active:scale-[0.98]
          "
              >
                Cancel
              </button>

              <button
                onClick={deleteSelectedMessages}
                className="
            h-12
            rounded-xl
            bg-red-500
            text-white
            font-semibold
            active:scale-[0.98]
            shadow-sm
          "
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
