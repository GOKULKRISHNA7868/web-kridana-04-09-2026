import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { logStaffAction } from "../../utils/trainerAccess";
import { ChevronDown, Filter, X, Plus, Trash2 } from "lucide-react";

const newExtraId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const sumExtras = (extras = []) =>
  (Array.isArray(extras) ? extras : []).reduce(
    (sum, row) => sum + Number(row?.amount || 0),
    0,
  );

const computeMonthTotal = (baseFee, extras = []) =>
  Number(baseFee || 0) + sumExtras(extras);
const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const YEARS = Array.from({ length: 10 }, (_, i) =>
  (new Date().getFullYear() - 5 + i).toString(),
);

const FeesDetailsPage = ({ instituteId: overrideId, actor = null } = {}) => {
  const instituteId = overrideId || auth.currentUser?.uid;

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedBranch, setSelectedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);
  const listScrollRef = useRef(null);
  const listScrollTopRef = useRef(0);
  const [selectedSport, setSelectedSport] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [editData, setEditData] = useState({
    baseFee: "",
    extras: [],
    totalFee: "",
    paidAmount: "",
    paidDate: "",
    waiveReason: "",
    feeWaived: false,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "students"),
      where("instituteId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const nameA = `${a.firstName || ""} ${
            a.lastName || ""
          }`.toLowerCase();
          const nameB = `${b.firstName || ""} ${
            b.lastName || ""
          }`.toLowerCase();

          return nameA.localeCompare(nameB);
        });

      setStudents(list);
    });
  }, [instituteId]);

  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "studentFees"),
      where("instituteId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      setFees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [instituteId]);
  const categories = [
    ...new Set(
      students.flatMap((s) => (s.sports || []).map((sp) => sp.category)),
    ),
  ];
  const subCategories = [
    ...new Set(
      students
        .flatMap((s) => s.sports || [])
        .filter((sp) => !selectedCategory || sp.category === selectedCategory)
        .map((sp) => sp.subCategory),
    ),
  ];
  const branches = useMemo(() => {
    return [
      ...new Set(
        students.map((s) => s.branch).filter((b) => b && b.trim() !== ""),
      ),
    ];
  }, [students]);
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedBranch && s.branch !== selectedBranch) {
        return false;
      }
      if (!selectedMonth || !selectedYear) return true;

      const selectedDate = new Date(
        Number(selectedYear),
        Number(selectedMonth) - 1,
        1,
      );

      if (s.joiningDate) {
        const joiningDate = new Date(s.joiningDate);
        if (
          selectedDate <
          new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1)
        ) {
          return false;
        }
      }

      if (s.leftDate) {
        const leftDate = s.leftDate?.toDate?.() || new Date(s.leftDate);
        const leftMonthDate = new Date(
          leftDate.getFullYear(),
          leftDate.getMonth(),
          1,
        );
        if (selectedDate > leftMonthDate) {
          return false;
        }
      }

      if (s.status === "Left") {
        if (s.leftDate) {
          const leftDate = s.leftDate?.toDate?.() || new Date(s.leftDate);
          const leftMonthDate = new Date(
            leftDate.getFullYear(),
            leftDate.getMonth(),
            1,
          );
          if (selectedDate > leftMonthDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [students, search, selectedMonth, selectedYear, selectedBranch]);
  const filteredRows = useMemo(() => {
    let rows = [];

    filteredStudents.forEach((student) => {
      (student.sports || []).forEach((sport) => {
        if (selectedCategory && sport.category !== selectedCategory) {
          return;
        }

        if (selectedSubCategory && sport.subCategory !== selectedSubCategory) {
          return;
        }

        rows.push({
          student,
          sport,
        });
      });
    });

    return rows;
  }, [filteredStudents, selectedCategory, selectedSubCategory]);
  const handleEditPayment = (student, sport) => {
    if (!selectedMonth || !selectedYear) {
      alert("Please select month and year first!");
      return;
    }

    // Keep list scroll position — popup must not jump the page
    if (listScrollRef.current) {
      listScrollTopRef.current = listScrollRef.current.scrollTop;
    }

    setSelectedStudent(student);
    setSelectedSport(sport);

    const existingFee = fees.find(
      (f) =>
        f.studentId === student.id &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    const extras = Array.isArray(existingFee?.extras)
      ? existingFee.extras.map((e) => ({
          id: e.id || newExtraId(),
          note: e.note || e.label || "",
          amount: String(e.amount ?? ""),
        }))
      : [];
    const baseFee = String(
      existingFee?.baseFee ??
        (existingFee?.totalAmount != null && extras.length
          ? Number(existingFee.totalAmount) - sumExtras(extras)
          : sport.fee ?? 0),
    );
    const totalFee = String(
      existingFee?.totalAmount ?? computeMonthTotal(baseFee, extras),
    );

    setEditData({
      baseFee,
      extras,
      totalFee,
      paidAmount: existingFee?.paidAmount ?? "",
      paidDate: existingFee?.paidDate ?? "",
      feeWaived: existingFee?.feeWaived ?? false,
      waiveReason: existingFee?.waiveReason ?? "",
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudent(null);
    setSelectedSport(null);
    requestAnimationFrame(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = listScrollTopRef.current;
      }
    });
  };

  const updatePayment = async () => {
    if (!selectedStudent || !selectedSport) return;

    const extrasClean = (editData.extras || [])
      .map((e) => ({
        id: e.id || newExtraId(),
        note: String(e.note || "").trim(),
        amount: Number(e.amount || 0),
      }))
      .filter((e) => e.amount > 0 || e.note);

    const baseFee = Number(editData.baseFee || 0);
    const totalFee = computeMonthTotal(baseFee, extrasClean);
    const paidAmount = Number(editData.paidAmount || 0);
    const paidDate = editData.paidDate || "";

    try {
      const existingFee = fees.find(
        (f) =>
          f.studentId === selectedStudent.id &&
          f.category === selectedSport.category &&
          f.subCategory === selectedSport.subCategory &&
          f.month === `${selectedYear}-${selectedMonth}`,
      );

      const payload = {
        baseFee,
        extras: extrasClean,
        totalAmount: totalFee,
        paidAmount,
        paidDate,
        feeWaived: editData.feeWaived || false,
        waiveReason: editData.waiveReason || "",
        updatedAt: serverTimestamp(),
        lastEditedBy: actor?.trainerUid || instituteId,
        lastEditedByName: actor?.name || "Academy",
        lastEditedByRole: actor?.role || "institute",
      };

      if (existingFee) {
        await updateDoc(doc(db, "studentFees", existingFee.id), payload);
      } else {
        await setDoc(doc(collection(db, "studentFees")), {
          studentId: selectedStudent.id,
          instituteId,
          category: selectedSport.category,
          subCategory: selectedSport.subCategory,
          month: `${selectedYear}-${selectedMonth}`,
          createdAt: serverTimestamp(),
          ...payload,
        });
      }

      if (actor?.trainerUid) {
        await logStaffAction({
          instituteId,
          trainerUid: actor.trainerUid,
          trainerName: actor.name,
          action: "fee_update",
          page: "Fee details",
          details: `Updated fee for ${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`.trim(),
        });
      }

      alert("Payment saved successfully ✅");

      closeEditModal();
    } catch (error) {
      console.error(error);
      alert("Error saving payment ❌");
    }
  };
  const totalStudents = filteredRows.length;

  const totalAmount = filteredRows.reduce((sum, row) => {
    const record = fees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.totalAmount ?? row.sport.fee ?? 0);
  }, 0);

  const totalPaid = filteredRows.reduce((sum, row) => {
    const record = fees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.paidAmount ?? 0);
  }, 0);
  const totalPending = totalAmount - totalPaid;
  const getFeeData = (student, sport) => {
    const feeRecord = fees.find(
      (f) =>
        f.studentId === student.id &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    if (feeRecord?.feeWaived) {
      return {
        total: 0,
        paid: 0,
        pending: 0,
        paidDate: "-",
        reason: feeRecord.waiveReason || "Fee Waived",
      };
    }

    const total = Number(
      feeRecord?.totalAmount ??
        computeMonthTotal(
          feeRecord?.baseFee ?? sport.fee ?? 0,
          feeRecord?.extras || [],
        ),
    );
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";
    const extras = Array.isArray(feeRecord?.extras) ? feeRecord.extras : [];
    const extraTotal = sumExtras(extras);

    return {
      total,
      paid,
      pending,
      paidDate,
      reason: "",
      extras,
      extraTotal,
      lastEditedByName: feeRecord?.lastEditedByName || "",
    };
  };

  const StatCard = ({ title, value }) => (
    <div className="bg-[#FF6A00] text-white rounded-2xl p-4 sm:p-5 min-h-[10px] flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
      {/* Title */}
      <h3 className="text-[11px] sm:text-sm md:text-base font-medium text-white/90 leading-snug break-words">
        {title}
      </h3>

      {/* Value */}
      <p className="text-lg sm:text-2xl md:text-3xl font-bold mt-3 break-words leading-tight">
        {value}
      </p>
    </div>
  );
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
      {/* ================= FIXED TOP HEADER ================= */}
      <div
        className="
    sticky
    top-0
    z-20
    bg-white
    border-b
    shadow-sm
  "
      >
        <div className="p-4 space-y-4">
          {/* TITLE */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-800">Fees Details</h1>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl shadow"
              >
                <Filter size={18} />
                Filters
              </button>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex flex-wrap items-center gap-3">
              {/* Year */}
              <div ref={yearRef} className="relative w-32">
                <button
                  onClick={() => setShowYearDropdown(!showYearDropdown)}
                  className="bg-orange-500 text-white rounded-lg px-4 py-3 font-semibold w-full"
                >
                  {selectedYear}
                </button>

                {showYearDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {YEARS.map((y) => (
                      <div
                        key={y}
                        onClick={() => {
                          setSelectedYear(y);
                          setShowYearDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-orange-100 cursor-pointer"
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Month */}
              <div ref={monthRef} className="relative w-44">
                <button
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="bg-orange-500 text-white rounded-lg px-4 py-3 font-semibold w-full flex items-center justify-between"
                >
                  {selectedMonth
                    ? MONTHS.find((m) => m.value === selectedMonth)?.label
                    : "Select Month"}
                  <ChevronDown size={18} />
                </button>

                {showMonthDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {MONTHS.map((m) => (
                      <div
                        key={m.value}
                        onClick={() => {
                          setSelectedMonth(m.value);
                          setShowMonthDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-orange-100 cursor-pointer"
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Branch */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border px-4 py-3 rounded-lg"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>

              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className="border px-4 py-3 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              {/* Sub */}
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="border px-4 py-3 rounded-lg"
              >
                <option value="">All SubCategories</option>
                {subCategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Total Fees Amount" value={`₹ ${totalAmount}`} />
            <StatCard title="Total Fees Pending" value={`₹ ${totalPending}`} />
            <StatCard title="Total Fees Paid" value={`₹ ${totalPaid}`} />
            <StatCard title="Total Students" value={totalStudents} />
          </div>

          {/* SEARCH */}
          <div className="relative w-full sm:w-80">
            <img
              src="/search-icon.png"
              alt="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
            />

            <input
              type="text"
              placeholder="Search here..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-orange-400 rounded px-10 py-2 w-full focus:outline-none"
            />
          </div>
        </div>
      </div>
      {/* TABLE */}
      {/* ================= TABLE / MOBILE RESPONSIVE ================= */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={listScrollRef}
          className="h-full overflow-y-auto px-4 pb-28"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="bg-white rounded-xl shadow overflow-hidden mt-4">
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-8 bg-black text-orange-500 px-6 py-3 font-semibold text-sm sticky top-0 z-10">
                <div>Student</div>
                <div>Category</div>
                <div>SubCategory</div>
                <div className="text-center">Sessions</div>
                <div className="text-center">Total</div>
                <div className="text-center">Paid</div>
                <div className="text-center">Pending</div>
                <div className="text-center">Reason</div>
              </div>

              {filteredRows.map((row, index) => {
                const { student, sport } = row;
                const data = getFeeData(student, sport);

                return (
                  <div
                    key={`${student.id}-${sport.subCategory}`}
                    className="grid grid-cols-8 px-6 py-4 border-t items-center text-sm hover:bg-orange-50/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleEditPayment(student, sport)}
                      className="font-medium text-left text-slate-900 hover:text-[#FF6A00] truncate pr-2"
                    >
                      {index + 1}. {student.firstName} {student.lastName}
                    </button>

                    <div className="truncate">{sport.category}</div>
                    <div className="truncate">{sport.subCategory}</div>
                    <div className="text-center">{student.sessions || "-"}</div>

                    <button
                      type="button"
                      onClick={() => handleEditPayment(student, sport)}
                      className="text-center font-semibold text-slate-800 hover:text-[#FF6A00]"
                    >
                      ₹ {data.total}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditPayment(student, sport)}
                      className="text-center text-green-600 font-semibold hover:underline"
                    >
                      ₹ {data.paid}
                    </button>

                    <div className="text-center text-red-600 font-semibold">
                      ₹ {data.pending}
                    </div>

                    <div className="text-center flex items-center justify-center gap-2">
                      <div className="min-w-0 text-left">
                        <span className="truncate text-xs text-slate-500 block">
                          {data.reason || "—"}
                        </span>
                        {data.extraTotal > 0 ? (
                          <span className="text-[10px] font-semibold text-[#FF6A00]">
                            +₹{data.extraTotal} extras
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditPayment(student, sport)}
                        className="shrink-0 min-h-[32px] px-2.5 rounded-lg bg-[#FF6A00] text-white text-[11px] font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden divide-y">
              {filteredRows.map((row, index) => {
                const { student, sport } = row;
                const data = getFeeData(student, sport);

                return (
                  <div
                    key={`${student.id}-${sport.subCategory}`}
                    className="p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900">
                          {index + 1}. {student.firstName} {student.lastName}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                          {sport.category} • {sport.subCategory}
                        </p>
                      </div>

                      <span className="text-xs text-orange-600 px-2 py-1 rounded-full bg-orange-50 shrink-0 h-fit">
                        {student.sessions || 0} sess
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-slate-100">
                        <p className="text-[11px] text-gray-500">Total</p>
                        <p className="font-semibold text-sm">₹ {data.total}</p>
                      </div>

                      <div className="bg-green-50 rounded-xl p-2.5 text-center border border-green-100">
                        <p className="text-[11px] text-green-600">Paid</p>
                        <p className="font-semibold text-sm text-green-700">
                          ₹ {data.paid}
                        </p>
                      </div>

                      <div className="bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                        <p className="text-[11px] text-red-500">Pending</p>
                        <p className="font-semibold text-sm text-red-600">
                          ₹ {data.pending}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-xs gap-2">
                      <span className="text-gray-500 truncate">
                        {data.paidDate !== "-"
                          ? `Paid: ${data.paidDate}`
                          : "Not paid yet"}
                        {data.lastEditedByName
                          ? ` · ${data.lastEditedByName}`
                          : ""}
                      </span>

                      {data.extraTotal > 0 ? (
                        <span className="bg-orange-100 text-[#E85D04] px-2 py-1 rounded-full shrink-0 font-semibold">
                          +₹{data.extraTotal} extras
                        </span>
                      ) : data.reason ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full shrink-0">
                          {data.reason}
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditPayment(student, sport)}
                      className="mt-3 w-full min-h-[44px] rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
                    >
                      Update payment
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal — portaled above page scroll */}
      {showEditModal && selectedStudent && selectedSport && (
        <ModalForm
          title="Update payment"
          studentName={`${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`.trim()}
          sportLabel={`${selectedSport.category || ""} · ${selectedSport.subCategory || ""}`}
          monthLabel={
            selectedMonth
              ? `${MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth} ${selectedYear}`
              : selectedYear
          }
          data={editData}
          setData={setEditData}
          onSave={updatePayment}
          onClose={closeEditModal}
        />
      )}
      {/* ===== MOBILE FILTER POPUP (BOTTOM NAV SAFE) ===== */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] bg-black/40 lg:hidden">
          {/* Click outside close */}
          <div
            className="absolute inset-0"
            onClick={() => setShowMobileFilters(false)}
          />

          {/* Bottom Sheet */}
          <div
            className="
        absolute left-0 right-0 bottom-0
        bg-white rounded-t-3xl shadow-2xl
        max-h-[82vh] overflow-y-auto
        px-5 pt-5
        pb-[calc(env(safe-area-inset-bottom)+88px)]
        animate-slideUp
      "
          >
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Filters</h2>

              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* YEAR */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* MONTH */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">Select Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* BRANCH */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* CATEGORY */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* SUB CATEGORY */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Sub Category
              </label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">All SubCategories</option>
                {subCategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* FIXED BUTTON AREA ABOVE NAVBAR */}
            <div
              className="
          sticky bottom-0 bg-white pt-3
          pb-[calc(env(safe-area-inset-bottom)+10px)]
        "
            >
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedMonth("");
                    setSelectedBranch("");
                    setSelectedCategory("");
                    setSelectedSubCategory("");
                  }}
                  className="py-3 rounded-xl border font-semibold"
                >
                  Reset
                </button>

                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="py-3 rounded-xl bg-orange-500 text-white font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-black text-white p-4 rounded-lg">
    <h3 className="text-sm">{title}</h3>
    <p className="text-xl font-bold text-orange-500 mt-2">{value}</p>
  </div>
);

const ModalForm = ({
  title,
  studentName,
  sportLabel,
  monthLabel,
  data,
  setData,
  onSave,
  onClose,
}) => {
  const [showWaiveConfirm, setShowWaiveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const scrollY = window.scrollY || window.pageYOffset;
    const prev = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.overflow;
      document.body.style.paddingRight = prev.paddingRight;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lock once while modal is mounted
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[12000] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fee-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] cursor-default"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        className="
          relative z-10 w-full sm:w-full sm:max-w-md
          max-h-[min(92dvh,720px)]
          bg-white
          rounded-t-3xl sm:rounded-2xl
          shadow-2xl
          flex flex-col
          animate-slideUp
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3 shrink-0" />

        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="fee-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {title}
              </h2>
              {studentName ? (
                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
                  {studentName}
                </p>
              ) : null}
              {sportLabel ? (
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {sportLabel}
                </p>
              ) : null}
              {monthLabel ? (
                <p className="text-xs text-[#FF6A00] font-medium mt-1">
                  Period: {monthLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1.5 block">
              Monthly fee (₹)
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100"
              placeholder="0"
              value={data.baseFee}
              onChange={(e) => {
                const baseFee = e.target.value.replace(/[^\d]/g, "");
                setData({
                  ...data,
                  baseFee,
                  totalFee: String(
                    computeMonthTotal(baseFee, data.extras || []),
                  ),
                });
              }}
            />
          </label>

          {/* Extra fees for this month */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Extra fees
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  e.g. Game kit ₹200 — shown to student when paying
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const extras = [
                    ...(data.extras || []),
                    { id: newExtraId(), note: "", amount: "" },
                  ];
                  setData({
                    ...data,
                    extras,
                    totalFee: String(
                      computeMonthTotal(data.baseFee, extras),
                    ),
                  });
                }}
                className="shrink-0 min-h-[36px] px-3 rounded-lg bg-[#FF6A00] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {(data.extras || []).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                No extra fees for this month
              </p>
            ) : (
              <div className="space-y-2">
                {(data.extras || []).map((row, idx) => (
                  <div
                    key={row.id || idx}
                    className="rounded-xl bg-white border border-slate-200 p-2.5 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 min-h-[42px] rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6A00]"
                        placeholder="Note (e.g. Game kit)"
                        value={row.note || ""}
                        onChange={(e) => {
                          const extras = (data.extras || []).map((ex, i) =>
                            i === idx ? { ...ex, note: e.target.value } : ex,
                          );
                          setData({ ...data, extras });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const extras = (data.extras || []).filter(
                            (_, i) => i !== idx,
                          );
                          setData({
                            ...data,
                            extras,
                            totalFee: String(
                              computeMonthTotal(data.baseFee, extras),
                            ),
                          });
                        }}
                        className="w-10 h-[42px] rounded-lg border border-red-100 text-red-500 flex items-center justify-center hover:bg-red-50"
                        aria-label="Remove extra"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full min-h-[42px] rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6A00]"
                      placeholder="Amount ₹"
                      value={row.amount ?? ""}
                      onChange={(e) => {
                        const amount = e.target.value.replace(/[^\d]/g, "");
                        const extras = (data.extras || []).map((ex, i) =>
                          i === idx ? { ...ex, amount } : ex,
                        );
                        setData({
                          ...data,
                          extras,
                          totalFee: String(
                            computeMonthTotal(data.baseFee, extras),
                          ),
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-orange-100/80">
              <span className="text-xs font-medium text-slate-600">
                Month total
              </span>
              <span className="text-base font-bold text-[#FF6A00]">
                ₹
                {Number(
                  data.totalFee ||
                    computeMonthTotal(data.baseFee, data.extras || []),
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1.5 block">
              Paid amount (₹)
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100"
              placeholder="0"
              value={data.paidAmount}
              onChange={(e) =>
                setData({
                  ...data,
                  paidAmount: e.target.value.replace(/[^\d]/g, ""),
                })
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1.5 block">
              Paid date
            </span>
            <input
              type="date"
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100"
              value={data.paidDate}
              onChange={(e) => setData({ ...data, paidDate: e.target.value })}
            />
          </label>

          {data.feeWaived ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700 mb-1.5 block">
                Waiver reason
              </span>
              <input
                type="text"
                className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100"
                placeholder="Medical leave / vacation / other"
                value={data.waiveReason}
                onChange={(e) =>
                  setData({ ...data, waiveReason: e.target.value })
                }
              />
            </label>
          ) : null}
        </div>

        <div
          className="
            px-5 pt-3 shrink-0 border-t border-slate-100 bg-white
            pb-[max(1rem,env(safe-area-inset-bottom))]
            space-y-2
          "
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save payment"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowWaiveConfirm(true)}
            className="w-full min-h-[44px] rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
          >
            Waive fee
          </button>
        </div>
      </div>

      {showWaiveConfirm ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Confirm fee waiver
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              This will set total and paid amounts to ₹0 for this student.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowWaiveConfirm(false)}
                className="min-h-[48px] rounded-xl border border-slate-200 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setData({
                    ...data,
                    feeWaived: true,
                    baseFee: 0,
                    extras: [],
                    totalFee: 0,
                    paidAmount: 0,
                  });
                  setShowWaiveConfirm(false);
                }}
                className="min-h-[48px] rounded-xl bg-red-500 text-white text-sm font-semibold"
              >
                Yes, waive
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
};

export default FeesDetailsPage;
