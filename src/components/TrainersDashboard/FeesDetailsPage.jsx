import React, { useEffect, useMemo, useState, useRef } from "react";
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

const FeesDetailsPage = () => {
  const [instituteId, setInstituteId] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setInstituteId(user.uid);
    });

    return () => unsub();
  }, []);

  const currentYear = new Date().getFullYear();

  const [students, setStudents] = useState([]);
  const [institutesFees, setInstitutesFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef(null);
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

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      .filter((s) => Array.isArray(s.sports) && s.sports.length > 0) // only students with sports
      .forEach((student) => {
        const matchesSearch = `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase());

        if (!matchesSearch) return;

        student.sports.forEach((sport) => {
          if (selectedCategory && sport.category !== selectedCategory) return;
          if (selectedSubCategory && sport.subCategory !== selectedSubCategory)
            return;

          if (!selectedMonth || !selectedYear) {
            rows.push({ student, sport });
            return;
          }

          const selectedDate = new Date(
            Number(selectedYear),
            Number(selectedMonth) - 1,
            1,
          );

          if (student.joiningDate) {
            const joiningDate = new Date(student.joiningDate);
            if (
              selectedDate <
              new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1)
            ) {
              return;
            }
          }

          if (student.leftDate) {
            const leftDate =
              student.leftDate?.toDate?.() || new Date(student.leftDate);

            if (
              selectedDate >
              new Date(leftDate.getFullYear(), leftDate.getMonth(), 1)
            ) {
              return;
            }
          }

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800">
              Fees Details
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage student payments & pending fees
            </p>
          </div>

          {/* MOBILE FILTER BUTTON */}
          <button
            onClick={() => setShowFilterModal(true)}
            className="md:hidden w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* DESKTOP FILTERS */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-11 px-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-orange-400 outline-none"
          >
            {[
              currentYear - 2,
              currentYear - 1,
              currentYear,
              currentYear + 1,
            ].map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-11 px-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-orange-400 outline-none"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubCategory("");
            }}
            className="h-11 px-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-orange-400 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="h-11 px-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-orange-400 outline-none"
          >
            <option value="">All SubCategory</option>
            {subCategories.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div className="px-4 sm:px-6 pt-4 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Amount" value={`₹ ${totalAmount}`} />
          <StatCard title="Pending Fees" value={`₹ ${totalPending}`} />
          <StatCard title="Paid Fees" value={`₹ ${totalPaid}`} />
          <StatCard title="Students" value={totalStudents} />
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 px-4 sm:px-6 py-4 min-h-0">
        {/* DESKTOP TABLE */}
        <div className="hidden lg:flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_1.4fr_1.4fr_0.8fr_1fr_1fr_1fr_1.2fr] bg-black text-orange-500 text-sm font-semibold px-5 py-3">
            <div>Student</div>
            <div>Category</div>
            <div>SubCategory</div>
            <div className="text-center">Sessions</div>
            <div className="text-center">Total</div>
            <div className="text-center">Paid</div>
            <div className="text-center">Pending</div>
            <div className="text-center">Status</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRows.map((row, index) => {
              const { student, sport } = row;
              const data = getFeeData(student, sport);

              return (
                <div
                  key={index}
                  onClick={() => handleEditStudent(student, sport)}
                  className="grid grid-cols-[2fr_1.4fr_1.4fr_0.8fr_1fr_1fr_1fr_1.2fr] px-5 py-3 border-b hover:bg-orange-50 cursor-pointer text-sm transition"
                >
                  <div className="font-medium text-gray-800">
                    {index + 1}. {student.firstName} {student.lastName}
                  </div>

                  <div>{sport.category}</div>
                  <div>{sport.subCategory}</div>

                  <div className="text-center">{sport.sessions || "-"}</div>

                  <div className="text-center font-semibold">
                    ₹ {data.total}
                  </div>

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
        </div>

        {/* MOBILE CARDS */}
        <div className="lg:hidden h-full overflow-y-auto space-y-3 pr-1 pb-24 sm:pb-28">
          {filteredRows.map((row, index) => {
            const { student, sport } = row;
            const data = getFeeData(student, sport);

            return (
              <div
                key={index}
                onClick={() => handleEditStudent(student, sport)}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm active:scale-[0.99] transition"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">
                      {index + 1}. {student.firstName} {student.lastName}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      {sport.category} • {sport.subCategory}
                    </p>
                  </div>

                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full h-fit">
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
              </div>
            );
          })}
        </div>
        {showFilterModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:hidden">
            <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 animate-slideUp">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">Filters</h2>
                <button onClick={() => setShowFilterModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border px-4 py-3 rounded-xl w-full"
              >
                {[
                  currentYear - 2,
                  currentYear - 1,
                  currentYear,
                  currentYear + 1,
                ].map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border px-4 py-3 rounded-xl w-full"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border px-4 py-3 rounded-xl w-full"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="border px-4 py-3 rounded-xl w-full"
              >
                <option value="">All SubCategory</option>
                {subCategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <button
                onClick={() => setShowFilterModal(false)}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
};

/* ================= BETTER STAT CARD ================= */
const StatCard = ({ title, value }) => (
  <div className="bg-black rounded-2xl px-4 py-3 shadow-sm">
    <p className="text-[11px] sm:text-xs text-gray-300">{title}</p>
    <h3 className="text-lg sm:text-xl font-bold text-orange-500 mt-1">
      {value}
    </h3>
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
}) => (
  <div
    className="fixed inset-0 z-[9999] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={onClose}
  >
    <div
      className="bg-white w-full sm:max-w-md max-h-[min(92dvh,720px)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
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

      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
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

      <div className="px-5 pt-3 pb-5 border-t border-slate-100 space-y-2 shrink-0">
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
            onClick={onSave}
            className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
          >
            Save payment
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
  </div>
);

export default FeesDetailsPage;
