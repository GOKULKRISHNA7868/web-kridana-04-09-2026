import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Lock,
  ChevronLeft,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function TrainerPaymentSelection() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const { totalAmount, studentId, studentName, month, items } = state || {};

  const [selected, setSelected] = useState("upi");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [student, setStudent] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [kyc, setKyc] = useState(null);

  const API_URL = "https://kridana-razorpay-backend.onrender.com";

  // 🔥 LOAD STUDENT + TRAINER + KYC
  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) {
        navigate("/");
        return;
      }

      try {
        // ✅ STUDENT
        const studentRef = doc(db, "trainerstudents", studentId);
        const snap = await getDoc(studentRef);

        if (!snap.exists()) {
          alert("Student not found");
          navigate("/");
          return;
        }

        const studentData = snap.data();
        setStudent(studentData);

        const trainerId = studentData?.trainerId;
        if (!trainerId) return;

        // ✅ TRAINER
        const trainerRef = doc(db, "trainers", trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists()) {
          setTrainer(trainerSnap.data());
        }

        // ✅ KYC (IMPORTANT)
        const kycRef = doc(db, "trainers", trainerId, "Kyc", "details");
        const kycSnap = await getDoc(kycRef);

        if (kycSnap.exists()) {
          setKyc(kycSnap.data());
        }
      } catch (err) {
        console.error("Payment load error:", err);
      }
    };

    fetchData();
  }, [studentId]);

  // 🔥 Razorpay
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleRazorpay = async () => {
    try {
      setLoading(true);

      const ok = await loadRazorpayScript();
      if (!ok) return alert("Razorpay failed");

      const res = await fetch(`${API_URL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount * 100 }),
      });

      const order = await res.json();

      const options = {
        key: "rzp_live_SUjQtjkrUIwaHm",
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "Kridana",

        prefill: {
          name: studentName,
          email: student?.email || "",
          contact: student?.phone || "",
        },

        handler: async (response) => {
          await fetch(`${API_URL}/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          navigate("/feepaymentsuccess", {
            state: {
              ...response,
              studentId,
              studentName,
              month,
              items,
              totalAmount,
              paymentMethod: "razorpay",
              status: "success",
            },
          });
        },
      };

      new window.Razorpay(options).open();
    } catch (e) {
      console.log(e);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };
  const upiId = kyc?.upiId || "9113831872@okbizaxis";
  const upiName = kyc?.upiHolderName || "Trainer";

  const copyUPI = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.log(err);
    }
  };
  // 🔥 UPI SUBMIT (FIXED → NOW GOES TO SAVE FLOW)
  const handleUTRSubmit = () => {
    if (!utr) return alert("Enter UTR");

    navigate("/feepaymentsuccess", {
      state: {
        studentId,
        studentName,
        month,
        items,
        totalAmount,
        utrNumber: utr,
        paymentMethod: "upi",
        status: "success",
      },
    });
  };

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-orange-50 to-white px-3 py-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-4">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}>
            <ChevronLeft />
          </button>
          <div>
            <h1 className="font-semibold">Fee Payment</h1>
            <p className="text-sm text-gray-500">₹{totalAmount}</p>
          </div>
        </div>

        {/* UPI */}
        <div
          onClick={() => setSelected("upi")}
          className={`p-4 border rounded-xl ${
            selected === "upi" ? "border-orange-500 bg-orange-50" : ""
          }`}
        >
          <h2 className="font-semibold">UPI Payment</h2>

          <div className="mt-5 bg-white border rounded-2xl p-4 flex flex-col items-center">
            {/* QR Code */}
            <div className="bg-white border rounded-2xl shadow-sm p-3">
              <img
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  `upi://pay?pa=${upiId}&pn=${upiName}&am=${totalAmount}&cu=INR`,
                )}`}
                alt="UPI QR"
              />
            </div>

            <p className="mt-4 font-semibold text-base">
              Scan & Pay ₹{totalAmount}
            </p>

            {/* Open UPI */}
            <a
              href={`upi://pay?pa=${upiId}&pn=${upiName}&am=${totalAmount}&cu=INR`}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] transition text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2"
            >
              <ExternalLink size={18} />
              Open Any UPI App
            </a>

            {/* UPI ID */}
            <div className="w-full mt-4">
              <p className="text-xs text-gray-500 mb-2">UPI ID</p>

              <div className="flex gap-2">
                <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl px-3 py-3 overflow-hidden">
                  <p className="font-semibold text-sm break-all">{upiId}</p>
                </div>

                <button
                  onClick={copyUPI}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition text-white rounded-xl px-4 flex items-center gap-2"
                >
                  <Copy size={18} />
                  <span className="hidden sm:inline">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>

              {copied && (
                <p className="text-green-600 text-xs mt-2 font-medium">
                  ✓ UPI ID copied successfully
                </p>
              )}
            </div>

            {/* Receiver */}
            <div className="w-full mt-4 bg-orange-50 border border-orange-100 rounded-xl p-3">
              <p className="text-xs text-gray-500">Receiver Name</p>

              <p className="font-semibold text-sm mt-1 break-all">{upiName}</p>
            </div>

            {/* UTR */}
            <input
              className="mt-5 w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Enter UTR Number"
              value={utr}
              onChange={(e) =>
                setUtr(
                  e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
                )
              }
            />

            <button
              onClick={handleUTRSubmit}
              disabled={loading}
              className="mt-4 w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition text-white py-3 rounded-xl font-semibold disabled:opacity-60"
            >
              {loading ? "Processing..." : "Submit UTR"}
            </button>
          </div>
        </div>

        {/* OR */}
        <div className="text-center my-4 text-gray-400">OR</div>

        {/* Razorpay */}
        <div
          onClick={() => setSelected("razorpay")}
          className={`p-4 border rounded-xl ${
            selected === "razorpay" ? "border-orange-500 bg-orange-50" : ""
          }`}
        >
          <h2 className="font-semibold">Razorpay</h2>

          {selected === "razorpay" && (
            <button
              onClick={handleRazorpay}
              className="w-full mt-3 bg-orange-500 text-white py-2 rounded"
            >
              Pay ₹{totalAmount}
            </button>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
          <Lock size={14} />
          Secure payment
        </div>
      </div>
    </div>
  );
}
