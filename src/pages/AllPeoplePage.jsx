// AllPeoplePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { db, auth } from "../firebase";

import {
  Search,
  Home,
  Users,
  User,
  Heart,
  Building2,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";

import { Bell } from "lucide-react";

export default function AllPeoplePage() {
  const navigate = useNavigate();

  const currentUser = auth.currentUser;

  const [newFollowerAlert, setNewFollowerAlert] = useState(false);
  const [lastFollowerCount, setLastFollowerCount] = useState(0);

  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");

  const [following, setFollowing] = useState({});
  const [followersMe, setFollowersMe] = useState({});

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [newFollowersList, setNewFollowersList] = useState([]);
  const [seenFollowers, setSeenFollowers] = useState([]);
  const [showBellPanel, setShowBellPanel] = useState(false);

  // ================= CHAT =================
  const startChat = async (person) => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/login");
      return;
    }

    // SELF BLOCK
    if (user.uid === person.uid) return;

    // ONLY BOTH FOLLOW
    const iFollow = following[person.uid];
    const theyFollowMe = followersMe[person.uid];

    if (!iFollow || !theyFollowMe) {
      alert("Both users must follow each other to chat.");
      return;
    }

    try {
      const chatId = [user.uid, person.uid].sort().join("_");

      const chatRef = doc(db, "chats", chatId);

      const snap = await getDoc(chatRef);

      if (!snap.exists()) {
        await setDoc(chatRef, {
          type: "individual",
          members: [user.uid, person.uid],
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastAt: serverTimestamp(),
        });
      }

      navigate("/components/InstituteDashboard/ChatBox", {
        state: {
          openChatId: chatId,
          targetUser: {
            uid: person.uid,
            name: person.name,
            image: person.image,
            type: person.type,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  };

  // ================= FOLLOW LISTENER =================
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const notifRef = doc(db, "followNotifications", user.uid);

    let unsubscribe;

    const start = async () => {
      const oldSnap = await getDoc(notifRef);

      let seenIds = [];

      if (oldSnap.exists()) {
        seenIds = oldSnap.data().seenIds || [];
        setSeenFollowers(seenIds);
      }

      unsubscribe = onSnapshot(collection(db, "followers"), async (snap) => {
        let myFollowing = {};
        let myFollowers = {};
        let firstTimeFollowers = [];

        snap.forEach((item) => {
          const data = item.data();

          // I FOLLOW OTHERS
          if (data.followerId === user.uid) {
            myFollowing[data.profileId] = true;
          }

          // OTHERS FOLLOW ME
          if (data.profileId === user.uid) {
            myFollowers[data.followerId] = true;

            if (!seenIds.includes(data.followerId)) {
              firstTimeFollowers.push(data.followerId);
            }
          }
        });

        setFollowing(myFollowing);
        setFollowersMe(myFollowers);

        setFollowersCount(Object.keys(myFollowers).length);
        setFollowingCount(Object.keys(myFollowing).length);

        if (firstTimeFollowers.length > 0) {
          setNewFollowerAlert(true);
          setNewFollowersList(firstTimeFollowers);
        } else {
          setNewFollowerAlert(false);
          setNewFollowersList([]);
        }
      });
    };

    start();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ================= INIT =================
  useEffect(() => {
    initLoad();
  }, []);

  const initLoad = async () => {
    setLoading(true);
    await loadPeople();
    setLoading(false);
  };

  // ================= LOAD PEOPLE =================
  const loadPeople = async () => {
    try {
      const [
        usersSnap,
        studentSnap,
        trainerSnap,
        instituteSnap,
        trainerStudentsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "trainers")),
        getDocs(collection(db, "institutes")),
        getDocs(collection(db, "trainerstudents")),
      ]);

      let finalData = [];

      // ================= TRAINER CACHE =================
      const trainerMap = {};

      trainerSnap.forEach((d) => {
        const data = d.data();

        trainerMap[d.id] = `${data.firstName || ""} ${
          data.lastName || ""
        }`.trim();

        // DON'T SHOW LOGIN PROFILE
        if (currentUser?.uid === d.id) return;

        finalData.push({
          uid: d.id,
          type: "trainer",
          name: trainerMap[d.id],
          image: data.profileImageUrl || "",
          subtitle: data.organization || "Trainer",
        });
      });

      // ================= INSTITUTE CACHE =================
      const instituteMap = {};

      instituteSnap.forEach((d) => {
        const data = d.data();

        instituteMap[d.id] = data.instituteName || "Institute";

        // DON'T SHOW LOGIN PROFILE
        if (currentUser?.uid === d.id) return;

        finalData.push({
          uid: d.id,
          type: "institute",
          name: data.instituteName || "Institute",
          image: data.profileImageUrl || "",
          subtitle: data.city || "Institute",
        });
      });

      // ================= USERS =================
      usersSnap.forEach((d) => {
        const data = d.data();

        // DON'T SHOW LOGIN PROFILE
        if (currentUser?.uid === d.id) return;

        finalData.push({
          uid: d.id,
          type: "user",
          name: data.name || "User",
          image: data.profileImage || "",
          subtitle: "Community User",
        });
      });

      // ================= STUDENTS =================
      studentSnap.forEach((d) => {
        const data = d.data();

        // DON'T SHOW LOGIN PROFILE
        if (currentUser?.uid === d.id || currentUser?.uid === data.customerUid)
          return;

        let joinedName = "";

        if (data.instituteId && instituteMap[data.instituteId]) {
          joinedName = instituteMap[data.instituteId];
        }

        if (data.trainerId && trainerMap[data.trainerId]) {
          joinedName = trainerMap[data.trainerId];
        }

        finalData.push({
          uid: d.id,
          type: "student",
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          image: data.profileImageUrl || "",
          subtitle: joinedName ? `Joined ${joinedName}` : "Student",
        });
      });

      // ================= TRAINER STUDENTS =================
      trainerStudentsSnap.forEach((d) => {
        const data = d.data();

        const studentId = data.studentUid || data.baseUid || d.id;

        // DON'T SHOW LOGIN PROFILE
        if (currentUser?.uid === studentId) return;

        finalData.push({
          uid: studentId,
          type: "trainerstudent",
          name:
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            "Student",
          image: data.profileImageUrl || "",
          subtitle: data.subCategory || "Student",
        });
      });

      // REMOVE DUPLICATES
      const uniquePeople = [];

      const ids = new Set();

      finalData.forEach((item) => {
        const key = `${item.type}_${item.uid}`;

        if (!ids.has(key)) {
          ids.add(key);
          uniquePeople.push(item);
        }
      });

      setPeople(
        uniquePeople.filter(
          (item) => item.type === "trainer" || item.type === "institute",
        ),
      );
    } catch (error) {
      console.log(error);
    }
  };

  // ================= FOLLOW / UNFOLLOW =================
  const toggleFollow = async (person) => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.uid === person.uid) return;

    const docId = `${user.uid}_${person.uid}`;

    const ref = doc(db, "followers", docId);

    try {
      // UNFOLLOW
      if (following[person.uid]) {
        const ok = window.confirm(`Unfollow ${person.name}?`);

        if (!ok) return;

        await deleteDoc(ref);

        setFollowing((prev) => {
          const updated = { ...prev };

          delete updated[person.uid];

          return updated;
        });

        setFollowingCount((prev) => prev - 1);

        return;
      }

      // FOLLOW
      await setDoc(ref, {
        followerId: user.uid,
        profileId: person.uid,
        createdAt: serverTimestamp(),
      });

      setFollowing((prev) => ({
        ...prev,
        [person.uid]: true,
      }));

      setFollowingCount((prev) => prev + 1);

      // REMOVE NOTIFICATION
      setNewFollowersList((prev) => prev.filter((id) => id !== person.uid));

      // SAVE SEEN
      const updatedSeen = [...new Set([...seenFollowers, person.uid])];

      setSeenFollowers(updatedSeen);

      await setDoc(
        doc(db, "followNotifications", user.uid),
        {
          seenIds: updatedSeen,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (newFollowersList.length <= 1) {
        setNewFollowerAlert(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // ================= FILTER =================
  const filtered = useMemo(() => {
    let data = [...people];

    if (activeFilter === "network") {
      data = data.filter(
        (item) => item.type === "trainer" || item.type === "institute",
      );
    } else if (activeFilter === "all") {
      data = [...people];
    } else if (activeFilter === "followers") {
      data = data.filter((item) => followersMe[item.uid]);
    } else if (activeFilter === "following") {
      data = data.filter((item) => following[item.uid]);
    } else if (activeFilter === "user") {
      data = data.filter(
        (item) =>
          item.type === "user" ||
          item.type === "student" ||
          item.type === "trainerstudent",
      );
    } else {
      data = data.filter((item) => item.type === activeFilter);
    }

    if (search.trim()) {
      data = data.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return data;
  }, [people, activeFilter, search, followersMe, following]);

  // ================= FILTER BUTTON =================
  const filterBtn = (key, label, icon = null) => (
    <button
      onClick={() => setActiveFilter(key)}
      className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
        activeFilter === key
          ? "bg-orange-500 text-white border-orange-500"
          : "bg-white text-gray-700 border-gray-200"
      }`}
    >
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </button>
  );

  return (
    <div className="h-screen bg-gradient-to-b from-orange-50 via-white to-white w-full max-w-md md:max-w-5xl mx-auto flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-orange-100 shadow-sm relative flex-shrink-0">
        {/* TOP */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">People</h1>

          <button
            onClick={async () => {
              const user = auth.currentUser;

              if (!user) return;

              const allSeen = [
                ...new Set([...seenFollowers, ...newFollowersList]),
              ];

              await setDoc(
                doc(db, "followNotifications", user.uid),
                {
                  seenIds: allSeen,
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );

              setSeenFollowers(allSeen);

              setNewFollowerAlert(false);

              setShowBellPanel(!showBellPanel);
            }}
            className="relative p-2 rounded-full bg-orange-50 active:scale-95"
          >
            <Bell size={22} className="text-orange-500" />

            {newFollowerAlert && (
              <>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>

                  <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600"></span>
                </span>

                <span className="absolute -bottom-1 -right-2 bg-orange-500 text-white text-[10px] px-1 rounded-full">
                  {newFollowersList.length}
                </span>
              </>
            )}
          </button>
        </div>

        {/* PANEL */}
        {showBellPanel && (
          <div className="absolute top-16 right-4 w-[320px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">
              Notifications ({newFollowersList.length})
            </div>

            <div className="max-h-80 overflow-y-auto">
              {people
                .filter((p) => newFollowersList.includes(p.uid))
                .map((person) => (
                  <div
                    key={person.uid}
                    className="flex items-center gap-3 px-4 py-3 border-b"
                  >
                    <img
                      loading="lazy"
                      src={
                        person.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          person.name,
                        )}`
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />

                    <div className="flex-1">
                      <p className="text-sm font-semibold">{person.name}</p>

                      <p className="text-xs text-gray-500">
                        Started following you
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(person);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        following[person.uid]
                          ? "bg-gray-200 text-black"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {following[person.uid] ? "Following" : "Follow Back"}
                    </button>
                  </div>
                ))}

              {newFollowersList.length === 0 && (
                <div className="p-5 text-center text-sm text-gray-500">
                  No notifications
                </div>
              )}
            </div>
          </div>
        )}

        {/* COUNTS */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => setActiveFilter("followers")}
            className={`rounded-2xl px-4 py-3 text-center transition ${
              activeFilter === "followers"
                ? "bg-orange-500 text-white"
                : "bg-orange-50"
            }`}
          >
            <p className="text-lg font-bold">{followersCount}</p>

            <p className="text-xs">Followers</p>
          </button>

          <button
            onClick={() => setActiveFilter("following")}
            className={`rounded-2xl px-4 py-3 text-center transition ${
              activeFilter === "following"
                ? "bg-blue-500 text-white"
                : "bg-blue-50"
            }`}
          >
            <p className="text-lg font-bold">{followingCount}</p>

            <p className="text-xs">Following</p>
          </button>
        </div>

        {/* SEARCH */}
        <div className="mt-3 bg-white border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
          <Search size={18} className="text-gray-500" />

          <input
            type="text"
            placeholder="Search people..."
            className="bg-transparent w-full outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTERS */}
        <div className="mt-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-1">
            {filterBtn("trainer", "Trainers", <BadgeCheck size={14} />)}
            {filterBtn("institute", "Institutes", <Building2 size={14} />)}
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            No users found
          </div>
        ) : (
          filtered.map((person) => {
            const bothFollow = following[person.uid] && followersMe[person.uid];

            return (
              <div
                key={`${person.type}_${person.uid}`}
                className="bg-white rounded-3xl p-3 flex items-center gap-3 shadow-md active:scale-[0.98] transition-all duration-200"
              >
                <img
                  loading="lazy"
                  src={
                    person.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      person.name,
                    )}`
                  }
                  alt=""
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-orange-100"
                />

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">
                    {person.name}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {person.subtitle}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {/* CHAT BUTTON ONLY BOTH FOLLOW */}
                  {bothFollow && (
                    <button
                      onClick={() => startChat(person)}
                      className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm active:scale-95 transition"
                    >
                      <MessageCircle size={18} />
                    </button>
                  )}

                  {/* FOLLOW */}
                  <button
                    onClick={() => toggleFollow(person)}
                    className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm active:scale-95 transition whitespace-nowrap ${
                      following[person.uid]
                        ? "bg-gray-200 text-black"
                        : followersMe[person.uid]
                        ? "bg-blue-500 text-white"
                        : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    }`}
                  >
                    {following[person.uid]
                      ? "Following"
                      : followersMe[person.uid]
                      ? "Follow Back"
                      : "Follow"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOTTOM NAV */}
    </div>
  );
}
