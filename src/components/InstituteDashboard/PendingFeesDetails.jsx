import React, { useEffect, useState } from "react";
import { SlidersHorizontal, ArrowLeft, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { isPersonActiveInMonth, isPersonCurrentlyActive } from "../../utils/personStatus";

const PendingFeesDetails = () => {
  const { branch } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ================= SWIPE BACK =================
  useEffect(() => {
    let startX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;

      if (endX - startX > 100) {
        navigate(-1); // swipe right → go back
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);

  // ================= FETCH =================
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const studentSnap = await getDocs(
        query(
          collection(db, "students"),
          where("instituteId", "==", user.uid),
          where("branch", "==", branch),
        ),
      );

      let students = studentSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const feeSnap = await getDocs(
        query(
          collection(db, "studentFees"),
          where("instituteId", "==", user.uid),
        ),
      );

      let fees = feeSnap.docs.map((d) => d.data());

      // MONTH FILTER
      let filterKey = "";
      if (selectedMonth && selectedYear) {
        filterKey = `${selectedYear}-${selectedMonth}`;
        fees = fees.filter((f) => f.month === filterKey);
      }

      // MONTH / MEMBERSHIP FILTER
      // Past month → students active that month; no month → current members only
      if (filterKey) {
        students = students.filter((s) =>
          isPersonActiveInMonth(s, selectedYear, selectedMonth),
        );
      } else {
        students = students.filter((s) => isPersonCurrentlyActive(s));
      }

      let final = students.map((s) => {
        const fee = fees.find((f) => f.studentId === s.id);

        const total = fee?.totalAmount || s.monthlyFee || 0;
        const paid = fee?.paidAmount || 0;
        const pending = total - paid;

        return {
          name: `${s.firstName} ${s.lastName}`,
          pending,
          paid,
          total,
          paidDate: fee?.paidDate || "-",
        };
      });

      // STATUS FILTER
      if (statusFilter === "paid") {
        final = final.filter((d) => d.pending === 0);
      } else if (statusFilter === "unpaid") {
        final = final.filter((d) => d.pending > 0);
      }

      setData(final);
    };

    fetchData();
  }, [user, branch, selectedMonth, selectedYear, statusFilter]);

  return (
    <div className="min-h-screen bg-[#FFF9F5] px-4 py-5 max-w-md mx-auto">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between mb-5">
        {/* LEFT (BACK + TITLE) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-lg shadow"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-lg font-bold text-[#FF6A00]">Pending Fees</h1>
        </div>

        {/* FILTER */}
        <button
          onClick={() => setShowFilter(true)}
          className="p-2 bg-white rounded-lg shadow"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* BRANCH */}
      <div className="text-sm text-gray-600 mb-4">
        Branch: <span className="font-semibold">{branch}</span>
      </div>

      {/* ================= LIST ================= */}
      {data.length === 0 ? (
        <div className="text-center text-gray-500 mt-20 text-sm">
          No students available for selected filters
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => {
            const letter = item.name?.charAt(0)?.toUpperCase();

            return (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-xl shadow-sm overflow-hidden"
              >
                {/* INDEX */}
                <div className="w-12 h-12 flex items-center justify-center bg-[#2D2D2D] font-bold text-[#FF6A00]">
                  {letter}
                </div>

                {/* CONTENT */}
                <div className="flex-1 px-3 text-sm">
                  <div className="font-medium text-gray-800">{item.name}</div>

                  <div className="text-xs text-gray-500">
                    Paid: ₹{item.paid} / ₹{item.total}
                  </div>

                  <div className="text-xs text-gray-400">
                    Date: {item.paidDate}
                  </div>
                </div>

                {/* STATUS */}
                <div
                  className={`text-sm font-semibold pr-4 ${
                    item.pending > 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {item.pending > 0 ? `₹${item.pending}` : "Paid"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= FILTER MODAL ================= */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 animate-slideUp">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#FF6A00]">Filters</h2>

              <button onClick={() => setShowFilter(false)}>
                <X size={18} />
              </button>
            </div>

            {/* STATUS */}
            <div className="mb-3">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {/* YEAR */}
            <div className="mb-3">
              <label className="text-xs text-gray-500">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="">Select Year</option>
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>

            {/* MONTH */}
            <div className="mb-4">
              <label className="text-xs text-gray-500">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="">Select Month</option>
                <option value="01">Jan</option>
                <option value="02">Feb</option>
                <option value="03">Mar</option>
                <option value="04">Apr</option>
                <option value="05">May</option>
                <option value="06">Jun</option>
                <option value="07">Jul</option>
                <option value="08">Aug</option>
                <option value="09">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setSelectedMonth("");
                  setSelectedYear("");
                  setStatusFilter("all");
                }}
                className="text-gray-500 text-sm"
              >
                Reset
              </button>

              <button
                onClick={() => setShowFilter(false)}
                className="bg-[#FF6A00] text-white px-4 py-2 rounded-lg font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingFeesDetails;
