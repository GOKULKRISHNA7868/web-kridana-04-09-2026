// src/components/InstituteDashboard/InstituteDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import CheckinCheckout from "./CheckinCheckout";
import Studenttimetables from "./Student timetables";
import TrainersTimetables from "./TrainersTimetables";
import FeesDetailsPage from "./FeesDetailsPage";
import TakeAttendance from "./TakeAttendance";
import Myattendance from "./Myattendance";
import TrainerStudentAttendance from "./TrainerStudentAttendance";
import TrainerStudentsFee from "./TrainerStudentsFee";
import MyOders from "./MyOders";
import BookedDemo from "./BookedDemo";
import Payslips from "./Payslips";
import Reports from "./Reports";
import { getDashboardGreeting } from "../../utils/dashboardGreeting";
import Dashboard from "./Dashboard";
import Timetables from "./Timetables";
import ChatBox from "./ChatBox";
import TrainerDashboard from "./TrainerDashboard";
import CustomerCentricPolicies from "../../pages/CustomerCentricPolicies";
import PrivacyPolicy from "../../pages/Privacy";
import ChatBoxTS from "./ChatBoxTS";
import UserMyAccount from "./UserMyAccount";
import { useSelectedStudent } from "../../context/SelectedStudentContext";
import UserDashboardPage from "../UserDashboard/UserDashboard";
import FitnessDashboard from "../../pages/Fitness/FitnessDashboard";
import { FaChevronLeft } from "react-icons/fa";
/* ============================= 
   SIDEBAR ITEMS
============================= */
const studentSidebarItems = [
  "Dashboard",
  "Time Table",
  //"Chat Box",
  "FitnessDashboard",
  "Fees Details",
];

const trainerSidebarItems = [
  "CheckinCheckout",
  "Trainer's Timetables",
  "My Attendance",
  "Payslips",
  "Take Attendance",
  "Log Out",
];

const trainerStudentSidebarItems = [
  "TrainerDashboard",
  "Time Tables",
  // "ChatBox",
  "FitnessDashboard",
  "Fee Details",
];

const otherUserSidebarItems = [
  "UserDashboard",
  "FitnessDashboard",
  "My Account",
];
const SettingsItems = ["Customer Policy", "Privacy Policy", "Logout"];
/* ============================= 
   WELCOME SCREEN
============================= */
const WelcomeDashboard = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6 dash-page-in">
    <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#FF6A00] via-[#FF7A1A] to-[#FF9A4A] p-8 shadow-[0_12px_32px_rgba(255,106,0,0.28)] relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/15 pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <p className="relative text-orange-100 text-sm font-medium tracking-wide">
        {getDashboardGreeting()}
      </p>
      <h1 className="relative text-2xl sm:text-3xl font-bold text-white mt-2 mb-3">
        Your Kridana space
      </h1>
      <p className="relative text-sm sm:text-base text-orange-50/95 leading-relaxed">
        Open the menu to explore attendance, fees, chat, fitness, and more —
        everything in one place.
      </p>
    </div>
  </div>
);

/* ============================= 
   MAIN DASHBOARD
============================= */
const UserDashboard = () => {
  const [activeMenu, setActiveMenu] = useState("Welcome");
  const { user } = useAuth();
  const navigate = useNavigate();
  const idleTimer = useRef(null);
  const mainContentRef = useRef(null);

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [familyStudents, setFamilyStudents] = useState([]);
  const { selectedStudentUid, setSelectedStudentUid } = useSelectedStudent();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletedSuccess, setShowDeletedSuccess] = useState(false);
  const [familyStudentDetails, setFamilyStudentDetails] = useState([]);
  const [selectedStudentRole, setSelectedStudentRole] = useState(null);
  /* ============================= 
     AUTO LOGOUT (5 MIN)
  ============================= */
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSameEmailStudents = async () => {
      try {
        const baseUid = user.uid.split("_")[0];

        const studentSnap = await getDocs(collection(db, "students"));
        const trainerStudentSnap = await getDocs(
          collection(db, "trainerstudents"),
        );

        // 🔥 MERGE BOTH COLLECTIONS
        const allUsers = [
          ...studentSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() })),
          ...trainerStudentSnap.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
          })),
        ];

        // 🔥 FILTER SAME FAMILY (UID BASE)
        const matched = allUsers.filter((item) => item.uid.startsWith(baseUid));

        // 🔥 FETCH INSTITUTE NAMES
        const finalList = await Promise.all(
          matched.map(async (s) => {
            let instituteName = "";

            if (s.instituteId) {
              const instSnap = await getDoc(
                doc(db, "institutes", s.instituteId),
              );

              if (instSnap.exists()) {
                instituteName = instSnap.data().instituteName || "";
              }
            }

            return {
              uid: s.uid,
              name: `${s.firstName} ${s.lastName}${
                instituteName ? ` (${instituteName})` : ""
              }`,
            };
          }),
        );

        setFamilyStudentDetails(finalList);

        // ✅ AUTO SELECT FIRST
        if (finalList.length > 0) {
          setSelectedStudentUid(finalList[0].uid);
        }
      } catch (err) {
        console.error("Sibling fetch error:", err);
      }
    };

    fetchSameEmailStudents();
  }, [user]);
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [activeMenu]);
  useEffect(() => {
    const resetTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(handleLogout, 5 * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll"].forEach((e) =>
      window.addEventListener(e, resetTimer),
    );
    resetTimer();

    return () => {
      ["mousemove", "keydown", "click", "scroll"].forEach((e) =>
        window.removeEventListener(e, resetTimer),
      );
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  /* ============================= 
     LOGOUT
  ============================= */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
  };

  /* ============================= 
     ROLE DETECTION
  ============================= */
  useEffect(() => {
    if (!user?.uid) return;

    const detectRole = async () => {
      setRoleLoading(true);

      const studentSnap = await getDoc(doc(db, "students", user.uid));
      if (studentSnap.exists()) {
        setRole("student");
        setRoleLoading(false);
        return;
      }

      const trainerSnap = await getDoc(doc(db, "InstituteTrainers", user.uid));
      if (trainerSnap.exists()) {
        setRole("trainer");
        setRoleLoading(false);
        return;
      }

      const trainerStudentSnap = await getDoc(
        doc(db, "trainerstudents", user.uid),
      );
      if (trainerStudentSnap.exists()) {
        setRole("trainerstudent");
        setRoleLoading(false);
        return;
      }

      const familySnap = await getDoc(doc(db, "families", user.uid));

      if (familySnap.exists()) {
        const familyData = familySnap.data();

        // If family linked to trainer
        if (familyData.trainerId) {
          setRole("trainerstudent");

          setFamilyStudents(familyData.students || []);
          setSelectedStudentUid(familyData.students?.[0] || "");

          setRoleLoading(false);
          return;
        }

        // If family linked to institute
        if (familyData.instituteId) {
          setRole("family");

          setFamilyStudents(familyData.students || []);
          setSelectedStudentUid(familyData.students?.[0] || "");

          setRoleLoading(false);
          return;
        }
      }

      setRole("other");
      setRoleLoading(false);
    };

    detectRole();
  }, [user]);

  /* ============================= 
     FETCH DATA
  ============================= */
  useEffect(() => {
    if (!user?.uid) return;

    const studentsQuery = query(
      collection(db, "students"),
      where("instituteId", "==", user.uid),
    );
    const unsubStudents = onSnapshot(studentsQuery, (snap) =>
      setStudents(snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))),
    );

    const trainersQuery = query(
      collection(db, "InstituteTrainers"),
      where("instituteId", "==", user.uid),
    );
    const unsubTrainers = onSnapshot(trainersQuery, (snap) =>
      setTrainers(
        snap.docs.map((doc) => ({ trainerUid: doc.id, ...doc.data() })),
      ),
    );

    return () => {
      unsubStudents();
      unsubTrainers();
    };
  }, [user]);
  /* ============================= 
   DEFAULT ACTIVE MENU BASED ON ROLE
============================= */
  useEffect(() => {
    if (!familyStudents.length) return;

    const fetchStudents = async () => {
      const list = [];

      for (let uid of familyStudents) {
        let snap = await getDoc(doc(db, "students", uid));

        if (!snap.exists()) {
          snap = await getDoc(doc(db, "trainerstudents", uid));
        }

        if (snap.exists()) {
          const data = snap.data();

          let instituteName = "";

          if (data.instituteId) {
            const instSnap = await getDoc(
              doc(db, "institutes", data.instituteId),
            );

            if (instSnap.exists()) {
              instituteName = instSnap.data().instituteName || "";
            }
          }

          list.push({
            uid,
            name: `${data.firstName || ""} ${data.lastName || ""}${
              instituteName ? ` (${instituteName})` : ""
            }`,
          });
        }
      }

      setFamilyStudentDetails(list);
    };

    fetchStudents();
  }, [familyStudents]);
  useEffect(() => {
    if (!role) return;

    if (role === "student" || role === "family") setActiveMenu("Dashboard");
    else if (role === "trainerstudent") setActiveMenu("TrainerDashboard");
    else setActiveMenu("UserDashboard"); // or whatever default for trainer/other
  }, [role]);
  /* ============================= 
     MAIN CONTENT RENDER
  ============================= */
  const renderMainContent = () => {
    switch (activeMenu) {
      case "Dashboard":
        return <Dashboard />;
      case "UserDashboard":
        return <UserDashboardPage />;
      case "FitnessDashboard":
        return <FitnessDashboard />;
      case "Student Timetables":
        return <Studenttimetables />;
      case "Trainer's Timetables":
        return <TrainersTimetables />;
      case "Fees Details":
        return <FeesDetailsPage />;
      case "Take Attendance":
        return <TakeAttendance />;
      case "My Attendance":
        return <Myattendance />;
      case "TrainerStudentAttendance":
        return <TrainerStudentAttendance studentUid={selectedStudentUid} />;
      case "Fee Details":
        return <TrainerStudentsFee studentUid={selectedStudentUid} />;
      case "CheckinCheckout":
        return <CheckinCheckout />;
      case "MyOders":
        return <MyOders />;
      case "Booked Demos":
        return <BookedDemo />;
      case "Payslips":
        return <Payslips />;
      case "Reports":
        return <Reports />;
      case "Time Table":
        return <Timetables />;
      case "Chat Box":
        return <ChatBox />;
      case "TrainerDashboard":
        return <TrainerDashboard />;
      case "Time Tables":
        return <TrainersTimetables />;
      case "Customer Policy":
        return <CustomerCentricPolicies />;

      case "Privacy Policy":
        return <PrivacyPolicy />;
      case "ChatBox":
        return <ChatBoxTS />;
      case "My Account":
        return <UserMyAccount />;

      default:
        return null;
    }
  };

  /* ============================= 
     SIDEBAR ITEMS BASED ON ROLE
  ============================= */
  /* ============================= 
   SIDEBAR ITEMS BASED ON ROLE
============================= */
  /* ============================= 
   EFFECTIVE ROLE BASED ON SELECTED STUDENT
============================= */
  const [effectiveRole, setEffectiveRole] = useState(role);

  useEffect(() => {
    if (!selectedStudentUid) return;

    const checkSelectedStudentRole = async () => {
      try {
        const studentSnap = await getDoc(
          doc(db, "students", selectedStudentUid),
        );
        if (studentSnap.exists()) {
          setSelectedStudentRole("student");
          return;
        }

        const trainerStudentSnap = await getDoc(
          doc(db, "trainerstudents", selectedStudentUid),
        );
        if (trainerStudentSnap.exists()) {
          setSelectedStudentRole("trainerstudent");
          return;
        }

        // fallback
        setSelectedStudentRole(null);
      } catch (err) {
        console.error("Error checking selected student role:", err);
        setSelectedStudentRole(null);
      }
    };

    checkSelectedStudentRole();
  }, [selectedStudentUid]);

  /* ============================= 
   SIDEBAR ITEMS BASED ON EFFECTIVE ROLE
============================= */
  const sidebarItems = React.useMemo(() => {
    if (selectedStudentRole === "student") return studentSidebarItems;
    if (selectedStudentRole === "trainerstudent")
      return trainerStudentSidebarItems;
    // fallback: logged-in user role
    if (role === "trainer") return trainerSidebarItems;
    return otherUserSidebarItems;
  }, [selectedStudentRole, role]);
  /* ============================= 
     LOADING SCREEN
  ============================= */
  if (roleLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FB] px-6">
        <div className="text-center animate-moreFadeUp">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-[#FF6A00] rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-[#FF6A00]">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    try {
      if (!auth.currentUser) return;

      let collectionName = "";

      if (role === "student") {
        collectionName = "students";
      } else if (role === "trainer") {
        collectionName = "InstituteTrainers";
      } else if (role === "trainerstudent") {
        collectionName = "trainerstudents";
      } else if (role === "other") {
        collectionName = "users"; // if you have
      } else {
        alert("Role not found.");
        return;
      }

      const userRef = doc(db, collectionName, auth.currentUser.uid);

      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 60);

      await updateDoc(userRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deleteAfter: deleteAfter,
      });

      setShowDeleteModal(false);
      setShowDeletedSuccess(true);

      setTimeout(async () => {
        await signOut(auth);
        navigate("/", { replace: true });
      }, 2000);
    } catch (error) {
      console.error("DELETE ERROR:", error);
      alert(error.message);
    }
  };

  const menuLabel = (item) =>
    ({
      FitnessDashboard: "Fitness",
      CheckinCheckout: "Check In / Out",
      TrainerDashboard: "Dashboard",
      UserDashboard: "Dashboard",
      "Trainer's Timetables": "Timetables",
      "Time Tables": "Timetables",
      "Time Table": "Timetable",
      TrainerStudentAttendance: "Attendance",
      "Fee Details": "Fees",
      "Fees Details": "Fees",
      MyOders: "My Orders",
      "Chat Box": "Chat",
      ChatBox: "Chat",
    }[item] || item);

  const lockedMenus = [
    "Dashboard",
    "UserDashboard",
    "TrainerDashboard",
    "FitnessDashboard",
    "My Account",
  ];
  const isLockedMenu = lockedMenus.includes(activeMenu);

  /* ============================= 
     DASHBOARD UI
  ============================= */
  return (
    <div className="fixed inset-0 bg-[#F4F6FB] md:bg-gray-200 md:pt-16 overflow-hidden">
      <div className="flex h-full flex-col md:flex-row overflow-hidden">
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-[80] bg-black/95 backdrop-blur-xl border-b border-white/10"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="h-10 px-2.5 sm:px-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-xl bg-white/10 text-white text-base flex items-center justify-center active:scale-95 transition"
              aria-label="Open menu"
            >
              ☰
            </button>

            <h2 className="flex-1 min-w-0 text-center text-orange-500 font-semibold text-xs sm:text-sm truncate">
              {user?.displayName || "Dashboard"}
            </h2>

            <div className="w-8 h-8 rounded-xl overflow-hidden border border-orange-400/70 bg-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 font-bold text-xs">
                {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
          </div>
        </div>

        <aside
          className={`
            fixed md:sticky
            top-0 md:top-16
            left-0
            h-[100dvh] md:h-[calc(100vh-4rem)]
            w-[min(20rem,88vw)] xl:w-80
            shrink-0
            bg-[#1A1C22]
            border-r border-white/10
            z-[10040]
            transform transition-transform duration-300 ease-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            flex flex-col
            overflow-hidden
            shadow-2xl md:shadow-none
          `}
        >
          <div
            className="md:hidden flex-shrink-0 px-4 pb-2 flex items-center justify-between"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
          >
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Menu
            </p>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="
                w-10 h-10
                flex items-center justify-center
                rounded-full
                bg-red-50 text-red-600
                border border-red-200
                shadow-sm
                transition-all duration-200
                hover:bg-red-100 hover:text-red-700 hover:border-red-300
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-red-300
              "
            >
              <FaChevronLeft size={18} />
            </button>
          </div>

          <div
            className="
              flex-1 min-h-0
              overflow-y-auto overflow-x-hidden
              px-3 sm:px-4
              pb-[calc(var(--bottom-navbar-height,64px)+24px)]
              md:pb-6
              overscroll-contain
            "
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="bg-black rounded-2xl px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 mb-4 shadow-lg animate-moreFadeUp">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-800 flex items-center justify-center border-2 border-orange-400 shrink-0">
                <span className="text-orange-400 font-bold text-lg">
                  {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  User
                </p>
                <span className="text-orange-500 font-bold text-sm sm:text-lg block truncate">
                  {user?.displayName || "User"}
                </span>
              </div>
            </div>

            {(role === "family" ||
              role === "trainerstudent" ||
              role === "student") &&
              familyStudentDetails.length > 0 && (
                <div className="bg-black rounded-2xl p-3 mb-4 shadow-lg animate-moreFadeUp">
                  <label className="block text-xs text-orange-400 font-semibold mb-1.5">
                    Select Student:
                  </label>

                  <select
                    value={selectedStudentUid}
                    onChange={(e) => setSelectedStudentUid(e.target.value)}
                    className="w-full border border-orange-400/70 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white outline-none"
                  >
                    {familyStudentDetails.map((student) => (
                      <option key={student.uid} value={student.uid}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="bg-black rounded-2xl p-2 sm:p-3 mb-4 shadow-lg">
              {sidebarItems.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => {
                    if (item === "Log Out") return handleLogout();
                    setActiveMenu(item);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 sm:px-4 py-3 min-h-[48px] rounded-xl flex items-center gap-2 transition duration-200 mb-1 animate-moreFadeUp active:scale-[0.99] ${
                    activeMenu === item
                      ? "text-orange-400 font-semibold bg-orange-500/15"
                      : "text-white hover:text-orange-400 hover:bg-white/5"
                  }`}
                >
                  {menuLabel(item)}
                </button>
              ))}
            </div>

            <div className="bg-black rounded-2xl p-3 sm:p-4 shadow-lg">
              <h3 className="text-white font-bold text-base sm:text-lg mb-2 px-1">
                Settings
              </h3>

              {SettingsItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === "Logout") {
                      setSidebarOpen(false);
                      return handleLogout();
                    }

                    setActiveMenu(item);
                    setSidebarOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-3 min-h-[44px] rounded-xl transition ${
                    activeMenu === item
                      ? "text-orange-500 font-semibold bg-white/5"
                      : "text-white hover:text-orange-400 hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="bg-black rounded-xl p-3 sm:p-4 mt-3">
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => {
                    setShowDeleteModal(true);
                  }, 300);
                }}
                className="w-full text-left text-red-500 hover:text-red-400 font-semibold flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-xl hover:bg-red-500/10 transition"
              >
                <img src="/delete-icon.png" alt="delete" className="w-5 h-5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[10030] animate-moreFadeUp"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main
          ref={mainContentRef}
          className="flex-1 min-w-0 h-full dash-surface overflow-hidden"
        >
          <div
            className={`
              h-full w-full max-w-[1600px] mx-auto
              px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12
              pt-[calc(2.5rem+env(safe-area-inset-top,0px))]
              pb-[calc(var(--bottom-navbar-height,64px)+8px)]
              md:pt-8 md:pb-8
              ${
                isLockedMenu
                  ? "overflow-hidden flex flex-col min-h-0"
                  : "overflow-y-auto overflow-x-hidden"
              }
            `}
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            <div
              key={activeMenu}
              className={
                isLockedMenu
                  ? "h-full min-h-0 flex flex-col overflow-hidden dash-page-in"
                  : "dash-page-in md:pt-2"
              }
            >
              {renderMainContent()}
            </div>
          </div>
        </main>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
            <div className="bg-white w-full sm:w-[95%] max-w-xl rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 relative text-center shadow-2xl animate-slideUp sm:animate-moreFadeUp">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 text-xl flex items-center justify-center"
              >
                ✕
              </button>

              <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4 pr-8">
                Delete Account ?
              </h2>

              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                Are you sure you want delete your account ?
              </p>

              <p className="text-gray-500 mb-2 text-sm sm:text-base">
                This action cannot be undone and all your data will be
                permanently removed after 60 days
              </p>

              <p className="text-green-600 mb-6 font-medium text-sm sm:text-base">
                You can re-activate your account within 60 days
              </p>

              <div className="flex flex-col-reverse sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 min-h-[48px] bg-gray-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-6 py-3 min-h-[48px] bg-red-600 text-white rounded-xl font-semibold"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeletedSuccess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
            <div className="bg-white w-full sm:w-[95%] max-w-3xl min-h-[280px] sm:min-h-[400px] rounded-t-3xl sm:rounded-2xl relative flex flex-col items-center justify-center px-5 py-10">
              <button
                type="button"
                onClick={() => {
                  setShowDeletedSuccess(false);
                  navigate("/");
                }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 text-2xl flex items-center justify-center"
              >
                ✕
              </button>

              <h2 className="text-xl sm:text-3xl font-semibold text-black text-center max-w-lg">
                Your Account has been deleted successfully
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
