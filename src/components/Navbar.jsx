import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  chatPathForRoute,
  ensureChatNotifications,
  getSmartMoreTip,
  isChatMuted,
  isOwnChatMessage,
  loadNotificationSettings,
  setAlertSound,
  setGlobalMute,
  setWalkingMute,
  setWalkingReminders,
} from "../utils/chatNotifications";
import NotificationPrefsPanel from "./chat/NotificationPrefsPanel";
import NavbarTour from "./NavbarTour";
import { scheduleDailyWalkReminder } from "../pages/Fitness/walkingNotifications";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  setDoc, // ✅ ADD THIS
  arrayUnion,
  updateDoc,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";
import {
  Home,
  Grid,
  MoreHorizontal,
  TrendingUp,
  LayoutGrid,
  MessageSquareText,
  Footprints,
  User,
  Settings,
  Users,
  Image,
  FileText,
  ShieldCheck,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  X,
  Bell,
  BellOff,
  ChevronLeft,
  Sparkles,
  Upload,
  LayoutDashboard,
  Clapperboard,
  Loader2,
} from "lucide-react";

const serviceTypes = [
  { name: "Martial Arts", path: "/services/martial-arts" },
  { name: "Team Ball Sports", path: "/services/teamball" },
  { name: "Racket Sports", path: "/services/racketsports" },
  { name: "Fitness", path: "/services/fitness" },
  {
    name: "Target & Precision Sports",
    path: "/services/target-precision-sports",
  },
  { name: "Equestrian Sports", path: "/services/equestrian-sports" },
  {
    name: "Adventure & Outdoor Sports",
    path: "/services/adventure-outdoor-sports",
  },
  { name: "Ice Sports", path: "/services/ice-sports" },
  { name: "Aquatic Sports", path: "/services/aquatic" },
  { name: "Wellness", path: "/services/wellness" },
  { name: "Dance", path: "/services/dance" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [newFollowerAlert, setNewFollowerAlert] = useState(false);
  const [newFollowersList, setNewFollowersList] = useState([]);
  const [seenFollowers, setSeenFollowers] = useState([]);
  const navigate = useNavigate();
  const servicesRef = useRef(null);
  const userDropdownRef = useRef(null);
  const [profileImage, setProfileImage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [desktopNotifOpen, setDesktopNotifOpen] = useState(false);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [chatMuted, setChatMuted] = useState(isChatMuted);
  const [walkingMuted, setWalkingMuted] = useState(false);
  const [alertSound, setAlertSoundState] = useState("ding");
  const [walkingReminders, setWalkingRemindersState] = useState(true);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const menuRef = useRef(null);
  const [highlight, setHighlight] = useState(true);
  const [unreadChats, setUnreadChats] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const [chatRoute, setChatRoute] = useState("/ChatBox");
  const hideNavbarOnChat =
    location.pathname.includes("ChatBox") ||
    location.pathname.includes("/chat/") ||
    location.pathname.includes("/Fitness/ActiveWalk");
  const lastUnread = useRef(0);
  const mutedRef = useRef(chatMuted);

  const initializedChats = useRef({});

  const markMessagesAsRead = async (chatId) => {
    const snap = await getDocs(collection(db, "chats", chatId, "messages"));

    const updates = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      if (
        data.senderId !== auth.currentUser.uid &&
        !(data.readBy || []).includes(auth.currentUser.uid)
      ) {
        updates.push(
          updateDoc(docSnap.ref, {
            readBy: [...(data.readBy || []), auth.currentUser.uid],
          }),
        );
      }
    });

    await Promise.all(updates);
  };
  useEffect(() => {
    ensureChatNotifications().then((permission) => {
      if (permission?.display) {
        setPushPermission(
          permission.display === "granted" ? "granted" : permission.display,
        );
      }
    });
  }, []);
  const appActive = useRef(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        appActive.current = isActive;
      });
    }
  }, []);
  useEffect(() => {
    mutedRef.current = chatMuted;
  }, [chatMuted]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setHighlight(false);
    }, 4000); // highlight for 4 seconds on first visit

    return () => clearTimeout(timer);
  }, []);
  // ================= FOLLOW NOTIFICATION REALTIME =================
  // REPLACE your current follower notification useEffect with this

  // ================= FOLLOW NOTIFICATION REALTIME =================
  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.getElementById("bottom-navbar");

      if (!navbar) return;

      const height = keyboardOpen ? 0 : navbar.offsetHeight;

      document.documentElement.style.setProperty(
        "--bottom-navbar-height",
        `${height}px`,
      );
    };

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;

      const isKeyboardOpen = viewportHeight < initialHeight - 150;

      setKeyboardOpen(isKeyboardOpen);

      document.documentElement.style.setProperty(
        "--bottom-navbar-height",
        isKeyboardOpen ? "0px" : "64px",
      );
    };

    updateNavbarHeight();

    window.addEventListener("resize", handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      window.removeEventListener("resize", handleResize);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);
  useEffect(() => {
    const navbar = document.getElementById("bottom-navbar");

    const shouldHide =
      keyboardOpen ||
      menuOpen ||
      location.pathname.includes("ChatBox") ||
      location.pathname.includes("/chat/") ||
      location.pathname.includes("/Fitness/ActiveWalk");

    document.documentElement.style.setProperty(
      "--bottom-navbar-height",
      shouldHide ? "0px" : `${navbar?.offsetHeight || 64}px`,
    );
  }, [keyboardOpen, location.pathname, menuOpen]);
  useEffect(() => {
    let unsubAuth = null;
    let unsubFollowers = null;

    unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (unsubFollowers) unsubFollowers();

      if (!user) {
        setNewFollowerAlert(false);
        setNewFollowersList([]);
        return;
      }

      try {
        const notifRef = doc(db, "followNotifications", user.uid);
        const oldSnap = await getDoc(notifRef);

        let seenIds = [];

        if (oldSnap.exists()) {
          seenIds = oldSnap.data().seenIds || [];
        }

        unsubFollowers = onSnapshot(collection(db, "followers"), (snap) => {
          let unseen = [];

          snap.forEach((item) => {
            const data = item.data();

            if (data.profileId === user.uid) {
              if (!seenIds.includes(data.followerId)) {
                unseen.push(data.followerId);
              }
            }
          });

          if (unseen.length > 0) {
            setNewFollowerAlert(true);
            setNewFollowersList(unseen);
          } else {
            setNewFollowerAlert(false);
            setNewFollowersList([]);
          }
        });
      } catch (error) {
        console.log(error);
      }
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubFollowers) unsubFollowers();
    };
  }, []);
  useEffect(() => {
    let unsubAuth = null;
    let unsubRequests = null;

    unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubRequests) unsubRequests();

      if (!user) {
        setFriendRequestCount(0);
        return;
      }

      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "pending"),
      );

      unsubRequests = onSnapshot(requestsQuery, (snap) => {
        setFriendRequestCount(snap.size);
      });
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubRequests) unsubRequests();
    };
  }, []);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return;

      try {
        let route = "/ChatBox";

        const instituteSnap = await getDoc(
          doc(db, "institutes", currentUser.uid),
        );

        if (instituteSnap.exists()) {
          route = "/components/InstituteDashboard/ChatBox";
        } else {
          const trainerSnap = await getDoc(
            doc(db, "trainers", currentUser.uid),
          );

          if (trainerSnap.exists()) {
            route = "/components/TrainersDashboard/ChatBox";
          } else {
            const trainerStudentSnap = await getDoc(
              doc(db, "trainerstudents", currentUser.uid),
            );

            if (trainerStudentSnap.exists()) {
              route = "/components/UserDashboard/ChatBox";
            } else {
              const studentSnap = await getDoc(
                doc(db, "students", currentUser.uid),
              );

              if (studentSnap.exists()) {
                route = "/components/UserDashboard/ChatBox";
              } else {
                const trainerQuery = query(
                  collection(db, "InstituteTrainers"),
                  where("trainerUid", "==", currentUser.uid),
                );

                const trainerResult = await getDocs(trainerQuery);

                if (!trainerResult.empty) {
                  route = "/components/TrainersDashboard/ChatBox";
                }
              }
            }
          }
        }

        setChatRoute(route);
      } catch (err) {
        console.log(err);
      }
    });

    return () => unsubscribe();
  }, []);
  /* ================= FETCH USER ROLE & PLAN ================= */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setUserRole(null);
        setHasActivePlan(false);
        setProfileImage("");
        setAuthLoading(false);
        return;
      }

      const trainerSnap = await getDoc(doc(db, "trainers", currentUser.uid));

      if (trainerSnap.exists()) {
        setUserRole("trainer");
        setProfileImage(trainerSnap.data().profileImageUrl || "");
      } else {
        const instituteSnap = await getDoc(
          doc(db, "institutes", currentUser.uid),
        );

        if (instituteSnap.exists()) {
          setUserRole("institute");
          setProfileImage(instituteSnap.data().profileImageUrl || "");
        } else {
          setUserRole("user");
          setProfileImage("");

          /* ✅ NEW: CHECK InstituteTrainers Login */
          const instituteTrainerSnap = await getDoc(
            doc(db, "InstituteTrainers", currentUser.uid),
          );

          if (instituteTrainerSnap.exists()) {
            setProfileImage(instituteTrainerSnap.data().profileImageUrl || "");
          }

          /* ✅ NEW: CHECK Students Login */
          const studentSnap = await getDoc(
            doc(db, "students", currentUser.uid),
          );

          if (studentSnap.exists()) {
            setProfileImage(studentSnap.data().profileImageUrl || "");
          }
        }
      }

      const planSnap = await getDoc(doc(db, "plans", currentUser.uid));
      if (
        planSnap.exists() &&
        planSnap.data()?.currentPlan?.status === "active"
      ) {
        setHasActivePlan(true);
      } else {
        setHasActivePlan(false);
      }

      // ✅ Auth finished loading
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* ================= USER DROPDOWN CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
        setDesktopNotifOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  /* ================= CLICK OUTSIDE HANDLER ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setServiceOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  /* ================= CHAT NOTIFICATION ================= */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const settings = await loadNotificationSettings(user.uid);
      setChatMuted(Boolean(settings.globalMute));
      mutedRef.current = Boolean(settings.globalMute);
      setWalkingMuted(Boolean(settings.walkingMute));
      setAlertSoundState(settings.chatSound || settings.walkingSound || "ding");
      setWalkingRemindersState(settings.walkingReminders !== false);
      await ensureChatNotifications(true);
      if (settings.walkingReminders !== false && !settings.walkingMute) {
        scheduleDailyWalkReminder(19).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener;
    const setup = async () => {
      listener = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (event) => {
          const extra = event?.notification?.extra || {};
          setMenuOpen(false);
          setNotifPanelOpen(false);

          if (extra.type === "walking" || extra.type === "walking_reminder") {
            navigate("/Fitness/fitnessdashboard");
            return;
          }
          if (extra.type === "friendRequest") {
            navigate(chatRoute);
            return;
          }
          if (extra.chatId) {
            navigate(chatPathForRoute(chatRoute, extra.chatId));
            return;
          }
          navigate(chatRoute);
        },
      );
    };
    setup();
    return () => listener?.remove();
  }, [navigate, chatRoute]);
  /* ================= LOCK BACKGROUND SCROLL WHEN MORE MENU OPEN ================= */
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // mobile
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);
  useEffect(() => {
    let unsubAuth;
    let unsubChats;
    let messageUnsubs = [];

    unsubAuth = auth.onAuthStateChanged((user) => {
      messageUnsubs.forEach((entry) => entry.unsubscribe?.());
      messageUnsubs = [];
      initializedChats.current = {};

      if (unsubChats) unsubChats();

      if (!user) {
        setUnreadChats(false);
        setTotalUnread(0);
        lastUnread.current = 0;
        return;
      }

      const unreadMap = {};
      const initialized = initializedChats.current;

      const updateUnread = () => {
        const total = Object.values(unreadMap).reduce(
          (sum, val) => sum + val,
          0,
        );
        setTotalUnread(total);
        setUnreadChats(total > 0);
        lastUnread.current = total;
      };

      const q = query(
        collection(db, "chats"),
        where("members", "array-contains", user.uid),
      );

      unsubChats = onSnapshot(q, (chatSnap) => {
        const liveIds = new Set(chatSnap.docs.map((chatDoc) => chatDoc.id));

        Object.keys(unreadMap).forEach((chatId) => {
          if (!liveIds.has(chatId)) delete unreadMap[chatId];
        });

        messageUnsubs = messageUnsubs.filter((entry) => {
          if (liveIds.has(entry.chatId)) return true;
          entry.unsubscribe();
          delete initialized[entry.chatId];
          return false;
        });

        const listening = new Set(messageUnsubs.map((entry) => entry.chatId));

        if (chatSnap.empty) {
          setUnreadChats(false);
          setTotalUnread(0);
          updateUnread();
          return;
        }

        chatSnap.forEach((chatDoc) => {
          const chatId = chatDoc.id;
          if (listening.has(chatId)) return;

          const unsub = onSnapshot(
            query(
              collection(db, "chats", chatId, "messages"),
              orderBy("createdAt", "desc"),
              limit(30),
            ),
            (snapshot) => {
              if (!initialized[chatId]) {
                initialized[chatId] = true;
              }

              let unread = 0;
              snapshot.forEach((docSnap) => {
                const msg = docSnap.data();
                if (
                  !isOwnChatMessage(msg.senderId, user.uid) &&
                  !(msg.readBy || []).includes(user.uid)
                ) {
                  unread += 1;
                }
              });

              unreadMap[chatId] = unread;
              updateUnread();
            },
          );

          messageUnsubs.push({ chatId, unsubscribe: unsub });
        });
      });
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubChats) unsubChats();
      messageUnsubs.forEach((entry) => entry.unsubscribe?.());
    };
  }, []);
  /* ================= DASHBOARD NAVIGATION ================= */
  const handleDashboardNavigation = () => {
    setDropdownOpen(false);

    // ✅ if not logged in → open same More popup
    if (!auth.currentUser) {
      setMenuOpen(true);
      return;
    }

    // ✅ Always open dashboard from top
    window.scrollTo(0, 0);

    if (userRole === "user") {
      navigate("/user/dashboard");
      return;
    }
    {
      /*}
    if (
      (userRole === "trainer" || userRole === "institute") &&
      !hasActivePlan
    ) {
      navigate("/plans");
      return;
    }
  */
    }
    if (userRole === "institute") {
      navigate("/institutes/dashboard");
      return;
    }

    if (userRole === "trainer") {
      navigate("/trainers/dashboard");
      return;
    }

    // fallback
    setMenuOpen(true);
  };
  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    if (loggingOut) return;

    // Branded overlay immediately — avoids white flash from full reload
    setLoggingOut(true);
    setDropdownOpen(false);
    setIsOpen(false);
    setMenuOpen(false);
    setNotifPanelOpen(false);
    setDesktopNotifOpen(false);

    try {
      await auth.signOut();

      setUserRole(null);
      setHasActivePlan(false);
      setProfileImage("");

      // Soft SPA navigation (no white full-page reload)
      navigate("/", { replace: true });

      // Let landing paint under the overlay, then fade away
      await new Promise((r) => setTimeout(r, 420));
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };
  const openMenu = () => {
    window.dispatchEvent(new Event("hideLandingBanner"));
    setMenuOpen(true);
  };

  const closeMenu = () => {
    window.dispatchEvent(new Event("showLandingBanner"));
    setNotifPanelOpen(false);
    setMenuOpen(false);
  };

  const toggleChatMute = async () => {
    const next = !chatMuted;
    setChatMuted(next);
    mutedRef.current = next;
    const uid = auth.currentUser?.uid;
    if (uid) await setGlobalMute(uid, next);
  };

  const toggleWalkingMute = async () => {
    const next = !walkingMuted;
    setWalkingMuted(next);
    const uid = auth.currentUser?.uid;
    if (uid) await setWalkingMute(uid, next);
  };

  const toggleWalkingReminders = async () => {
    const next = !walkingReminders;
    setWalkingRemindersState(next);
    const uid = auth.currentUser?.uid;
    if (uid) await setWalkingReminders(uid, next);
    if (next && !walkingMuted) {
      scheduleDailyWalkReminder(19).catch(() => {});
    }
  };

  const changeAlertSound = async (soundId) => {
    setAlertSoundState(soundId);
    const uid = auth.currentUser?.uid;
    await setAlertSound(uid, soundId);
  };

  const enablePushNotifications = async () => {
    try {
      const permission = await ensureChatNotifications(true);
      setPushPermission(
        permission?.display === "granted" || permission === "granted"
          ? "granted"
          : "denied",
      );
      if (Capacitor.isNativePlatform()) {
        const push = await PushNotifications.checkPermissions();
        if (push.receive !== "granted") {
          await PushNotifications.requestPermissions();
        }
        await PushNotifications.register();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const goFromMore = (path) => {
    closeMenu();
    navigate(path);
  };

  const dashboardPath =
    userRole === "institute"
      ? "/institutes/dashboard"
      : userRole === "trainer"
        ? "/trainers/dashboard"
        : "/user/dashboard";

  const smartTip = getSmartMoreTip({
    unread: totalUnread,
    role: userRole || "user",
    walkingMute: walkingMuted,
    chatMute: chatMuted,
  });

  const quickActions =
    userRole === "institute"
      ? [
          {
            label: "Dashboard",
            hint: "Academy overview",
            path: "/institutes/dashboard",
            icon: LayoutDashboard,
            tone: "bg-orange-50 text-orange-500",
          },
          {
            label: "Chat",
            hint: "Students & trainers",
            path: chatRoute,
            icon: MessageSquareText,
            tone: "bg-blue-50 text-blue-600",
          },
          {
            label: "Upload posts",
            hint: "Reels, photos, videos",
            path: "/Uploadimages",
            icon: Upload,
            tone: "bg-violet-50 text-violet-600",
          },
        ]
      : userRole === "trainer"
        ? [
            {
              label: "Dashboard",
              hint: "Trainer home",
              path: "/trainers/dashboard",
              icon: LayoutDashboard,
              tone: "bg-orange-50 text-orange-500",
            },
            {
              label: "Chat",
              hint: "Message students",
              path: chatRoute,
              icon: MessageSquareText,
              tone: "bg-blue-50 text-blue-600",
            },
            {
              label: "Upload",
              hint: "Reels & achievements",
              path: "/Uploadimages",
              icon: Clapperboard,
              tone: "bg-violet-50 text-violet-600",
            },
          ]
        : [
            {
              label: "Dashboard",
              hint: "Your account home",
              path: dashboardPath,
              icon: LayoutDashboard,
              tone: "bg-orange-50 text-orange-500",
            },
            {
              label: "Chat",
              hint: "Friends & groups",
              path: chatRoute,
              icon: MessageSquareText,
              tone: "bg-blue-50 text-blue-600",
            },
            {
              label: "Upload",
              hint: "Posts & reels",
              path: "/Uploadimages",
              icon: Upload,
              tone: "bg-violet-50 text-violet-600",
            },
          ];

  const notificationCount =
    (unreadChats ? totalUnread : 0) +
    (newFollowersList?.length || 0) +
    friendRequestCount;

  const isHomeActive = location.pathname === "/";
  const isWalkActive = location.pathname.includes("/Fitness/");
  const isDashActive =
    location.pathname.includes("dashboard") && !isWalkActive;
  const isChatActive =
    location.pathname.includes("ChatBox") ||
    location.pathname.includes("/chat/");

  const openWalkPage = () => {
    setDropdownOpen(false);
    closeMenu();
    if (!auth.currentUser) {
      setMenuOpen(true);
      return;
    }
    navigate("/Fitness/fitnessdashboard");
  };
  const navItemClass = (active) =>
    `flex flex-col items-center justify-center min-h-[48px] px-1 active:scale-95 transition-all duration-200 ${
      active ? "text-[#FF6A00]" : "text-gray-600"
    }`;
  /* REPLACE THIS useEffect BODY FOR PERFECT PAGE GAP */

  /* ================= MOBILE FOOTER SAFE SPACE ================= */
  /* ================= MOBILE SAFE FOOTER SPACE ================= */
  /* ================= GLOBAL MOBILE SAFE FOOTER SPACE ================= */

  return (
    <>
      <nav className="hidden md:block w-full bg-black shadow-md sticky top-0 z-50">
        <div className="w-full px-6 md:px-10 lg:px-14">
          <div className="flex items-center justify-between h-16">
            {/* LOGO */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center cursor-pointer"
            >
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden 
      bg-white flex items-center justify-center transition-all duration-500
      ${highlight ? "ring-4 ring-orange-400 animate-pulse scale-110" : ""}
      hover:scale-110 hover:ring-2 hover:ring-orange-400`}
              >
                <img
                  src="/Kridana logo.png"
                  alt="Kridana Logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center space-x-8 text-orange-500 font-normal text-lg">
              <NavLink to="/" className="hover:text-white transition">
                Home
              </NavLink>

              {/* SERVICES */}
              <div className="relative" ref={servicesRef}>
                <button
                  onClick={() => setServiceOpen((prev) => !prev)}
                  className="flex items-center gap-1 transition hover:text-white"
                >
                  Categories
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      serviceOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {serviceOpen && (
                  <div className="absolute top-10 left-0 w-60 bg-white shadow-md rounded-lg border border-gray-200 py-1 z-50">
                    {serviceTypes.map((service) => (
                      <NavLink
                        key={service.path}
                        to={service.path}
                        onClick={() => {
                          setIsOpen(false);
                          setServiceOpen(false); // ✅ IMPORTANT FIX
                        }}
                        className="block text-sm hover:text-orange-600"
                      >
                        {service.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              <NavLink
                to="/trending-plays"
                className="hover:text-white transition"
              >
                Reels
              </NavLink>

              <button
                type="button"
                onClick={openWalkPage}
                className={`flex items-center gap-1.5 transition ${
                  isWalkActive ? "text-white" : "hover:text-white"
                }`}
              >
                <Footprints size={18} />
                Walk
              </button>

              {/* USER ACTIONS (profile + new dropdown side by side) */}
              {/* PROFILE + ARROW DROPDOWN */}
              {/* PROFILE + SMALL ARROW (tight like Categories) */}
              {auth.currentUser && (
                <div className="relative flex items-center gap-4" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopNotifOpen((prev) => !prev);
                      setDropdownOpen(false);
                    }}
                    className="relative p-1 text-orange-500 hover:text-white transition"
                    aria-label="Notifications"
                  >
                    <Bell className="w-6 h-6" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>

                  {desktopNotifOpen && (
                    <div className="absolute right-12 top-10 w-72 bg-white shadow-xl rounded-2xl border border-gray-100 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">
                          Notifications
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Messages, follows and requests
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDesktopNotifOpen(false);
                          navigate(chatRoute);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-800">Messages</span>
                        {totalUnread > 0 && (
                          <span className="text-[11px] font-bold text-white bg-orange-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                            {totalUnread > 99 ? "99+" : totalUnread}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDesktopNotifOpen(false);
                          navigate("/AllPeoplePage");
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-800">
                          New followers
                        </span>
                        {newFollowersList.length > 0 && (
                          <span className="text-[11px] font-bold text-white bg-red-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                            {newFollowersList.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setDesktopNotifOpen(false);
                          navigate(chatRoute);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-800">
                          Connection requests
                        </span>
                        {friendRequestCount > 0 && (
                          <span className="text-[11px] font-bold text-white bg-blue-500 rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                            {friendRequestCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={toggleChatMute}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-t border-gray-100"
                      >
                        <span className="text-sm text-gray-800">
                          {chatMuted ? "Unmute all chat alerts" : "Mute all chat alerts"}
                        </span>
                        {chatMuted ? (
                          <BellOff size={16} className="text-gray-400" />
                        ) : (
                          <Bell size={16} className="text-orange-500" />
                        )}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center">
                    {/* PROFILE ICON (no click) */}
                    {profileImage ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                    )}

                    {/* SMALL ARROW BUTTON */}
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="ml-1 p-1 hover:text-orange-600 transition"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${
                          dropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-lg border border-gray-200 z-50 overflow-hidden">
                      <button
                        onClick={handleDashboardNavigation}
                        className="block w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-100 transition"
                      >
                        Dashboard
                      </button>

                      <button
                        onClick={openWalkPage}
                        className="block w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-100 transition"
                      >
                        Walk
                      </button>

                      <div className="border-t border-gray-200"></div>

                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SIGN UP BUTTON */}
              {!authLoading && !auth.currentUser && (
                <button
                  onClick={() => navigate("/RoleSelection")}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full shadow-md transition"
                >
                  Sign Up
                </button>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white text-2xl z-50"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}

        {/* ✅ MOBILE BOTTOM NAVBAR */}
        {/* ✅ MOBILE BOTTOM NAVBAR */}
      </nav>
      {/* ================= MOBILE APP FOOTER NAVBAR ================= */}
      {/* ================= MOBILE APP FOOTER NAVBAR ================= */}

      <div
        id="bottom-navbar"
        className={`
    md:hidden
    fixed
    bottom-0
    left-0
    right-0
    z-[9999]
    bg-white/90
    backdrop-blur-xl
    border-t border-gray-200/70
    shadow-[0_-8px_30px_rgba(0,0,0,0.08)]
    transition-transform duration-300 ease-out
    ${
      keyboardOpen || hideNavbarOnChat || menuOpen
        ? "translate-y-full"
        : "translate-y-0"
    }
  `}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="w-full max-w-screen-md mx-auto">
          <div className="grid grid-cols-5 items-center min-h-[56px] sm:min-h-[60px] px-1">
            <button
              type="button"
              data-tour-id="nav-home"
              onClick={() => navigate("/")}
              className={navItemClass(isHomeActive)}
            >
              <Home size={22} strokeWidth={isHomeActive ? 2.6 : 2.2} />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">
                Home
              </span>
            </button>

            <button
              type="button"
              data-tour-id="nav-dashboard"
              onClick={handleDashboardNavigation}
              className={navItemClass(isDashActive)}
            >
              <Grid size={22} strokeWidth={isDashActive ? 2.6 : 2.2} />
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">
                Dashboard
              </span>
            </button>

            <button
              type="button"
              data-tour-id="nav-walk"
              onClick={openWalkPage}
              className={navItemClass(isWalkActive)}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isWalkActive ? "bg-[#FF6A00]" : "bg-orange-50"
                }`}
              >
                <Footprints
                  size={18}
                  className={isWalkActive ? "text-white" : "text-[#FF6A00]"}
                  strokeWidth={2.4}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">
                Walk
              </span>
            </button>

            <button
              type="button"
              data-tour-id="nav-chat"
              onClick={() => {
                if (!auth.currentUser) {
                  navigate("/login");
                  return;
                }
                navigate(chatRoute);
              }}
              className={`${navItemClass(isChatActive)} relative`}
            >
              <div className="relative">
                <MessageSquareText
                  size={22}
                  strokeWidth={isChatActive ? 2.6 : 2.2}
                />
                {unreadChats && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {totalUnread > 99 ? "99+" : totalUnread || ""}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">
                Chat
              </span>
            </button>

            <button
              type="button"
              data-tour-id="nav-more"
              onClick={openMenu}
              className={`${navItemClass(menuOpen)} relative`}
            >
              <div className="relative">
                <MoreHorizontal size={22} strokeWidth={menuOpen ? 2.6 : 2.2} />
                {(newFollowerAlert || notificationCount > 0) && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {notificationCount > 99 ? "99+" : notificationCount || ""}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold mt-0.5">
                More
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MORE MENU PANEL ================= */}

      {/* =========================================================
    FULL SCREEN MORE PAGE
    IMPORTANT: OUTSIDE #bottom-navbar
========================================================= */}

      {menuOpen && (
        <div
          className="
      fixed
      inset-0
      z-[100000]
      w-screen
      h-[100dvh]
      min-h-[100vh]
      bg-[#f7f8fa]
      overflow-hidden
      animate-morePageIn
    "
        >
          {/* ================= HEADER ================= */}

          <header
            className="
        sticky
        top-0
        z-30
        w-full
        bg-white
        border-b
        border-gray-100
        shadow-sm
      "
            style={{
              paddingTop: "env(safe-area-inset-top)",
            }}
          >
            <div className="h-[64px] px-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={closeMenu}
                  className="
              w-10
              h-10
              rounded-full
              bg-gray-100
              flex
              items-center
              justify-center
              text-gray-700
              active:scale-90
              transition
              flex-shrink-0
            "
                  aria-label="Close"
                >
                  <X size={21} strokeWidth={2.3} />
                </button>

                <div className="min-w-0">
                  <h1 className="text-[19px] font-bold text-gray-900 leading-tight">
                    More
                  </h1>

                  <p className="text-[11px] text-gray-500 truncate">
                    Everything in one place
                  </p>
                </div>
              </div>

              {auth.currentUser && (
                <button
                  type="button"
                  onClick={() => setNotifPanelOpen(true)}
                  className="relative w-10 h-10 rounded-full bg-orange-50 text-[#FF6A00] flex items-center justify-center active:scale-90 transition"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </header>

          {/* ================= SCROLLABLE CONTENT ================= */}

          <main
            className="
        absolute
        left-0
        right-0
        top-[64px]
        bottom-0
        overflow-y-auto
        overflow-x-hidden
        overscroll-contain
        touch-pan-y
        bg-[#f7f8fa]
      "
            style={{
              paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
              top: "calc(64px + env(safe-area-inset-top))",
            }}
          >
            <div
              className="
          w-full
          max-w-screen-md
          mx-auto
          px-4
          pt-4
          pb-8
        "
            >
              {/* ================= PROFILE ================= */}

              {auth.currentUser ? (
                <div
                  className="
              relative
              overflow-hidden
              rounded-[24px]
              bg-gradient-to-br
              from-[#1E4E45]
              to-[#163c35]
              p-5
              shadow-lg
              mb-5
            "
                >
                  <div
                    className="
                absolute
                -right-10
                -top-10
                w-32
                h-32
                rounded-full
                bg-white/10
              "
                  />

                  <div
                    className="
                absolute
                -right-5
                -bottom-14
                w-32
                h-32
                rounded-full
                bg-orange-400/10
              "
                  />

                  <div className="relative flex items-center gap-3">
                    {/* IMAGE */}

                    <div
                      className="
                  w-[58px]
                  h-[58px]
                  rounded-full
                  bg-white
                  p-[2px]
                  shadow-md
                  flex-shrink-0
                  overflow-hidden
                "
                    >
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div
                          className="
                      w-full
                      h-full
                      rounded-full
                      bg-gray-100
                      flex
                      items-center
                      justify-center
                    "
                        >
                          <User size={27} className="text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* USER DETAILS */}

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/70 font-medium">
                        Welcome back
                      </p>

                      <h2 className="text-[17px] sm:text-[18px] font-bold text-white truncate">
                        {auth.currentUser.displayName ||
                          auth.currentUser.email?.split("@")[0] ||
                          "Kridana User"}
                      </h2>

                      <p className="text-[10px] sm:text-[11px] text-white/60 truncate mt-0.5">
                        {auth.currentUser.email ||
                          "Manage your Kridana account"}
                      </p>
                    </div>

                    {/* SETTINGS */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/MobileEditprofile");
                      }}
                      className="
                  w-9
                  h-9
                  rounded-full
                  bg-white/10
                  border
                  border-white/10
                  flex
                  items-center
                  justify-center
                  text-white
                  active:scale-90
                  transition
                  flex-shrink-0
                "
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= GUEST ================= */

                <div
                  className="
              rounded-[22px]
              bg-white
              border
              border-gray-100
              p-5
              shadow-sm
              mb-5
            "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                  w-14
                  h-14
                  rounded-full
                  bg-orange-50
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
                    >
                      <User size={27} className="text-orange-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-[17px] font-bold text-gray-900">
                        Welcome to Kridana
                      </h2>

                      <p className="text-[11px] text-gray-500 mt-1">
                        Login to access your profile, chats and more.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/RoleSelection");
                    }}
                    className="
                mt-4
                w-full
                bg-[#FF6A00]
                text-white
                py-3
                rounded-2xl
                text-sm
                font-bold
                active:scale-[0.98]
                transition
              "
                  >
                    Sign Up / Login
                  </button>
                </div>
              )}

              {/* =====================================================
            QUICK ACTIONS + SMART TIP
        ===================================================== */}

              {auth.currentUser && (
                <>
                  <div className="mb-5 rounded-[20px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-900">
                          {smartTip.title}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          {smartTip.body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (smartTip.action === "chat") goFromMore(chatRoute);
                          else if (smartTip.action === "upload")
                            goFromMore("/Uploadimages");
                          else if (smartTip.action === "notifications")
                            setNotifPanelOpen(true);
                          else goFromMore("/Fitness/fitnessdashboard");
                        }}
                        className="text-[11px] font-bold text-[#FF6A00] shrink-0"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  <p className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Quick actions
                    {userRole ? ` · ${userRole}` : ""}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => goFromMore(action.path)}
                          className="rounded-[18px] border border-gray-100 bg-white p-3.5 text-left shadow-sm active:scale-[0.98] transition"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${action.tone}`}
                          >
                            <Icon size={18} />
                          </div>
                          <p className="text-[13px] font-bold text-gray-900">
                            {action.label}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {action.hint}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* =====================================================
            ACCOUNT
        ===================================================== */}

              {auth.currentUser && (
                <>
                  <p
                    className="
                px-1
                mb-2
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                text-gray-400
              "
                  >
                    Account
                  </p>

                  <div
                    className="
                bg-white
                rounded-[20px]
                border
                border-gray-100
                overflow-hidden
                shadow-sm
                mb-5
              "
                  >
                    <button
                      onClick={() => goFromMore("/MobileCategoriesPage")}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                  transition
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-emerald-50
                    text-emerald-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <LayoutGrid size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Categories
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Browse sports and training
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* PEOPLE */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/AllPeoplePage");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                  transition
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-blue-50
                    text-blue-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <Users size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          People
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Find and connect with people
                        </p>
                      </div>

                      {newFollowerAlert && newFollowersList.length > 0 && (
                        <span
                          className="
                        min-w-[22px]
                        h-[22px]
                        px-1
                        rounded-full
                        bg-red-500
                        text-white
                        text-[10px]
                        font-bold
                        flex
                        items-center
                        justify-center
                      "
                        >
                          {newFollowersList.length}
                        </span>
                      )}

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    <button
                      onClick={() => setNotifPanelOpen(true)}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                  transition
                "
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
                        <Bell size={19} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Notifications
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Messages, follows, requests and sounds
                        </p>
                      </div>
                      {notificationCount > 0 && (
                        <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {notificationCount > 99 ? "99+" : notificationCount}
                        </span>
                      )}
                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* EDIT PROFILE */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/MobileEditprofile");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                  transition
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-purple-50
                    text-purple-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <User size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Edit Profile
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Update your personal information
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* UPLOAD */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/Uploadimages");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                  transition
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-orange-50
                    text-orange-500
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <Image size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Upload Images
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Add and manage your photos
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>
                  </div>

                  {/* =================================================
                INFORMATION
            ================================================= */}

                  <p
                    className="
                px-1
                mb-2
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                text-gray-400
              "
                  >
                    Information
                  </p>

                  <div
                    className="
                bg-white
                rounded-[20px]
                border
                border-gray-100
                overflow-hidden
                shadow-sm
                mb-5
              "
                  >
                    {/* TERMS */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/terms");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-gray-100
                    text-gray-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <FileText size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Terms & Conditions
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Review Kridana terms
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* PRIVACY */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/privacy");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-green-50
                    text-green-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <ShieldCheck size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Privacy Policy
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Learn how your data is protected
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* HELP */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/help-center");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-yellow-50
                    text-yellow-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <HelpCircle size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Help Center
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Get help and support
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    {/* ABOUT */}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/about");
                      }}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                "
                    >
                      <div
                        className="
                    w-10
                    h-10
                    rounded-xl
                    bg-indigo-50
                    text-indigo-600
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                      >
                        <Info size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          About Kridana
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Learn more about Kridana
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>

                    <div className="h-px bg-gray-100 ml-[68px]" />

                    <button
                      onClick={() => goFromMore("/feedback")}
                      className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-4
                  text-left
                  active:bg-gray-50
                "
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquareText size={19} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800">
                          Feedback
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Share ideas and report issues
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-gray-300 flex-shrink-0"
                      />
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="
                w-full
                bg-white
                border
                border-red-100
                rounded-[20px]
                px-4
                py-4
                flex
                items-center
                gap-3
                text-left
                shadow-sm
                active:bg-red-50
                active:scale-[0.99]
                transition
              "
                  >
                    <div
                      className="
                  w-10
                  h-10
                  rounded-xl
                  bg-red-50
                  text-red-500
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
                    >
                      <LogOut size={19} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-red-600">
                        Logout
                      </p>

                      <p className="text-[10px] text-red-400 mt-0.5">
                        Sign out of your Kridana account
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-red-200 flex-shrink-0"
                    />
                  </button>

                  {/* VERSION */}

                  <div className="text-center pt-5 pb-2">
                    <p className="text-[9px] text-gray-400">Kridana</p>

                    <p className="text-[9px] text-gray-300 mt-0.5">
                      Your Sports • Your Community
                    </p>
                  </div>
                </>
              )}
            </div>
          </main>

          {notifPanelOpen && (
            <div
              className="absolute inset-0 z-50 bg-[#f7f8fa] animate-moreSlideIn overflow-hidden"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <header className="h-[64px] px-4 flex items-center gap-3 bg-white border-b border-gray-100 shadow-sm">
                <button
                  type="button"
                  onClick={() => setNotifPanelOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"
                  aria-label="Back"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-[18px] font-bold text-gray-900">
                    Notifications
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    All alerts in one place
                  </p>
                </div>
              </header>

              <div
                className="absolute left-0 right-0 top-[64px] bottom-0 overflow-y-auto px-4 pt-4"
                style={{
                  paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
                }}
              >
                <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-sm mb-5 animate-moreFadeUp">
                  <button
                    type="button"
                    onClick={() => goFromMore(chatRoute)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <MessageSquareText size={19} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-800">
                        Messages
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Open chats and unread conversations
                      </p>
                    </div>
                    {totalUnread > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                  <div className="h-px bg-gray-100 ml-[68px]" />
                  <button
                    type="button"
                    onClick={() => goFromMore("/AllPeoplePage")}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={19} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-800">
                        New followers
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        People who started following you
                      </p>
                    </div>
                    {newFollowersList.length > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {newFollowersList.length}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                  <div className="h-px bg-gray-100 ml-[68px]" />
                  <button
                    type="button"
                    onClick={() => goFromMore(chatRoute)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <User size={19} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-800">
                        Connection requests
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Accept or decline new connections
                      </p>
                    </div>
                    {friendRequestCount > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {friendRequestCount}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                </div>

                <NotificationPrefsPanel
                  chatMuted={chatMuted}
                  walkingMuted={walkingMuted}
                  alertSound={alertSound}
                  walkingReminders={walkingReminders}
                  pushPermission={pushPermission}
                  onToggleChatMute={toggleChatMute}
                  onToggleWalkingMute={toggleWalkingMute}
                  onToggleWalkingReminders={toggleWalkingReminders}
                  onAlertSound={changeAlertSound}
                  onEnablePush={enablePushNotifications}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logout transition — covers white flash during sign-out */}
      {loggingOut &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 20%, rgba(255,106,0,0.35), transparent 55%), linear-gradient(180deg, #2A1608 0%, #1A0F08 100%)",
            }}
            role="status"
            aria-live="polite"
            aria-label="Signing out"
          >
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="relative w-full max-w-xs text-center animate-moreFadeUp">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FF6A00] text-white flex items-center justify-center shadow-[0_12px_32px_rgba(255,106,0,0.45)] mb-5">
                <LogOut size={28} />
              </div>
              <h2 className="text-white text-xl font-bold tracking-tight">
                See you soon
              </h2>
              <p className="text-white/65 text-sm mt-2 leading-relaxed">
                Signing you out securely…
              </p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-orange-100 text-xs font-medium">
                <Loader2 size={14} className="animate-spin text-[#FFB347]" />
                Taking you to Kridana
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* First-install mobile navbar quick guide */}
      <NavbarTour
        enabled={
          !hideNavbarOnChat &&
          !menuOpen &&
          !keyboardOpen &&
          !loggingOut
        }
      />
    </>
  );
};

export default Navbar;
