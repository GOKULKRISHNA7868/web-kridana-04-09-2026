import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useSelectedStudent } from "../../context/SelectedStudentContext";
import { useNavigate } from "react-router-dom";
const PaymentOverview = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showReminder, setShowReminder] = useState(false);
  const [generatedMonths, setGeneratedMonths] = useState([]);
  const { selectedStudentUid } = useSelectedStudent();
  const [user, setUser] = useState(null);
  const activeStudentId =
    selectedStudentUid && selectedStudentUid !== ""
      ? selectedStudentUid
      : user?.uid;
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [feeHistory, setFeeHistory] = useState([]);
  const navigate = useNavigate();
  const filteredHistory = feeHistory.filter(
    (f) =>
      (!selectedCategory || f.category === selectedCategory) &&
      (!selectedSubCategory || f.subCategory === selectedSubCategory),
  );

  const totalPaid = filteredHistory.reduce(
    (sum, f) => sum + Number(f.paidAmount || 0),
    0,
  );
  const [processing, setProcessing] = useState(false);
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };
  const API_URL = "https://kridana-razorpay-backend.onrender.com";
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);
    });

    return () => unsub();
  }, []);
  useEffect(() => {
    if (!activeStudentId || activeStudentId === "") return;

    const fetchStudentData = async () => {
      setLoading(true);

      try {
        // =========================
        // Fetch student profile
        // =========================
        const studentRef = doc(db, "trainerstudents", activeStudentId);
        const snap = await getDoc(studentRef);
        console.log("Selected UID:", selectedStudentUid);
        console.log("Active UID:", activeStudentId);
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const studentData = snap.data();
        setStudent(studentData);

        // =========================
        // Fetch payment history
        // =========================
        const feesRef = collection(db, "institutesFees");

        const q = query(feesRef, where("studentId", "==", activeStudentId));

        const feesSnap = await getDocs(q);

        const history = [];
        let paidSum = 0;

        feesSnap.forEach((doc) => {
          const data = doc.data();

          history.push(data);
          paidSum += Number(data.paidAmount || 0);
        });

        setFeeHistory(history);

        // =========================
        // Generate months
        // =========================
        // =========================
        // Generate months
        // =========================
        if (studentData?.createdAt) {
          const startDate = studentData.createdAt.toDate();
          const today = new Date();

          const monthsArray = [];

          let tempDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            1,
          );

          while (
            tempDate.getFullYear() < today.getFullYear() ||
            (tempDate.getFullYear() === today.getFullYear() &&
              tempDate.getMonth() <= today.getMonth())
          ) {
            const year = tempDate.getFullYear();
            const monthIndex = tempDate.getMonth();

            const monthKey = `${year}-${String(monthIndex + 1).padStart(
              2,
              "0",
            )}`;

            const isPaid = history.some((item) => item.month === monthKey);

            monthsArray.push({
              month: tempDate.toLocaleString("default", { month: "long" }),
              year,
              key: monthKey,
              paid: isPaid,
              current:
                year === today.getFullYear() && monthIndex === today.getMonth(),
            });

            tempDate.setMonth(tempDate.getMonth() + 1);
          }

          setGeneratedMonths(monthsArray);
        }

        // =========================
        // Reminder logic
        // =========================
        if (studentData.monthlyDate) {
          const today = new Date().getDate();
          const dueDay = Number(studentData.monthlyDate);

          if (today >= dueDay - 5 && today < dueDay) {
            setShowReminder(true);
          } else {
            setShowReminder(false);
          }
        }
      } catch (err) {
        console.error("Error fetching payment:", err);
      }

      setLoading(false);
    };

    fetchStudentData();
  }, [activeStudentId, selectedCategory, selectedSubCategory]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!student) return <div className="p-8">No Data Found</div>;

  let monthlyFee = 0;

  if (selectedSubCategory) {
    const sport = student.sports.find(
      (s) => s.subCategory === selectedSubCategory,
    );

    monthlyFee = Number(sport?.fee || 0);
  } else {
    monthlyFee = (student.sports || []).reduce(
      (sum, s) => sum + Number(s.fee || 0),
      0,
    );
  }
  let expectedTotalFee = 0;

  generatedMonths.forEach((m) => {
    student.sports.forEach((sport) => {
      const record = feeHistory.find(
        (f) =>
          f.month === m.key &&
          f.category === sport.category &&
          f.subCategory === sport.subCategory,
      );

      // If record exists AND paidAmount = 0 AND reason exists → skip fee
      if (record && Number(record.paidAmount) === 0 && record.reason) {
        return;
      }

      expectedTotalFee += Number(sport.fee || 0);
    });
  });
  let pendingFee = 0;

  generatedMonths.forEach((m) => {
    student.sports.forEach((sport) => {
      const record = feeHistory.find(
        (f) =>
          f.month === m.key &&
          f.category === sport.category &&
          f.subCategory === sport.subCategory,
      );

      // If record exists (even if amount is 0) → treat as handled
      if (record) return;

      // No record → unpaid
      pendingFee += Number(sport.fee || 0);
    });
  });

  const categories = [
    ...new Set((student?.sports || []).map((s) => s.category)),
  ];

  const subCategories = [
    ...new Set(
      (student?.sports || [])
        .filter((s) => !selectedCategory || s.category === selectedCategory)
        .map((s) => s.subCategory),
    ),
  ];
  if (processing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">
            Please wait, processing payment...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            ←
          </button>

          <h1 className="text-lg font-semibold text-gray-800">Fees Details</h1>
        </div>

        <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 5h12M5 9h8M7 13h4" />
          </svg>
        </button>
      </div>

      <div className="max-w-md mx-auto pb-8">
        {/* Filters */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className="
          w-full
          appearance-none
          rounded-xl
          bg-white
          border
          border-gray-200
          px-4
          py-3
          text-sm
          text-gray-700
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-orange-400
        "
              >
                <option value="">All Categories</option>

                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ▼
              </div>
            </div>

            {/* Sub Category */}
            <div className="relative">
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="
          w-full
          appearance-none
          rounded-xl
          bg-white
          border
          border-gray-200
          px-4
          py-3
          text-sm
          text-gray-700
          shadow-sm
          focus:outline-none
          focus:ring-2
          focus:ring-orange-400
        "
              >
                <option value="">All SubCategories</option>

                {subCategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ▼
              </div>
            </div>
          </div>
        </div>
        {/* Cards Section */}

        {/* =========================
      Student Card
========================= */}
        <div className="px-4 pt-4">
          <div className="overflow-hidden rounded-3xl shadow-lg">
            {/* Orange Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center font-bold text-white">
                    {(student.firstName || "S").charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div>
                    <h2 className="text-sm font-semibold">Customer 01</h2>

                    <p className="text-xs text-orange-100 mt-1">
                      {student.firstName} {student.lastName}
                    </p>

                    <div className="mt-3 text-[11px] leading-5 text-orange-50">
                      {(student.sports || []).map((sport, index) => (
                        <span key={index}>
                          {sport.category} - {sport.subCategory}
                          {index !== student.sports.length - 1 && (
                            <>
                              <br />
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Menu */}
                <button className="text-white text-xl leading-none">⋮</button>
              </div>
            </div>

            {/* Bottom White Area */}
            <div className="bg-white px-5 py-4">
              <div className="grid grid-cols-2">
                {/* Due */}
                <div>
                  <p className="text-xs text-gray-500">Due Amount</p>

                  <h2 className="text-3xl font-bold text-red-500 mt-1">
                    ₹{monthlyFee}
                  </h2>
                </div>

                {/* Due Date */}
                <div className="text-right">
                  <p className="text-xs text-gray-500">To be paid :</p>

                  <p className="font-semibold text-gray-800 mt-1">
                    Every Month {student.monthlyDate}th
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showReminder && (
          <div className="px-4 mt-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-orange-700 font-medium">
                Scroll to view previous and Pending Months
              </span>

              <span className="text-orange-500 text-lg">↑</span>
            </div>
          </div>
        )}

        {/* Payment History */}
        {/* =========================
      Payment History
========================= */}
        <div className="px-4 mt-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Payment History
          </h2>

          {generatedMonths.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
              No Payment History
            </div>
          )}

          <div className="space-y-4">
            {generatedMonths.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Month Header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {item.month} {item.year}
                      </h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Due Date : {item.month} {student.monthlyDate}
                      </p>
                    </div>

                    {item.current && (
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                {/* Sports List */}

                <div className="divide-y divide-gray-100">
                  {(() => {
                    const records = student.sports.map((sport) => {
                      const record = feeHistory.find(
                        (f) =>
                          f.month === item.key &&
                          f.category === sport.category &&
                          f.subCategory === sport.subCategory,
                      );

                      return {
                        category: sport.category,
                        subCategory: sport.subCategory,
                        amount: Number(sport.fee || 0),
                        paidAmount: record?.paidAmount || 0,
                        paid: record && Number(record.paidAmount) > 0,
                      };
                    });

                    const hasPending = records.some(
                      (r) => !r.paid || r.paidAmount === 0,
                    );

                    const handlePayNow = async () => {
                      const unpaidRecords = student.sports
                        .map((sport) => {
                          const record = feeHistory.find(
                            (f) =>
                              f.month === item.key &&
                              f.category === sport.category &&
                              f.subCategory === sport.subCategory,
                          );

                          if (!record || Number(record.paidAmount) === 0) {
                            return {
                              category: sport.category,
                              subCategory: sport.subCategory,
                              amount: Number(sport.fee || 0),
                            };
                          }

                          return null;
                        })
                        .filter(Boolean);

                      const totalAmount = unpaidRecords.reduce(
                        (sum, r) => sum + r.amount,
                        0,
                      );

                      navigate("/trainerpaymentselection", {
                        state: {
                          totalAmount,
                          studentId: activeStudentId,
                          studentName: `${student.firstName} ${student.lastName}`,
                          month: item.key,
                          items: unpaidRecords,
                          student,
                          instituteId: student.instituteId || "",
                        },
                      });
                    };

                    return (
                      <>
                        {records.map((r, i) => (
                          <div
                            key={i}
                            className="px-5 py-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {/* Status Dot */}

                              <div
                                className={`w-3 h-3 rounded-full ${
                                  r.paid ? "bg-green-500" : "bg-red-500"
                                }`}
                              />

                              <div>
                                <p className="font-medium text-sm text-gray-800">
                                  {r.category}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {r.subCategory}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {r.paid ? (
                                <>
                                  <p className="text-green-600 font-semibold text-sm">
                                    Paid
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    ₹{r.paidAmount}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-red-600 font-semibold text-sm">
                                    Unpaid
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    ₹{r.amount}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Pay Button */}

                        {hasPending && (
                          <div className="px-5 pb-5 flex justify-end">
                            <button
                              onClick={handlePayNow}
                              className="
                        bg-blue-600
                        hover:bg-blue-700
                        text-white
                        rounded-xl
                        px-5
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                      "
                            >
                              Pay Now
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Summary */}
        {/* =========================
      Payment Summary
========================= */}
        <div className="px-4 mt-5 mb-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                Payment Summary
              </h2>

              <p className="text-xs text-gray-500 mt-1">Overall fee details</p>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Total Fees */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    💰
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Total Fees
                    </p>

                    <p className="text-xs text-gray-500">
                      Generated till this month
                    </p>
                  </div>
                </div>

                <p className="text-lg font-bold text-gray-900">
                  ₹{expectedTotalFee}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200"></div>

              {/* Paid */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    ✅
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Fees Paid
                    </p>

                    <p className="text-xs text-gray-500">
                      Successfully received
                    </p>
                  </div>
                </div>

                <p className="text-lg font-bold text-green-600">₹{totalPaid}</p>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200"></div>

              {/* Pending */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    ⏳
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Pending Fees
                    </p>

                    <p className="text-xs text-gray-500">
                      Remaining amount to pay
                    </p>
                  </div>
                </div>

                <p className="text-lg font-bold text-red-600">₹{pendingFee}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOverview;
