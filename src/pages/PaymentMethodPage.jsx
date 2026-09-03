import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Landmark,
  CreditCard,
  Info,
  CheckCircle,
  Lock,
  ChevronLeft,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function PaymentMethodPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { amount, planType, billing } = location.state || {};

  const [selected, setSelected] = useState("upi");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ RAZORPAY SDK
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // ✅ SAVE PAYMENT
  const saveSubscription = async ({ method, paymentId, utrNumber }) => {
    const user = auth.currentUser;

    if (!user) return;

    const expiryDate = new Date();

    if (billing === "monthly") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    await setDoc(
      doc(db, "subscriptions", user.uid),
      {
        uid: user.uid,
        email: user.email,
        planType,
        billing,
        amount,
        paymentMethod: method,

        paymentId: paymentId || null,
        utrNumber: utrNumber || null,

        status: "active",

        createdAt: serverTimestamp(),

        expiryDate,
      },
      { merge: true },
    );
  };

  // ✅ RAZORPAY PAYMENT
  const handleRazorpay = async () => {
    try {
      setLoading(true);

      const loaded = await loadRazorpay();

      if (!loaded) {
        alert("Razorpay failed");
        return;
      }

      const res = await fetch(
        "https://kridana-razorpay-backend.onrender.com/create-order",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            amount: Number(amount) * 100,
          }),
        },
      );

      const order = await res.json();

      const options = {
        key: "rzp_live_SUjQtjkrUIwaHm",

        amount: order.amount,

        currency: "INR",

        order_id: order.id,

        name: "Kridana",

        description: `${planType} Subscription`,

        handler: async function (response) {
          await saveSubscription({
            method: "razorpay",
            paymentId: response.razorpay_payment_id,
          });

          navigate("/payment-success");
        },

        prefill: {
          email: auth.currentUser?.email,
        },

        theme: {
          color: "#f97316",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.open();
    } catch (err) {
      console.log(err);

      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ UTR SUBMIT
  const handleUTRSubmit = async () => {
    if (!utr) {
      alert("Enter UTR Number");
      return;
    }

    try {
      setLoading(true);

      await saveSubscription({
        method: "upi",
        utrNumber: utr,
      });

      navigate("/payment-success");
    } catch (err) {
      console.log(err);

      alert("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center py-4 md:py-6 bg-white">
      {/* 🔥 OUTER GREY CARD */}
      <div className="w-full max-w-[95%] md:max-w-3xl bg-[#FBF9F7] px-3 md:px-5 py-4 md:py-5 rounded-2xl">
        {/* CENTER CONTAINER */}
        <div className="w-full max-w-full md:max-w-lg lg:max-w-xl mx-auto relative px-2 md:px-3">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="bg-white border border-orange-100 shadow-sm rounded-xl p-2.5"
              >
                <ChevronLeft
                  className="text-orange-500"
                  size={20}
                  strokeWidth={2}
                />
              </button>

              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                  Choose Payment Method
                </h1>

                <p className="text-sm text-gray-500">Amount: ₹{amount}</p>
              </div>
            </div>
          </div>

          {/* TITLE */}
          <h1 className="text-center text-2xl md:text-3xl font-semibold text-gray-800">
            Choose Payment Method
          </h1>

          <div className="w-10 h-[3px] bg-orange-500 mx-auto my-2 rounded"></div>

          <p className="text-center text-gray-500 mb-6 text-sm">
            Your payment goes directly to the institution and trainers.
          </p>

          {/* ================= UPI ================= */}
          <div
            onClick={() => setSelected("upi")}
            className={`rounded-2xl p-5 shadow-sm border transition ${
              selected === "upi"
                ? "border-orange-400 bg-[#fff7f2]"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
              {/* RADIO */}
              <div className="mt-2">
                <div
                  className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${
                    selected === "upi" ? "border-orange-500" : "border-gray-300"
                  }`}
                >
                  {selected === "upi" && (
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* LOGO */}
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/5/5e/UPI-Logo-vector.svg"
                  className="w-8 h-8 object-contain"
                />
              </div>

              {/* TEXT */}
              <div className="flex-1">
                {/* TITLE */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <h2 className="font-semibold text-[15px] text-gray-800">
                    Pay through UPI (via UTR)
                  </h2>

                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs whitespace-nowrap">
                    <CheckCircle size={14} />
                    No Transaction Fee
                  </div>
                </div>

                <p className="text-gray-500 text-sm mt-1 leading-snug max-w-[360px]">
                  Pay using any UPI app and submit UTR to confirm your payment.
                </p>

                {/* FEATURE BOX */}
                <div className="mt-4 bg-[#fff3ea] p-4 rounded-xl border space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
                      <Landmark className="text-orange-500" size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        100% payment goes to Institution & Trainers
                      </p>

                      <p className="text-xs text-gray-500">
                        No fees deducted from your payment.
                      </p>
                    </div>
                  </div>

                  <hr />

                  <div className="flex gap-3">
                    <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
                      <Zap className="text-orange-500" size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium">Instant transfer</p>

                      <p className="text-xs text-gray-500">
                        Pay instantly using any UPI app.
                      </p>
                    </div>
                  </div>

                  <hr />

                  <div className="flex gap-3">
                    <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
                      <ShieldCheck className="text-orange-500" size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium">Secure & Trusted</p>

                      <p className="text-xs text-gray-500">
                        Your transaction is safe and secure.
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR + UTR */}
                {selected === "upi" && (
                  <div className="mt-5 bg-white border rounded-2xl p-4 flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        `upi://pay?pa=kridana@ibl&pn=Kridana&am=${amount}&cu=INR`,
                      )}`}
                      className="w-52 h-52"
                    />

                    <p className="mt-3 font-semibold">Scan & Pay ₹{amount}</p>

                    <input
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="Enter UTR Number"
                      className="mt-4 w-full border rounded-xl px-4 py-3 outline-none"
                    />

                    <button
                      onClick={handleUTRSubmit}
                      disabled={loading}
                      className="mt-4 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold"
                    >
                      {loading ? "Processing..." : "Submit UTR"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OR */}
          <div className="flex items-center justify-center my-6">
            <div className="flex-1 h-[1px] bg-gray-300"></div>

            <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white border border-gray-300 rounded-full text-sm font-semibold text-gray-700 shadow-sm mx-3">
              OR
            </div>

            <div className="flex-1 h-[1px] bg-gray-300"></div>
          </div>

          {/* ================= RAZORPAY ================= */}
          <div
            onClick={() => setSelected("razorpay")}
            className={`rounded-2xl p-5 shadow-sm transition border ${
              selected === "razorpay"
                ? "border-orange-400 bg-[#fff7f2]"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
              {/* RADIO */}
              <div className="mt-2">
                <div
                  className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${
                    selected === "razorpay"
                      ? "border-orange-500"
                      : "border-gray-300"
                  }`}
                >
                  {selected === "razorpay" && (
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* LOGO */}
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg"
                  className="w-8 h-8 object-contain"
                />
              </div>

              {/* CONTENT */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div>
                    <h2 className="font-semibold text-[15px] text-gray-800">
                      Pay using Razorpay
                    </h2>

                    <p className="text-gray-500 text-sm mt-1 max-w-[240px] md:max-w-[300px] leading-snug">
                      Pay securely using Credit Card, Debit Card or Net Banking.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs w-fit">
                    <Info size={14} />
                    Transaction Fee Applicable
                  </div>
                </div>

                {/* INNER WHITE BOX */}
                <div className="mt-4 bg-white border rounded-xl p-3 md:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="flex items-start gap-3 pr-4 md:border-r border-gray-200">
                      <CreditCard className="text-orange-500 mt-1" />

                      <div>
                        <p className="font-medium text-sm">Card Payments</p>

                        <p className="text-xs text-gray-500 leading-snug">
                          Visa, Mastercard, Rupay Credit / Debit Cards
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pl-4">
                      <Landmark className="text-orange-500 mt-1" />

                      <div>
                        <p className="font-medium text-sm">Net Banking</p>

                        <p className="text-xs text-gray-500 leading-snug">
                          All major banks supported
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-[#fff3ea] border border-orange-100 p-3 rounded-lg flex gap-2 items-start">
                    <Info className="text-orange-500 mt-1" size={16} />

                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="text-orange-600 font-medium">Note:</span>{" "}
                      Applicable transaction fee will be deducted from the
                      institution & trainer's settlement.
                    </p>
                  </div>
                </div>

                {selected === "razorpay" && (
                  <button
                    onClick={handleRazorpay}
                    disabled={loading}
                    className="mt-5 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold"
                  >
                    {loading ? "Processing..." : `Pay ₹${amount}`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* WHY */}
          <div className="mt-6 border border-orange-200 bg-[#fff7f2] p-4 rounded-xl flex items-start gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <Info className="text-orange-500" />
            </div>

            <div>
              <p className="text-orange-600 font-semibold text-sm">
                Why two options?
              </p>

              <p className="text-gray-600 text-sm">
                <span className="font-semibold text-gray-900">UPI via UTR</span>{" "}
                has no transaction fee. Razorpay charges a fee that is deducted
                from the institution & trainer.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-6 -mx-4 md:-mx-0 bg-[#fff7f2] border-t py-4 px-6 rounded-b-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-orange-500" size={20} />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Secure Payments
                  </p>

                  <p className="text-xs text-gray-500">100% Secure</p>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-gray-300"></div>

              <div className="flex items-center gap-3">
                <Lock className="text-orange-500" size={20} />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Encrypted & Safe
                  </p>

                  <p className="text-xs text-gray-500">
                    Your data is protected
                  </p>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-gray-300"></div>

              <div className="flex items-center gap-3">
                <ShieldCheck className="text-orange-500" size={20} />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Trusted by Thousands
                  </p>

                  <p className="text-xs text-gray-500">Safe & Reliable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
