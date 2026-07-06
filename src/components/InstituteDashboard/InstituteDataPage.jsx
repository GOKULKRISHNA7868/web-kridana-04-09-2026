import React, { useEffect, useMemo, useState } from "react";

import {
  Search,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";

import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

import { collection, query, where, getDocs } from "firebase/firestore";

const PerformanceDashboard = () => {
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");

  // ================= FETCH DATA =================
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // ================= STUDENTS =================
        const studentsSnap = await getDocs(
          query(
            collection(db, "students"),
            where("instituteId", "==", user.uid),
          ),
        );

        const studentsData = studentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setStudents(studentsData);

        // ================= FEES =================
        const feeSnap = await getDocs(
          query(
            collection(db, "studentFees"),
            where("instituteId", "==", user.uid),
          ),
        );

        const feesData = feeSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFees(feesData);
      } catch (error) {
        console.log(error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // ================= COMBINE STUDENT + FEES =================
  const tableData = useMemo(() => {
    return students.map((student) => {
      const fee = fees.find((f) => f.studentId === student.id);

      const totalAmount = Number(fee?.totalAmount || student.monthlyFee || 0);

      const paidAmount = Number(fee?.paidAmount || 0);

      const pendingAmount = totalAmount - paidAmount;

      let paymentStatus = "Pending";

      if (pendingAmount <= 0) {
        paymentStatus = "Paid";
      } else if (paidAmount > 0) {
        paymentStatus = "Partial";
      }

      return {
        ...student,
        totalAmount,
        paidAmount,
        pendingAmount,
        paymentStatus,
      };
    });
  }, [students, fees]);

  // ================= BRANCHES =================
  const branches = useMemo(() => {
    const list = tableData.map((s) => s.branch || "Unknown");

    return ["All", ...new Set(list)];
  }, [tableData]);

  // ================= FILTER =================
  const filteredStudents = useMemo(() => {
    return tableData.filter((student) => {
      const fullName = `${student.firstName || ""} ${
        student.lastName || ""
      }`.toLowerCase();

      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        student.phone?.includes(search) ||
        student.email?.toLowerCase().includes(search.toLowerCase()) ||
        student.registernumber?.toLowerCase().includes(search.toLowerCase());

      const matchesBranch =
        branchFilter === "All" || student.branch === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [tableData, search, branchFilter]);

  // ================= STATUS UI =================
  const StatusBadge = ({ status }) => {
    if (status === "Paid") {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold whitespace-nowrap">
          <CheckCircle2 size={12} />
          Paid
        </div>
      );
    }

    if (status === "Partial") {
      return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-semibold whitespace-nowrap">
          <Clock3 size={12} />
          Partial
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold whitespace-nowrap">
        <AlertCircle size={12} />
        Pending
      </div>
    );
  };

  return (
    <div
      className="
    h-full
    w-full
    flex
    flex-col
    bg-gray-50
    rounded-2xl
    overflow-hidden
  "
    >
      {/* ================= FIXED TOP SECTION ================= */}
      <div className="shrink-0 px-3 md:px-5 pt-4">
        {/* ================= HEADER ================= */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-black">Students Dashboard</h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage all students and payment details
          </p>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="bg-white rounded-2xl shadow-sm p-3 mb-4">
          {/* SEARCH */}
          <div className="relative mb-3">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                pl-10
                pr-4
                py-3
                border
                border-gray-200
                rounded-xl
                text-sm
                outline-none
                focus:border-orange-500
              "
            />
          </div>

          {/* BRANCH FILTER */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-1">
              {branches.map((branch, index) => (
                <button
                  key={index}
                  onClick={() => setBranchFilter(branch)}
                  className={`
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                    font-semibold
                    whitespace-nowrap
                    transition
                    active:scale-95
                    ${
                      branchFilter === branch
                        ? "bg-[#FF6A00] text-white"
                        : "bg-gray-100 text-gray-700"
                    }
                  `}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABLE SECTION ONLY SCROLLABLE ================= */}
      <div
        className="
    flex-1
    min-h-0
    px-3
    md:px-5
    pb-[170px]
    md:pb-6
  "
      >
        <div
          className="
            bg-white
            rounded-2xl
            shadow-sm
            h-full
            flex
            flex-col
            overflow-hidden
          "
        >
          {/* TABLE HEADER */}
          <div className="px-4 py-4 border-b bg-white shrink-0">
            <h2 className="font-bold text-lg">Students Table</h2>

            <p className="text-sm text-gray-500 mt-1">
              Total Records: {filteredStudents.length}
            </p>
          </div>

          {/* ================= TABLE SCROLL AREA ================= */}
          <div
            className="
              flex-1
              min-h-0
              overflow-auto
              overscroll-contain
              touch-pan-x
              touch-pan-y
            "
          >
            {loading ? (
              <div className="p-4 space-y-3">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-40 bg-gray-100 rounded-2xl animate-pulse"
                    />
                  ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                No Students Found
              </div>
            ) : (
              <div className="min-w-[1150px]">
                <table className="w-full border-collapse">
                  {/* ================= STICKY TABLE HEADER ================= */}
                  <thead className="sticky top-0 z-20 bg-[#FFF1E8]">
                    <tr className="text-left text-xs text-gray-700">
                      <th className="px-3 py-3 whitespace-nowrap">Profile</th>

                      <th className="px-3 py-3 whitespace-nowrap">Name</th>

                      <th className="px-3 py-3 whitespace-nowrap">Phone</th>

                      <th className="px-3 py-3 whitespace-nowrap">Email</th>

                      <th className="px-3 py-3 whitespace-nowrap">Branch</th>

                      <th className="px-3 py-3 whitespace-nowrap">Sport</th>

                      <th className="px-3 py-3 whitespace-nowrap">Belt</th>

                      <th className="px-3 py-3 whitespace-nowrap">Session</th>

                      <th className="px-3 py-3 whitespace-nowrap">
                        Monthly Fee
                      </th>

                      <th className="px-3 py-3 whitespace-nowrap">Paid</th>

                      <th className="px-3 py-3 whitespace-nowrap">Pending</th>

                      <th className="px-3 py-3 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>

                  {/* ================= TABLE BODY ================= */}
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="
                          border-b
                          text-sm
                          bg-white
                        "
                      >
                        {/* PROFILE */}
                        <td className="px-3 py-3">
                          <img
                            src={
                              student.profileImageUrl ||
                              "https://ui-avatars.com/api/?name=Student"
                            }
                            alt="profile"
                            className="
                              w-12
                              h-12
                              rounded-full
                              object-cover
                            "
                          />
                        </td>

                        {/* NAME */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-semibold">
                            {student.firstName} {student.lastName}
                          </div>

                          <div className="text-xs text-gray-500">
                            {student.registernumber}
                          </div>
                        </td>

                        {/* PHONE */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Phone size={13} />

                            {student.phone || "-"}
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Mail size={13} />

                            <span>{student.email || "-"}</span>
                          </div>
                        </td>

                        {/* BRANCH */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {student.branch || "-"}
                        </td>

                        {/* SPORT */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {student.subCategory ||
                            student.sports?.[0]?.subCategory ||
                            "-"}
                        </td>

                        {/* BELT */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {student.belt || "-"}
                        </td>

                        {/* SESSION */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {student.sessions || "-"}
                        </td>

                        {/* MONTHLY */}
                        <td className="px-3 py-3 whitespace-nowrap font-semibold">
                          ₹{student.totalAmount}
                        </td>

                        {/* PAID */}
                        <td className="px-3 py-3 whitespace-nowrap text-green-600 font-semibold">
                          ₹{student.paidAmount}
                        </td>

                        {/* PENDING */}
                        <td className="px-3 py-3 whitespace-nowrap text-red-500 font-semibold">
                          ₹{student.pendingAmount}
                        </td>

                        {/* STATUS */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <StatusBadge status={student.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
