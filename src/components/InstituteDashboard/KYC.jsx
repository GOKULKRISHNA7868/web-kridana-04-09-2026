import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  Building2,
  CreditCard,
  Mail,
  User,
  Briefcase,
  Landmark,
  Smartphone,
  CheckCircle2,
  Pencil,
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

const inputClass =
  "w-full min-h-[48px] h-12 px-4 border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-[16px] bg-white";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

const EDGE_SWIPE_PX = 32;
const EDGE_SWIPE_MIN_DX = 72;

const RazorpayKYC = ({ setActiveMenu }) => {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const touchRef = useRef({ x: 0, y: 0, fromEdge: false });
  const backLockRef = useRef(false);

  const [form, setForm] = useState({
    accountName: "",
    accountEmail: "",
    businessName: "",
    businessType: "",

    bankName: "",
    ifsc: "",
    accountNumber: "",
    confirmAccountNumber: "",
    beneficiaryName: "",

    // ✅ NEW UPI SECTION
    upiId: "",
    upiName: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [ifscInfo, setIfscInfo] = useState(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState("");
  /* =====================================================
     FETCH KYC
  ===================================================== */
  useEffect(() => {
    const fetchKYC = async () => {
      if (!uid) return;

      try {
        const ref = doc(db, "institutes", uid, "Kyc", "details");

        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          setForm({
            accountName: data.accountName || "",
            accountEmail: data.accountEmail || "",
            businessName: data.businessName || "",
            businessType: data.businessType || "",

            bankName: data.bankName || "",
            ifsc: data.ifsc || "",
            accountNumber: data.accountNumber || "",
            confirmAccountNumber:
              data.confirmAccountNumber || data.accountNumber || "",
            beneficiaryName: data.beneficiaryName || "",

            // ✅ UPI
            upiId: data.upiId || "",
            upiName: data.upiName || "",
          });

          setSubmitted(true);
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    fetchKYC();
  }, [uid]);

  /* =====================================================
     BACK NAVIGATION (button + edge swipe + browser/app back)
  ===================================================== */
  const leaveKyc = useCallback(() => {
    if (typeof setActiveMenu === "function") {
      setActiveMenu("Dashboard");
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    }
  }, [setActiveMenu]);

  const handleBack = useCallback(() => {
    if (backLockRef.current) return;
    backLockRef.current = true;
    window.setTimeout(() => {
      backLockRef.current = false;
    }, 350);

    if (showChargesModal) {
      setShowChargesModal(false);
      return;
    }

    if (editing) {
      setEditing(false);
      return;
    }

    leaveKyc();
  }, [showChargesModal, editing, leaveKyc]);

  const showChargesModalRef = useRef(showChargesModal);
  const editingRef = useRef(editing);
  const leaveKycRef = useRef(leaveKyc);

  useEffect(() => {
    showChargesModalRef.current = showChargesModal;
  }, [showChargesModal]);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    leaveKycRef.current = leaveKyc;
  }, [leaveKyc]);

  // Keep a history entry so Android / browser back stays inside the dashboard
  useEffect(() => {
    window.history.pushState({ kridanaKyc: true }, "");

    const onPopState = () => {
      if (showChargesModalRef.current) {
        setShowChargesModal(false);
        window.history.pushState({ kridanaKyc: true }, "");
        return;
      }
      if (editingRef.current) {
        setEditing(false);
        window.history.pushState({ kridanaKyc: true }, "");
        return;
      }
      leaveKycRef.current();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Left-edge swipe → back (corners only, not mid-screen scroll)
  useEffect(() => {
    const onTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      touchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        fromEdge: touch.clientX <= EDGE_SWIPE_PX,
      };
    };

    const onTouchEnd = (e) => {
      const touch = e.changedTouches?.[0];
      if (!touch || !touchRef.current.fromEdge) return;

      const dx = touch.clientX - touchRef.current.x;
      const dy = Math.abs(touch.clientY - touchRef.current.y);

      if (dx >= EDGE_SWIPE_MIN_DX && dy < 70) {
        handleBack();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleBack]);

  /* =====================================================
     HANDLE INPUT
  ===================================================== */
  const handleChange = (e) => {
    let { name, value } = e.target;

    // ✅ ALPHABET FIELDS
    const alphaFields = [
      "accountName",
      "businessName",
      "businessType",
      "bankName",
      "beneficiaryName",
      "upiName",
    ];

    if (alphaFields.includes(name)) {
      value = value.replace(/[^A-Za-z ]/g, "");

      value = value.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    if (name === "accountNumber" || name === "confirmAccountNumber") {
      value = value.replace(/[^0-9]/g, "");
    }

    if (name === "ifsc") {
      value = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);
      setIfscInfo(null);
      setIfscError("");
    }

    // ✅ UPI ID
    if (name === "upiId") {
      value = value.replace(/[^A-Za-z0-9@._-]/g, "").toLowerCase();
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     VALIDATION
  ===================================================== */
  const validate = () => {
    if (!form.accountName.trim()) {
      alert("Account Name required");
      return false;
    }

    if (!form.accountEmail.trim()) {
      alert("Account Email required");
      return false;
    }

    if (!form.businessName.trim()) {
      alert("Business Name required");
      return false;
    }

    if (!form.bankName.trim()) {
      alert("Bank name is required");
      return false;
    }

    if (!form.beneficiaryName.trim()) {
      alert("Beneficiary name is required");
      return false;
    }

    if (!form.accountNumber.trim()) {
      alert("Account number is required");
      return false;
    }

    if (!form.confirmAccountNumber.trim()) {
      alert("Please re-enter the account number");
      return false;
    }

    if (form.accountNumber !== form.confirmAccountNumber) {
      alert("Account numbers do not match");
      return false;
    }

    if (!form.ifsc.trim()) {
      alert("IFSC code is required");
      return false;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      alert("Enter a valid 11-character IFSC code");
      return false;
    }

    // ✅ UPI VALIDATION
    if (!form.upiId.trim()) {
      alert("UPI ID required");
      return false;
    }

    return true;
  };

  const lookupIfsc = async () => {
    const code = form.ifsc.trim().toUpperCase();
    if (code.length !== 11) {
      setIfscError("IFSC must be 11 characters");
      setIfscInfo(null);
      return;
    }

    setIfscLoading(true);
    setIfscError("");
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (!res.ok) {
        setIfscInfo(null);
        setIfscError("IFSC not found. Please check the code.");
        return;
      }
      const data = await res.json();
      setIfscInfo({
        bank: data.BANK || "",
        branch: data.BRANCH || "",
        city: data.CITY || "",
      });
      setForm((prev) => ({
        ...prev,
        ifsc: code,
        bankName: prev.bankName || data.BANK || "",
      }));
    } catch {
      setIfscInfo(null);
      setIfscError("Could not verify IFSC. Try again.");
    } finally {
      setIfscLoading(false);
    }
  };

  /* =====================================================
     SUBMIT
  ===================================================== */
  const handleSubmit = async () => {
    if (!uid) return;

    if (!validate()) return;

    try {
      setSaving(true);

      const ref = doc(db, "institutes", uid, "Kyc", "details");

      await setDoc(
        ref,
        {
          ...form,

          // ✅ PAYMENT SETTINGS
          paymentSettings: {
            upiId: form.upiId,
            upiName: form.upiName,
          },

          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSubmitted(true);
      setEditing(false);

      alert("✅ KYC Completed Successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving KYC");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */
  if (loading) {
    return (
      <div className="h-full min-h-[320px] flex flex-col bg-[#F4F6FB] rounded-2xl">
        <div className="px-3 sm:px-6 h-12 flex items-center gap-2.5 border-b border-gray-100">
          <button
            type="button"
            onClick={leaveKyc}
            className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <p className="font-semibold text-gray-900">Complete KYC</p>
        </div>
        <div className="flex-1 flex justify-center items-center px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm">Loading KYC details...</p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#F4F6FB] pb-[calc(var(--bottom-navbar-height,64px)+16px)] md:pb-6 relative">
      {/* Left-edge swipe hint zone (visual only) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5 z-20 sm:hidden"
        aria-hidden
      >
        <div className="h-16 w-1 rounded-full bg-orange-300/50 absolute top-1/2 -translate-y-1/2 left-0.5" />
      </div>

      {/* Sticky back header */}
      <div
        className="sticky top-0 z-30 bg-[#F4F6FB]/95 backdrop-blur border-b border-gray-100/80"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="h-10 w-10 shrink-0 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center active:scale-95 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-gray-900" strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {editing ? "Edit KYC" : "Complete KYC"}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 truncate">
              {showChargesModal
                ? "Review payment charges"
                : editing
                  ? "Update bank & UPI details"
                  : "Bank & UPI for receiving payments"}
            </p>
          </div>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="shrink-0 text-sm font-semibold text-gray-600 px-2 py-2"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 sm:px-8 py-5 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
              Razorpay KYC Details
            </h2>
            <p className="text-orange-100 text-center mt-1.5 text-sm">
              Complete your bank & UPI details for receiving payments
            </p>
          </div>

          <div className="p-4 sm:p-8">
            {/* =====================================================
               SUCCESS VIEW
            ===================================================== */}
            {submitted && !editing ? (
              <>
                <div className="bg-green-100 border border-green-300 text-green-700 rounded-2xl p-4 flex items-center gap-3 mb-8">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />

                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">
                      KYC Completed Successfully
                    </h3>

                    <p className="text-sm mt-1">
                      Students payments will be credited to your bank/UPI.
                    </p>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      label: "Account Name",
                      value: form.accountName,
                    },
                    {
                      label: "Account Email",
                      value: form.accountEmail,
                    },
                    {
                      label: "Business Name",
                      value: form.businessName,
                    },
                    {
                      label: "Business Type",
                      value: form.businessType,
                    },
                    {
                      label: "Bank Name",
                      value: form.bankName,
                    },
                    {
                      label: "Beneficiary Name",
                      value: form.beneficiaryName,
                    },
                    {
                      label: "Account Number",
                      value: form.accountNumber,
                    },
                    {
                      label: "IFSC Code",
                      value: form.ifsc,
                    },
                    {
                      label: "UPI ID",
                      value: form.upiId,
                    },
                    {
                      label: "UPI Name",
                      value: form.upiName,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-gray-50 border rounded-2xl p-4"
                    >
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>

                      <p className="font-semibold break-all text-sm sm:text-base">
                        {item.value || "-"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* EDIT BUTTON */}
                <button
                  onClick={() => setEditing(true)}
                  className="mt-8 w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 transition text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Pencil size={18} />
                  Edit Details
                </button>
              </>
            ) : (
              <>
                {/* =====================================================
                   BANK DETAILS
                ===================================================== */}
                {/* =====================================================
   ACCOUNT HOLDER DETAILS
===================================================== */}
                <div className="mb-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-5 flex items-center gap-2">
                    <User className="text-orange-500" />
                    Account Holder Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ACCOUNT HOLDER NAME */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Account Holder Name
                      </label>

                      <div className="relative">
                        <User
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          name="accountName"
                          value={form.accountName}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Enter account holder name"
                        />
                      </div>
                    </div>

                    {/* REGISTERED EMAIL */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Registered Email Address
                      </label>

                      <div className="relative">
                        <Mail
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="email"
                          name="accountEmail"
                          value={form.accountEmail}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Enter registered email"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* =====================================================
   BUSINESS DETAILS
===================================================== */}
                <div className="mb-8 border-t pt-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-5 flex items-center gap-2">
                    <Building2 className="text-orange-500" />
                    Business Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* BUSINESS NAME */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Academy / Business Name
                      </label>

                      <div className="relative">
                        <Building2
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          name="businessName"
                          value={form.businessName}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Enter academy or business name"
                        />
                      </div>
                    </div>

                    {/* BUSINESS TYPE */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Business Category
                      </label>

                      <div className="relative">
                        <Briefcase
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          name="businessType"
                          value={form.businessType}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Enter business category"
                        />
                      </div>
                    </div>

                    {/* PROFESSION */}
                  </div>
                </div>

                {/* =====================================================
   BANK ACCOUNT DETAILS
===================================================== */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  className="mb-8 border-t pt-8"
                >
                  <h3 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
                    <Landmark className="text-orange-500" />
                    Bank Account Details
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-5">
                    Enter details in this order: bank → beneficiary → account → IFSC
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        1. Bank Name
                      </label>
                      <div className="relative">
                        <Landmark
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          name="bankName"
                          value={form.bankName}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="e.g. State Bank of India"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        2. Beneficiary Name
                      </label>
                      <div className="relative">
                        <User
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          name="beneficiaryName"
                          value={form.beneficiaryName}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Name as per bank account"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        3. Account Number
                      </label>
                      <div className="relative">
                        <CreditCard
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          name="accountNumber"
                          value={form.accountNumber}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Enter bank account number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        4. Re-enter Bank Account Number
                      </label>
                      <div className="relative">
                        <CreditCard
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          name="confirmAccountNumber"
                          value={form.confirmAccountNumber}
                          onChange={handleChange}
                          className={`${inputClass} pl-10 ${
                            form.confirmAccountNumber &&
                            form.accountNumber !== form.confirmAccountNumber
                              ? "border-red-400"
                              : form.confirmAccountNumber &&
                                  form.accountNumber === form.confirmAccountNumber
                                ? "border-green-400"
                                : ""
                          }`}
                          placeholder="Re-enter account number"
                        />
                      </div>
                      {form.confirmAccountNumber ? (
                        <p
                          className={`mt-1.5 text-xs font-medium ${
                            form.accountNumber === form.confirmAccountNumber
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {form.accountNumber === form.confirmAccountNumber
                            ? "Account numbers match"
                            : "Account numbers do not match"}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        5. IFSC Code
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          name="ifsc"
                          value={form.ifsc}
                          onChange={handleChange}
                          className={`${inputClass} uppercase tracking-wide`}
                          placeholder="e.g. SBIN0001234"
                          maxLength={11}
                        />
                        <button
                          type="button"
                          onClick={lookupIfsc}
                          disabled={ifscLoading || form.ifsc.length !== 11}
                          className="min-h-[48px] sm:w-40 shrink-0 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:bg-gray-300 inline-flex items-center justify-center gap-1.5"
                        >
                          <Search size={15} />
                          {ifscLoading ? "Checking..." : "Verify IFSC"}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        11 characters. Added last so we can confirm your bank.
                      </p>
                      {ifscError ? (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {ifscError}
                        </p>
                      ) : null}
                      {ifscInfo ? (
                        <div className="mt-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-800">
                          <p className="font-semibold flex items-center gap-1">
                            <Check size={14} />
                            {ifscInfo.bank}
                          </p>
                          <p className="text-xs mt-0.5">
                            {ifscInfo.branch}
                            {ifscInfo.city ? ` · ${ifscInfo.city}` : ""}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>

                {/* =====================================================
                   UPI SECTION
                ===================================================== */}
                <div className="border-t pt-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-5 flex items-center gap-2">
                    <Smartphone className="text-green-600" />
                    UPI Payment Details
                  </h3>

                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-green-700 leading-relaxed">
                      Students payments paid through UPI will be transferred to
                      this UPI ID.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UPI ID */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        UPI ID
                      </label>

                      <div className="relative">
                        <Smartphone
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          name="upiId"
                          value={form.upiId}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          placeholder="example@paytm"
                        />
                      </div>
                    </div>

                    {/* UPI NAME */}
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        UPI Name
                      </label>

                      <input
                        type="text"
                        name="upiName"
                        value={form.upiName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Enter UPI holder name"
                      />
                    </div>
                  </div>
                </div>
                {/* IMPORTANT NOTE */}
                <div className="mt-8 bg-red-50 border border-red-300 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 text-xl">⚠️</div>

                    <div className="flex-1">
                      <h4 className="font-bold text-red-700 text-sm sm:text-base">
                        Important Payment Charges Information
                      </h4>

                      <p className="text-red-600 text-sm mt-1">
                        Please read the payment settlement and transaction
                        charge details before submitting your KYC.
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowChargesModal(true)}
                        className="mt-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition"
                      >
                        View Charges & Terms
                      </button>
                    </div>
                  </div>
                </div>
                {/* SUBMIT BUTTON */}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`mt-10 w-full h-12 rounded-2xl text-white font-semibold transition
                  ${
                    saving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {saving ? "Saving..." : "Submit KYC"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* PAYMENT CHARGES MODAL */}
      {showChargesModal && (
        <div
          className="fixed inset-0 z-[10050] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowChargesModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[min(90dvh,880px)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
            {/* Header */}
            <div className="bg-red-600 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base sm:text-lg">
                Payment charges
              </h3>
              <button
                type="button"
                onClick={() => setShowChargesModal(false)}
                className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 p-5 space-y-5 text-sm">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-700 mb-2">
                  1. Pay Using Your Business UPI QR Code
                </h4>

                <p className="font-semibold text-green-600 mb-2">
                  Zero Transaction Fees
                </p>

                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>Add your business UPI ID during KYC.</li>
                  <li>
                    Your business QR code will be generated automatically.
                  </li>
                  <li>Students can scan and pay directly.</li>
                  <li>No platform transaction fees are charged.</li>
                  <li>
                    Payments are credited directly to your linked bank account.
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h4 className="font-bold text-orange-700 mb-3">
                  2. Razorpay Payment Gateway Charges
                </h4>

                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">Domestic Payments</p>

                    <ul className="list-disc pl-5 text-gray-700">
                      <li>2% Transaction Fee</li>
                      <li>18% GST on Transaction Fee</li>
                      <li>Effective Charge: 2.36%</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold">
                      International Cards, AMEX, EMI & Corporate Cards
                    </p>

                    <ul className="list-disc pl-5 text-gray-700">
                      <li>3% Transaction Fee</li>
                      <li>18% GST on Transaction Fee</li>
                      <li>Effective Charge: 3.54%</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-700 mb-2">Example</h4>

                <p>
                  For a payment of <strong>₹100</strong>:
                </p>

                <ul className="list-disc pl-5 mt-2">
                  <li>Razorpay Fee: ₹2.36</li>
                  <li>Amount Settled: ₹97.64</li>
                </ul>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4">
                <h4 className="font-bold mb-2">Additional Information</h4>

                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>No setup fees.</li>
                  <li>No annual maintenance charges.</li>
                  <li>
                    Charges apply only to successful Razorpay transactions.
                  </li>
                  <li>
                    GST is calculated only on the transaction fee, not on the
                    total payment amount.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setShowChargesModal(false)}
                className="w-full min-h-[48px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RazorpayKYC;
