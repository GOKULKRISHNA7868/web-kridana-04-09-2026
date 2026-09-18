import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase";

import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const FeePaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const savedPayment = localStorage.getItem("paymentData");
  const hasSaved = useRef(false);
  const state =
    location.state || (savedPayment ? JSON.parse(savedPayment) : null);

  const [saving, setSaving] = useState(true);
  const [saved, setSaved] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);

  // 🔒 BLOCK BACK BUTTON
  useEffect(() => {
    const handleBack = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, []);

  // 🔥 SAVE FUNCTION
  const handleSubmit = async () => {
    if (hasSaved.current) return;

    hasSaved.current = true;
    try {
      setSaving(true);

      if (!state?.studentId) {
        alert("Student ID missing");
        return;
      }

      // ✅ GET STUDENT
      const studentRef = doc(db, "students", state.studentId);

      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert("Student not found");
        return;
      }

      const studentData = studentSnap.data();

      const instituteId = studentData.instituteId || "";

      // ==================================================
      // ✅ CHECK DUPLICATE PAYMENT HISTORY
      // ==================================================

      const paymentHistoryRef = collection(
        db,
        "instituepaymenthistory",
        state.studentId,
        "payments",
      );

      const paymentQuery = query(
        paymentHistoryRef,
        where("paymentId", "==", state.paymentId || ""),
      );

      const paymentSnap = await getDocs(paymentQuery);

      // ==================================================
      // ✅ SAVE PAYMENT HISTORY
      // ==================================================

      if (paymentSnap.empty) {
        await addDoc(paymentHistoryRef, {
          studentName: state.studentName || "",

          studentId: state.studentId,

          instituteId,

          month: state.month || "",

          totalAmount: state.totalAmount || 0,

          paymentId: state.paymentId || "",

          orderId: state.orderId || "",

          signature: state.signature || "",

          utrNumber: state.utrNumber || "",

          paymentMethod: state.paymentMethod || "",

          status: state.status || "paid",

          items: state.items || [],

          date: state.date || "",

          time: state.time || "",

          createdAt: serverTimestamp(),
        });
      }

      // ==================================================
      // ✅ SAVE STUDENT FEES
      // ==================================================

      for (const item of state.items || []) {
        // 🔍 CHECK DUPLICATE
        const feeQuery = query(
          collection(db, "studentFees"),
          where("studentId", "==", state.studentId),
          where("month", "==", state.month),
          where("category", "==", item.category),
          where("subCategory", "==", item.subCategory),
        );

        const existingFee = await getDocs(feeQuery);

        // ✅ Already exists — update paid amount; keep extras / total from academy
        if (!existingFee.empty) {
          const feeDoc = existingFee.docs[0];
          const prev = feeDoc.data();
          const prevPaid = Number(prev.paidAmount || 0);
          const payNow = Number(item.amount || 0);
          const nextPaid = prevPaid + payNow;
          const keptTotal = Number(
            prev.totalAmount ??
              item.totalAmount ??
              Number(prev.baseFee || 0) +
                (Array.isArray(prev.extras)
                  ? prev.extras.reduce((s, e) => s + Number(e.amount || 0), 0)
                  : 0) ??
              payNow,
          );

          await updateDoc(feeDoc.ref, {
            paidAmount: nextPaid,
            totalAmount: keptTotal,
            baseFee: prev.baseFee ?? item.baseFee ?? keptTotal,
            extras: Array.isArray(prev.extras)
              ? prev.extras
              : item.extras || [],
            paidDate: state.date || prev.paidDate || "",
            paymentId: state.paymentId || prev.paymentId || "",
            orderId: state.orderId || prev.orderId || "",
            signature: state.signature || prev.signature || "",
            utrNumber: state.utrNumber || prev.utrNumber || "",
            paymentMethod: state.paymentMethod || prev.paymentMethod || "",
            paymentStatus: nextPaid >= keptTotal ? "paid" : "partial",
            updatedAt: serverTimestamp(),
          });
          continue;
        }

        // ✅ SAVE new
        await addDoc(collection(db, "studentFees"), {
          studentId: state.studentId,
          studentName: state.studentName || "",
          instituteId,
          category: item.category || "",
          subCategory: item.subCategory || "",
          month: state.month || "",
          baseFee: Number(item.baseFee ?? item.amount ?? 0),
          extras: Array.isArray(item.extras) ? item.extras : [],
          paidAmount: Number(item.amount || 0),
          totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
          paidDate: state.date || "",
          paymentId: state.paymentId || "",
          orderId: state.orderId || "",
          signature: state.signature || "",
          utrNumber: state.utrNumber || "",
          paymentMethod: state.paymentMethod || "",
          paymentStatus: "paid",
          feeWaived: false,
          waiveReason: "",
          createdAt: serverTimestamp(),
        });
      }

      // ✅ SUCCESS
      setSaved(true);
    } catch (err) {
      console.error("SAVE ERROR:", err);

      alert("Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  // 🚀 AUTO SAVE
  useEffect(() => {
    if (state && state.studentId && state.items && !alreadySaved) {
      setAlreadySaved(true);

      handleSubmit();
    }
  }, [state, alreadySaved]);

  // 🚀 REDIRECT
  useEffect(() => {
    if (saved) {
      setTimeout(() => {
        navigate("/user/dashboard");
      }, 2000);
    }
  }, [saved, navigate]);

  // ✅ AFTER HOOKS
  if (!state) {
    return <div className="p-8">No Data Found</div>;
  }

  // 🔄 LOADING
  if (saving) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>

        <p className="text-lg font-semibold">Saving your payment...</p>

        <p className="text-sm opacity-70">Please do not close this page</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-green-600 mb-4 text-center">
          Payment Saved Successfully 🎉
        </h1>

        <div className="space-y-2 text-sm">
          <p>
            <b>Student:</b> {state.studentName}
          </p>

          <p>
            <b>Month:</b> {state.month}
          </p>

          <p>
            <b>Status:</b> {state.status}
          </p>

          <p className="text-lg font-semibold mt-3">
            Total Amount: ₹{state.totalAmount}
          </p>

          <hr className="my-3" />

          <p>
            <b>Payment ID:</b> {state.paymentId}
          </p>

          <p>
            <b>Order ID:</b> {state.orderId}
          </p>

          <hr className="my-3" />

          <h3 className="font-semibold">Items Paid:</h3>
          {(state.items || []).map((item, i) => (
            <div key={i} className="flex justify-between">
              <p>
                {item.category} - {item.subCategory}
              </p>

              <p>₹{item.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeePaymentSuccess;
