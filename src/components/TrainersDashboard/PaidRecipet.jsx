// src/pages/PaymentHistory.jsx
import React, { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const PaymentHistory = () => {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        setLoading(true);
        console.log("USER UID:", user?.uid);
        // ✅ Query only this trainer's payments
        const snapshot = await getDocs(collectionGroup(db, "payments"));

        let trainerPayments = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((p) => p.trainerId === user.uid);

        console.log("✅ TRAINER PAYMENTS:", trainerPayments);

        // ✅ Attach student names
        const enrichedPayments = await Promise.all(
          trainerPayments.map(async (p) => {
            try {
              const studentRef = doc(db, "trainerstudents", p.studentId);
              const studentSnap = await getDoc(studentRef);

              let studentName = "Unknown";

              if (studentSnap.exists()) {
                const data = studentSnap.data();
                studentName = `${data.firstName || ""} ${data.lastName || ""}`;
              }

              return {
                ...p,
                studentName,
              };
            } catch (err) {
              return {
                ...p,
                studentName: "Unknown",
              };
            }
          }),
        );

        setPayments(enrichedPayments);
        setFiltered(enrichedPayments);
      } catch (err) {
        alert("Index not created yet. Please wait...");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  // ✅ SEARCH + FILTER
  useEffect(() => {
    let temp = [...payments];

    // Search by student name
    if (search) {
      temp = temp.filter((p) =>
        p.studentName?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Filter by paid date month
    if (monthFilter) {
      const [selectedYear, selectedMonth] = monthFilter.split("-");

      temp = temp.filter((p) => {
        if (!p.paidDate) return false;

        const paymentDate = new Date(p.paidDate);

        const year = paymentDate.getFullYear().toString();
        const month = String(paymentDate.getMonth() + 1).padStart(2, "0");

        return year === selectedYear && month === selectedMonth;
      });
    }

    // Latest payment first
    temp.sort((a, b) => {
      const dateA = a.paidDate ? new Date(a.paidDate) : new Date(0);
      const dateB = b.paidDate ? new Date(b.paidDate) : new Date(0);

      return dateB - dateA;
    });

    setFiltered(temp);
  }, [search, monthFilter, payments]);
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

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
      {/* TOP HEADER */}
      <div className="sticky top-0 z-20 bg-white shadow px-4 py-4">
        <h1 className="text-2xl font-bold">Trainer Payment History</h1>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <input
            type="text"
            placeholder="Search by student name..."
            className="border p-2 rounded w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="month"
            className="border p-2 rounded"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
      </div>

      {/* SCROLLABLE LIST ONLY */}
      {/* PAYMENT LIST ONLY SCROLLS */}
      <div
        className="
    flex-1
    overflow-y-auto
    overflow-x-hidden
    px-4
    py-4
    pb-28
  "
      >
        {filtered.length === 0 ? (
          <div className="mt-10 text-center">
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-lg font-semibold text-gray-700">
                No payments found ❌
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Try selecting another month or clearing the search filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {filtered.map((p) => {
              let paidMonth = "N/A";

              if (p.month) {
                try {
                  const [year, month] = p.month.split("-");

                  const monthName = new Date(
                    year,
                    parseInt(month) - 1,
                  ).toLocaleString("en-IN", {
                    month: "long",
                  });

                  paidMonth = `${monthName} ${year}`;
                } catch {
                  paidMonth = p.month;
                }
              }

              return (
                <div
                  key={p.id}
                  className="
                  bg-white
                  p-5
                  rounded-xl
                  shadow
                  border
                "
                >
                  {/* HEADER */}
                  <div className="flex justify-between flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-green-600">
                        ₹{p.paidAmount}
                      </h2>

                      <p className="text-sm text-gray-500">
                        Paid on:{" "}
                        {p.paidDate
                          ? new Date(p.paidDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </p>
                    </div>

                    <span
                      className="
                      bg-green-100
                      text-green-700
                      px-3
                      py-1
                      rounded-full
                      text-sm
                      font-medium
                    "
                    >
                      Paid
                    </span>
                  </div>

                  <hr className="my-3" />

                  {/* DETAILS */}
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    <p>
                      <b>Student:</b> {p.studentName}
                    </p>

                    <p>
                      <b>Student ID:</b> {p.studentId}
                    </p>

                    <p>
                      <b>Trainer ID:</b> {p.trainerId}
                    </p>

                    <p>
                      <b>Category:</b> {p.category}
                    </p>

                    <p>
                      <b>Sub Category:</b> {p.subCategory}
                    </p>

                    <p>
                      <b>Month:</b> {paidMonth}
                    </p>
                  </div>

                  <hr className="my-3" />

                  <div className="text-sm">
                    <p>
                      <b>Total Amount:</b> ₹{p.totalAmount}
                    </p>

                    <p>
                      <b>Fee Waived:</b> {p.feeWaived ? "Yes" : "No"}
                    </p>

                    {p.feeWaived && (
                      <p>
                        <b>Reason:</b> {p.waiveReason || "-"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM SAFE SPACE FOR MOBILE NAVBAR */}
      <div className="h-10 shrink-0"></div>
    </div>
  );
};

export default PaymentHistory;
