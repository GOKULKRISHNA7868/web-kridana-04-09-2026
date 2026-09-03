// src/pages/Signup.js
import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ArrowLeft, Loader2 } from "lucide-react";
export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const role = queryParams.get("role") || "user"; // default user
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    emailPhone: "",
    password: "",
    rePassword: "",
  });

  // ✅ NEW STATE (does not affect existing logic)
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // ✅ Name → only alphabets + capitalize
    if (name === "name") {
      newValue = value
        .replace(/[^A-Za-z ]/g, "") // only letters
        .replace(/\b[a-z]/g, (c) => c.toUpperCase()); // capitalize
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreed) {
      alert("Please agree to the Terms & Policies to continue");
      return;
    }

    if (formData.password !== formData.rePassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      if (role === "user") {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.emailPhone,
          formData.password,
        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          emailOrPhone: formData.emailPhone,
          role: "user",
          createdAt: serverTimestamp(),
          agreements: {
            termsAndConditions: true,
            privacyPolicy: true,
            paymentPolicy: true,
            merchantPolicy: true,
            agreedAt: serverTimestamp(),
          },
        });

        navigate("/");
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4 sm:p-8">
      <div className="w-full max-w-md lg:max-w-lg bg-white rounded-3xl shadow-sm border border-orange-100 p-5 sm:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h2 className="text-3xl font-bold mb-6 text-orange-500">
          {role === "institute"
            ? "Register Your Institute"
            : "Join Kridana Sports"}
        </h2>
        {loading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-[330px] p-8 flex flex-col items-center">
              {/* Spinner */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-orange-100"></div>
                <Loader2
                  size={36}
                  className="animate-spin text-orange-500 absolute inset-0 m-auto"
                />
              </div>

              <h2 className="mt-6 text-xl font-bold text-gray-800">
                Creating your account
              </h2>

              <p className="text-gray-500 text-center mt-2 text-sm leading-6">
                Setting everything up securely.
                <br />
                This usually takes only a few seconds.
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-6 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full animate-pulse w-3/4"></div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Please don't close this window.
              </p>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${
            loading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <div>
            <label className="block mb-1 text-orange-500">
              {role === "institute" ? "Institute Name*" : "Name*"}
            </label>
            <input
              type="text"
              name="name"
              placeholder={
                role === "institute" ? "Enter Institute Name" : "Enter Name"
              }
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-orange-200 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-orange-500">E-mail</label>
            <input
              type="text"
              name="emailPhone"
              placeholder="Enter Mail"
              value={formData.emailPhone}
              onChange={handleChange}
              required
              className="w-full border border-orange-200 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-orange-500">Password*</label>
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border border-orange-200 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-orange-500">Re-Password*</label>
            <input
              type="password"
              name="rePassword"
              placeholder="Re-enter Password"
              value={formData.rePassword}
              onChange={handleChange}
              required
              className="w-full border border-orange-200 rounded-md p-2"
            />
          </div>

          {/* ✅ AGREEMENT SECTION */}
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <p>
              I agree to the{" "}
              <Link to="/terms" className="text-blue-600 underline">
                Terms & Conditions
              </Link>
              ,{" "}
              <Link to="/privacy" className="text-blue-600 underline">
                Privacy Policy
              </Link>
              ,{" "}
              <Link to="/paymentpolicy" className="text-blue-600 underline">
                Payment & Merchant Policy
              </Link>
              .
            </p>
          </div>
          <button
            type="submit"
            disabled={!agreed || loading}
            className={`w-full h-12 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              agreed && !loading
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="mt-4 text-gray-700">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/")}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
