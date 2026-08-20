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
  const activeStudentId = selectedStudentUid || user?.uid;
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
  const sortedMonths = [...generatedMonths].sort((a, b) => {
    const aPaid = student.sports.every((sport) =>
      feeHistory.find(
        (f) =>
          f.month === a.key &&
          f.category === sport.category &&
          f.subCategory === sport.subCategory &&
          Number(f.paidAmount) > 0,
      ),
    );

    const bPaid = student.sports.every((sport) =>
      feeHistory.find(
        (f) =>
          f.month === b.key &&
          f.category === sport.category &&
          f.subCategory === sport.subCategory &&
          Number(f.paidAmount) > 0,
      ),
    );

    if (aPaid === bPaid) {
      return b.key.localeCompare(a.key);
    }

    return aPaid ? 1 : -1;
  });
  const [processing, setProcessing] = useState(false);
  const pendingMonths = sortedMonths.filter((month) => {
    return student.sports.some((sport) => {
      const rec = feeHistory.find(
        (f) =>
          f.month === month.key &&
          f.category === sport.category &&
          f.subCategory === sport.subCategory,
      );

      return !(rec && Number(rec.paidAmount) > 0);
    });
  }).length;
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };
  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://kridana-razorpay-backend.onrender.com";
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
    if (!activeStudentId) return;

    const fetchStudentData = async () => {
      setLoading(true);

      try {
        // =========================
        // Fetch student profile
        // =========================
        const studentRef = doc(db, "students", activeStudentId);
        const snap = await getDoc(studentRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const studentData = snap.data();
        setStudent(studentData);

        // =========================
        // Fetch payment history
        // =========================
        const feesRef = collection(db, "studentFees");

        const q = query(feesRef, where("studentId", "==", activeStudentId));

        const feesSnap = await getDocs(q);

        console.log(
          "Fetched Fees:",
          feesSnap.docs.map((d) => d.data()),
        );

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
        if (studentData.createdAt) {
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
              tempDate.getMonth() <= today.getMonth()) // ✅ include current month
          ) {
            const monthName = tempDate.toLocaleString("default", {
              month: "long",
            });

            const year = tempDate.getFullYear();
            const monthKey = `${year}-${String(
              tempDate.getMonth() + 1,
            ).padStart(2, "0")}`;

            const isPaid = history.some(
              (item) =>
                item.month ===
                `${year}-${String(tempDate.getMonth() + 1).padStart(2, "0")}`,
            );

            monthsArray.push({
              month: monthName,
              year,
              key: monthKey,
              paid: isPaid,
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
          f.month?.trim() === m.key?.trim() &&
          f.category?.trim().toLowerCase() ===
            sport.category?.trim().toLowerCase() &&
          f.subCategory?.trim().toLowerCase() ===
            sport.subCategory?.trim().toLowerCase(),
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

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      {/* HEADER */}

      <div className="z-30 bg-white px-4 py- border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              ←
            </button>

            <h1 className="text-lg font-semibold text-gray-800">
              Fees Details
            </h1>
          </div>

          <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 5h10l-4 5v4l-2 1V10L4 5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* FILTERS */}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubCategory("");
            }}
            className="bg-white border border-gray-200 rounded-xl px-3 h-11 text-sm shadow-sm outline-none"
          >
            <option value="">All Categories</option>

            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 h-11 text-sm shadow-sm outline-none"
          >
            <option value="">All SubCategories</option>

            {subCategories.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* CUSTOMER CARD */}

        <div className="rounded-3xl overflow-hidden shadow-md bg-gradient-to-br from-[#FF8A26] via-[#FF6A00] to-[#F4511E] text-white">
          <div className="p-5">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                  {student.firstName?.charAt(0)}
                </div>

                <div>
                  <p className="text-[12px] opacity-90">Customer 01</p>

                  <h2 className="font-semibold text-[17px]">
                    {student.firstName} {student.lastName}
                  </h2>

                  <p className="text-xs mt-1 leading-5 text-white/90">
                    {(student.sports || []).map((sport, i) => (
                      <span key={i}>
                        {sport.category} • {sport.subCategory}
                        {i !== student.sports.length - 1 && (
                          <>
                            <br />
                          </>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <button className="text-2xl leading-none">⋮</button>
            </div>

            <div className="mt-6 flex justify-between items-end">
              <div>
                <p className="text-xs opacity-90">Due Amount</p>

                <h1 className="text-4xl font-bold mt-1">₹{monthlyFee}</h1>
              </div>

              <div className="text-right">
                <p className="text-xs opacity-80">To be paid :</p>

                <p className="text-sm font-medium mt-1">
                  Every Month {student.monthlyDate}th
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder */}

        <div className="mt-4 bg-[#FFF2E8] rounded-xl px-4 py-3 flex justify-between items-center border border-orange-200">
          <div className="w-7 h-7 rounded-full bg-[#FF6A00] text-white flex items-center justify-center text-xs font-semibold">
            {pendingMonths}
          </div>
        </div>

        {/* PAYMENT HISTORY */}

        <div className="mt-5 space-y-4 overflow-y-auto pb-24">
          {/* Payment History */}
          {/* Payment History */}

          <p className="text-[11px] text-red-400 mb-3">
            ↓ Scroll to view previous and Pending Months: {pendingMonths}
          </p>

          {generatedMonths.length === 0 && (
            <p className="text-xs text-gray-400">No payments found</p>
          )}

          {sortedMonths.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Month Header */}

              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-lg">
                  {item.month} {item.year}
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  Due Date : {item.month} {student.monthlyDate}
                </p>
              </div>

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
                    paymentDate:
                      record?.paymentDate ||
                      record?.paidAt ||
                      record?.createdAt ||
                      null,
                  };
                });

                const handlePayNow = () => {
                  const unpaidRecords = student.sports
                    .map((sport) => {
                      const record = feeHistory.find(
                        (f) =>
                          f.month === item.key &&
                          f.category === sport.category &&
                          f.subCategory === sport.subCategory,
                      );

                      if (record && Number(record.paidAmount) > 0) return null;

                      return {
                        category: sport.category,
                        subCategory: sport.subCategory,
                        amount: Number(sport.fee || 0),
                      };
                    })
                    .filter(Boolean);

                  const totalAmount = unpaidRecords.reduce(
                    (sum, r) => sum + r.amount,
                    0,
                  );

                  navigate("/PaymentSelection", {
                    state: {
                      paymentType: "multiple",
                      studentId: activeStudentId,
                      studentName: `${student.firstName} ${student.lastName}`,
                      month: item.key,
                      items: unpaidRecords,
                      totalAmount,
                      student,
                    },
                  });
                };

                return (
                  <>
                    {records.map((r, i) => {
                      const handleSinglePayment = () => {
                        navigate("/PaymentSelection", {
                          state: {
                            paymentType: "single",
                            studentId: activeStudentId,
                            studentName: `${student.firstName} ${student.lastName}`,
                            month: item.key,
                            items: [
                              {
                                category: r.category,
                                subCategory: r.subCategory,
                                amount: r.amount,
                              },
                            ],
                            totalAmount: r.amount,
                            student,
                          },
                        });
                      };

                      const iconColor = r.subCategory
                        .toLowerCase()
                        .includes("karate")
                        ? "bg-black"
                        : r.subCategory.toLowerCase().includes("swimming")
                        ? "bg-sky-400"
                        : r.subCategory.toLowerCase().includes("tennis")
                        ? "bg-lime-500"
                        : "bg-orange-500";

                      return (
                        <div
                          key={i}
                          className="px-5 py-4 border-b last:border-b-0 border-gray-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div
                                className={`w-11 h-11 rounded-full ${iconColor} flex items-center justify-center text-white text-xs font-bold`}
                              >
                                {r.subCategory.charAt(0)}
                              </div>

                              <div>
                                <h4 className="font-medium text-gray-800">
                                  {r.category} - {r.subCategory}
                                </h4>

                                {r.paid ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-green-600 text-sm font-medium">
                                      Paid ₹{r.paidAmount}
                                    </span>

                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">
                                      ✓
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-red-500 text-sm font-medium">
                                    Unpaid ₹{r.amount}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              {r.paymentDate && r.paid && (
                                <p className="text-xs text-gray-400 mb-2">
                                  {r.paymentDate
                                    .toDate()
                                    .toLocaleDateString("en-IN")}
                                </p>
                              )}

                              {!r.paid && (
                                <button
                                  onClick={handleSinglePayment}
                                  className="bg-[#2F80ED] hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-4 py-2 transition"
                                >
                                  Pay Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {records.some((r) => !r.paid) && (
                      <div className="px-5 py-4 bg-gray-50 flex justify-end"></div>
                    )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Bottom Summary */}
        {/* Bottom Summary */}

        <div className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-gray-500 text-sm font-medium">
              Total Fees
            </span>

            <span className="text-lg font-bold text-gray-800">
              ₹{expectedTotalFee}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="text-gray-500 text-sm font-medium">Fees Paid</span>

            <span className="text-lg font-bold text-green-600">
              ₹{totalPaid}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-gray-500 text-sm font-medium">
              Pending Fees
            </span>

            <span className="text-lg font-bold text-red-500">
              ₹{pendingFee}
            </span>
          </div>
        </div>
      </div>

      {/* 🔴 Reminder Popup */}
      {showReminder && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl">
              🔔
            </div>

            <div>
              <p className="font-semibold">Payment Reminder</p>

              <p className="text-sm opacity-90">
                Fee is due on {student.monthlyDate}th
              </p>
            </div>
          </div>
        </div>
      )}
      {processing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[999] flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-8 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full border-[5px] border-orange-500 border-t-transparent animate-spin"></div>

            <h2 className="mt-6 text-lg font-semibold text-gray-800">
              Processing Payment
            </h2>

            <p className="text-gray-500 text-sm mt-2 text-center">
              Please wait while we connect securely with Razorpay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOverview;
