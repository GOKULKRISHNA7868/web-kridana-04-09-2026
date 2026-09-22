import React, { useEffect, useMemo, useState } from "react";

import {
  Search,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Users,
} from "lucide-react";

import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getDashboardGreeting } from "../../utils/dashboardGreeting";
import {
  isPersonCurrentlyActive,
  isPersonLeft,
} from "../../utils/personStatus";

import { collection, query, where, getDocs } from "firebase/firestore";

const StatusBadge = ({ status }) => {
  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold whitespace-nowrap">
        <CheckCircle2 size={10} />
        Paid
      </span>
    );
  }

  if (status === "Partial") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold whitespace-nowrap">
        <Clock3 size={10} />
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-semibold whitespace-nowrap">
      <AlertCircle size={10} />
      Pending
    </span>
  );
};

const getPrimarySport = (student) => {
  const sport = Array.isArray(student.sports) ? student.sports[0] : null;
  return {
    subCategory:
      student.subCategory || sport?.subCategory || sport?.category || "-",
    belt: student.belt || sport?.belt || sport?.skillLevel || "-",
    sessions: student.sessions || sport?.sessions || sport?.session || "-",
  };
};

const avatarUrl = (student) =>
  student.profileImageUrl ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${student.firstName || "S"}+${student.lastName || ""}`,
  )}&background=FFF1E8&color=FF6A00&size=64`;

const PerformanceDashboard = () => {
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const studentsSnap = await getDocs(
          query(
            collection(db, "students"),
            where("instituteId", "==", user.uid),
          ),
        );

        setStudents(
          studentsSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );

        const feeSnap = await getDocs(
          query(
            collection(db, "studentFees"),
            where("instituteId", "==", user.uid),
          ),
        );

        setFees(
          feeSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
      } catch (error) {
        console.log(error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const tableData = useMemo(() => {
    return students.map((student) => {
      const fee = fees.find((f) => f.studentId === student.id);
      const totalAmount = Number(fee?.totalAmount || student.monthlyFee || 0);
      const paidAmount = Number(fee?.paidAmount || 0);
      const pendingAmount = Math.max(0, totalAmount - paidAmount);

      let paymentStatus = "Pending";
      if (pendingAmount <= 0 && totalAmount > 0) paymentStatus = "Paid";
      else if (paidAmount > 0) paymentStatus = "Partial";

      return {
        ...student,
        totalAmount,
        paidAmount,
        pendingAmount,
        paymentStatus,
      };
    });
  }, [students, fees]);

  const branches = useMemo(() => {
    const list = tableData.map((s) => s.branch || "Unknown");
    return ["All", ...new Set(list)];
  }, [tableData]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tableData.filter((student) => {
      const fullName = `${student.firstName || ""} ${
        student.lastName || ""
      }`.toLowerCase();

      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        String(student.phone || "").includes(q) ||
        String(student.email || "")
          .toLowerCase()
          .includes(q) ||
        String(student.registernumber || "")
          .toLowerCase()
          .includes(q);

      const matchesBranch =
        branchFilter === "All" || student.branch === branchFilter;

      let matchesStatus = true;
      if (statusFilter === "Active") {
        matchesStatus = isPersonCurrentlyActive(student);
      } else if (statusFilter === "Left") {
        matchesStatus = isPersonLeft(student);
      }

      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [tableData, search, branchFilter, statusFilter]);

  const paidCount = useMemo(
    () => filteredStudents.filter((s) => s.paymentStatus === "Paid").length,
    [filteredStudents],
  );
  const pendingCount = useMemo(
    () =>
      filteredStudents.filter((s) => s.paymentStatus !== "Paid").length,
    [filteredStudents],
  );

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-[#f5f6f8] rounded-xl lg:rounded-2xl overflow-hidden">
      {/* Compact toolbar — maximize table height */}
      <div className="shrink-0 px-2 sm:px-3 lg:px-4 pt-2 pb-1.5 space-y-1.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
          {/* Title strip */}
          <div className="flex items-center justify-between gap-2 min-w-0 lg:min-w-[200px] xl:min-w-[240px]">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium leading-none">
                {getDashboardGreeting()}
              </p>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight mt-0.5">
                Students
              </h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                <Users size={11} className="text-[#FF6A00]" />
                {filteredStudents.length}
              </span>
              <span className="hidden sm:inline-flex rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
                {paidCount} paid
              </span>
              <span className="hidden sm:inline-flex rounded-md bg-red-50 text-red-600 px-1.5 py-0.5 text-[10px] font-semibold">
                {pendingCount} due
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search name, phone, email, reg. no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
            />
          </div>

          {/* Status pills */}
          <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg bg-gray-200/80 shrink-0 lg:w-[200px]">
            {["Active", "Left", "All"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatusFilter(item)}
                className={`h-7 rounded-md text-[11px] font-semibold transition ${
                  statusFilter === item
                    ? "bg-[#FF6A00] text-white shadow-sm"
                    : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Branches — compact chips */}
        <div className="overflow-x-auto scrollbar-hide -mx-0.5 px-0.5">
          <div className="flex gap-1 min-w-max">
            {branches.map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => setBranchFilter(branch)}
                className={`h-6 px-2 rounded-md text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition active:scale-[0.98] ${
                  branchFilter === branch
                    ? "bg-[#FF6A00] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200"
                }`}
              >
                {branch}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-gray-400 leading-snug hidden sm:block">
          Active list is current members. Open Left for alumni — fee history
          stays on past months.
        </p>
      </div>

      {/* Table fills remaining height */}
      <div className="flex-1 min-h-0 px-2 sm:px-3 lg:px-4 pb-2 lg:pb-3">
        <div className="h-full min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="shrink-0 h-8 px-2.5 sm:px-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-[#fafafa]">
            <p className="text-[11px] font-semibold text-gray-700">
              Directory
            </p>
            <p className="text-[10px] text-gray-400">
              {filteredStudents.length} shown
              {statusFilter !== "All" ? ` · ${statusFilter}` : ""}
              {branchFilter !== "All" ? ` · ${branchFilter}` : ""}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
            {loading ? (
              <div className="p-2 space-y-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-md dash-shimmer"
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-2">
                  <Search size={18} className="text-[#FF6A00]" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  No students found
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Try another search, branch, or status filter.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile / tablet compact cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {filteredStudents.map((student) => {
                    const sport = getPrimarySport(student);
                    return (
                      <div
                        key={student.id}
                        className="px-2.5 py-2 flex gap-2.5 items-start hover:bg-orange-50/40"
                      >
                        <img
                          src={avatarUrl(student)}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {student.registernumber || "No reg. no"}
                                {student.branch ? ` · ${student.branch}` : ""}
                              </p>
                            </div>
                            <StatusBadge status={student.paymentStatus} />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                            <span className="truncate max-w-[140px]">
                              {sport.subCategory}
                            </span>
                            <span>·</span>
                            <span>{sport.belt}</span>
                            <span>·</span>
                            <span>{sport.sessions}</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-2 min-w-0 text-gray-500">
                              <span className="inline-flex items-center gap-0.5 truncate">
                                <Phone size={10} className="shrink-0" />
                                {student.phone || "-"}
                              </span>
                            </div>
                            <div className="shrink-0 font-semibold tabular-nums">
                              <span className="text-gray-700">
                                ₹{student.totalAmount}
                              </span>
                              <span className="text-gray-300 mx-1">|</span>
                              <span className="text-emerald-600">
                                ₹{student.paidAmount}
                              </span>
                              <span className="text-gray-300 mx-1">|</span>
                              <span className="text-red-500">
                                ₹{student.pendingAmount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop dense table */}
                <div className="hidden lg:block min-w-0">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-20 bg-[#FFF7F0] shadow-[inset_0_-1px_0_#f3e8de]">
                      <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                        <th className="px-2 py-1.5 font-semibold w-10" />
                        <th className="px-2 py-1.5 font-semibold">Name</th>
                        <th className="px-2 py-1.5 font-semibold">Contact</th>
                        <th className="px-2 py-1.5 font-semibold">Branch</th>
                        <th className="px-2 py-1.5 font-semibold">Sport</th>
                        <th className="px-2 py-1.5 font-semibold">Belt</th>
                        <th className="px-2 py-1.5 font-semibold">Session</th>
                        <th className="px-2 py-1.5 font-semibold text-right">
                          Fee
                        </th>
                        <th className="px-2 py-1.5 font-semibold text-right">
                          Paid
                        </th>
                        <th className="px-2 py-1.5 font-semibold text-right">
                          Due
                        </th>
                        <th className="px-2 py-1.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const sport = getPrimarySport(student);
                        return (
                          <tr
                            key={student.id}
                            className="border-b border-gray-50 hover:bg-orange-50/50 transition-colors"
                          >
                            <td className="px-2 py-1">
                              <img
                                src={avatarUrl(student)}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1 min-w-[140px]">
                              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {student.registernumber || "—"}
                              </p>
                            </td>
                            <td className="px-2 py-1 min-w-[150px]">
                              <p className="text-[11px] text-gray-700 flex items-center gap-1 truncate">
                                <Phone size={10} className="text-gray-400 shrink-0" />
                                {student.phone || "—"}
                              </p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate max-w-[180px]">
                                <Mail size={10} className="shrink-0" />
                                {student.email || "—"}
                              </p>
                            </td>
                            <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                              {student.branch || "—"}
                            </td>
                            <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap max-w-[120px] truncate">
                              {sport.subCategory}
                            </td>
                            <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                              {sport.belt}
                            </td>
                            <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                              {sport.sessions}
                            </td>
                            <td className="px-2 py-1 text-[11px] font-semibold text-gray-800 text-right tabular-nums whitespace-nowrap">
                              ₹{student.totalAmount}
                            </td>
                            <td className="px-2 py-1 text-[11px] font-semibold text-emerald-600 text-right tabular-nums whitespace-nowrap">
                              ₹{student.paidAmount}
                            </td>
                            <td className="px-2 py-1 text-[11px] font-semibold text-red-500 text-right tabular-nums whitespace-nowrap">
                              ₹{student.pendingAmount}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <StatusBadge status={student.paymentStatus} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
