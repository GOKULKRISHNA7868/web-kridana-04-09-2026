import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { logStaffAction } from "../../utils/trainerAccess";
import {
  History,
  User,
  Phone,
  Mail,
  CalendarDays,
  Receipt,
  Wallet,
  Check,
  Search,
  Minus,
  Plus,
  Info,
  QrCode,
} from "lucide-react";

const DEFAULT_SERVICES = [
  "Yoga - Drop In",
  "Spa Session",
  "Swimming - Drop In",
  "Drop In Class",
  "Guest Session",
  "Other",
];

const toISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (iso) => {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const isReadableLabel = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^\d+(\.\d+)?$/.test(text)) return false;
  return /[A-Za-z]/.test(text);
};

const emptyForm = (billDate) => ({
  customerName: "",
  phone: "",
  email: "",
  service: "",
  customService: "",
  billDate,
  price: "",
  gstPercent: "18",
  quantity: 1,
});

const DailyBill = ({ instituteId: overrideId, actor = null } = {}) => {
  const instituteId = overrideId || auth.currentUser?.uid;
  const [view, setView] = useState("new");
  const [form, setForm] = useState(() => emptyForm(toISODate()));
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [instituteName, setInstituteName] = useState("Academy");
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [customers, setCustomers] = useState([]);
  const [dayBills, setDayBills] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [historyService, setHistoryService] = useState("all");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem("openDailyBillHistory") === "1") {
      setView("history");
      sessionStorage.removeItem("openDailyBillHistory");
    }
  }, []);

  const billDate = form.billDate || toISODate();

  const calc = useMemo(() => {
    const price = Number(form.price || 0);
    const qty = Math.max(1, Number(form.quantity || 1));
    const gstPercent = Math.max(0, Number(form.gstPercent || 0));
    const subtotal = price * qty;
    const gstAmount = (subtotal * gstPercent) / 100;
    return {
      subtotal: Number(subtotal.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      total: Number((subtotal + gstAmount).toFixed(2)),
    };
  }, [form.price, form.quantity, form.gstPercent]);

  const selectedService =
    form.service === "Other" ? form.customService.trim() : form.service;

  const canSave =
    Boolean(form.customerName.trim()) &&
    form.phone.replace(/\D/g, "").length === 10 &&
    Boolean(selectedService) &&
    Boolean(billDate) &&
    Number(form.price) > 0 &&
    Number(form.quantity) > 0;

  const upiLink = useMemo(() => {
    if (!upiId || calc.total <= 0) return "";
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName || instituteName,
      am: String(calc.total),
      cu: "INR",
      tn: `Daily bill ${billDate}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, upiName, instituteName, calc.total, billDate]);

  const qrSrc = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`
    : "";

  useEffect(() => {
    if (!instituteId) return;

    const loadSetup = async () => {
      try {
        const [instituteSnap, kycSnap, studentsSnap] = await Promise.all([
          getDoc(doc(db, "institutes", instituteId)),
          getDoc(doc(db, "institutes", instituteId, "Kyc", "details")),
          getDocs(
            query(collection(db, "students"), where("instituteId", "==", instituteId)),
          ),
        ]);

        const extraServices = [];
        if (instituteSnap.exists()) {
          const data = instituteSnap.data();
          setInstituteName(data.instituteName || data.academyName || "Academy");
          (data.trainingPrograms || []).forEach((item) => {
            const name = item?.subCategory || item?.programName || item?.title;
            if (isReadableLabel(name)) extraServices.push(String(name).trim());
          });
        }

        if (kycSnap.exists()) {
          const kyc = kycSnap.data();
          setUpiId(kyc.upiId || kyc.paymentSettings?.upiId || "");
          setUpiName(kyc.upiName || kyc.paymentSettings?.upiName || "");
        }

        setServices(
          [...new Set([...DEFAULT_SERVICES, ...extraServices])].filter(
            isReadableLabel,
          ),
        );
        setCustomers(
          studentsSnap.docs
            .map((item) => {
              const data = item.data();
              return {
                id: item.id,
                name: data.studentName || data.name || data.fullName || "",
                phone: String(data.phoneNumber || data.phone || "").replace(
                  /\D/g,
                  "",
                ),
                email: data.email || "",
              };
            })
            .filter((item) => isReadableLabel(item.name)),
        );
      } catch (error) {
        console.error("Daily bill setup error:", error);
      }
    };

    loadSetup();
  }, [instituteId]);

  const loadDayBills = async (dateValue) => {
    if (!instituteId || !dateValue) return;
    try {
      const snap = await getDocs(
        collection(db, "institutes", instituteId, "dailyBills"),
      );
      const rows = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.date === dateValue)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDayBills(rows);
    } catch (error) {
      console.error("Day bills error:", error);
    }
  };

  const loadHistory = async () => {
    if (!instituteId) return;
    setLoadingHistory(true);
    try {
      const snap = await getDocs(
        collection(db, "institutes", instituteId, "dailyBills"),
      );
      setHistory(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
      );
    } catch (error) {
      console.error("History error:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDayBills(billDate);
  }, [instituteId, billDate]);

  useEffect(() => {
    if (view === "history") loadHistory();
  }, [view, instituteId]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const applyCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      customerName: customer.name,
      phone: String(customer.phone || "").slice(-10),
      email: customer.email || "",
    }));
  };

  const handlePaid = async () => {
    if (!instituteId || !canSave || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const phone = form.phone.replace(/\D/g, "").slice(-10);
      const [year, month] = billDate.split("-");
      await addDoc(collection(db, "institutes", instituteId, "dailyBills"), {
        instituteId: instituteId,
        customerName: form.customerName.trim(),
        phone,
        email: form.email.trim(),
        service: selectedService,
        date: billDate,
        year,
        month,
        price: Number(form.price),
        gstPercent: Number(form.gstPercent || 0),
        quantity: Number(form.quantity),
        subtotal: calc.subtotal,
        gstAmount: calc.gstAmount,
        total: calc.total,
        paidAmount: calc.total,
        status: "paid",
        paymentMethod: "manual_paid",
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        createdBy: actor?.trainerUid || instituteId,
        createdByName: actor?.name || "Academy",
        createdByRole: actor?.role || "institute",
      });
      if (actor?.trainerUid) {
        await logStaffAction({
          instituteId,
          trainerUid: actor.trainerUid,
          trainerName: actor.name,
          action: "daily_bill",
          page: "Daily bill",
          details: `Saved bill for ${form.customerName.trim()} · ${selectedService}`,
        });
      }
      setNotice("Bill marked as paid and saved for this date.");
      setForm((prev) => emptyForm(prev.billDate));
      await loadDayBills(billDate);
    } catch (error) {
      console.error("Save daily bill error:", error);
      setNotice("Could not save the bill. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();
    return history.filter((item) => {
      if (historyDate && item.date !== historyDate) return false;
      if (historyService !== "all" && item.service !== historyService) {
        return false;
      }
      if (!keyword) return true;
      return `${item.customerName || ""} ${item.phone || ""} ${item.service || ""}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [history, historySearch, historyDate, historyService]);

  const dayTotal = dayBills.reduce(
    (sum, item) => sum + Number(item.total || item.paidAmount || 0),
    0,
  );

  return (
    <div className="min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Daily Bill</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Walk-in yoga, spa, swimming and one-time visitors
          </p>
          {actor?.name && (
            <p className="text-[11px] text-orange-600 mt-1">
              Saved bills show your name to the academy
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setView(view === "new" ? "history" : "new")}
          className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
        >
          {view === "new" ? <History size={16} /> : <Receipt size={16} />}
          {view === "new" ? "History" : "New bill"}
        </button>
      </div>

      {view === "new" ? (
        <div className="flex-1 min-h-0 overflow-y-auto pb-6 space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
              Bill date
            </p>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                <CalendarDays size={18} className="text-orange-500" />
                {formatDisplayDate(billDate)}
              </div>
              <input
                type="date"
                value={billDate}
                max={toISODate()}
                onChange={(event) => updateField("billDate", event.target.value)}
                className="min-h-[44px] border border-orange-200 rounded-xl px-3 bg-white text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {dayBills.length} bill{dayBills.length === 1 ? "" : "s"} on this date
              · ₹ {money(dayTotal)} collected
            </p>
          </div>

          {notice ? (
            <div className="rounded-xl bg-emerald-50 text-emerald-800 text-sm px-4 py-3">
              {notice}
            </div>
          ) : null}

          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <User size={16} className="text-orange-500" />
              Customer details
            </h2>
            {customers.length > 0 && (
              <select
                className="w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm mb-3"
                defaultValue=""
                onChange={(event) => {
                  const found = customers.find((item) => item.id === event.target.value);
                  if (found) applyCustomer(found);
                }}
              >
                <option value="">New walk-in customer</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Customer name <span className="text-red-500">*</span>
                </span>
                <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3">
                  <User size={16} className="text-gray-400" />
                  <input
                    value={form.customerName}
                    onChange={(event) => updateField("customerName", event.target.value)}
                    className="w-full min-h-[44px] outline-none text-sm"
                    placeholder="Rohan Sharma"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Phone number <span className="text-red-500">*</span>
                </span>
                <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    className="w-full min-h-[44px] outline-none text-sm"
                    placeholder="9876543210"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email ID (optional)</span>
                <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3">
                  <Mail size={16} className="text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="w-full min-h-[44px] outline-none text-sm"
                    placeholder="rohan@gmail.com"
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Receipt size={16} className="text-orange-500" />
              Bill details
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Service / class <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.service}
                  onChange={(event) => updateField("service", event.target.value)}
                  className="mt-1 w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
                >
                  <option value="">Select service</option>
                  {services.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              {form.service === "Other" && (
                <input
                  value={form.customService}
                  onChange={(event) => updateField("customService", event.target.value)}
                  placeholder="Enter service name"
                  className="w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Price (₹) <span className="text-red-500">*</span>
                  </span>
                  <input
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value.replace(/[^\d.]/g, ""))
                    }
                    className="mt-1 w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
                    placeholder="400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    GST (%) <span className="text-red-500">*</span>
                  </span>
                  <input
                    inputMode="decimal"
                    value={form.gstPercent}
                    onChange={(event) =>
                      updateField("gstPercent", event.target.value.replace(/[^\d.]/g, ""))
                    }
                    className="mt-1 w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
                    placeholder="18"
                  />
                </label>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Quantity / sessions <span className="text-red-500">*</span>
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("quantity", Math.max(1, Number(form.quantity) - 1))
                    }
                    className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="min-w-[32px] text-center font-semibold">
                    {form.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateField("quantity", Number(form.quantity || 1) + 1)
                    }
                    className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Price summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹ {money(calc.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST ({form.gstPercent || 0}%)</span>
                <span>₹ {money(calc.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-orange-600 pt-1">
                <span>Total amount</span>
                <span>₹ {money(calc.total)}</span>
              </div>
              <div className="mt-2 rounded-xl bg-orange-50 px-4 py-3 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Amount payable</span>
                <span className="text-xl font-bold text-orange-600">
                  ₹ {money(calc.total)}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-orange-500" />
              Payment
            </h2>
            <p className="text-xs text-gray-500 mb-4">Scan to collect payment</p>
            {upiId ? (
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="UPI QR"
                    className="w-40 h-40 rounded-xl border border-gray-100 bg-white"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-xl bg-gray-50 flex items-center justify-center">
                    <QrCode className="text-gray-400" />
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">Scan & collect payment</p>
                  <p className="mt-1">
                    Ask the customer to scan this QR. It uses your academy UPI (
                    {upiId}).
                  </p>
                  <p className="mt-3 font-semibold text-orange-600">
                    Payment amount ₹ {money(calc.total)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-3">
                Add your UPI ID in Complete KYC to show a payment QR here.
              </p>
            )}
            <div className="mt-4 flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 rounded-xl px-3 py-3">
              <Info size={16} className="mt-0.5 shrink-0" />
              After payment, tap Paid. This bill is saved only for your academy
              login.
            </div>
          </section>

          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handlePaid}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {saving ? "Saving..." : "PAID"}
          </button>

          {dayBills.length > 0 && (
            <section className="bg-white border border-gray-100 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Bills on {formatDisplayDate(billDate)}
              </h3>
              <div className="space-y-2">
                {dayBills.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {item.customerName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.service} · {item.phone}
                      </p>
                      {item.createdByName && (
                        <p className="text-[11px] text-orange-600 truncate">
                          Saved by {item.createdByName}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-orange-600 shrink-0">
                      ₹ {money(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pb-6 space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3">
              <Search size={16} className="text-gray-400" />
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search name, phone or service"
                className="w-full min-h-[44px] outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={historyDate}
                onChange={(event) => setHistoryDate(event.target.value)}
                className="min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
              />
              <select
                value={historyService}
                onChange={(event) => setHistoryService(event.target.value)}
                className="min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
              >
                <option value="all">All services</option>
                {[
                  ...new Set(
                    history.map((item) => item.service).filter(isReadableLabel),
                  ),
                ].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loadingHistory ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No daily bills for these filters.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedBill(item)}
                  className="w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {item.customerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDisplayDate(item.date)} · {item.service}
                      </p>
                      <p className="text-xs text-gray-400">{item.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-orange-600">
                        ₹ {money(item.total)}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold">Paid</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedBill && (
        <div
          className="fixed inset-0 z-[80] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                  Daily bill
                </p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedBill.customerName}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDisplayDate(selectedBill.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                className="min-h-[40px] px-3 text-sm font-semibold text-orange-500"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Phone</span>
                <span className="font-semibold text-gray-800">
                  {selectedBill.phone ? `+91 ${selectedBill.phone}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Email</span>
                <span className="font-semibold text-gray-800 break-all text-right">
                  {selectedBill.email || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Service</span>
                <span className="font-semibold text-gray-800 text-right">
                  {selectedBill.service}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Quantity</span>
                <span className="font-semibold text-gray-800">
                  {selectedBill.quantity || 1}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Price</span>
                <span>₹ {money(selectedBill.price)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Subtotal</span>
                <span>₹ {money(selectedBill.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">
                  GST ({selectedBill.gstPercent || 0}%)
                </span>
                <span>₹ {money(selectedBill.gstAmount)}</span>
              </div>
              <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-900">Total paid</span>
                <span className="font-bold text-orange-600">
                  ₹ {money(selectedBill.total || selectedBill.paidAmount)}
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-semibold pt-1">
                Status: Paid
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyBill;
