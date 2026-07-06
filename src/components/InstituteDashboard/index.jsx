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
import ComplaintHistory from "./ComplaintHistory";
import ResetPassword from "./ResetPassword";
import KYC from "./KYC";
import BookingsList from "./BookingsList";
import AddSportsFacilitiesPage from "./AddSportsFacilitiesPage";
import RegisterNumber from "./RegisterNumber";
import {
  FaUsers,
  FaUserTie,
  FaCogs,
  FaChartBar,
  FaTachometerAlt,
  FaChevronDown,
  FaChevronRight,
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
      "Fees Details",
      "Performance Reports",
    ],
  },
  {
    title: "Management",
    icon: "management",
    items: ["Management Attendance", "Management Details", "Salary Details"],
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
  const toggleMenu = (title) => {
    setOpenMenu(openMenu === title ? null : title);
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
        return <Reelsdata />;
      case "Time Table":
        return <Timetable />;
      case "Chat Box":
        return <ChatBox />;
      case "Edit My Account":
        return <MyAccountLayout />;
      case "Customer & Management Settings":
        return <MyAccountPage setActiveMenu={setActiveMenu} />;
      //case "BookingsList":
      //return <BookingsList />;
      //case "AddSportsFacilitiesPage":
      //return <AddSportsFacilitiesPage />;
      case "Paid Recipets":
        return <PaidRecipet />;
      //case "Payment & Subscription":
      //return <PaymentsSubscriptionPage />;
      case "Complete KYC":
        return <KYC />;
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
    <div className="fixed inset-0 bg-gray-100 md:bg-gray-200 md:pt-16">
      <div className="flex h-full flex-col md:flex-row overflow-hidden">
        {/* MOBILE TOPBAR */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-black z-[60] flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white text-2xl"
          >
            ☰
          </button>

          <h2 className="text-orange-500 font-bold">
            {institute?.instituteName || "Dashboard"}
          </h2>
        </div>

        {/* LEFT SIDEBAR */}
        <aside
          className={`
    fixed md:sticky
    top-0 md:top-16
    left-0
    h-screen md:h-full
    w-72 xl:w-80
    shrink-0
    bg-gray-700
    border-r border-gray-600
    z-[100]
    transform transition-transform duration-300
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `}
        >
          <div className="md:hidden flex justify-end mb-3">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white text-2xl"
            >
              ✕
            </button>
          </div>
          <div className="h-full overflow-y-auto pr-2">
            {/* ===== INSTITUTE CARD ===== */}
            {/* ===== INSTITUTE CARD ===== */}
            <div className="bg-black rounded-2xl px-5 py-4 flex items-center gap-4 mb-4 shadow-lg">
              {/* PROFILE IMAGE */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-orange-400 shadow-md">
                  {institute?.profileImageUrl ? (
                    <img
                      src={institute.profileImageUrl}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-orange-400 font-bold text-lg sm:text-xl">
                        {institute?.instituteName?.charAt(0)?.toUpperCase() ||
                          "I"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* INSTITUTE NAME */}
              <div className="flex-1 min-w-0">
                <h2 className="text-orange-500 font-bold text-base sm:text-lg md:text-xl break-words text-center md:text-left leading-snug">
                  {institute?.instituteName || "Institute Name"}
                </h2>
              </div>
            </div>

            {/* ===== MENU CARD ===== */}
            <div className="bg-black rounded-2xl p-4 mb-4 shadow-lg">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  {/* MAIN MENU */}
                  <button
                    onClick={() => {
                      if (section.title === "Dashboard") {
                        setActiveMenu("Dashboard");
                        setSidebarOpen(false); // ✅ ADD THIS
                      } else {
                        toggleMenu(section.title);
                      }
                    }}
                    className="
w-full
flex
items-center
justify-between
px-4
py-3
rounded-xl
text-white
transition
duration-200
hover:bg-gray-800
"
                  >
                    <div className="flex items-center gap-3">
                      {getIcon(section.icon)}
                      {section.title}
                    </div>

                    {section.items.length > 0 &&
                      (openMenu === section.title ? (
                        <FaChevronDown />
                      ) : (
                        <FaChevronRight />
                      ))}
                  </button>

                  {/* DROPDOWN ITEMS */}
                  {openMenu === section.title && (
                    <div className="ml-8 mt-1 space-y-1">
                      {section.items.map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setActiveMenu(item);
                            setOpenMenu(null);
                            setSidebarOpen(false);
                          }}
                          className="
block
w-full
text-left
px-3
py-2
rounded-lg
text-gray-300
hover:bg-gray-800
hover:text-orange-500
transition
"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ===== SETTINGS CARD ===== */}
            <div className="bg-black rounded-2xl p-4 shadow-lg">
              <h3 className="text-white font-bold text-lg mb-3">Settings</h3>

              <button
                onClick={() => setActiveMenu("Terms & Conditions")}
                className={`block w-full text-left py-2 ${
                  activeMenu === "Terms & Conditions"
                    ? "text-orange-500 font-semibold"
                    : "text-white hover:text-orange-400"
                }`}
              >
                Terms & Conditions
              </button>

              <button
                onClick={() => setActiveMenu("Privacy Policy")}
                className={`block w-full text-left py-2 ${
                  activeMenu === "Privacy Policy"
                    ? "text-orange-500 font-semibold"
                    : "text-white hover:text-orange-400"
                }`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setActiveMenu("ResetPassword")}
                className={`block w-full text-left py-2 ${
                  activeMenu === "ResetPassword"
                    ? "text-orange-500 font-semibold"
                    : "text-white hover:text-orange-400"
                }`}
              >
                Reset Password
              </button>

              <button
                onClick={() => signOut(auth)}
                className="block w-full text-left py-2 text-white hover:text-red-400"
              >
                Logout
              </button>
            </div>
            <div className="bg-black rounded-xl p-4 mt-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full text-left text-red-500 hover:text-red-400 font-semibold flex items-center gap-2"
              >
                <img src="/delete-icon.png" alt="delete" className="w-5 h-5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </aside>

        <main
          ref={mainContentRef}
          className="
flex-1
min-w-0
h-full
bg-gray-100
mt-14
md:mt-0
overflow-hidden
"
        >
          <div
            className="
      h-full
      overflow-y-auto
      overflow-x-hidden
      w-full
     max-w-[1600px]
      mx-auto
      px-4
      sm:px-6
      md:px-8
      lg:px-10
      xl:px-12
      py-6
      md:py-8
    "
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {renderMainContent()}
          </div>
        </main>

        {/* DELETE CONFIRM MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white w-[95%] max-w-xl rounded-lg p-8 relative text-center">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 text-2xl"
              >
                ✕
              </button>

              <h2 className="text-3xl font-bold text-red-600 mb-4">
                Delete Account ?
              </h2>

              <p className="text-gray-600 mb-2">
                Are you sure you want delete your account ?
              </p>

              <p className="text-gray-500 mb-2">
                This action cannot be undone and all your data will be
                permanently removed after 60 days
              </p>

              <p className="text-green-600 mb-6 font-medium">
                You can re-activate your account within 60 days
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2 bg-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-6 py-2 bg-red-600 text-white rounded-md"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
        {/* DELETE SUCCESS MODAL */}
        {showDeletedSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white w-[95%] max-w-3xl min-h-[450px] rounded-lg relative flex flex-col items-center justify-center">
              <button
                onClick={() => {
                  setShowDeletedSuccess(false);
                  navigate("/");
                }}
                className="absolute top-6 right-6 text-3xl"
              >
                ✕
              </button>

              <img
                src="/delete-success.png"
                alt="deleted"
                className="w-64 mb-8"
              />

              <h2 className="text-3xl font-semibold text-black text-center">
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
