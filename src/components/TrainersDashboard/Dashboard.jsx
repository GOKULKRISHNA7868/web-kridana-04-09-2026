import React, { useEffect, useMemo, useState } from "react";

import {
  Settings,
  Search,
  Phone,
  Mail,
  Eye,
  IndianRupee,
  Users,
  BadgeCheck,
  UserPlus,
  X,
} from "lucide-react";

import { db } from "../../firebase";

import { useAuth } from "../../context/AuthContext";

import { collection, query, where, getDocs } from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import { getDashboardGreeting } from "../../utils/dashboardGreeting";

const TrainerDashboard = ({ setView }) => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const [showAddPrompt, setShowAddPrompt] = useState(true);

  const [students, setStudents] = useState([]);

  const [fees, setFees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [stats, setStats] = useState({
    totalStudents: 0,
    newStudents: 0,
    totalFees: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  // =========================================================
  // FETCH DATA
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // =====================================================
        // STUDENTS
        // =====================================================
        const studentSnap = await getDocs(
          query(
            collection(db, "trainerstudents"),
            where("trainerId", "==", user.uid),
          ),
        );

        const studentsData = studentSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStudents(studentsData);

        // =====================================================
        // FEES
        // =====================================================
        const feeSnap = await getDocs(
          query(
            collection(db, "institutesFees"),
            where("trainerId", "==", user.uid),
          ),
        );

        const feesData = feeSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFees(feesData);

        // =====================================================
        // TOTAL FEES
        // =====================================================
        let totalFees = 0;

        studentsData.forEach((student) => {
          if (Array.isArray(student.sports) && student.sports.length > 0) {
            student.sports.forEach((sport) => {
              totalFees += Number(sport.fee || 0);
            });
          } else {
            totalFees += Number(student.monthlyFee || 0);
          }
        });

        // =====================================================
        // PAID
        // =====================================================
        let paidAmount = 0;

        feesData.forEach((fee) => {
          paidAmount += Number(fee.paidAmount || 0);
        });

        // =====================================================
        // PENDING
        // =====================================================
        const pendingAmount = totalFees - paidAmount;

        // =====================================================
        // NEW STUDENTS
        // =====================================================
        const newStudents = studentsData.filter((student) => {
          const joinDate = new Date(student.joiningDate);

          const now = new Date();

          const diffDays = (now - joinDate) / (1000 * 60 * 60 * 24);

          return diffDays <= 30;
        }).length;

        // =====================================================
        // STATS
        // =====================================================
        setStats({
          totalStudents: studentsData.length,
          newStudents,
          totalFees,
          paidAmount,
          pendingAmount,
        });
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // =========================================================
  // SEARCH FILTER
  // =========================================================
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const text = `
        ${student.firstName}
        ${student.lastName}
        ${student.phone}
        ${student.email}
        ${student.registerNumber}
        ${student.category}
        ${student.subCategory}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [students, search]);

  const goToAddCustomer = () => {
    setShowAddPrompt(false);
    if (typeof setView === "function") {
      setView("addStudent");
      return;
    }
    navigate("/trainers/dashboard");
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="h-full bg-[#F4F6FB] flex flex-col overflow-hidden rounded-2xl">
        <div className="flex-shrink-0 bg-white/95 border-b border-orange-100 px-3 py-3">
          <div className="h-4 w-40 rounded-lg dash-shimmer" />
          <div className="h-3 w-28 rounded-lg dash-shimmer mt-2" />
        </div>
        <div className="p-3 space-y-3 flex-1">
          <div className="h-12 rounded-2xl dash-shimmer" />
          <div className="h-40 rounded-2xl dash-shimmer" />
          <div className="h-40 rounded-2xl dash-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 bg-[#F4F6FB] flex flex-col overflow-hidden rounded-2xl">
      <div className="flex-shrink-0 bg-gradient-to-br from-[#FF6A00] via-[#FF7A1A] to-[#FF9A4A] px-3 py-3.5 sm:px-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/15 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user?.photoURL || "https://ui-avatars.com/api/?name=Trainer"}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border-2 border-white/40 shadow-sm"
            />

            <div className="min-w-0">
              <p className="text-orange-100 text-[11px] font-medium tracking-wide">
                {getDashboardGreeting(user?.displayName)}
              </p>
              <h1 className="font-bold text-sm sm:text-base text-white truncate">
                Trainer Dashboard
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-3 pt-2.5 pb-1 sm:px-4 flex flex-col gap-2.5">
        {/* ===================================================
      SEARCH
  =================================================== */}
        <div className="dash-card p-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
            <Search size={16} className="text-gray-400 shrink-0" />

            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none bg-transparent text-sm"
            />
          </div>
        </div>

        {/* ===================================================
      STUDENTS TABLE
  =================================================== */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="px-3 py-2.5 bg-[#FF6A00] flex-shrink-0">
            <h2 className="text-white font-bold text-sm sm:text-base">
              Students List
            </h2>
          </div>

          {/* ONLY STUDENTS AREA SCROLLS */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Horizontal + vertical student area */}
            <div
              className="
      h-full
      w-full
      overflow-x-auto
      overflow-y-auto
      overscroll-contain
    "
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x pan-y",
              }}
            >
              <table className="w-full min-w-[1100px]">
                <thead className="sticky top-0 z-20 bg-orange-50">
                  <tr className="text-left">
                    <Th>Photo</Th>
                    <Th>Name</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>Register No</Th>
                    <Th>Category</Th>
                    <Th>Sport</Th>
                    <Th>Session</Th>
                    <Th>Timing</Th>
                    <Th>Fee</Th>
                    <Th>Joining</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-0">
                        <div className="min-w-[320px] py-10 px-6 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                            <UserPlus size={26} />
                          </div>
                          <p className="mt-3 text-base font-bold text-gray-800">
                            No customers yet
                          </p>
                          <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Add your first student to start attendance, fees
                            and training on Kridana.
                          </p>
                          <button
                            type="button"
                            onClick={goToAddCustomer}
                            className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold active:scale-95"
                          >
                            Add your customers
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="text-center py-10 text-gray-500"
                      >
                        No students found — try a different search
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const sport = student.sports?.[0] || {};

                      return (
                        <tr
                          key={student.id}
                          className={`border-b ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {/* PHOTO */}
                          <Td>
                            <img
                              src={student.profileImageUrl}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover border"
                            />
                          </Td>

                          {/* NAME */}
                          <Td>
                            <div className="font-semibold">
                              {student.firstName} {student.lastName}
                            </div>

                            <div className="text-xs text-gray-500">
                              {student.gender}
                            </div>
                          </Td>

                          {/* PHONE */}
                          <Td>
                            <div className="flex items-center gap-2">
                              <Phone size={14} />

                              {student.phone}
                            </div>
                          </Td>

                          {/* EMAIL */}
                          <Td>
                            <div className="flex items-center gap-2">
                              <Mail size={14} />

                              <span className="break-all">{student.email}</span>
                            </div>
                          </Td>

                          {/* REGISTER */}
                          <Td>{student.registerNumber}</Td>

                          {/* CATEGORY */}
                          <Td>{student.category}</Td>

                          {/* SPORT */}
                          <Td>{student.subCategory || sport.subCategory}</Td>

                          {/* SESSION */}
                          <Td>{student.sessions}</Td>

                          {/* TIMING */}
                          <Td>{student.timings || sport.timings}</Td>

                          {/* FEE */}
                          <Td>₹{student.monthlyFee || sport.fee || 0}</Td>

                          {/* JOINING */}
                          <Td>{student.joiningDate}</Td>

                          {/* STATUS */}
                          <Td>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                student.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {student.status || "Active"}
                            </span>
                          </Td>

                          {/* ACTIONS */}
                          <Td>
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${student.phone}`}
                                className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs"
                              >
                                Call
                              </a>
                            </div>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===================================================
            FEES TABLE
        =================================================== */}
      </div>

      {showAddPrompt && students.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            style={{
              paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="px-5 pt-4 pb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddPrompt(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                <UserPlus size={26} />
              </div>
              <h2 className="mt-3 text-lg font-bold text-gray-900">
                Add your customers
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Your dashboard is ready. Add students to manage attendance,
                fees and training from one place.
              </p>
              <button
                type="button"
                onClick={goToAddCustomer}
                className="mt-5 w-full min-h-[48px] rounded-xl bg-[#FF6A00] text-white font-semibold active:scale-[0.99]"
              >
                Add customers
              </button>
              <button
                type="button"
                onClick={() => setShowAddPrompt(false)}
                className="mt-2 w-full min-h-[40px] text-sm font-medium text-gray-500"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// TABLE HEADER
// =========================================================
const Th = ({ children }) => {
  return (
    <th className="px-3 py-2.5 text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">
      {children}
    </th>
  );
};

// =========================================================
// TABLE DATA
// =========================================================
const Td = ({ children, className = "" }) => {
  return (
    <td className={`px-3 py-2.5 text-sm whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
};

// =========================================================
// SUMMARY TABLE ROW
// =========================================================
const TableRow = ({ icon, label, value, valueColor }) => {
  return (
    <tr className="border-b">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 text-[#FF6A00] p-2 rounded-xl">
            {icon}
          </div>

          <span className="font-medium">{label}</span>
        </div>
      </td>

      <td
        className={`px-4 py-4 text-right font-bold ${
          valueColor || "text-black"
        }`}
      >
        {value}
      </td>
    </tr>
  );
};

export default TrainerDashboard;
