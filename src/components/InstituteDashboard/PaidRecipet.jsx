// src/pages/PaymentHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import html2pdf from "html2pdf.js";
import {
  Search,
  CalendarDays,
  Copy,
  Check,
  Receipt,
  IndianRupee,
  X,
  Download,
} from "lucide-react";

const PaymentHistory = () => {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
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
          p.orderId?.toLowerCase().includes(s) ||
          p.items?.some(
            (item) =>
              item.category?.toLowerCase().includes(s) ||
              item.subCategory?.toLowerCase().includes(s),
          ),
      );
    }

    if (statusFilter !== "all") {
      temp = temp.filter(
        (p) => String(p.status || "").toLowerCase() === statusFilter,
      );
    }

    if (categoryFilter) {
      temp = temp.filter((p) =>
        p.items?.some((item) => item.category === categoryFilter),
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
  }, [search, monthFilter, statusFilter, categoryFilter, payments]);

  const categories = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      p.items?.forEach((item) => {
        if (item.category) set.add(item.category);
      });
    });
    return Array.from(set);
  }, [payments]);

  const totals = useMemo(() => {
    const collected = filtered.reduce(
      (sum, p) => sum + Number(p.totalAmount || 0),
      0,
    );
    return {
      count: filtered.length,
      collected,
    };
  }, [filtered]);

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedId(value);
      window.setTimeout(() => setCopiedId(""), 1400);
    } catch {
      /* ignore */
    }
  };

  const formatAmount = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

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

  const itemMonthLabel = (item, payment) => {
    const rawMonth = item?.month || payment?.month;
    if (!rawMonth) return "N/A";
    try {
      const [year, month] = String(rawMonth).split("-");
      const monthName = new Date(year, parseInt(month, 10) - 1).toLocaleString(
        "en-IN",
        { month: "long" },
      );
      return `${monthName} ${year}`;
    } catch {
      return rawMonth;
    }
  };

  const downloadReceipt = async (payment) => {
    if (!payment || downloadingId) return;
    setDownloadingId(payment.id);
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-9999px";
    wrap.style.top = "0";
    wrap.style.width = "720px";
    wrap.style.background = "#fff";
    const itemsHtml = (payment.items || [])
      .map((item) => {
        return `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;">
            <div style="font-weight:600;">${item.category || ""}${item.subCategory ? ` · ${item.subCategory}` : ""}</div>
            <div style="color:#6b7280;font-size:11px;margin-top:3px;">For ${itemMonthLabel(item, payment)}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#16a34a;white-space:nowrap;">${formatAmount(item.amount)}</td>
        </tr>`;
      })
      .join("");
    wrap.innerHTML = `
      <div style="font-family:Arial,sans-serif;color:#111;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #FF6A00;padding-bottom:14px;">
          <div>
            <div style="font-size:22px;font-weight:800;color:#FF6A00;">Kridana</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">Fee Receipt</div>
          </div>
          <div style="text-align:right;">
            <div style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;text-transform:uppercase;">${payment.status || "paid"}</div>
            <div style="font-size:20px;font-weight:800;color:#16a34a;margin-top:8px;">${formatAmount(payment.totalAmount)}</div>
          </div>
        </div>
        <div style="margin-top:16px;font-size:13px;">
          <div><b>Student:</b> ${payment.studentName || "-"}</div>
          <div style="margin-top:6px;"><b>Paid on:</b> ${formatPaymentDateTime(payment.date, payment.time)}</div>
          <div style="margin-top:6px;"><b>Order ID:</b> ${payment.orderId || "-"}</div>
          <div style="margin-top:6px;"><b>Payment ID:</b> ${payment.paymentId || "-"}</div>
        </div>
        <table style="width:100%;margin-top:18px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;color:#6b7280;padding-bottom:8px;">Item</th>
              <th style="text-align:right;font-size:11px;color:#6b7280;padding-bottom:8px;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</table>
        <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;padding-top:12px;">
          <div style="font-size:12px;color:#6b7280;">Thank you for paying with Kridana</div>
          <div style="font-size:16px;font-weight:800;">Total ${formatAmount(payment.totalAmount)}</div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    try {
      await html2pdf()
        .set({
          margin: 8,
          filename: `Kridana-Receipt-${payment.studentName || payment.id}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(wrap)
        .save();
    } catch (err) {
      console.error("Receipt download failed:", err);
      alert("Could not download receipt. Please try again.");
    } finally {
      wrap.remove();
      setDownloadingId("");
    }
  };

  const hasFilters = Boolean(search || monthFilter || categoryFilter || statusFilter !== "all");

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F4F6FB] rounded-2xl">
        <p className="text-sm text-gray-500">Loading receipts...</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-[#F4F6FB] rounded-2xl overflow-hidden">
      <div className="shrink-0 bg-white border-b border-orange-100 px-3 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#FF6A00]">
              Paid receipts
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
              Student fee receipts for your academy
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-orange-50 px-3 py-1.5 text-right">
            <p className="text-[10px] text-gray-500">Collected</p>
            <p className="text-sm font-bold text-[#FF6A00]">
              {formatAmount(totals.collected)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-green-50 px-3 py-2">
            <p className="text-[10px] text-green-700">Receipts</p>
            <p className="text-sm font-bold text-gray-900">{totals.count}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-[10px] text-gray-500">Showing</p>
            <p className="text-sm font-bold text-gray-900">
              {filtered.length}/{payments.length}
            </p>
          </div>
        </div>

        <div className="relative mt-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Search student, ID or sport"
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-[16px] outline-none focus:border-orange-400 focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="relative">
            <CalendarDays
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="month"
              className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-2 text-sm outline-none focus:border-orange-400"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
          >
            <option value="">All sports</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {["all", "paid", "success", "pending"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 min-h-[34px] px-3 rounded-full text-xs font-semibold capitalize ${
                statusFilter === status
                  ? "bg-[#FF6A00] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {status === "all" ? "All status" : status}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setMonthFilter("");
                setStatusFilter("all");
                setCategoryFilter("");
              }}
              className="shrink-0 min-h-[34px] px-3 rounded-full text-xs font-semibold text-gray-500 bg-white border border-gray-200 inline-flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-5 py-3"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {filtered.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6">
            <Receipt size={34} className="text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-600">
              No receipts found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try another search or month.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-[#F8FFF9] border-b border-green-50">
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">Amount paid</p>
                    <p className="text-lg font-bold text-green-600 leading-tight">
                      {formatAmount(p.totalAmount)}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatPaymentDateTime(p.date, p.time)}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className="rounded-full bg-green-100 text-green-700 text-[11px] font-bold px-2.5 py-1 capitalize">
                      {p.status || "paid"}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadReceipt(p)}
                      disabled={downloadingId === p.id}
                      className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg bg-white border border-orange-200 text-[#FF6A00] text-[11px] font-semibold"
                    >
                      <Download size={13} />
                      {downloadingId === p.id ? "Saving..." : "Download"}
                    </button>
                  </div>
                </div>

                <div className="px-3.5 py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Student</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {p.studentName || "Student"}
                      </p>
                    </div>
                    <IndianRupee size={16} className="text-orange-300 shrink-0" />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      ["Order ID", p.orderId],
                      ["Payment ID", p.paymentId],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400">{label}</p>
                          <p className="text-xs font-medium text-gray-800 break-all">
                            {value || "-"}
                          </p>
                        </div>
                        {value ? (
                          <button
                            type="button"
                            onClick={() => copyText(value)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0"
                            aria-label={`Copy ${label}`}
                          >
                            {copiedId === value ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <Copy size={13} className="text-gray-500" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      Items paid
                    </p>
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
                          className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {item.category}
                              {item.subCategory ? ` · ${item.subCategory}` : ""}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              For {paidMonth}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                            {formatAmount(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
