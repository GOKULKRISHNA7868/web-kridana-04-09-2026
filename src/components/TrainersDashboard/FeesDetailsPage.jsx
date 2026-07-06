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

import { ChevronDown, Filter, X } from "lucide-react";
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

    setEditData({
      totalFee:
        existingFee?.totalAmount ?? student.monthlyFee ?? sport.fee ?? 0,

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

    const { totalFee, paidAmount, paidDate, feeWaived, waiveReason } = editData;
    const finalTotal = feeWaived ? 0 : Number(totalFee);
    const finalPaid = feeWaived ? 0 : Number(paidAmount);
    try {
      /* update student monthly fee */
      await updateDoc(doc(db, "trainerstudents", selectedStudent.id), {
        monthlyFee: Number(totalFee),
      });

      const monthKey = `${selectedYear}-${selectedMonth}`;

      /* check existing fee record */
      const existingFee = institutesFees.find(
        (f) =>
          f.studentId === selectedStudent.id &&
          f.category === selectedSport.category &&
          f.subCategory === selectedSport.subCategory &&
          f.month === monthKey,
      );

      if (existingFee) {
        await updateDoc(doc(db, "institutesFees", existingFee.id), {
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          paidDate: feeWaived ? "" : paidDate,
          feeWaived,
          waiveReason: feeWaived ? waiveReason : "",
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(collection(db, "institutesFees")), {
          studentId: selectedStudent.id,
          trainerId: instituteId,
          category: selectedSport.category,
          subCategory: selectedSport.subCategory,
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          paidDate: feeWaived ? "" : paidDate,
          feeWaived,
          waiveReason: feeWaived ? waiveReason : "",
          month: monthKey,
          createdAt: serverTimestamp(),
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
    console.log(
      "CHECK",
      student.id,
      sport.category,
      sport.subCategory,
      `${selectedYear}-${selectedMonth}`,
    );
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
      };
    }

    const total = Number(feeRecord?.totalAmount ?? sport.fee ?? 0);
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";

    return { total, paid, pending, paidDate, reason: "" };
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

                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {data.paidDate !== "-" ? data.paidDate : "Not Paid"}
                  </span>

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
          title="Update Fee Details"
          data={editData}
          setData={setEditData}
          onSave={updateStudentPayment}
          onClose={() => setShowEditModal(false)}
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

const ModalForm = ({ title, data, setData, onSave, onClose }) => (
  <div
    className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-xl font-semibold">{title}</h2>

      <input
        type="number"
        placeholder="Total Fee"
        value={data.totalFee}
        onChange={(e) => setData({ ...data, totalFee: e.target.value })}
        className="border w-full p-2 rounded"
      />

      <input
        type="number"
        placeholder="Paid Amount"
        value={data.paidAmount}
        onChange={(e) => setData({ ...data, paidAmount: e.target.value })}
        className="border w-full p-2 rounded"
      />

      {data.feeWaived && (
        <input
          type="text"
          placeholder="Reason (Medical Leave / Vacation)"
          value={data.waiveReason}
          onChange={(e) => setData({ ...data, waiveReason: e.target.value })}
          className="border w-full p-2 rounded"
        />
      )}

      <input
        type="date"
        value={data.paidDate}
        onChange={(e) => setData({ ...data, paidDate: e.target.value })}
        className="border w-full p-2 rounded"
      />

      <button
        onClick={() =>
          setData({
            ...data,
            feeWaived: true,
            totalFee: 0,
            paidAmount: 0,
            paidDate: "",
          })
        }
        className="bg-gray-200 px-3 py-1 rounded text-sm"
      >
        Fee Waived
      </button>

      <div className="flex justify-end gap-3">
        <button onClick={onClose}>Cancel</button>

        <button
          onClick={onSave}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default FeesDetailsPage;
