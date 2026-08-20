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
      title: "Main",
      icon: "dashboard",
      items: [{ label: "Dashboard", value: "Dashboard" }],
    },
    {
      title: "Customers",
      icon: "customers",
      items: [
        { label: "Customers Attendance", value: "Customers Attendance" },
        { label: "Customer Details", value: "Customer Details" },
        //{ label: "Family Details", value: "Family Details" },
        //{ label: "RegisterNumber", value: "RegisterNumber" },
        { label: "PaidReceipt", value: "PaidReceipt" },
        { label: "Fees Details", value: "Fees Details" },
        { label: "Performance Reports", value: "Performance Reports" },
      ],
    },
    {
      title: "Operations",
      icon: "operations",
      items: [
        { label: "Time Table", value: "Time Table" },
        //{ label: "Add Events", value: "Add Events" },
        { label: "Expenses", value: "Expenses" },
        //{ label: "Chat Box", value: "Chat Box" },
      ],
    },
    {
      title: "Posts",
      icon: "analytics",
      items: [{ label: "Upload", value: "Uploadimages" }],
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
          label: "Customer & Management Settings",
          value: "Customer & Management Settings",
        },
        { label: "My Account", value: "My Account" },
        { label: "Complete KYC", value: "Complete KYC" },

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
    if (view === "Dashboard") return <Dashboard />;
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
              {trainerDisplayName || trainerLabel}
            </h2>

            <div className="w-8 h-8 rounded-xl overflow-hidden border border-orange-400/70 bg-gray-800 flex items-center justify-center flex-shrink-0">
              {trainerData?.profileImageUrl ? (
                <img
                  src={trainerData.profileImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-orange-400 font-bold text-xs">
                  {trainerDisplayName?.charAt(0)?.toUpperCase() || "T"}
                </span>
              )}
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
          onClick={(e) => e.stopPropagation()}
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
              scrollbar-hide
            "
            style={{
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div className="bg-black rounded-2xl px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 mb-4 shadow-lg animate-moreFadeUp">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-orange-400 shadow-md">
                  {trainerData?.profileImageUrl ? (
                    <img
                      src={trainerData.profileImageUrl}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-orange-400 font-bold text-lg sm:text-xl">
                        {trainerDisplayName?.charAt(0)?.toUpperCase() || "T"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                  {trainerLabel}
                </p>
                <h2 className="text-orange-500 font-bold text-sm sm:text-lg md:text-xl break-words leading-snug">
                  {trainerDisplayName || trainerLabel}
                </h2>
              </div>
            </div>

            <div className="bg-black rounded-2xl p-2 sm:p-3 mb-4 shadow-lg">
              {sidebarSections.map((section, index) => (
                <div
                  key={section.title}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className="animate-moreFadeUp"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (section.title === "Main") {
                        handleMenuClick("Dashboard");
                      } else {
                        toggleMenu(section.title);
                      }
                    }}
                    className={`
                      w-full flex items-center justify-between
                      px-3 sm:px-4 py-3 min-h-[48px]
                      rounded-xl text-white
                      transition duration-200
                      active:scale-[0.99]
                      ${
                        (section.title === "Main" &&
                          activeMenu === "Dashboard") ||
                        openMenu === section.title
                          ? "bg-white/10 text-orange-400"
                          : "hover:bg-gray-800"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-orange-400 flex-shrink-0">
                        {getIcon(section.icon)}
                      </span>
                      <span className="font-medium text-sm sm:text-base truncate">
                        {section.title === "Main" ? "Dashboard" : section.title}
                      </span>
                    </div>

                    {section.title !== "Main" &&
                      section.items.length > 0 &&
                      (openMenu === section.title ? (
                        <FaChevronDown
                          size={12}
                          className="flex-shrink-0 transition-transform duration-200"
                        />
                      ) : (
                        <FaChevronRight
                          size={12}
                          className="flex-shrink-0 transition-transform duration-200"
                        />
                      ))}
                  </button>

                  {section.title !== "Main" && openMenu === section.title && (
                    <div className="ml-4 sm:ml-8 mt-1 mb-2 space-y-1 animate-moreFadeUp">
                      {section.items.map((item) => (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => handleMenuClick(item.value)}
                          className={`
                            block w-full text-left
                            px-3 py-2.5 min-h-[44px]
                            rounded-lg text-sm
                            transition duration-200
                            ${
                              activeMenu === item.value
                                ? "bg-orange-500/15 text-orange-400 font-semibold"
                                : "text-gray-300 hover:bg-gray-800 hover:text-orange-500"
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

            <div className="bg-black rounded-2xl p-3 sm:p-4 shadow-lg">
              <h3 className="text-white font-bold text-base sm:text-lg mb-2 px-1">
                Settings
              </h3>

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => {
                    handleMenuClick("terms");
                  }, 300);
                }}
                className={`block w-full text-left px-3 py-3 min-h-[44px] rounded-xl transition ${
                  activeMenu === "terms"
                    ? "text-orange-500 font-semibold bg-white/5"
                    : "text-white hover:text-orange-400 hover:bg-white/5"
                }`}
              >
                Terms & Conditions
              </button>

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => {
                    handleMenuClick("privacy");
                  }, 300);
                }}
                className={`block w-full text-left px-3 py-3 min-h-[44px] rounded-xl transition ${
                  activeMenu === "privacy"
                    ? "text-orange-500 font-semibold bg-white/5"
                    : "text-white hover:text-orange-400 hover:bg-white/5"
                }`}
              >
                Privacy Policy
              </button>

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => {
                    handleMenuClick("ResetPassword");
                  }, 300);
                }}
                className={`block w-full text-left px-3 py-3 min-h-[44px] rounded-xl transition ${
                  activeMenu === "ResetPassword"
                    ? "text-orange-500 font-semibold bg-white/5"
                    : "text-white hover:text-orange-400 hover:bg-white/5"
                }`}
              >
                Reset Password
              </button>

              <button
                type="button"
                onClick={() => signOut(auth)}
                className="block w-full text-left px-3 py-3 min-h-[44px] rounded-xl text-white hover:text-red-400 hover:bg-red-500/10 transition"
              >
                Logout
              </button>
            </div>

            <div className="bg-black rounded-xl p-3 sm:p-4 mt-3">
              <button
                type="button"
                onClick={handleDeleteClick}
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
