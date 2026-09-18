import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";

import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const PaymentSuccess = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(true);
  const hasSaved = useRef(false);

  if (!state) return <div className="p-10">No Data</div>;

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

  // 🔥 CLEAN DATA FUNCTION
  const cleanData = (obj) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined),
    );
  };

  // 🔥 SAVE FUNCTION
  const handleSubmit = async () => {
    if (hasSaved.current) return;

    hasSaved.current = true;

    try {
      setSaving(true);

      const user = auth.currentUser;
      if (!user) {
        alert("User not logged in");
        return;
      }

      const studentId = state.studentId;

      const studentRef = doc(db, "trainerstudents", studentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert("Student not found");
        return;
      }

      const studentData = studentSnap.data();
      const trainerId = studentData.trainerId || "";

      let trainerName = "";
      if (trainerId) {
        const trainerRef = doc(db, "trainers", trainerId);
        const trainerSnap = await getDoc(trainerRef);

        if (trainerSnap.exists()) {
          const tData = trainerSnap.data();
          trainerName = `${tData.firstName || ""} ${tData.lastName || ""}`;
        }
      }

      for (const item of state.items) {
        const payNow = Number(item.amount || 0);
        const itemTotal = Number(item.totalAmount ?? item.amount ?? 0);
        const extras = Array.isArray(item.extras) ? item.extras : [];
        const baseFee = Number(item.baseFee ?? item.amount ?? 0);

        let data = {
          category: item.category || "",
          subCategory: item.subCategory || "",
          studentId,
          trainerId,
          trainerName,
          month: state.month || "",
          baseFee,
          extras,
          paidAmount: payNow,
          totalAmount: itemTotal,
          feeWaived: false,
          waiveReason: "",
          paymentMethod: "online",
          transactionGroupId: state.razorpay_order_id || "",
          paidByUserId: user.uid,
          paidDate: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (state.razorpay_order_id) data.orderId = state.razorpay_order_id;
        if (state.razorpay_payment_id)
          data.paymentId = state.razorpay_payment_id;
        if (state.status) data.paymentStatus = state.status;
        if (state.paymentMethod === "upi") {
          data.utrNumber = state.utrNumber || "";
        }
        const safeData = cleanData(data);

        // Receipt under student
        await setDoc(
          doc(
            db,
            "feepayments",
            studentId,
            "payments",
            `${state.month}_${item.category}_${item.subCategory}`,
          ),
          safeData,
        );

        // Upsert institutesFees for this month + sport (keep extras)
        const feeQuery = query(
          collection(db, "institutesFees"),
          where("studentId", "==", studentId),
          where("month", "==", state.month || ""),
          where("category", "==", item.category || ""),
          where("subCategory", "==", item.subCategory || ""),
        );
        const existing = await getDocs(feeQuery);

        if (!existing.empty) {
          const feeDoc = existing.docs[0];
          const prev = feeDoc.data();
          const prevPaid = Number(prev.paidAmount || 0);
          const nextPaid = prevPaid + payNow;
          const keptTotal = Number(
            prev.totalAmount ?? itemTotal ?? payNow,
          );
          await updateDoc(feeDoc.ref, {
            paidAmount: nextPaid,
            totalAmount: keptTotal,
            baseFee: prev.baseFee ?? baseFee,
            extras: Array.isArray(prev.extras) ? prev.extras : extras,
            paidDate: data.paidDate,
            paymentMethod: "online",
            paymentStatus: nextPaid >= keptTotal ? "paid" : "partial",
            orderId: data.orderId || prev.orderId || "",
            paymentId: data.paymentId || prev.paymentId || "",
            utrNumber: data.utrNumber || prev.utrNumber || "",
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(
            collection(db, "institutesFees"),
            cleanData({
              ...safeData,
              paymentStatus: "paid",
            }),
          );
        }
      }

      // 🚀 AFTER SAVE → NAVIGATE
      navigate("/user/dashboard");
    } catch (err) {
      console.error("❌ ERROR:", err);
      alert("Error saving payment");
    } finally {
      setSaving(false);
    }
  };

  // 🚀 AUTO RUN IMMEDIATELY
  useEffect(() => {
    handleSubmit();
  }, []);

  // 🔄 FULL SCREEN LOADER (NO GAP UI)
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>

      <p className="text-lg font-semibold">
        {saving ? "Processing Payment..." : "Redirecting..."}
      </p>

      <p className="text-sm opacity-70">Please wait, do not close or go back</p>
    </div>
  );
};

export default PaymentSuccess;
