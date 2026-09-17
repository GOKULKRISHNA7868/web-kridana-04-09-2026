// src/components/InstituteDashboard/InstituteDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TermsAndConditions from "../../pages/Terms";
import PrivacyPolicy from "../../pages/Privacy";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { App } from "@capacitor/app";
import PerformanceReports from "./PerformanceReports";
import InstituteDataPage from "./InstituteDataPage";
import StudentsAttendancePage from "./StudentsAttendancePage";
import TrainersAttendancePage from "./TrainersAttendancePage";
import FeesDetailsPage from "./FeesDetailsPage";
import SalaryDetailsPage from "./SalaryDetailsPage";
import AddTrainerDetailsPage from "./AddTrainerDetailsPage";
import TrainerAccessPage from "./TrainerAccessPage";
import AddStudentDetailsPage from "./AddStudentDetailsPage";
import PaymentsPage from "./PaymentsPage";
import Editprofile from "./Editprofile";
import Timetable from "./Timetable";
import SellSportsMaterial from "./SellSportsMaterial";
import UploadProductDetails from "./UploadProductDetails";
import Orders from "./Orders";
import DemoClasses from "./DemoClasses";
import InstituteBookedDemos from "./InstituteBookedDemos";
import Reelsdata from "./Reelsdata";
import MyAccountLayout from "./MyAccount/MyAccountLayout";
import PaymentsSubscriptionPage from "./PaymentsSubscriptionPage";
import ChatBox from "./ChatBox";
import EventsPage from "./Events/EventsPage";
import EventsSidebar from "./Events/EventsSidebar";
import MyAccountPage from "./MyAccountPage";
import PaidRecipet from "./PaidRecipet";
import DailyBill from "./DailyBill";
import ComplaintHistory from "./ComplaintHistory";
import ResetPassword from "./ResetPassword";
import KYC from "./KYC";
import BookingsList from "./BookingsList";
import AddSportsFacilitiesPage from "./AddSportsFacilitiesPage";
import RegisterNumber from "./RegisterNumber";
import Uploadimages from "../../pages/Uploadimages";
import {
  FaUsers,
  FaUserTie,
  FaCogs,
  FaChartBar,
  FaTachometerAlt,
  FaChevronDown,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
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
      "Customers Attendance",
      //"RegisterNumber",
      "Add Customers",
      "Paid Recipets",
      "Daily Bill",
      "Fees Details",
      "Performance Reports",
    ],
  },
  {
    title: "Posts",
    icon: "management",
    items: ["Uploadimages"],
  },
  {
    title: "Management",
    icon: "management",
    items: [
      "Management Attendance",
      "Management Details",
      "Trainer Access",
      "Salary Details",
    ],
  },
  {
    title: "Operations",
    icon: "operations",
    items: [
      "Time Table",
      "Add Events",
      //"Chat Box",
      "Analytics",
      //"BookingsList",
      //"AddSportsFacilitiesPage",
    ],
  },
  {
    title: "Account",
    icon: "account",
    items: [
      "Customer & Management Settings",
      "Edit My Account",
      "Complete KYC",
      //"Payment & Subscription",
    ],
  },
];

const menuDisplayName = (item) => {
  const map = {
    "Edit My Account": "Academy Profile",
    "Customers Attendance": "Attendance",
    "Add Customers": "Students",
    "Paid Recipets": "Paid Receipts",
    Uploadimages: "Posts & Media",
    "Management Details": "Trainers",
    "Fees Details": "Fees & Payments",
    "Customer & Management Settings": "Settings",
    "Complete KYC": "KYC Verification",
    Analytics: "Analytics",
  };
  return map[item] || item;
};

const InstituteDashboard = () => {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const { institute, user } = useAuth();
  const idleTimer = useRef(null);
  const mainContentRef = useRef(null);
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [dataType, setDataType] = useState("students");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletedSuccess, setShowDeletedSuccess] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeMenu === "Edit My Account") {
      setOpenMenu("Account");
    }
  }, [activeMenu]);

  const toggleMenu = (title) => {
    setOpenMenu(openMenu === title ? null : title);
  };
  const handleDeleteClick = () => {
    setSidebarOpen(false); // Close sidebar first

    setTimeout(() => {
      setShowDeleteModal(true); // Then open delete modal
    }, 300); // Match sidebar animation duration
  };
  /* =============================
     📂 FETCH STUDENTS & TRAINERS
  ============================= */
  const getIcon = (icon) => {
    switch (icon) {
      case "dashboard":
        return <FaTachometerAlt />;
      case "customers":
        return <FaUsers />;
      case "management":
        return <FaUserTie />;
      case "uploadimages":
        return <FaUserTie />;
      case "operations":
        return <FaCogs />;
      case "account":
        return <FaChartBar />;
      default:
        return null;
    }
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
  }, [activeMenu]);

  useEffect(() => {
    if (!user?.uid) return;

    const studentsQuery = query(
      collection(db, "students"),
      where("instituteId", "==", user.uid),
    );

    const unsubStudents = onSnapshot(studentsQuery, (snap) => {
      const data = snap.docs.map((doc) => {
        const raw = doc.data();

        return {
          uid: doc.id,
          ...raw,
          batch: raw.batch || raw.category || "",
          createdAt: raw.createdAt
            ? raw.createdAt.toDate().toISOString().split("T")[0]
            : null,
          joiningDate: raw.joiningDate || null,
        };
      });

      setStudents(data);
    });

    const trainersQuery = query(
      collection(db, "InstituteTrainers"),
      where("instituteId", "==", user.uid),
    );

    const unsubTrainers = onSnapshot(trainersQuery, (snap) => {
      const data = snap.docs.map((doc) => ({
        trainerUid: doc.id,
        firstName: doc.data().firstName || "",
        lastName: doc.data().lastName || "",
        category: doc.data().category || "",
        phone: doc.data().phone || "",
        createdAt: doc.data().createdAt
          ? doc.data().createdAt.toDate().toISOString().split("T")[0]
          : null,
        joiningDate: doc.data().joiningDate || null,
      }));

      setTrainers(data);
    });

    return () => {
      unsubStudents();
      unsubTrainers();
    };
  }, [user]);

  /* =============================
     📂 RENDER MAIN CONTENT
  ============================= */
  const renderMainContent = () => {
    switch (activeMenu) {
      case "Dashboard":
        return (
          <InstituteDataPage
            students={students}
            trainers={trainers}
            studentLabel="Customers"
            trainerLabel="Management"
            setDataType={setDataType}
            setActiveMenu={setActiveMenu}
            notifications={notifications}
            openComplaints={(ticketId) => {
              setSelectedTicket(ticketId);
              setActiveMenu("Complaint History");
            }}
            unreadCount={unreadNotifications.length}
            markAllSeen={() => {
              const ids = notifications.map((n) => n.id);
              setSeenNotifications(ids);
              localStorage.setItem("seenNotifications", JSON.stringify(ids));
            }}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            onDeleteStudent={(uid) =>
              setStudents((prev) => prev.filter((s) => s.uid !== uid))
            }
            onDeleteTrainer={(trainerUid) =>
              setTrainers((prev) =>
                prev.filter((t) => t.trainerUid !== trainerUid),
              )
            }
          />
        );

      case "Customers Attendance":
        return <StudentsAttendancePage />;
      case "Management Attendance":
        return <TrainersAttendancePage />;
      case "Fees Details":
        return <FeesDetailsPage />;
      case "Salary Details":
        return <SalaryDetailsPage />;
      case "Management Details":
        return <AddTrainerDetailsPage />;
      case "Trainer Access":
        return <TrainerAccessPage />;
      case "Uploadimages":
        return <Uploadimages />;
      case "Add Customers":
        return <AddStudentDetailsPage />;
      case "Add Events":
        return <EventsPage setActiveMenu={setActiveMenu} />;
      case "Sell Sports Material":
        return <SellSportsMaterial setActiveMenu={setActiveMenu} />;
      case "Upload Product Details":
        return <UploadProductDetails />;
      case "Orders":
        return <Orders />;
      case "Terms & Conditions":
        return <TermsAndConditions />;
      case "Privacy Policy":
        return <PrivacyPolicy />;
      case "ResetPassword":
        return <ResetPassword />;
      case "Performance Reports":
        return <PerformanceReports />;
      case "Analytics":
        return <Reelsdata setActiveMenu={setActiveMenu} />;
      case "Time Table":
        return <Timetable />;
      case "Chat Box":
        return <ChatBox />;
      case "Edit My Account":
        return <MyAccountLayout />;
      case "Customer & Management Settings":
        return (
          <MyAccountPage
            setActiveMenu={setActiveMenu}
            closeSidebar={() => setSidebarOpen(false)}
          />
        );
      //case "BookingsList":
      //return <BookingsList />;
      //case "AddSportsFacilitiesPage":
      //return <AddSportsFacilitiesPage />;
      case "Paid Recipets":
        return <PaidRecipet />;
      case "Daily Bill":
        return <DailyBill />;
      //case "Payment & Subscription":
      //return <PaymentsSubscriptionPage />;
      case "Complete KYC":
        return <KYC setActiveMenu={setActiveMenu} />;
      case "RegisterNumber":
        return <RegisterNumber />;
      case "Complaint History":
        return (
          <ComplaintHistory
            ticketId={selectedTicket}
            setActiveMenu={setActiveMenu}
          />
        );
      default:
        return (
          <div className="text-black">
            <h1 className="text-4xl font-extrabold mb-4">{activeMenu}</h1>
            <p className="text-lg max-w-xl">
              This section will be connected to data later.
            </p>
          </div>
        );
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const instituteRef = doc(db, "institutes", user.uid);

      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 60);

      await updateDoc(instituteRef, {
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
    }
  };
  const [seenNotifications, setSeenNotifications] = useState(() => {
    const saved = localStorage.getItem("seenNotifications");
    return saved ? JSON.parse(saved) : [];
  });
  const unreadNotifications = notifications.filter(
    (n) => !seenNotifications.includes(n.id),
  );
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "helpcenter"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(
        data.sort((a, b) => b.reportedOn?.seconds - a.reportedOn?.seconds),
      );
    });

    return () => unsub();
  }, [user]);

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
              {menuDisplayName(activeMenu) ||
                institute?.instituteName ||
                "Dashboard"}
            </h2>

            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#FF6A00]/70 bg-slate-800 flex items-center justify-center flex-shrink-0">
              {institute?.profileImageUrl ? (
                <img
                  src={institute.profileImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#FF6A00] font-bold text-xs">
                  {institute?.instituteName?.charAt(0)?.toUpperCase() || "I"}
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
                  Academy console
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
                        setActiveMenu("Dashboard");
                        setSidebarOpen(false);
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
                        section.items.includes(activeMenu)
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
                          key={item}
                          onClick={() => {
                            setActiveMenu(item);
                            setOpenMenu(null);
                            setSidebarOpen(false);
                          }}
                          className={`
                            block w-full text-left
                            px-3 py-2.5 min-h-[40px]
                            rounded-lg text-[13px]
                            transition duration-200
                            ${
                              activeMenu === item
                                ? "bg-white/10 text-[#FF6A00] font-semibold"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }
                          `}
                        >
                          {menuDisplayName(item)}
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
                ["Terms & Conditions", "Terms & Conditions"],
                ["Privacy Policy", "Privacy Policy"],
                ["ResetPassword", "Reset Password"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    setTimeout(() => setActiveMenu(key), 200);
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
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => setShowDeleteModal(true), 200);
                }}
                className="w-full text-left text-red-400 hover:text-red-300 font-semibold flex items-center gap-2 px-3 py-2.5 min-h-[40px] rounded-xl hover:bg-red-500/10 transition text-[13px] mt-1"
              >
                <img src="/delete-icon.png" alt="" className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* BOTTOM INSTITUTE CARD */}
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-[#0B1220]">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 px-3 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#FF6A00]/50 bg-slate-700 shrink-0">
                {institute?.profileImageUrl ? (
                  <img
                    src={institute.profileImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#FF6A00] font-bold">
                    {institute?.instituteName?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">
                  {institute?.instituteName || "Your Academy"}
                </p>
                <p className="text-[11px] text-slate-400">Owner</p>
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
                activeMenu === "Dashboard" ||
                activeMenu === "Customers Attendance" ||
                activeMenu === "Customer & Management Settings" ||
                activeMenu === "Edit My Account" ||
                activeMenu === "Time Table" ||
                activeMenu === "Paid Recipets" ||
                activeMenu === "Daily Bill"
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
                activeMenu === "Dashboard" ||
                activeMenu === "Customers Attendance" ||
                activeMenu === "Customer & Management Settings" ||
                activeMenu === "Edit My Account" ||
                activeMenu === "Time Table" ||
                activeMenu === "Paid Recipets" ||
                activeMenu === "Daily Bill"
                  ? "h-full min-h-0 flex flex-col overflow-hidden dash-page-in"
                  : "dash-page-in md:pt-1"
              }
            >
              {renderMainContent()}
            </div>
          </div>
        </main>

        {/* DELETE CONFIRM MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
            <div className="bg-white w-full sm:w-[95%] max-w-xl rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 relative text-center shadow-2xl animate-slideUp sm:animate-moreFadeUp">
              <button
                type="button"
                onClick={handleDeleteClick}
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

export default InstituteDashboard;
