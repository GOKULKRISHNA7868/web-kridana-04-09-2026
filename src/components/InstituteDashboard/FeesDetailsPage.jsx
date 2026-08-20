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
import { ChevronDown } from "lucide-react";
import { Filter, X } from "lucide-react";
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

const FeesDetailsPage = () => {
  const instituteId = auth.currentUser?.uid;

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
  const [selectedSport, setSelectedSport] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearRef = useRef(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [editData, setEditData] = useState({
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

    setSelectedStudent(student);
    setSelectedSport(sport);

    const existingFee = fees.find(
      (f) =>
        f.studentId === student.id &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory &&
        f.month === `${selectedYear}-${selectedMonth}`,
    );

    setEditData({
      totalFee: existingFee?.totalAmount ?? sport.fee ?? 0,
      paidAmount: existingFee?.paidAmount ?? "",
      paidDate: existingFee?.paidDate ?? "",
      feeWaived: existingFee?.feeWaived ?? false,
      waiveReason: existingFee?.waiveReason ?? "",
    });

    setShowEditModal(true);
  };

  const updatePayment = async () => {
    if (!selectedStudent || !selectedSport) return;

    const { totalFee, paidAmount, paidDate } = editData;

    try {
      const existingFee = fees.find(
        (f) =>
          f.studentId === selectedStudent.id &&
          f.category === selectedSport.category &&
          f.subCategory === selectedSport.subCategory &&
          f.month === `${selectedYear}-${selectedMonth}`,
      );

      if (existingFee) {
        await updateDoc(doc(db, "studentFees", existingFee.id), {
          totalAmount: Number(totalFee),
          paidAmount: Number(paidAmount),
          paidDate,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(collection(db, "studentFees")), {
          studentId: selectedStudent.id,
          instituteId,
          category: selectedSport.category,
          subCategory: selectedSport.subCategory,
          totalAmount: Number(totalFee),
          paidAmount: Number(paidAmount),
          paidDate,
          feeWaived: editData.feeWaived || false,
          waiveReason: editData.waiveReason || "",
          month: `${selectedYear}-${selectedMonth}`,
          createdAt: serverTimestamp(),
        });
      }

      alert("Payment saved successfully ✅");

      setShowEditModal(false);
      setSelectedStudent(null);
      setSelectedSport(null);
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

    const total = Number(feeRecord?.totalAmount ?? sport.fee ?? 0);
    const paid = Number(feeRecord?.paidAmount || 0);
    const pending = total - paid;
    const paidDate = feeRecord?.paidDate || "-";

    return { total, paid, pending, paidDate, reason: "" };
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
                    className="grid grid-cols-8 px-6 py-4 border-t items-center text-sm hover:bg-gray-50"
                  >
                    <div className="font-medium">
                      {index + 1}. {student.firstName} {student.lastName}
                    </div>

                    <div>{sport.category}</div>
                    <div>{sport.subCategory}</div>
                    <div className="text-center">{student.sessions || "-"}</div>

                    <div
                      onClick={() => handleEditPayment(student, sport)}
                      className="text-center cursor-pointer"
                    >
                      ₹ {data.total}
                    </div>

                    <div
                      onClick={() => handleEditPayment(student, sport)}
                      className="text-center text-green-600 font-semibold cursor-pointer"
                    >
                      ₹ {data.paid}
                    </div>

                    <div className="text-center text-red-600 font-semibold">
                      ₹ {data.pending}
                    </div>

                    <div className="text-center">{data.reason || "-"}</div>
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
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">
                          {index + 1}. {student.firstName} {student.lastName}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                          {sport.category} • {sport.subCategory}
                        </p>
                      </div>

                      <span className="text-xs  text-orange-600 px-2 py-1 rounded-full">
                        {student.sessions || 0}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <button
                        onClick={() => handleEditPayment(student, sport)}
                        className="bg-gray-50 rounded-lg p-2 text-center"
                      >
                        <p className="text-[11px] text-gray-500">Total</p>
                        <p className="font-semibold">₹ {data.total}</p>
                      </button>

                      <button
                        onClick={() => handleEditPayment(student, sport)}
                        className="bg-green-50 rounded-lg p-2 text-center"
                      >
                        <p className="text-[11px] text-green-600">Paid</p>
                        <p className="font-semibold text-green-700">
                          ₹ {data.paid}
                        </p>
                      </button>

                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-[11px] text-red-500">Pending</p>
                        <p className="font-semibold text-red-600">
                          ₹ {data.pending}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-3 text-xs">
                        <span className="text-gray-500">
                          {data.paidDate !== "-"
                            ? `Paid: ${data.paidDate}`
                            : "Not Paid"}
                        </span>

                        {data.reason && (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            {data.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showEditModal && (
        <ModalForm
          title="Update Payment"
          data={editData}
          setData={setEditData}
          onSave={updatePayment}
          onClose={() => setShowEditModal(false)}
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

const ModalForm = ({ title, data, setData, onSave, onClose }) => {
  const [showWaiveConfirm, setShowWaiveConfirm] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] sm:w-96 space-y-4">
        <h2 className="font-semibold">{title}</h2>

        <input
          type="number"
          className="border w-full p-2 rounded"
          placeholder="Total Fee"
          value={data.totalFee}
          onChange={(e) => setData({ ...data, totalFee: e.target.value })}
        />

        <input
          type="number"
          className="border w-full p-2 rounded"
          placeholder="Paid Amount"
          value={data.paidAmount}
          onChange={(e) => setData({ ...data, paidAmount: e.target.value })}
        />

        <input
          type="date"
          className="border w-full p-2 rounded"
          placeholder="Paid Date"
          value={data.paidDate}
          onChange={(e) => setData({ ...data, paidDate: e.target.value })}
        />
        {data.feeWaived && (
          <input
            type="text"
            className="border w-full p-2 rounded"
            placeholder="Reason (Medical Leave / Vacation)"
            value={data.waiveReason}
            onChange={(e) => setData({ ...data, waiveReason: e.target.value })}
          />
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={onSave}
            className="bg-orange-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={() => setShowWaiveConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Waive Fee
          </button>
        </div>
      </div>
      {showWaiveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-scaleIn">
            <h3 className="text-lg font-bold text-gray-800">
              Confirm Fee Waiver
            </h3>

            <p className="text-gray-600 mt-3">
              Are you sure you want to waive this student's fee?
            </p>

            <p className="mt-2 font-semibold text-red-600">
              This will set the fee amount to ₹0.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWaiveConfirm(false)}
                className="flex-1 border border-gray-300 py-3 rounded-xl font-medium"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setData({
                    ...data,
                    feeWaived: true,
                    totalFee: 0,
                    paidAmount: 0,
                  });

                  setShowWaiveConfirm(false);
                }}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium"
              >
                Yes, Waive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesDetailsPage;
