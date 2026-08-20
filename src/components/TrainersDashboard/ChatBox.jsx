import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Send,
  BellOff,
  Bell,
  Info,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import { db, auth } from "../../firebase";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import ChatMuteMenuItems from "../chat/ChatMuteMenuItems";
import { getChatDayKey, getChatDayLabel } from "../../utils/chatDayLabel";
import {
  ensureChatNotifications,
  isChatMuted,
  isConversationMuted,
  loadNotificationSettings,
  setActiveChatId,
  setConversationMute,
  setGlobalMute,
} from "../../utils/chatNotifications";
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
  limit,
  serverTimestamp,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

const USER_COLLECTIONS = [
  "users",
  "trainerstudents",
  "students",
  "trainers",
  "institutes",
  "InstituteTrainers",
];

const ChatBox = () => {
  const [activeTab, setActiveTab] = useState("chats");
  const [showMenu, setShowMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [incomingBanner, setIncomingBanner] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMuted, setIsMuted] = useState(isChatMuted);
  const [conversationMuted, setConversationMuted] = useState(false);
  const [user, setUser] = useState(null);
  const [trainerId, setTrainerId] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatName, setActiveChatName] = useState("");
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [renameValue, setRenameValue] = useState("");
  const [chatList, setChatList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({});
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const appState = useRef(true);
  const mutedRef = useRef(isMuted);
  const notifiedMessages = useRef(new Set());
  const initializedNotificationChats = useRef(new Set());
  const pendingNotifications = useRef(new Map());
  const notificationTimers = useRef(new Map());
  const notificationIds = useRef(new Map());
  const userDetailsCache = useRef(new Map());
  const unreadUnsubs = useRef({});
  const notificationUnsubs = useRef({});
  const activeChatRef = useRef(null);
  const usersRef = useRef([]);

  useEffect(() => {
    activeChatRef.current = activeChat;
    setActiveChatId(activeChat?.id || null);
  }, [activeChat]);

  useEffect(() => {
    return () => setActiveChatId(null);
  }, []);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!user) return;
    loadNotificationSettings(user.uid).then(() => {
      setIsMuted(isChatMuted());
      setConversationMuted(isConversationMuted(activeChat?.id));
    });
  }, [user, activeChat?.id]);

  useEffect(() => {
    const navbar = document.getElementById("bottom-navbar");
    const previousHeight =
      document.documentElement.style.getPropertyValue("--bottom-navbar-height");
    const previousDisplay = navbar?.style.display || "";

    document.body.classList.add("chat-fullscreen");
    document.documentElement.style.setProperty("--bottom-navbar-height", "0px");
    if (navbar) navbar.style.display = "none";

    return () => {
      document.body.classList.remove("chat-fullscreen");
      document.documentElement.style.setProperty(
        "--bottom-navbar-height",
        previousHeight || "",
      );
      if (navbar) navbar.style.display = previousDisplay;
    };
  }, []);

  const getValidImage = (url, name) => {
    if (!url)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User",
      )}`;
    if (url.startsWith("blob:"))
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User",
      )}`;
    return url;
  };

  const updatePresence = async (online) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(
        doc(db, "presence", auth.currentUser.uid),
        { online, lastSeen: serverTimestamp() },
        { merge: true },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const getUserDetails = async (uid) => {
    if (!uid) {
      return { uid, name: "Unknown User", photo: "", role: "" };
    }
    if (userDetailsCache.current.has(uid)) {
      return userDetailsCache.current.get(uid);
    }

    for (const col of USER_COLLECTIONS) {
      const snap = await getDoc(doc(db, col, uid));
      if (!snap.exists()) continue;
      const data = snap.data();
      const details = {
        uid,
        name:
          data.name ||
          data.trainerName ||
          data.instituteName ||
          data.organization ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
          "User",
        photo:
          data.profileImageUrl ||
          data.profileImage ||
          data.studentPhotoUrl ||
          data.ownerPhotoUrl ||
          "",
        role: col,
      };
      userDetailsCache.current.set(uid, details);
      return details;
    }

    const fallback = { uid, name: "Unknown User", photo: "", role: "" };
    userDetailsCache.current.set(uid, fallback);
    return fallback;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chatId");
    if (!chatId) return;
    setActiveChat({ id: chatId, type: "individual" });
    setActiveChatName("Chat");
  }, [location.search]);

  useEffect(() => {
    const data = location.state;
    if (!data?.openChatId) return;
    setActiveChat({
      id: data.openChatId,
      type: "individual",
      uid: data?.targetUser?.uid || null,
    });
    setActiveChatName(data?.targetUser?.name || "Chat");
  }, [location.state]);

  useEffect(() => {
    if (!user) return;

    const handleAppState = ({ isActive }) => {
      appState.current = isActive;
      updatePresence(isActive);
    };

    updatePresence(true);
    let listener;
    const setup = async () => {
      listener = await App.addListener("appStateChange", handleAppState);
    };
    setup();

    return () => {
      updatePresence(false);
      listener?.remove();
    };
  }, [user]);

  useEffect(() => {
    ensureChatNotifications();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;
    const setup = async () => {
      listener = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (event) => {
          const extra = event?.notification?.extra || {};
          const chatId = extra.chatId;
          if (!chatId) return;

          setActiveChat({
            id: chatId,
            type: extra.type || "individual",
            uid: extra.senderId || null,
          });
          setActiveChatName(extra.senderName || "Chat");

          if (location.pathname.includes("TrainersDashboard/ChatBox")) {
            navigate(
              `/components/TrainersDashboard/ChatBox?chatId=${encodeURIComponent(
                chatId,
              )}`,
              { replace: true },
            );
          }
        },
      );
    };

    setup();
    return () => listener?.remove();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      if (!detail.chatId) return;
      if (activeChatRef.current?.id === detail.chatId) return;
      setIncomingBanner(detail);
      window.setTimeout(() => setIncomingBanner(null), 4000);
    };
    window.addEventListener("kridana-incoming-chat", handler);
    return () => window.removeEventListener("kridana-incoming-chat", handler);
  }, []);

  /* Hardware / swipe-back: close chat before leaving page */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle;
    const setup = async () => {
      handle = await App.addListener("backButton", () => {
        if (activeChatRef.current) {
          setActiveChat(null);
          setActiveChatName("");
          setMessages([]);
        } else {
          navigate(-1);
        }
      });
    };
    setup();
    return () => handle?.remove();
  }, [navigate]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      setUser(currentUser);

      const trainerSnap = await getDoc(doc(db, "trainers", currentUser.uid));
      if (trainerSnap.exists()) {
        setTrainerId(currentUser.uid);
        return;
      }

      const instTrainerSnap = await getDocs(
        query(
          collection(db, "InstituteTrainers"),
          where("trainerUid", "==", currentUser.uid),
        ),
      );
      if (!instTrainerSnap.empty) {
        setTrainerId(currentUser.uid);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!trainerId) return;

    const unsubStudents = onSnapshot(
      query(
        collection(db, "trainerstudents"),
        where("trainerId", "==", trainerId),
      ),
      (snap) => {
        const students = snap.docs
          .map((item) => {
            const data = item.data();
            const uid = data.studentUid || item.id;
            if (!uid) return null;
            return {
              id: item.id,
              uid,
              name:
                `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
                data.name ||
                "Student",
              role: "student",
              profileImageUrl: data.profileImageUrl || data.studentPhotoUrl || "",
            };
          })
          .filter(Boolean);

        setUsers(students);
      },
    );

    return () => unsubStudents();
  }, [trainerId]);

  useEffect(() => {
    if (!user || !trainerId) return;

    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid),
      where("trainerId", "==", trainerId),
    );

    const unsub = onSnapshot(groupsQuery, (snap) => {
      setGroups(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => unsub();
  }, [user, trainerId]);

  useEffect(() => {
    const people = users.filter((person) => person.uid);
    if (!people.length) return;

    const unsubscribers = people.map((person) =>
      onSnapshot(doc(db, "presence", person.uid), (snap) => {
        if (!snap.exists()) return;
        setOnlineUsers((prev) => ({
          ...prev,
          [person.uid]: snap.data(),
        }));
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [users]);

  useEffect(() => {
    if (!user) {
      setListLoading(false);
      return;
    }

    setListLoading(true);
    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
    );

    const unsub = onSnapshot(chatsQuery, async (snap) => {
      const chats = await Promise.all(
        snap.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          if (!Array.isArray(data.members) || !data.members.includes(user.uid)) {
            return null;
          }

          if (data.type === "group") {
            return {
              id: chatDoc.id,
              type: "group",
              name: data.name || "Group",
              members: data.members || [],
              lastMessage: data.lastMessage || "",
              lastAt: data.lastAt || data.createdAt || null,
              profileImageUrl: "",
            };
          }

          const otherUid = (data.members || []).find(
            (memberId) => memberId !== user.uid,
          );
          if (!otherUid) return null;

          const localUser = usersRef.current.find(
            (person) => person.uid === otherUid,
          );
          const otherUser = localUser
            ? {
                name: localUser.name,
                photo: localUser.profileImageUrl,
                role: localUser.role,
              }
            : await getUserDetails(otherUid);

          return {
            id: chatDoc.id,
            uid: otherUid,
            type: "individual",
            name: otherUser.name,
            profileImageUrl: otherUser.photo || localUser?.profileImageUrl || "",
            role: otherUser.role || localUser?.role || "",
            lastMessage: data.lastMessage || "",
            lastAt: data.lastAt || data.createdAt || null,
          };
        }),
      );

      const validChats = chats.filter(Boolean);
      validChats.sort((a, b) => {
        const aTime = a.lastAt?.seconds || 0;
        const bTime = b.lastAt?.seconds || 0;
        return bTime - aTime;
      });

      setChatList(validChats);
      setListLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
    );

    const unsubChats = onSnapshot(chatsQuery, (snap) => {
      const liveIds = new Set(snap.docs.map((chatDoc) => chatDoc.id));

      Object.keys(unreadUnsubs.current).forEach((chatId) => {
        if (!liveIds.has(chatId)) {
          unreadUnsubs.current[chatId]();
          delete unreadUnsubs.current[chatId];
        }
      });

      snap.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        if (unreadUnsubs.current[chatId]) return;

        const messagesQuery = query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "desc"),
          limit(40),
        );

        unreadUnsubs.current[chatId] = onSnapshot(messagesQuery, (msgSnap) => {
          let unread = 0;
          msgSnap.forEach((messageDoc) => {
            const data = messageDoc.data();
            if (
              data.senderId !== user.uid &&
              !data.readBy?.includes(user.uid)
            ) {
              unread += 1;
            }
          });
          setUnreadCounts((prev) => ({ ...prev, [chatId]: unread }));
        });
      });
    });

    return () => {
      unsubChats();
      Object.values(unreadUnsubs.current).forEach((unsubscribe) =>
        unsubscribe(),
      );
      unreadUnsubs.current = {};
    };
  }, [user]);

  useEffect(() => {
    if (!activeChat?.id) return;

    setMessages([]);
    setMessagesLoading(true);
    const messagesQuery = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(200),
    );

    const unsub = onSnapshot(messagesQuery, (snap) => {
      setMessages(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setMessagesLoading(false);
    });

    return () => unsub();
  }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat?.id || !user) return;

    const markRead = async () => {
      const recentSnap = await getDocs(
        query(
          collection(db, "chats", activeChat.id, "messages"),
          orderBy("createdAt", "desc"),
          limit(40),
        ),
      );

      const updates = recentSnap.docs.filter((item) => {
        const data = item.data();
        return data.senderId !== user.uid && !data.readBy?.includes(user.uid);
      });

      await Promise.all(
        updates.map((item) =>
          updateDoc(doc(db, "chats", activeChat.id, "messages", item.id), {
            readBy: [...new Set([...(item.data().readBy || []), user.uid])],
          }),
        ),
      );

      setUnreadCounts((prev) => ({ ...prev, [activeChat.id]: 0 }));
    };

    markRead();
  }, [activeChat?.id, user, messages[messages.length - 1]?.id]);

  const isAdmin = () => {
    const group = groups.find((item) => item.id === activeChat?.id);
    return group?.adminId === user?.uid;
  };

  const openChat = (chat) => {
    setActiveChat({
      id: chat.id,
      type: chat.type || "individual",
      uid: chat.uid || null,
    });
    setActiveChatName(chat.name || "Chat");
    setShowMenu(false);
    setShowChatMenu(false);
    setShowChatSearch(false);
    setMessageSearch("");
    setSelectedMessages([]);
    setSelectionMode(false);
    setUnreadCounts((prev) => ({ ...prev, [chat.id]: 0 }));
  };

  const startChat = async (target) => {
    if (!user || !target?.uid || target.uid === user.uid) return;

    try {
      const chatId = [user.uid, target.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const snap = await getDoc(chatRef);

      if (!snap.exists()) {
        await setDoc(chatRef, {
          type: "individual",
          trainerId: trainerId || null,
          members: [user.uid, target.uid],
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastAt: serverTimestamp(),
        });
      }

      openChat({
        id: chatId,
        type: "individual",
        uid: target.uid,
        name: target.name || "Chat",
      });
    } catch (error) {
      console.error("Start chat error:", error);
    }
  };

  const renameGroup = async () => {
    if (!activeChat?.id || !renameValue.trim() || !user) return;
    const groupRef = doc(db, "groups", activeChat.id);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists() || groupSnap.data().adminId !== user.uid) return;

    await updateDoc(groupRef, { name: renameValue.trim() });
    await updateDoc(doc(db, "chats", activeChat.id), {
      name: renameValue.trim(),
    });
    setActiveChatName(renameValue.trim());
    setRenameValue("");
  };

  const deleteGroup = async () => {
    if (!activeChat?.id || !user) return;
    const groupRef = doc(db, "groups", activeChat.id);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists() || groupSnap.data().adminId !== user.uid) return;

    const msgs = await getDocs(
      query(collection(db, "chats", activeChat.id, "messages"), limit(200)),
    );
    await Promise.all(
      msgs.docs.map((item) =>
        deleteDoc(doc(db, "chats", activeChat.id, "messages", item.id)),
      ),
    );
    await deleteDoc(doc(db, "chats", activeChat.id));
    await deleteDoc(groupRef);
    setActiveChat(null);
    setActiveChatName("");
    setMessages([]);
    setShowMenu(false);
  };

  const sendMessage = async () => {
    const message = text.trim();
    if (!message || !activeChat?.id || !user || sending) return;
    if (message.length > 2000) return;

    setSending(true);
    setText("");

    try {
      const chatRef = doc(db, "chats", activeChat.id);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) return;
      if (!(chatSnap.data().members || []).includes(user.uid)) return;

      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });

      await updateDoc(chatRef, {
        lastMessage: message,
        lastAt: serverTimestamp(),
        lastSenderId: user.uid,
      });
    } catch (error) {
      console.error("Send message error:", error);
      setText(message);
    } finally {
      setSending(false);
    }
  };

  const handleMic = async () => {
    if (!activeChat?.id || !user) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      if (!isRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const audioURL = URL.createObjectURL(blob);
          const chatSnap = await getDoc(doc(db, "chats", activeChat.id));
          if (!chatSnap.exists()) return;
          if (!(chatSnap.data().members || []).includes(user.uid)) return;

          await addDoc(collection(db, "chats", activeChat.id, "messages"), {
            audio: audioURL,
            senderId: user.uid,
            createdAt: serverTimestamp(),
            readBy: [user.uid],
          });
          await updateDoc(doc(db, "chats", activeChat.id), {
            lastMessage: "Voice message",
            lastAt: serverTimestamp(),
            lastSenderId: user.uid,
          });
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } else if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } catch (error) {
      console.error("Mic error:", error);
      setIsRecording(false);
    }
  };

  const submitCreateGroup = async () => {
    if (!user || !trainerId || !groupName.trim() || !selectedMembers.length) {
      return;
    }

    try {
      const members = [...new Set([user.uid, ...selectedMembers])].filter(
        Boolean,
      );
      const groupRef = await addDoc(collection(db, "groups"), {
        name: groupName.trim(),
        trainerId,
        members,
        adminId: user.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "chats", groupRef.id), {
        type: "group",
        trainerId,
        members,
        name: groupName.trim(),
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastAt: serverTimestamp(),
      });

      openChat({
        id: groupRef.id,
        type: "group",
        name: groupName.trim(),
      });
      setGroupName("");
      setSelectedMembers([]);
      setShowCreateGroup(false);
    } catch (error) {
      console.error("Create group error:", error);
    }
  };

  const removeParticipant = async (uid) => {
    if (!activeChat?.id || !user || !uid) return;
    const groupRef = doc(db, "groups", activeChat.id);
    const snap = await getDoc(groupRef);
    if (!snap.exists() || snap.data().adminId !== user.uid) return;

    await updateDoc(groupRef, { members: arrayRemove(uid) });
    await updateDoc(doc(db, "chats", activeChat.id), {
      members: arrayRemove(uid),
    });
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages([]);
    setShowDeleteConfirm(false);
  };

  const toggleMessageSelection = (message) => {
    if (message.senderId !== user?.uid) return;
    setSelectionMode(true);
    setSelectedMessages((prev) => {
      if (prev.includes(message.id)) {
        const next = prev.filter((id) => id !== message.id);
        if (next.length === 0) setSelectionMode(false);
        return next;
      }
      return [...prev, message.id];
    });
  };

  const startMessageLongPress = (message) => {
    if (message.senderId !== user?.uid) return;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      toggleMessageSelection(message);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 550);
  };

  const cancelMessageLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const deleteSelectedMessages = async () => {
    if (!activeChat?.id || !user?.uid || !selectedMessages.length) return;

    try {
      for (const messageId of selectedMessages) {
        const messageRef = doc(
          db,
          "chats",
          activeChat.id,
          "messages",
          messageId,
        );
        const messageSnap = await getDoc(messageRef);
        if (!messageSnap.exists()) continue;
        if (messageSnap.data().senderId !== user.uid) continue;
        await deleteDoc(messageRef);
      }

      const remainingSnap = await getDocs(
        query(
          collection(db, "chats", activeChat.id, "messages"),
          orderBy("createdAt", "desc"),
          limit(1),
        ),
      );

      if (remainingSnap.empty) {
        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: "",
          lastAt: null,
          lastSenderId: null,
        });
      } else {
        const latest = remainingSnap.docs[0].data();
        await updateDoc(doc(db, "chats", activeChat.id), {
          lastMessage: latest.text || (latest.audio ? "Voice message" : ""),
          lastAt: latest.createdAt || serverTimestamp(),
          lastSenderId: latest.senderId || null,
        });
      }

      closeSelectionMode();
    } catch (error) {
      console.error("Delete selected messages error:", error);
    }
  };

  const memberObjects = (
    groups.find((group) => group.id === activeChat?.id)?.members || []
  )
    .map(
      (uid) =>
        users.find((person) => person.uid === uid) || {
          uid,
          name: "Unknown User",
        },
    )
    .filter(Boolean);

  const keyword = searchTerm.trim().toLowerCase();
  const filteredChats = chatList.filter((chat) => {
    if (activeTab === "group" && chat.type !== "group") return false;
    if (activeTab === "chats" && chat.type === "group") return false;
    if (!keyword) return true;
    return (
      (chat.name || "").toLowerCase().includes(keyword) ||
      (chat.lastMessage || "").toLowerCase().includes(keyword)
    );
  });

  const visiblePeople = users
    .filter((person) => person.uid && person.uid !== user?.uid)
    .filter(
      (person, index, self) =>
        index === self.findIndex((item) => item.uid === person.uid),
    )
    .filter((person) =>
      keyword ? (person.name || "").toLowerCase().includes(keyword) : true,
    );

  const visibleMessages = messageSearch.trim()
    ? messages.filter((message) =>
        (message.text || "")
          .toLowerCase()
          .includes(messageSearch.trim().toLowerCase()),
      )
    : messages;

  const formatTime = (createdAt) => {
    if (!createdAt?.seconds) return "";
    return new Date(createdAt.seconds * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-[10050] flex h-[100dvh] w-full bg-[#f3f3f3] overflow-hidden">
      {incomingBanner && (
        <button
          type="button"
          onClick={() => {
            openChat({
              id: incomingBanner.chatId,
              type: incomingBanner.type || "individual",
              uid: incomingBanner.senderId,
              name: incomingBanner.senderName,
            });
            setIncomingBanner(null);
          }}
          className="absolute top-3 left-3 right-3 z-[80] bg-white rounded-2xl shadow-lg border border-orange-100 px-4 py-3 text-left"
        >
          <p className="text-sm font-semibold text-gray-900">
            {incomingBanner.senderName}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {incomingBanner.text}
          </p>
        </button>
      )}

      <div
        className={`${
          activeChat ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] bg-[#F8F8F8] border-r border-gray-100 h-full`}
      >
        <div className="px-4 pt-[max(env(safe-area-inset-top),20px)] pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => {
                if (activeChat) {
                  setActiveChat(null);
                  setActiveChatName("");
                  setMessages([]);
                  closeSelectionMode();
                } else {
                  navigate(-1);
                }
              }}
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-black">Chat</h1>
          </div>

          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search students, chats, groups..."
            className="w-full mt-4 bg-white rounded-2xl px-4 py-3 text-sm outline-none border border-gray-200 shadow-sm"
          />

          <div className="flex gap-2 mt-3 overflow-x-auto">
            {[
              { id: "chats", label: "Chats" },
              { id: "group", label: "Groups" },
              { id: "people", label: "Students" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-600 border"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="ml-auto h-9 w-9 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-sm"
              title="Create group"
            >
              +
            </button>
          </div>
        </div>

        {activeTab !== "group" && visiblePeople.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Your students
            </p>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4">
                {visiblePeople.slice(0, 16).map((person) => (
                  <button
                    key={person.uid}
                    type="button"
                    onClick={() => startChat(person)}
                    className="flex flex-col items-center min-w-[68px]"
                  >
                    <div className="relative">
                      <img
                        src={getValidImage(person.profileImageUrl, person.name)}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      {onlineUsers[person.uid]?.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="text-xs mt-1 truncate w-full text-center text-gray-700">
                      {person.name?.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-6 min-h-0">
          {listLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="bg-white rounded-3xl px-4 py-4 flex items-center gap-4 animate-pulse"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 bg-gray-200 rounded-full" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!listLoading && activeTab !== "people" && filteredChats.length > 0 && (
            <>
              <p className="px-2 mb-3 text-xs font-semibold text-gray-500 uppercase">
                {activeTab === "group" ? "Groups" : "Recent chats"}
              </p>
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => openChat(chat)}
                  className="w-full bg-white rounded-3xl px-4 py-4 mb-3 flex items-center gap-4 shadow-sm text-left"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getValidImage(chat.profileImageUrl, chat.name)}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    {chat.uid && onlineUsers[chat.uid]?.online && (
                      <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate">{chat.name}</h3>
                      {chat.lastAt?.seconds && (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {formatTime(chat.lastAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage ||
                        (chat.type === "group"
                          ? "Group conversation"
                          : "Start conversation")}
                    </p>
                  </div>
                  {unreadCounts[chat.id] > 0 && (
                    <div className="bg-orange-500 text-white min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs">
                      {unreadCounts[chat.id]}
                    </div>
                  )}
                </button>
              ))}
            </>
          )}

          {!listLoading && activeTab === "people" && (
            <>
              {visiblePeople.map((person) => (
                <button
                  key={person.uid}
                  type="button"
                  onClick={() => startChat(person)}
                  className="w-full bg-white rounded-3xl px-4 py-4 mb-3 flex items-center gap-4 shadow-sm text-left"
                >
                  <div className="relative">
                    <img
                      src={getValidImage(person.profileImageUrl, person.name)}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    {onlineUsers[person.uid]?.online && (
                      <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{person.name}</h3>
                    <p className="text-xs text-gray-400">Student</p>
                  </div>
                </button>
              ))}
              {visiblePeople.length === 0 && (
                <div className="text-center py-16 px-6">
                  <p className="text-sm font-semibold text-gray-700">
                    No students yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Students you add will appear here so you can message them.
                  </p>
                </div>
              )}
            </>
          )}

          {!listLoading &&
            activeTab !== "people" &&
            filteredChats.length === 0 && (
              <div className="text-center py-16 px-6">
                <p className="text-sm font-semibold text-gray-700">
                  {activeTab === "group" ? "No groups yet" : "No chats yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === "group"
                    ? "Create a group to message several students at once."
                    : "Start a conversation from Your students above."}
                </p>
                {activeTab === "group" && (
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(true)}
                    className="mt-4 bg-[#FF6B00] text-white px-6 py-3 rounded-xl text-sm font-medium"
                  >
                    Create group
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      <div
        className={`${
          activeChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col bg-[#F4F4F4] h-full overflow-hidden`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveChat(null);
                setActiveChatName("");
                setMessages([]);
                closeSelectionMode();
              }}
              className="md:hidden text-xl"
            >
              ←
            </button>
            <img
              src={getValidImage("", activeChatName)}
              alt=""
              className="w-11 h-11 rounded-full object-cover"
            />
            <div className="min-w-0">
              <h2 className="font-semibold text-[15px] truncate">
                {activeChatName || "Select a chat"}
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
                    : activeChat
                      ? "Offline"
                      : ""}
              </p>
            </div>
          </div>

          {activeChat && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (selectedMessages.length > 0) {
                    setShowMenu((prev) => !prev);
                    setShowChatMenu(false);
                  } else {
                    setShowChatMenu((prev) => !prev);
                    setShowMenu(false);
                  }
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500"
              >
                <MoreVertical size={21} />
              </button>

              {showChatMenu && selectedMessages.length === 0 && (
                <div className="absolute right-0 top-11 z-[100] w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatSearch(true);
                      setShowChatMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
                  >
                    <Search size={16} />
                    Search messages
                  </button>
                  <ChatMuteMenuItems
                    conversationMuted={conversationMuted}
                    globalMuted={isMuted}
                    onToggleConversation={async () => {
                      if (!user || !activeChat?.id) return;
                      const next = !conversationMuted;
                      setConversationMuted(next);
                      setShowChatMenu(false);
                      await setConversationMute(user.uid, activeChat.id, next);
                    }}
                    onToggleGlobal={async () => {
                      if (!user) return;
                      const next = !isMuted;
                      setIsMuted(next);
                      setShowChatMenu(false);
                      await setGlobalMute(user.uid, next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      setShowMenu(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
                  >
                    <Info size={16} />
                    Chat info
                  </button>
                </div>
              )}

              {selectedMessages.length > 0 && showMenu && (
                <div className="absolute right-0 top-11 z-[100] w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-3 text-left text-red-600 text-sm font-semibold hover:bg-red-50"
                  >
                    Delete {selectedMessages.length} selected
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showChatSearch && (
          <div className="px-3 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={messageSearch}
              onChange={(event) => setMessageSearch(event.target.value)}
              placeholder="Search in this chat"
              className="flex-1 min-h-[40px] text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setShowChatSearch(false);
                setMessageSearch("");
              }}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {showMenu && activeChat?.type === "group" && (
          <div className="bg-white border-b border-gray-100 p-4 space-y-4 max-h-[40%] overflow-y-auto">
            {isAdmin() && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Rename group</h3>
                <div className="flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder="New group name"
                    className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={renameGroup}
                    className="bg-[#FF6B00] text-white px-4 rounded-xl text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2 text-sm">Participants</h3>
              <div className="space-y-2">
                {memberObjects.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between bg-[#F8F8F8] rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getValidImage(member.profileImageUrl, member.name)}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <span className="text-sm truncate">{member.name}</span>
                    </div>
                    {isAdmin() && member.uid !== user?.uid && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(member.uid)}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {isAdmin() && (
              <button
                type="button"
                onClick={deleteGroup}
                className="w-full bg-red-500 text-white py-3 rounded-2xl text-sm font-semibold"
              >
                Delete group
              </button>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse overscroll-contain">
          <div className="px-4 py-5 space-y-4">
          {messagesLoading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-[#FF6B00]" />
            </div>
          )}

          {messages.length === 0 && activeChat && !messagesLoading && (
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

          {!activeChat && !messagesLoading && (
            <div className="flex justify-center mt-16 text-sm text-gray-400">
              Select a chat to start messaging
            </div>
          )}

          {visibleMessages.map((message, index) => {
            const sender = users.find(
              (person) => person.uid === message.senderId,
            );
            const isMine = message.senderId === user?.uid;
            const isSelected = selectedMessages.includes(message.id);
            const showDay =
              getChatDayKey(message.createdAt) !==
              getChatDayKey(visibleMessages[index - 1]?.createdAt);

            return (
              <React.Fragment key={message.id}>
                {showDay && (
                  <div className="flex justify-center py-1">
                    <span className="bg-white text-gray-500 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                      {getChatDayLabel(message.createdAt) || "Today"}
                    </span>
                  </div>
                )}
              <div
                className={`flex ${isMine ? "justify-end" : "justify-start"} relative`}
                onTouchStart={() => startMessageLongPress(message)}
                onTouchEnd={cancelMessageLongPress}
                onTouchMove={cancelMessageLongPress}
                onMouseDown={() => startMessageLongPress(message)}
                onMouseUp={cancelMessageLongPress}
                onMouseLeave={cancelMessageLongPress}
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false;
                    return;
                  }
                  if (selectionMode) toggleMessageSelection(message);
                }}
              >
                <div
                  className={`relative max-w-[78%] px-4 py-3 text-sm shadow-sm ${
                    isMine
                      ? "bg-[#FFE2CF] rounded-2xl rounded-tr-sm"
                      : "bg-white rounded-2xl rounded-tl-sm"
                  } ${isSelected ? "ring-2 ring-orange-500" : ""}`}
                >
                  {activeChat?.type === "group" && !isMine && (
                    <p className="text-[11px] font-semibold text-[#FF6B00] mb-1">
                      {sender?.name || "User"}
                    </p>
                  )}
                  {message.text && (
                    <p className="whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  )}
                  {message.audio && (
                    <audio controls className="w-full mt-2 max-w-[240px]">
                      <source src={message.audio} type="audio/webm" />
                    </audio>
                  )}
                  <div className="flex justify-end items-center gap-1 mt-2">
                    <span className="text-[10px] text-gray-500">
                      {formatTime(message.createdAt)}
                    </span>
                    {isMine &&
                      ((message.readBy?.length || 0) > 1 ? (
                        <CheckCheck size={15} className="text-blue-500" />
                      ) : (
                        <Check size={15} className="text-gray-400" />
                      ))}
                  </div>
                </div>
              </div>
              </React.Fragment>
            );
          })}
          </div>
        </div>

        <div className="bg-[#F4F4F4] border-t border-gray-100 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] flex-shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-white rounded-full px-4 py-3 flex items-center gap-3 shadow-sm">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={activeChat ? "Message" : "Select a chat first"}
                disabled={!activeChat || sending}
                className="flex-1 outline-none text-sm bg-transparent"
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
              />
            </div>
            <button
              type="button"
              onClick={text.trim() ? sendMessage : handleMic}
              disabled={sending || !activeChat}
              className="w-14 h-12 rounded-full bg-[#FF6B00] flex items-center justify-center shadow-lg shrink-0 disabled:opacity-50"
            >
              {sending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : text.trim() ? (
                <Send size={20} className="text-white" />
              ) : (
                <span className="text-white text-lg">
                  {isRecording ? "■" : "🎤"}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:w-[430px] rounded-t-[30px] md:rounded-[30px] p-5 max-h-[82dvh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Create group</h2>
              <button type="button" onClick={() => setShowCreateGroup(false)}>
                ×
              </button>
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Enter group name"
              className="w-full bg-white rounded-2xl py-3.5 px-4 outline-none text-sm border border-gray-200 mb-4"
            />
            <div className="space-y-3 max-h-[45vh] overflow-y-auto">
              {visiblePeople.map((person) => (
                <label
                  key={person.uid}
                  className="flex items-center gap-3 bg-[#F8F8F8] rounded-2xl p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(person.uid)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedMembers((prev) => [...prev, person.uid]);
                      } else {
                        setSelectedMembers((prev) =>
                          prev.filter((id) => id !== person.uid),
                        );
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <img
                    src={getValidImage(person.profileImageUrl, person.name)}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {person.name}
                    </h3>
                    <p className="text-xs text-gray-400">Student</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={submitCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0}
              className="w-full mt-5 bg-[#FF6B00] text-white py-3 rounded-2xl font-semibold disabled:opacity-50"
            >
              Create group
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center px-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-[370px] bg-white rounded-[28px] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-center text-lg font-bold text-gray-900">
              Delete selected messages?
            </h3>
            <p className="text-center text-sm text-gray-500 mt-2">
              Only your own messages will be removed.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelectedMessages}
                className="py-3 rounded-2xl bg-red-500 text-white font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
