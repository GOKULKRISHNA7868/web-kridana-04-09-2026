// src/pages/PaymentFailed.jsx
import React from "react";
import { motion } from "framer-motion";

export default function PaymentFailed() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
    <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Payment Failed ❌
      </h1>
      <p className="mb-4">
        Something went wrong with your payment. Please try again.
      </p>

      <button
        onClick={() => (window.location.href = "/")}
        className="mt-6 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Go to Home
      </button>
    </div>
    </motion.div>
  );
}
