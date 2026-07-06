// src/pages/PaymentHistory.jsx
import React, { useEffect, useState } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const PaymentHistory = () => {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const getPaymentTimestamp = (payment) => {
    try {
      const date = payment?.date || "";
      const time = payment?.time || "00:00:00";

      let parsedDate;

      if (date.includes("/")) {
        const parts = date.split("/");

        // DD/MM/YYYY
        if (parseInt(parts[0]) > 12) {
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]} ${time}`);
        } else {
          // MM/DD/YYYY
          parsedDate = new Date(`${date} ${time}`);
        }
      } else {
        parsedDate = new Date(`${date} ${time}`);
      }

      return parsedDate.getTime() || 0;
    } catch {
      return 0;
    }
  };
  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        // ✅ Fetch ALL payments from ALL users
        const snapshot = await getDocs(collectionGroup(db, "payments"));

        const allPayments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("🔥 ALL PAYMENTS:", allPayments);

        // ✅ Filter only this institute
        const institutePayments = allPayments.filter(
          (p) => p.instituteId === user.uid,
        );

        console.log("✅ FILTERED PAYMENTS:", institutePayments);

        // ✅ SORT LATEST PAYMENT FIRST
        // ✅ SORT BY PAID ON (LATEST FIRST)
        const sortedPayments = [...institutePayments].sort(
          (a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a),
        );

        setPayments(sortedPayments);
        setFiltered(sortedPayments);
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  // ✅ SEARCH + FILTER LOGIC
  useEffect(() => {
    let temp = [...payments];

    // 🔍 SEARCH (name, paymentId, orderId)
    if (search) {
      const s = search.toLowerCase();

      temp = temp.filter(
        (p) =>
          p.studentName?.toLowerCase().includes(s) ||
          p.paymentId?.toLowerCase().includes(s) ||
          p.orderId?.toLowerCase().includes(s),
      );
    }

    // 📅 MONTH FILTER (YYYY-MM)
    // 📅 FILTER BY PAID DATE MONTH (YYYY-MM)
    if (monthFilter) {
      temp = temp.filter((p) => {
        if (!p.date) return false;

        try {
          let paymentDate;

          if (p.date.includes("/")) {
            const parts = p.date.split("/");

            // DD/MM/YYYY
            if (parseInt(parts[0]) > 12) {
              paymentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              // MM/DD/YYYY
              paymentDate = new Date(p.date);
            }
          } else {
            paymentDate = new Date(p.date);
          }

          if (isNaN(paymentDate)) return false;

          const year = paymentDate.getFullYear();
          const month = String(paymentDate.getMonth() + 1).padStart(2, "0");

          return `${year}-${month}` === monthFilter;
        } catch {
          return false;
        }
      });
    }

    // 📆 DATE FILTER (based on saved date string)

    setFiltered(temp);
  }, [search, monthFilter, payments]);

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }
  const formatPaymentDateTime = (date, time) => {
    try {
      let parsedDate;

      // Handle DD/MM/YYYY
      if (date?.includes("/")) {
        const parts = date.split("/");

        // Detect Indian format
        if (parts[0].length <= 2 && parseInt(parts[0]) > 12) {
          parsedDate = new Date(
            `${parts[2]}-${parts[1]}-${parts[0]} ${time || ""}`,
          );
        } else {
          // MM/DD/YYYY
          parsedDate = new Date(`${date} ${time || ""}`);
        }
      } else {
        parsedDate = new Date(`${date} ${time || ""}`);
      }

      if (isNaN(parsedDate)) {
        return `${date} • ${time}`;
      }

      const formattedDate = parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const formattedTime = parsedDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return `${formattedDate} • ${formattedTime}`;
    } catch {
      return `${date} • ${time}`;
    }
  };
  return (
    <div
      className="
      h-full
      w-full
      flex
      flex-col
      bg-gray-100
      rounded-2xl
      shadow-sm
      overflow-hidden
    "
    >
      {/* FIXED HEADER */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-4 md:px-8 md:py-6">
        <h1 className="text-xl md:text-3xl font-bold mb-5">Payment History</h1>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search by student name..."
            className="
w-full
border
rounded-xl
px-4
py-3
focus:outline-none
focus:ring-2
focus:ring-orange-400
"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="month"
            className="
w-full
border
rounded-xl
px-4
py-3
focus:outline-none
focus:ring-2
focus:ring-orange-400
"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
      </div>
      {/* SCROLLABLE PAYMENT LIST */}
      <div
        className="
flex-1
overflow-y-auto
px-4
md:px-8
py-5
"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
            No payments found ❌
          </div>
        ) : (
          <div className="grid gap-5 py-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="
bg-white
rounded-2xl
border
border-gray-200
shadow-sm
hover:shadow-md
transition
p-5
md:p-6
"
              >
                {/* HEADER */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-green-600">
                      ₹{p.totalAmount}
                    </h2>

                    <p className="text-sm text-gray-500">
                      Paid on: {formatPaymentDateTime(p.date, p.time)}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-green-600 capitalize">
                    {p.status}
                  </p>
                </div>

                <hr className="my-3" />

                {/* DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                  <p>
                    <b>Student:</b> {p.studentName}
                  </p>

                  <p>
                    <b>Order ID:</b> {p.orderId}
                  </p>

                  <p>
                    <b>Payment ID:</b> {p.paymentId}
                  </p>
                </div>

                <hr className="my-3" />

                {/* ITEMS */}
                <div>
                  <h3 className="font-semibold mb-2">Items Paid:</h3>

                  {p.items?.map((item, i) => {
                    let paidMonth = "N/A";

                    let rawMonth = item?.month || p.month;

                    if (rawMonth) {
                      try {
                        const [year, month] = rawMonth.split("-");

                        const monthName = new Date(
                          year,
                          parseInt(month) - 1,
                        ).toLocaleString("en-IN", {
                          month: "long",
                        });

                        paidMonth = `${monthName} ${year}`;
                      } catch {
                        paidMonth = rawMonth;
                      }
                    }

                    return (
                      <div
                        key={i}
                        className="
flex
flex-col
md:flex-row
md:justify-between
md:items-center
gap-3
border-b
last:border-0
py-3
text-sm
"
                      >
                        <div>
                          <p>
                            {item.category} - {item.subCategory}
                          </p>

                          <p className="text-xs text-gray-500">
                            For Month: <b>{paidMonth}</b>
                          </p>
                        </div>

                        <span className="font-semibold text-green-600 whitespace-nowrap">
                          ₹{item.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
