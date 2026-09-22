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
import {
  isPersonActiveInMonth,
  isPersonCurrentlyActive,
} from "../../utils/personStatus";

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

const useBodyScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return undefined;

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
    const key = "__kridanaScrollLockCount";
    window[key] = (window[key] || 0) + 1;
    if (window[key] === 1) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      if (scrollbar > 0) {
        document.body.style.paddingRight = `${scrollbar}px`;
      }
      window.__kridanaScrollY = scrollY;
      window.__kridanaScrollPrev = prev;
    }

    return () => {
      window[key] = Math.max(0, (window[key] || 1) - 1);
      if (window[key] === 0) {
        const saved = window.__kridanaScrollPrev || prev;
        const y = window.__kridanaScrollY ?? scrollY;
        document.documentElement.style.overflow = saved.htmlOverflow;
        document.body.style.overflow = saved.overflow;
        document.body.style.paddingRight = saved.paddingRight;
        document.body.style.position = saved.position;
        document.body.style.top = saved.top;
        document.body.style.width = saved.width;
        window.scrollTo(0, y);
        delete window.__kridanaScrollPrev;
        delete window.__kridanaScrollY;
      }
    };
  }, [locked]);
};

const PickerSheet = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  zIndex = 11050,
}) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3"
      style={{ zIndex, touchAction: "none" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md max-h-[min(80dvh,520px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ touchAction: "manipulation" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className="px-4 py-4 overflow-y-auto overscroll-contain min-h-0"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const MonthGrid = ({ value, onChange, columns = 3 }) => (
  <div
    className={`grid gap-2 ${columns === 4 ? "grid-cols-4" : "grid-cols-3"}`}
  >
    {MONTHS.map((m) => {
      const active = value === m.value;
      return (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`min-h-[44px] sm:min-h-[48px] rounded-xl px-1.5 py-2.5 text-xs sm:text-sm font-semibold border transition ${
            active
              ? "bg-[#FF6A00] text-white border-[#FF6A00] shadow-sm"
              : "bg-slate-50 text-slate-800 border-slate-200 active:bg-orange-50"
          }`}
        >
          <span className="sm:hidden">{m.label.slice(0, 3)}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      );
    })}
  </div>
);

const YearChips = ({ value, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
    {YEARS.map((y) => {
      const active = value === y;
      return (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`shrink-0 min-h-[40px] min-w-[72px] px-3 rounded-xl text-sm font-semibold border ${
            active
              ? "bg-[#FF6A00] text-white border-[#FF6A00]"
              : "bg-slate-50 text-slate-700 border-slate-200"
          }`}
        >
          {y}
        </button>
      );
    })}
  </div>
);

const FeesDetailsPage = () => {
  const [instituteId, setInstituteId] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setInstituteId(user.uid);
    });

    return () => unsub();
  }, []);

  const [students, setStudents] = useState([]);
  const [institutesFees, setInstitutesFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pickerMode, setPickerMode] = useState(null);
  const listScrollRef = useRef(null);
  const listScrollTopRef = useRef(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedSport, setSelectedSport] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    baseFee: "",
    extras: [],
    totalFee: "",
    paidAmount: "",
    paidDate: "",
    feeWaived: false,
    waiveReason: "",
  });

  useBodyScrollLock(showFilterModal);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return undefined;
    const overlayOpen = showFilterModal || !!pickerMode || showEditModal;
    if (!overlayOpen) return undefined;
    const savedTop = listScrollTopRef.current || el.scrollTop;
    listScrollTopRef.current = savedTop;
    const prev = el.style.overflowY;
    el.style.overflowY = "hidden";
    el.scrollTop = savedTop;
    return () => {
      el.style.overflowY = prev;
      el.scrollTop = listScrollTopRef.current;
    };
  }, [showFilterModal, pickerMode, showEditModal]);

  const monthLabel = selectedMonth
    ? MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth
    : "Select Month";

  const activeFilterCount = [
    selectedMonth,
    selectedCategory,
    selectedSubCategory,
  ].filter(Boolean).length;

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "trainerstudents"),
      where("trainerId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      const studentsData = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setStudents(studentsData);
    });
  }, [instituteId]);

  /* ================= FETCH FEES ================= */
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "institutesFees"),
      where("trainerId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      setInstitutesFees(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );
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
  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    let rows = [];

    [...students]
      .sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""))
      .filter((s) => Array.isArray(s.sports) && s.sports.length > 0)
      .forEach((student) => {
        const matchesSearch = `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase());

        if (!matchesSearch) return;

        const membershipOk =
          !selectedMonth || !selectedYear
            ? isPersonCurrentlyActive(student)
            : isPersonActiveInMonth(student, selectedYear, selectedMonth);
        if (!membershipOk) return;

        student.sports.forEach((sport) => {
          if (selectedCategory && sport.category !== selectedCategory) return;
          if (selectedSubCategory && sport.subCategory !== selectedSubCategory)
            return;

          rows.push({ student, sport });
        });
      });

    return rows;
  }, [
    students,
    search,
    selectedCategory,
    selectedSubCategory,
    selectedMonth,
    selectedYear,
  ]);
  useEffect(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear().toString();

    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);
  /* ================= EDIT STUDENT ================= */
  const handleEditStudent = (student, sport) => {
    if (!selectedMonth || !selectedYear) {
      alert("Please select month and year first!");
      return;
    }

    setSelectedStudent(student);
    setSelectedSport(sport);

    const existingFee = institutesFees.find((f) => {
      return (
        String(f.studentId).trim() === String(student.id).trim() &&
        String(f.category).trim() === String(sport.category).trim() &&
        String(f.subCategory).trim() === String(sport.subCategory).trim() &&
        String(f.month).trim() === `${selectedYear}-${selectedMonth}`.trim()
      );
    });

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
          : sport.fee ?? student.monthlyFee ?? 0),
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

  const updateStudentPayment = async () => {
    if (!selectedStudent || !selectedSport) return;

    if (!selectedMonth) {
      alert("Please select month");
      return;
    }

    const extrasClean = (editData.extras || [])
      .map((e) => ({
        id: e.id || newExtraId(),
        note: String(e.note || "").trim(),
        amount: Number(e.amount || 0),
      }))
      .filter((e) => e.amount > 0 || e.note);

    const baseFee = Number(editData.baseFee || 0);
    const feeWaived = Boolean(editData.feeWaived);
    const finalTotal = feeWaived ? 0 : computeMonthTotal(baseFee, extrasClean);
    const finalPaid = feeWaived ? 0 : Number(editData.paidAmount || 0);
    const paidDate = feeWaived ? "" : editData.paidDate || "";

    try {
      await updateDoc(doc(db, "trainerstudents", selectedStudent.id), {
        monthlyFee: baseFee,
      });

      const monthKey = `${selectedYear}-${selectedMonth}`;

      const existingFee = institutesFees.find(
        (f) =>
          f.studentId === selectedStudent.id &&
          f.category === selectedSport.category &&
          f.subCategory === selectedSport.subCategory &&
          f.month === monthKey,
      );

      const payload = {
        baseFee: feeWaived ? 0 : baseFee,
        extras: feeWaived ? [] : extrasClean,
        totalAmount: finalTotal,
        paidAmount: finalPaid,
        paidDate,
        feeWaived,
        waiveReason: feeWaived ? editData.waiveReason || "" : "",
        updatedAt: serverTimestamp(),
      };

      if (existingFee) {
        await updateDoc(doc(db, "institutesFees", existingFee.id), payload);
      } else {
        await setDoc(doc(collection(db, "institutesFees")), {
          studentId: selectedStudent.id,
          trainerId: instituteId,
          category: selectedSport.category,
          subCategory: selectedSport.subCategory,
          month: monthKey,
          createdAt: serverTimestamp(),
          ...payload,
        });
      }

      setShowEditModal(false);
      setSelectedStudent(null);
      setSelectedSport(null);
    } catch (err) {
      console.error(err);
      alert("Error saving payment");
    }
  };
  /* ================= CALCULATIONS ================= */
  const totalStudents = filteredRows.length;

  const totalAmount = filteredRows.reduce((sum, row) => {
    const record = institutesFees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.totalAmount ?? row.sport.fee ?? 0);
  }, 0);

  const totalPaid = filteredRows.reduce((sum, row) => {
    const record = institutesFees.find(
      (f) =>
        f.studentId === row.student.id &&
        f.category === row.sport.category &&
        f.subCategory === row.sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    return sum + Number(record?.paidAmount || 0);
  }, 0);

  const totalPending = totalAmount - totalPaid;

  const getFeeData = (student, sport) => {
    const feeRecord = institutesFees.find(
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
        extras: [],
        extraTotal: 0,
      };
    }

    const extras = Array.isArray(feeRecord?.extras) ? feeRecord.extras : [];
    const extraTotal = sumExtras(extras);
    const total = Number(
      feeRecord?.totalAmount ??
        computeMonthTotal(feeRecord?.baseFee ?? sport.fee ?? 0, extras),
    );
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";

    return { total, paid, pending, paidDate, reason: "", extras, extraTotal };
  };
  /* ================= MAIN ROOT DIV ================= */
  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-gray-50 rounded-none sm:rounded-2xl overflow-hidden">
      {/* ================= FIXED TOP HEADER ================= */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm shrink-0">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">
                Fees Details
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Manage student payments & pending fees
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (listScrollRef.current) {
                  listScrollTopRef.current = listScrollRef.current.scrollTop;
                }
                setShowFilterModal(true);
              }}
              className="lg:hidden relative flex items-center gap-2 bg-orange-500 text-white px-3.5 py-2.5 min-h-[44px] rounded-xl shadow shrink-0"
            >
              <Filter size={18} />
              <span className="font-semibold text-sm">Filters</span>
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPickerMode("year")}
              className="min-h-[44px] min-w-[96px] flex-1 sm:flex-none sm:w-28 bg-orange-500 text-white rounded-xl px-3 py-2.5 font-semibold flex items-center justify-between gap-2 shadow-sm"
            >
              <span>{selectedYear}</span>
              <ChevronDown size={16} className="opacity-90 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setPickerMode("month")}
              className="min-h-[44px] flex-[1.4] sm:flex-none sm:min-w-[180px] bg-orange-500 text-white rounded-xl px-3 py-2.5 font-semibold flex items-center justify-between gap-2 shadow-sm"
            >
              <span className="truncate">{monthLabel}</span>
              <ChevronDown size={16} className="opacity-90 shrink-0" />
            </button>

            <div className="hidden lg:flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className="border border-slate-200 bg-white px-3 py-2.5 min-h-[44px] rounded-xl text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="border border-slate-200 bg-white px-3 py-2.5 min-h-[44px] rounded-xl text-sm"
              >
                <option value="">All SubCategory</option>
                {subCategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard title="Total Amount" value={`₹ ${totalAmount}`} />
            <StatCard title="Pending Fees" value={`₹ ${totalPending}`} />
            <StatCard title="Paid Fees" value={`₹ ${totalPaid}`} />
            <StatCard title="Students" value={totalStudents} />
          </div>

          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-orange-400 rounded-xl px-4 py-2.5 min-h-[44px] w-full focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={listScrollRef}
          className="h-full overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-28 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white rounded-xl shadow overflow-hidden mt-4">
            <div className="grid grid-cols-[2fr_1.4fr_1.4fr_0.8fr_1fr_1fr_1fr_1.2fr] bg-black text-orange-500 text-sm font-semibold px-5 py-3 sticky top-0 z-10">
              <div>Student</div>
              <div>Category</div>
              <div>SubCategory</div>
              <div className="text-center">Sessions</div>
              <div className="text-center">Total</div>
              <div className="text-center">Paid</div>
              <div className="text-center">Pending</div>
              <div className="text-center">Status</div>
            </div>

            {filteredRows.map((row, index) => {
              const { student, sport } = row;
              const data = getFeeData(student, sport);

              return (
                <div
                  key={`${student.id}-${sport.subCategory}-${index}`}
                  onClick={() => handleEditStudent(student, sport)}
                  className="grid grid-cols-[2fr_1.4fr_1.4fr_0.8fr_1fr_1fr_1fr_1.2fr] px-5 py-3 border-b hover:bg-orange-50 cursor-pointer text-sm transition"
                >
                  <div className="font-medium text-gray-800 truncate pr-2">
                    {index + 1}. {student.firstName} {student.lastName}
                  </div>
                  <div className="truncate">{sport.category}</div>
                  <div className="truncate">{sport.subCategory}</div>
                  <div className="text-center">{sport.sessions || "-"}</div>
                  <div className="text-center font-semibold">₹ {data.total}</div>
                  <div className="text-center text-green-600 font-semibold">
                    ₹ {data.paid}
                  </div>
                  <div className="text-center text-red-500 font-semibold">
                    ₹ {data.pending}
                  </div>
                  <div className="text-center">
                    {data.extraTotal > 0 ? (
                      <span className="block text-[10px] font-semibold text-[#FF6A00] mb-0.5">
                        +₹{data.extraTotal} extras
                      </span>
                    ) : null}
                    {data.pending === 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Paid
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MOBILE CARDS */}
          <div className="lg:hidden space-y-3 mt-4">
            {filteredRows.map((row, index) => {
              const { student, sport } = row;
              const data = getFeeData(student, sport);

              return (
                <div
                  key={`${student.id}-${sport.subCategory}-${index}`}
                  onClick={() => handleEditStudent(student, sport)}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm active:scale-[0.99] transition"
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {index + 1}. {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {sport.category} • {sport.subCategory}
                      </p>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full h-fit shrink-0">
                      {sport.sessions || "-"} Sessions
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-[10px] text-gray-500">Total</p>
                      <p className="font-semibold text-sm">₹ {data.total}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-[10px] text-gray-500">Paid</p>
                      <p className="font-semibold text-sm text-green-600">
                        ₹ {data.paid}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-[10px] text-gray-500">Pending</p>
                      <p className="font-semibold text-sm text-red-500">
                        ₹ {data.pending}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {data.paidDate !== "-" ? data.paidDate : "Not Paid"}
                    </span>
                    <div className="flex items-center gap-2">
                      {data.extraTotal > 0 ? (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-orange-100 text-[#E85D04] font-semibold">
                          +₹{data.extraTotal} extras
                        </span>
                      ) : null}
                      {data.pending === 0 ? (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Paid
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-red-100 text-red-600">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
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

      {showEditModal && (
        <ModalForm
          title="Update fee details"
          studentName={`${selectedStudent?.firstName || ""} ${selectedStudent?.lastName || ""}`.trim()}
          sportLabel={`${selectedSport?.category || ""} · ${selectedSport?.subCategory || ""}`}
          monthLabel={
            selectedMonth
              ? `${MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth} ${selectedYear}`
              : selectedYear
          }
          data={editData}
          setData={setEditData}
          onSave={updateStudentPayment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStudent(null);
            setSelectedSport(null);
          }}
        />
      )}

      <PickerSheet
        open={pickerMode === "month"}
        title="Select month"
        subtitle={`Fees for ${selectedYear}`}
        onClose={() => setPickerMode(null)}
      >
        <MonthGrid
          value={selectedMonth}
          onChange={(v) => {
            setSelectedMonth(v);
            setPickerMode(null);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setSelectedMonth("");
            setPickerMode(null);
          }}
          className="mt-4 w-full min-h-[44px] rounded-xl border border-slate-200 text-slate-600 font-semibold"
        >
          Clear month
        </button>
      </PickerSheet>

      <PickerSheet
        open={pickerMode === "year"}
        title="Select year"
        onClose={() => setPickerMode(null)}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {YEARS.map((y) => {
            const active = selectedYear === y;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setSelectedYear(y);
                  setPickerMode(null);
                }}
                className={`min-h-[48px] rounded-xl px-3 py-3 text-sm font-semibold border ${
                  active
                    ? "bg-[#FF6A00] text-white border-[#FF6A00] shadow-sm"
                    : "bg-slate-50 text-slate-800 border-slate-200"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </PickerSheet>

      {showFilterModal
        ? createPortal(
            <div
              className="fixed inset-0 z-[11050] flex items-center justify-center p-3 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              style={{ touchAction: "none" }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/60"
                aria-label="Close filters"
                onClick={() => setShowFilterModal(false)}
              />

              <div
                className="relative z-10 w-full max-w-md h-[min(82dvh,560px)] max-h-[calc(100dvh-24px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ touchAction: "manipulation" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                    <p className="text-xs text-slate-500">
                      Choose month & options, then Apply
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div
                  className="px-4 py-3 space-y-3 overflow-y-auto overscroll-contain flex-1 min-h-0"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-y",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Month
                      </label>
                      {selectedMonth ? (
                        <button
                          type="button"
                          onClick={() => setSelectedMonth("")}
                          className="text-xs font-semibold text-[#FF6A00]"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MONTHS.map((m) => {
                        const active = selectedMonth === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setSelectedMonth(m.value)}
                            className={`min-h-[38px] rounded-lg text-xs font-semibold border ${
                              active
                                ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {m.label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                      Year
                    </label>
                    <YearChips value={selectedYear} onChange={setSelectedYear} />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubCategory("");
                      }}
                      className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                      Sub Category
                    </label>
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm"
                    >
                      <option value="">All SubCategory</option>
                      {subCategories.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth("");
                      setSelectedCategory("");
                      setSelectedSubCategory("");
                    }}
                    className="min-h-[46px] rounded-xl border border-slate-200 font-semibold text-sm"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="min-h-[46px] rounded-xl bg-orange-500 text-white font-semibold text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

/* ================= BETTER STAT CARD ================= */
const StatCard = ({ title, value }) => (
  <div className="bg-[#FF6A00] text-white rounded-2xl p-3 sm:p-4 min-h-[88px] flex flex-col justify-between shadow-sm">
    <h3 className="text-[11px] sm:text-sm font-medium text-white/90 leading-snug">
      {title}
    </h3>
    <p className="text-lg sm:text-2xl font-bold mt-2 break-words leading-tight">
      {value}
    </p>
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
  const [saving, setSaving] = useState(false);
  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      style={{ touchAction: "none" }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 bg-white w-full max-w-md max-h-[min(88dvh,720px)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ touchAction: "manipulation" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
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
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1.5 block">
              Monthly fee (₹)
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={data.baseFee}
              onChange={(e) => {
                const baseFee = e.target.value.replace(/[^\d]/g, "");
                setData({
                  ...data,
                  baseFee,
                  totalFee: String(computeMonthTotal(baseFee, data.extras || [])),
                });
              }}
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00]"
            />
          </label>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Extra fees</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  e.g. Game kit ₹200 — shown when student pays
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
                    totalFee: String(computeMonthTotal(data.baseFee, extras)),
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
                        className="w-10 h-[42px] rounded-lg border border-red-100 text-red-500 flex items-center justify-center"
                        aria-label="Remove"
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
              placeholder="0"
              value={data.paidAmount}
              onChange={(e) =>
                setData({
                  ...data,
                  paidAmount: e.target.value.replace(/[^\d]/g, ""),
                })
              }
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1.5 block">
              Paid date
            </span>
            <input
              type="date"
              value={data.paidDate}
              onChange={(e) => setData({ ...data, paidDate: e.target.value })}
              className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00]"
            />
          </label>

          {data.feeWaived ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700 mb-1.5 block">
                Waiver reason
              </span>
              <input
                type="text"
                placeholder="Medical leave / vacation / other"
                value={data.waiveReason}
                onChange={(e) =>
                  setData({ ...data, waiveReason: e.target.value })
                }
                className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[15px] outline-none focus:border-[#FF6A00]"
              />
            </label>
          ) : null}
        </div>

        <div className="px-5 pt-3 pb-5 border-t border-slate-100 space-y-2 shrink-0 bg-white">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-slate-200 text-sm font-semibold"
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
            onClick={() =>
              setData({
                ...data,
                feeWaived: true,
                baseFee: 0,
                extras: [],
                totalFee: 0,
                paidAmount: 0,
                paidDate: "",
              })
            }
            className="w-full min-h-[44px] rounded-xl border border-red-200 text-red-600 text-sm font-semibold"
          >
            Waive fee
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FeesDetailsPage;
