import React, { useEffect, useMemo, useState } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { jsPDF } from "jspdf";
import {
  Search,
  Copy,
  Check,
  Receipt,
  IndianRupee,
  X,
  Download,
  ChevronDown,
} from "lucide-react";

const MONTHS = [
  { label: "January", short: "Jan", value: "01" },
  { label: "February", short: "Feb", value: "02" },
  { label: "March", short: "Mar", value: "03" },
  { label: "April", short: "Apr", value: "04" },
  { label: "May", short: "May", value: "05" },
  { label: "June", short: "Jun", value: "06" },
  { label: "July", short: "Jul", value: "07" },
  { label: "August", short: "Aug", value: "08" },
  { label: "September", short: "Sep", value: "09" },
  { label: "October", short: "Oct", value: "10" },
  { label: "November", short: "Nov", value: "11" },
  { label: "December", short: "Dec", value: "12" },
];

/** Normalize fee-period keys like "2026-3", "2026-03", "03-2026" → "YYYY-MM" */
const normalizeMonthKey = (raw) => {
  if (!raw) return "";
  const s = String(raw).trim();
  const yyyyMm = s.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyyMm) {
    return `${yyyyMm[1]}-${String(yyyyMm[2]).padStart(2, "0")}`;
  }
  const mmYyyy = s.match(/^(\d{1,2})-(\d{4})$/);
  if (mmYyyy) {
    return `${mmYyyy[2]}-${String(mmYyyy[1]).padStart(2, "0")}`;
  }
  return s;
};

const formatFeeMonth = (raw) => {
  const key = normalizeMonthKey(raw);
  if (!key) return "N/A";
  const [year, month] = key.split("-");
  const found = MONTHS.find((m) => m.value === month);
  if (found && year) return `${found.label} ${year}`;
  return key;
};

/** App stores dates via toLocaleDateString() — prefer DD/MM/YYYY (India). */
const parsePaymentDate = (date, time = "00:00:00") => {
  if (!date) return null;
  try {
    const d = String(date).trim();
    const t = String(time || "00:00:00").trim();

    if (d.includes("/")) {
      const parts = d.split("/").map((p) => p.trim());
      if (parts.length === 3) {
        const [a, b, c] = parts;
        // Always treat as DD/MM/YYYY for this product
        const day = a.padStart(2, "0");
        const month = b.padStart(2, "0");
        const year = c.length === 2 ? `20${c}` : c;
        const parsed = new Date(`${year}-${month}-${day}T${normalizeTime(t)}`);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }

    if (d.includes("-") && d.length >= 8) {
      const parsed = new Date(`${d}T${normalizeTime(t)}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(`${d} ${t}`);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
};

const normalizeTime = (time) => {
  const t = String(time || "00:00:00").replace(/\s*(AM|PM)/i, "");
  const parts = t.split(":").map((p) => p.trim());
  const h = (parts[0] || "0").padStart(2, "0");
  const m = (parts[1] || "0").padStart(2, "0");
  const s = (parts[2] || "0").padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const getPaymentTimestamp = (payment) => {
  const fromCreated = payment?.createdAt?.toDate?.()?.getTime?.();
  if (fromCreated) return fromCreated;
  const parsed = parsePaymentDate(payment?.date, payment?.time);
  return parsed ? parsed.getTime() : 0;
};

const getPaymentFeeMonths = (payment) => {
  const keys = new Set();
  const top = normalizeMonthKey(payment?.month);
  if (top) keys.add(top);
  (payment?.items || []).forEach((item) => {
    const k = normalizeMonthKey(item?.month || payment?.month);
    if (k) keys.add(k);
  });
  return Array.from(keys);
};

const normalizeStatus = (status) => {
  const s = String(status || "paid").toLowerCase().trim();
  if (s === "success" || s === "captured" || s === "completed") return "paid";
  if (s === "failed" || s === "failure") return "failed";
  return s || "paid";
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

/** jsPDF default fonts don't render ₹ reliably — use Rs. in PDF */
const formatAmountPdf = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const safePdfText = (value, fallback = "-") => {
  const s = String(value ?? "")
    .replace(/\u20B9/g, "Rs. ")
    .replace(/[^\x20-\x7E\u00A0-\u024F]/g, "")
    .trim();
  return s || fallback;
};

const drawReceiptPdf = (payment, helpers) => {
  const {
    formatPaymentDateTime,
    formatFeeMonth,
    itemMonthLabel,
    normalizeStatus,
  } = helpers;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageW - margin;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need = 12) => {
    if (y + need <= pageH - margin) return;
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");
    y = margin;
  };

  const line = (x1, y1, x2, y2) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.35);
    pdf.line(x1, y1, x2, y2);
  };

  const sectionTitle = (title) => {
    ensureSpace(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, margin, y);
    y += 2;
    line(margin, y, right, y);
    y += 6;
  };

  const kv = (label, value) => {
    const labelW = 42;
    const text = safePdfText(value);
    const lines = pdf.splitTextToSize(text, contentW - labelW);
    ensureSpace(5 + lines.length * 4.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(lines, margin + labelW, y);
    y += Math.max(5.5, lines.length * 4.5);
  };

  // White page
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(0, 0, 0);
  pdf.text("KRIDANA", margin, y + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Official Fee Receipt", margin, y + 13);

  const status = normalizeStatus(payment.status).toUpperCase();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(status, right, y + 6, { align: "right" });
  pdf.setFontSize(13);
  pdf.text(formatAmountPdf(payment.totalAmount), right, y + 13, {
    align: "right",
  });

  y += 18;
  line(margin, y, right, y);
  y += 8;

  sectionTitle("STUDENT DETAILS");
  kv("Student name", payment.studentName || "Student");
  kv("Student ID", payment.studentId);
  kv("Fee month", formatFeeMonth(payment.month));

  y += 2;
  sectionTitle("PAYMENT DETAILS");
  kv("Paid on", formatPaymentDateTime(payment.date, payment.time));
  kv("Status", status);
  kv("Payment method", payment.paymentMethod || "Online");
  kv("Order ID", payment.orderId);
  kv("Payment ID", payment.paymentId);
  if (payment.utrNumber) kv("UTR / Ref", payment.utrNumber);
  if (payment.instituteUpiId) kv("UPI ID", payment.instituteUpiId);
  if (payment.instituteUpiName) kv("UPI name", payment.instituteUpiName);

  y += 2;
  sectionTitle("ITEMS PAID");

  // Table header
  ensureSpace(10);
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y - 4, contentW, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Item / Sport", margin + 1.5, y + 1);
  pdf.text("Fee month", margin + contentW * 0.52, y + 1);
  pdf.text("Amount", right - 1.5, y + 1, { align: "right" });
  y += 7;
  line(margin, y, right, y);
  y += 5;

  const items = Array.isArray(payment.items) ? payment.items : [];
  if (items.length === 0) {
    ensureSpace(8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text("No line items recorded for this payment.", margin, y);
    y += 7;
  } else {
    items.forEach((item, idx) => {
      const title = [item.category, item.subCategory].filter(Boolean).join(" / ");
      const titleLines = pdf.splitTextToSize(
        safePdfText(title, `Item ${idx + 1}`),
        contentW * 0.48,
      );
      const monthTxt = safePdfText(itemMonthLabel(item, payment));
      const amt = formatAmountPdf(item.amount ?? item.totalAmount);
      const rowH = Math.max(6, titleLines.length * 4.2);

      ensureSpace(rowH + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text(titleLines, margin + 1.5, y);
      pdf.setFontSize(9);
      pdf.text(monthTxt, margin + contentW * 0.52, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(amt, right - 1.5, y, { align: "right" });
      y += rowH;
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y - 1.5, right, y - 1.5);
      y += 2;
    });
  }

  y += 4;
  ensureSpace(22);
  line(margin, y, right, y);
  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text("TOTAL PAID", margin, y);
  pdf.text(formatAmountPdf(payment.totalAmount), right, y, { align: "right" });
  y += 6;
  line(margin, y, right, y);
  y += 10;

  ensureSpace(20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(60, 60, 60);
  const footer = pdf.splitTextToSize(
    "This is a computer-generated receipt from Kridana. Please keep it for your records. For support, contact your academy.",
    contentW,
  );
  pdf.text(footer, margin, y);
  y += footer.length * 4 + 6;
  pdf.setFontSize(8);
  pdf.text(`Generated on ${new Date().toLocaleString("en-IN")}`, margin, y);

  const safeName = safePdfText(payment.studentName, "Student")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const monthPart = safePdfText(
    formatFeeMonth(payment.month).replace(/\s+/g, "-"),
    "fee",
  );
  pdf.save(`Kridana-Receipt-${safeName}-${monthPart}.pdf`);
};

const PaymentHistory = () => {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      try {
        const snapshot = await getDocs(collectionGroup(db, "payments"));
        const allPayments = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const institutePayments = allPayments.filter(
          (p) => p.instituteId === user.uid,
        );

        const sortedPayments = [...institutePayments].sort(
          (a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a),
        );

        setPayments(sortedPayments);
      } catch (err) {
        console.error("Fetch receipts error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      p.items?.forEach((item) => {
        if (item.category) set.add(item.category);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  /** Fee-period months present in data (what receipts show as "For …") */
  const availableMonths = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      getPaymentFeeMonths(p).forEach((m) => set.add(m));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [payments]);

  const filtered = useMemo(() => {
    let temp = [...payments];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      temp = temp.filter(
        (p) =>
          p.studentName?.toLowerCase().includes(s) ||
          p.paymentId?.toLowerCase().includes(s) ||
          p.orderId?.toLowerCase().includes(s) ||
          p.utrNumber?.toLowerCase().includes(s) ||
          p.items?.some(
            (item) =>
              item.category?.toLowerCase().includes(s) ||
              item.subCategory?.toLowerCase().includes(s),
          ),
      );
    }

    if (statusFilter !== "all") {
      temp = temp.filter(
        (p) => normalizeStatus(p.status) === statusFilter,
      );
    }

    if (categoryFilter) {
      temp = temp.filter((p) =>
        p.items?.some((item) => item.category === categoryFilter),
      );
    }

    // Filter by fee period month (matches "For March 2026" on cards)
    if (monthFilter) {
      const want = normalizeMonthKey(monthFilter);
      temp = temp.filter((p) =>
        getPaymentFeeMonths(p).some((m) => m === want),
      );
    }

    return temp;
  }, [search, monthFilter, statusFilter, categoryFilter, payments]);

  const totals = useMemo(() => {
    const collected = filtered.reduce(
      (sum, p) => sum + Number(p.totalAmount || 0),
      0,
    );
    return { count: filtered.length, collected };
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

  const formatPaymentDateTime = (date, time) => {
    const parsed = parsePaymentDate(date, time);
    if (!parsed) {
      return [date, time].filter(Boolean).join(" • ") || "—";
    }
    const formattedDate = parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} • ${formattedTime}`;
  };

  const itemMonthLabel = (item, payment) =>
    formatFeeMonth(item?.month || payment?.month);

  const clearFilters = () => {
    setSearch("");
    setMonthFilter("");
    setStatusFilter("all");
    setCategoryFilter("");
    setShowMonthPicker(false);
  };

  const downloadReceipt = async (payment) => {
    if (!payment || downloadingId) return;
    setDownloadingId(payment.id);
    try {
      drawReceiptPdf(payment, {
        formatPaymentDateTime,
        formatFeeMonth,
        itemMonthLabel,
        normalizeStatus,
      });
    } catch (err) {
      console.error("Receipt download failed:", err);
      alert("Could not download receipt. Please try again.");
    } finally {
      setDownloadingId("");
    }
  };

  const hasFilters = Boolean(
    search || monthFilter || categoryFilter || statusFilter !== "all",
  );

  const monthFilterLabel = monthFilter
    ? formatFeeMonth(monthFilter)
    : "Fee month";

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F4F6FB] rounded-2xl">
        <p className="text-sm text-gray-500">Loading receipts...</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-[#F4F6FB] rounded-none sm:rounded-2xl overflow-hidden">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className={`relative ${showMonthPicker ? "z-30" : ""}`}>
            <button
              type="button"
              onClick={() => setShowMonthPicker((v) => !v)}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none flex items-center justify-between gap-2 text-left"
            >
              <span
                className={
                  monthFilter ? "text-gray-900 font-medium" : "text-gray-500"
                }
              >
                {monthFilterLabel}
              </span>
              <ChevronDown size={16} className="text-gray-400 shrink-0" />
            </button>

            {showMonthPicker ? (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto overscroll-contain">
                <button
                  type="button"
                  onClick={() => {
                    setMonthFilter("");
                    setShowMonthPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 ${
                    !monthFilter
                      ? "bg-orange-50 text-[#FF6A00] font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All fee months
                </button>
                {availableMonths.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-gray-400">
                    No fee months in receipts yet
                  </p>
                ) : (
                  availableMonths.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMonthFilter(m);
                        setShowMonthPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm ${
                        monthFilter === m
                          ? "bg-orange-50 text-[#FF6A00] font-semibold"
                          : "text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      {formatFeeMonth(m)}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

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

        {showMonthPicker ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-transparent cursor-default"
            aria-label="Close month picker"
            onClick={() => setShowMonthPicker(false)}
          />
        ) : null}

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { id: "all", label: "All status" },
            { id: "paid", label: "Paid" },
            { id: "pending", label: "Pending" },
            { id: "failed", label: "Failed" },
          ].map((status) => (
            <button
              key={status.id}
              type="button"
              onClick={() => setStatusFilter(status.id)}
              className={`shrink-0 min-h-[34px] px-3 rounded-full text-xs font-semibold ${
                statusFilter === status.id
                  ? "bg-[#FF6A00] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {status.label}
            </button>
          ))}
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 min-h-[34px] px-3 rounded-full text-xs font-semibold text-gray-500 bg-white border border-gray-200 inline-flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          ) : null}
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
              Try another search or fee month.
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 min-h-[40px] px-4 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filtered.map((p) => {
              const status = normalizeStatus(p.status);
              return (
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
                        Paid on {formatPaymentDateTime(p.date, p.time)}
                      </p>
                      <p className="text-[11px] text-[#FF6A00] font-medium mt-0.5">
                        Fee month · {formatFeeMonth(p.month)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full text-[11px] font-bold px-2.5 py-1 capitalize ${
                          status === "paid"
                            ? "bg-green-100 text-green-700"
                            : status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadReceipt(p);
                        }}
                        disabled={downloadingId === p.id}
                        className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg bg-white border border-orange-200 text-[#FF6A00] text-[11px] font-semibold disabled:opacity-60"
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
                      <IndianRupee
                        size={16}
                        className="text-orange-300 shrink-0"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {[
                        ["Order ID", p.orderId || "-"],
                        ["Payment ID", p.paymentId || "-"],
                        ...(p.paymentMethod
                          ? [["Method", p.paymentMethod]]
                          : []),
                        ...(p.utrNumber ? [["UTR / Ref", p.utrNumber]] : []),
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400">{label}</p>
                            <p className="text-xs font-medium text-gray-800 break-all">
                              {value}
                            </p>
                          </div>
                          {value && value !== "-" && label !== "Method" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(value);
                              }}
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
                      {(p.items || []).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No items</p>
                      ) : (
                        (p.items || []).map((item, i) => (
                          <div
                            key={`${p.id}-item-${i}`}
                            className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                {item.category}
                                {item.subCategory
                                  ? ` · ${item.subCategory}`
                                  : ""}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                For {itemMonthLabel(item, p)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                              {formatAmount(item.amount)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
