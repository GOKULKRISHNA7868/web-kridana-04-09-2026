import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import {
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import TrainersTable from "./TrainersTable";
import StudentsAttendancePage from "./StudentsAttendancePage";
import FeesDetailsPage from "./FeesDetailsPage";
import AddStudentDetailsPage from "./AddStudentDetailsPage";
import PaymentsPage from "./PaymentsPage";
import { Pagination } from "./shared";
import Editprofile from "./Editprofile";
import MyStudents from "./MyStudents";
import DemoClasses from "./DemoClasses";
import InstituteBookedDemos from "./InstituteBookedDemos";
import TermsAndConditions from "../../pages/Terms";
import PrivacyPolicy from "../../pages/Privacy";
import PerformanceReports from "./PerformanceReports";
import Timetable from "./Timetable";
import PaymentsSubscriptionPage from "./PaymentsSubscriptionPage";
import MyAccountPage from "./MyAccountPage";
import { db } from "../../firebase";
import ResetPassword from "./ResetPassword";
import PaidRecipet from "./PaidRecipet";
import Dashboard from "./Dashboard";
import KYC from "./KYC";
import Expenses from "./Expences";
import { App } from "@capacitor/app";

import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Reelsdata from "./Reelsdata";
import ChatBox from "./ChatBox";
import TrainerEventsPage from "./Events/EventsPage";
import Myaccountpage from "./MyAccountPage";
import TrainerMyAccountLayout from "./MyAccount/MyAccountLayout";
import ComplaintHistory from "./ComplaintHistory";
import RegisterNumber from "./RegisterNumber";
//import Family from "./Family";
/* =============================
   🔥 NEW ROLE STATE
============================= */
import Uploadimages from "../../pages/Uploadimages";
import {
  FaTachometerAlt,
  FaUsers,
  FaCogs,
  FaChartBar,
  FaUserCircle,
  FaChevronDown,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
const TrainersDashboard = () => {
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const mainContentRef = useRef(null);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [view, setView] = useState("Dashboard");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerType, setTrainerType] = useState("Trainer"); // NEW
  const { institute, user } = useAuth();
  const [trainerData, setTrainerData] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (title) => {
    setOpenMenu(openMenu === title ? null : title);
  };
  const handleDeleteClick = () => {
    setSidebarOpen(false);
    setTimeout(() => {
      setShowDeleteModal(true);
    }, 300);
  };
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [view]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [seenNotifications, setSeenNotifications] = useState(() => {
    const saved = localStorage.getItem("trainerSeenNotifications");
    return saved ? JSON.parse(saved) : [];
  });
  const unreadNotifications = notifications.filter(
    (n) => !seenNotifications.includes(String(n.id)),
  );
  const markAllSeen = () => {
    const ids = notifications.map((n) => String(n.id));

    const updatedSeen = [...new Set([...seenNotifications, ...ids])];

    setSeenNotifications(updatedSeen);

    localStorage.setItem(
      "trainerSeenNotifications",
      JSON.stringify(updatedSeen),
    );
  };
  const studentLabel = trainerType === "Therapist" ? "Patients" : "Students";
  const trainerLabel = trainerType === "Therapist" ? "Therapist" : "Trainer";

  const sidebarSections = [
    {
      title: "Dashboard",
      icon: "dashboard",
      items: [],
    },
    {
      title: "Customers",
      icon: "customers",
      items: [
        { label: "Attendance", value: "Customers Attendance" },
        { label: "Students", value: "Customer Details" },
        { label: "Paid Receipts", value: "PaidReceipt" },
        { label: "Fees & Payments", value: "Fees Details" },
        { label: "Performance Reports", value: "Performance Reports" },
      ],
    },
    {
      title: "Operations",
      icon: "operations",
      items: [
        { label: "Time Table", value: "Time Table" },
        { label: "Expenses", value: "Expenses" },
      ],
    },
    {
      title: "Posts",
      icon: "analytics",
      items: [{ label: "Posts & Media", value: "Uploadimages" }],
    },
    {
      title: "Analytics",
      icon: "analytics",
      items: [{ label: "Analytics", value: "Analytics" }],
    },
    {
      title: "Account",
      icon: "account",
      items: [
        {
          label: "Settings",
          value: "Customer & Management Settings",
        },
        { label: "Trainer Profile", value: "My Account" },
        { label: "KYC Verification", value: "Complete KYC" },
        { label: "Payment & Subscription", value: "Payment & Subscription" },
      ],
    },
  ];
  const getIcon = (icon) => {
    switch (icon) {
      case "dashboard":
        return <FaTachometerAlt />;
      case "customers":
        return <FaUsers />;
      case "Uploadimages":
        return <FaUsers />;
      case "operations":
        return <FaCogs />;
      case "analytics":
        return <FaChartBar />;
      case "account":
        return <FaUserCircle />;
      default:
        return null;
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletedSuccess, setShowDeletedSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /* =============================
     🔥 FETCH TRAINER TYPE
  ============================= */
  useEffect(() => {
    const fetchTrainerType = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, "trainers"),
          where("__name__", "==", user.uid),
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setTrainerType(data.trainerType || "Trainer");
        }
      } catch (err) {
        console.error("Error fetching trainer type:", err);
      }
    };

    fetchTrainerType();
  }, []);
  useEffect(() => {
    const q = query(collection(db, "helpcenter"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => b.reportedOn?.seconds - a.reportedOn?.seconds);

      setNotifications(data);
    });

    return () => unsub();
  }, []);

  /* =============================
   🔥 FETCH STUDENTS
============================= */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, "trainerstudents"),
          where("trainerUID", "==", user.uid),
        );

        const snap = await getDocs(q);

        const studentsData = snap.docs.map((doc) => ({
          id: doc.id,
          name: `${doc.data().firstName || ""} ${doc.data().lastName || ""}`,
          batch: doc.data().category || "N/A",
          phone: doc.data().phoneNumber || "N/A",
          createdAt: doc.data().createdAt || null,
        }));

        setTrainers(studentsData);
      } catch (error) {
        console.error("Error fetching trainer students:", error);
      }
    };

    fetchStudents();
  }, []);
  useEffect(() => {
    const fetchTrainerData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, "trainers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTrainerData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching trainer data:", err);
      }
    };

    fetchTrainerData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDate]);

  const isSameDay = (firestoreDate, selectedDate) => {
    if (!selectedDate) return true;
    if (!firestoreDate) return false;

    let d1;

    if (firestoreDate.seconds) {
      d1 = new Date(firestoreDate.seconds * 1000);
    } else if (firestoreDate instanceof Date) {
      d1 = firestoreDate;
    } else {
      return false;
    }

    const d2 = new Date(selectedDate);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchesDate = isSameDay(t.createdAt, selectedDate);

      return matchesSearch && matchesDate;
    });
  }, [trainers, search, selectedDate]);

  const totalPages = Math.ceil(filteredTrainers.length / itemsPerPage);

  const paginatedTrainers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrainers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrainers, currentPage]);

  const handleMenuClick = (item) => {
    setActiveMenu(item);
    setSidebarOpen(false);
    if (item === "Home") return setView("trainersData");

    if (item === "Customers Attendance") return setView("studentsAttendance");

    if (item === "Customer Details") return setView("addStudent");

    if (item === "Performance Reports") return setView("performance");

    if (item === "Fees Details") return setView("feesDetails");

    if (item === "Time Table") return setView("timetable");

    if (item === "Add Events") return setView("events");

    if (item === "Analytics") return setView("analytics");
    if (item === "Uploadimages") return setView("Uploadimages");
    if (item === "Chat Box") return setView("chatBox");
    if (item === "Expenses") return setView("expenses");
    if (item === "My Account") return setView("myAccount");
    if (item === "Complete KYC") return setView("KYC");
    if (item === "Dashboard") return setView("Dashboard");
    if (item === "Customer & Management Settings")
      return setView("CustomerManagementSettings");
    //if (item === "Family Details") return setView("Family");
    if (item === "RegisterNumber") return setView("RegisterNumber");
    if (item === "PaidReceipt") return setView("PaidReceipt");
    if (item === "Payment & Subscription")
      return setView("PaymentsSubscriptionPage");
    if (item === "terms") return setView("terms");
    if (item === "privacy") return setView("privacy");
    if (item === "ResetPassword") return setView("ResetPassword");

    setView("notConnected");
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, "trainerstudents", id));
      setTrainers((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };
  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);

      const trainerRef = doc(db, "trainers", auth.currentUser.uid);

      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 60);

      await updateDoc(trainerRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deleteAfter: deleteAfter,
      });

      setShowDeleteModal(false);
      setShowDeletedSuccess(true);

      setTimeout(async () => {
        await signOut(auth);
        navigate("/");
      }, 2000);
    } catch (error) {
      console.log(error);
      alert("Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };
  const renderMainContent = () => {
    if (view === "MyStudents") return <MyStudents />;
    if (view === "Editprofile") return <Editprofile />;
    if (view === "studentsAttendance") return <StudentsAttendancePage />;
    if (view === "feesDetails") return <FeesDetailsPage />;
    if (view === "addStudent") return <AddStudentDetailsPage />;
    if (view === "paymentDetails") return <PaymentsPage />;
    if (view === "demoClasses") return <DemoClasses />;
    if (view === "bookedDemos") return <InstituteBookedDemos />;
    if (view === "terms") return <TermsAndConditions />;
    if (view === "privacy") return <PrivacyPolicy />;
    if (view === "ResetPassword") return <ResetPassword />;
    if (view === "expenses") return <Expenses />;
    if (view === "performance") return <PerformanceReports />;
    if (view === "analytics") return <Reelsdata />;
    if (view === "Uploadimages") return <Uploadimages />;
    if (view === "myAccount") return <TrainerMyAccountLayout />;
    if (view === "KYC") return <KYC />;
    if (view === "Dashboard")
      return <Dashboard setView={setView} />;
    if (view === "chatBox") return <ChatBox />;
    if (view === "timetable") return <Timetable />;
    if (view === "events")
      return <TrainerEventsPage setActiveMenu={handleMenuClick} />;
    if (view === "CustomerManagementSettings")
      return <MyAccountPage setActiveMenu={handleMenuClick} />;
    //if (view === "Family") return <Family />;
    if (view === "RegisterNumber") return <RegisterNumber />;
    if (view === "PaidReceipt") return <PaidRecipet />;
    if (view === "complaintHistory")
      return (
        <ComplaintHistory
          ticketId={selectedTicket}
          setView={setView} // ✅ ADD THIS
        />
      );
    if (view === "PaymentsSubscriptionPage")
      return <PaymentsSubscriptionPage />;
    if (view === "notConnected") {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <h1 className="text-3xl font-bold text-orange-500 mb-3">
              🚧 Page Not Connected
            </h1>
            <p className="text-gray-500">
              This section is not implemented yet.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center mb-4 w-full"></div>

        <h1 className="text-3xl font-extrabold text-orange-500 mb-4">
          {trainerLabel}s Data
        </h1>

        <TrainersTable
          rows={paginatedTrainers}
          onDelete={handleDeleteStudent}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </>
    );
  };

  const trainerDisplayName = [trainerData?.firstName, trainerData?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const lockedViews = [
    "Dashboard",
    "studentsAttendance",
    "CustomerManagementSettings",
    "myAccount",
  ];
  const isLockedView = lockedViews.includes(view);

  return (
    <div className="fixed inset-0 bg-[#F4F6FB] md:bg-[#F4F6FB] md:pt-16 overflow-hidden">
      <div className="flex h-full flex-col md:flex-row overflow-hidden">
        {/* MOBILE TOPBAR */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-[80] bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/10"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="h-12 px-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/10 text-white text-base flex items-center justify-center active:scale-95 transition"
              aria-label="Open menu"
            >
              ☰
            </button>

            <h2 className="flex-1 min-w-0 text-center text-white font-semibold text-sm truncate">
              {activeMenu || trainerDisplayName || trainerLabel || "Dashboard"}
            </h2>

            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#FF6A00]/70 bg-slate-800 flex items-center justify-center flex-shrink-0">
              {trainerData?.profileImageUrl ? (
                <img
                  src={trainerData.profileImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#FF6A00] font-bold text-xs">
                  {trainerDisplayName?.charAt(0)?.toUpperCase() || "T"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LEFT SIDEBAR */}
        <aside
          className={`
            fixed md:sticky
            top-0 md:top-16
            left-0
            h-[100dvh] md:h-[calc(100vh-4rem)]
            w-[min(20rem,88vw)] xl:w-[17.5rem]
            shrink-0
            bg-[#0F172A]
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
          {/* BRAND + CLOSE */}
          <div
            className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/10"
            style={{
              paddingTop: "max(16px, env(safe-area-inset-top))",
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/Kridana logo.png"
                  alt="Kridana"
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm tracking-wide">
                  KRIDANA
                </p>
                <p className="text-[10px] text-orange-300/80 font-medium truncate">
                  Trainer console
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-95"
            >
              <FaChevronLeft size={14} />
            </button>
          </div>

          {/* SIDEBAR SCROLL AREA */}
          <div
            className="
              flex-1 min-h-0
              overflow-y-auto overflow-x-hidden
              px-3
              pb-3
              overscroll-contain
              scrollbar-hide
            "
            style={{
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* ===== MENU ===== */}
            <div className="mt-3 space-y-1">
              {sidebarSections.map((section, index) => (
                <div
                  key={section.title}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className="animate-moreFadeUp"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (section.title === "Dashboard") {
                        handleMenuClick("Dashboard");
                      } else {
                        toggleMenu(section.title);
                      }
                    }}
                    className={`
                      w-full flex items-center justify-between
                      px-3 py-2.5 min-h-[44px]
                      rounded-xl text-sm font-medium
                      transition duration-200
                      active:scale-[0.99]
                      ${
                        (section.title === "Dashboard" &&
                          activeMenu === "Dashboard") ||
                        openMenu === section.title ||
                        section.items.some((i) => i.value === activeMenu)
                          ? "bg-[#FF6A00] text-white shadow-lg shadow-orange-500/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 opacity-90">
                        {getIcon(section.icon)}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </div>

                    {section.items.length > 0 &&
                      (openMenu === section.title ? (
                        <FaChevronDown size={11} className="flex-shrink-0" />
                      ) : (
                        <FaChevronRight size={11} className="flex-shrink-0" />
                      ))}
                  </button>

                  {openMenu === section.title && (
                    <div className="ml-2 mt-1 mb-2 space-y-0.5 pl-2 border-l border-white/10 animate-moreFadeUp">
                      {section.items.map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => handleMenuClick(item.value)}
                          className={`
                            block w-full text-left
                            px-3 py-2.5 min-h-[40px]
                            rounded-lg text-[13px]
                            transition duration-200
                            ${
                              activeMenu === item.value
                                ? "bg-white/10 text-[#FF6A00] font-semibold"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }
                          `}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ===== SETTINGS ===== */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Settings
              </p>

              {[
                ["terms", "Terms & Conditions"],
                ["privacy", "Privacy Policy"],
                ["ResetPassword", "Reset Password"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    setTimeout(() => handleMenuClick(key), 200);
                  }}
                  className={`block w-full text-left px-3 py-2.5 min-h-[40px] rounded-xl text-[13px] transition ${
                    activeMenu === key
                      ? "text-[#FF6A00] font-semibold bg-white/5"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => signOut(auth)}
                className="block w-full text-left px-3 py-2.5 min-h-[40px] rounded-xl text-[13px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                Logout
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                className="w-full text-left text-red-400 hover:text-red-300 font-semibold flex items-center gap-2 px-3 py-2.5 min-h-[40px] rounded-xl hover:bg-red-500/10 transition text-[13px] mt-1"
              >
                <img src="/delete-icon.png" alt="" className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* BOTTOM TRAINER CARD */}
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-[#0B1220]">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 px-3 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#FF6A00]/50 bg-slate-700 shrink-0">
                {trainerData?.profileImageUrl ? (
                  <img
                    src={trainerData.profileImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#FF6A00] font-bold">
                    {trainerDisplayName?.charAt(0)?.toUpperCase() || "T"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">
                  {trainerDisplayName || trainerLabel}
                </p>
                <p className="text-[11px] text-slate-400">{trainerLabel}</p>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-500 mt-2 font-medium tracking-wide">
              Build · Train · Grow
            </p>
          </div>
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[10030] animate-moreFadeUp"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main
          ref={mainContentRef}
          className="flex-1 min-w-0 h-full bg-[#F4F6FB] overflow-hidden"
        >
          <div
            className={`
              h-full w-full max-w-[1600px] mx-auto
              px-3 sm:px-5 md:px-6 lg:px-8
              pt-[calc(3.25rem+env(safe-area-inset-top,0px))]
              pb-[calc(var(--bottom-navbar-height,64px)+8px)]
              md:pt-6 md:pb-6
              ${
                isLockedView
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
              key={view}
              className={
                isLockedView
                  ? "h-full min-h-0 flex flex-col overflow-hidden dash-page-in"
                  : "dash-page-in md:pt-1"
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
                  disabled={deleting}
                  className="px-6 py-3 min-h-[48px] bg-red-600 text-white rounded-xl font-semibold disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeletedSuccess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
            <div className="bg-white w-full sm:w-[95%] max-w-3xl min-h-[320px] sm:min-h-[450px] rounded-t-3xl sm:rounded-2xl relative flex flex-col items-center justify-center px-5 py-10">
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

              <img
                src="/delete-success.png"
                alt="deleted"
                className="w-40 sm:w-64 mb-6 sm:mb-8"
              />

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

export default TrainersDashboard;
