import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  X,
  Mail,
  Lock,
  ShieldCheck,
  User,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";

/*
=========================================================
IMPORTANT
=========================================================

1. ADD YOUR POPUP IMAGE IN:
   /src/assets/kridana-popup.png

2. IMPORT IS ALREADY ADDED BELOW

3. PLAN CHECK COMPLETELY REMOVED

4. ALL ROUTING PRESERVED

=========================================================
*/

const ROLE_META = {
  user: {
    label: "Customer",
    hint: "Book sessions, shop & train",
    Icon: User,
    signup: "/signup",
  },
  trainer: {
    label: "Solo Coach",
    hint: "Manage clients & coaching",
    Icon: Users,
    signup: "/trainer-signup",
  },
  institute: {
    label: "Academy",
    hint: "Run your institute",
    Icon: Building2,
    signup: "/institute-signup",
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const popupImage = "/Kridana pop Up.png";
  const role = new URLSearchParams(location.search).get("role") || "user";
  const roleMeta = ROLE_META[role] || ROLE_META.user;
  const RoleIcon = roleMeta.Icon;

  const [formData, setFormData] = useState({
    emailPhone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/");
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleChange = (e) => {
    setErrorMsg("");
    setFormData((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBack = () => {
    // Always return to role picker — never dashboards while logged out
    navigate("/RoleSelection");
  };

  /*
  =========================================================
  LOGIN
  =========================================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setErrorMsg("");
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const cred = await signInWithEmailAndPassword(
        auth,
        formData.emailPhone.trim(),
        formData.password,
      );

      const user = cred.user;

      /*
      =========================================================
      ROLE CHECK
      =========================================================
      */

      const trainerSnap = await getDoc(doc(db, "trainers", user.uid));

      const instituteSnap = await getDoc(doc(db, "institutes", user.uid));

      const familySnap = await getDoc(doc(db, "families", user.uid));

      let actualRole = null;

      if (trainerSnap.exists()) actualRole = "trainer";

      if (instituteSnap.exists()) actualRole = "institute";

      if (familySnap.exists()) actualRole = "family";

      if (!actualRole && role === "user") {
        actualRole = "user";
      }

      /*
      =========================================================
      ROLE MISMATCH
      =========================================================
      */

      if (role !== "user" && actualRole !== role && actualRole !== "family") {
        setErrorMsg(
          `This account is registered as ${actualRole || "another role"}. Please choose the matching role.`,
        );
        setLoading(false);
        return;
      }

      /*
      =========================================================
      FAMILY
      =========================================================
      */

      if (actualRole === "family") {
        setRedirectPath("/");

        setShowWelcomePopup(true);

        return;
      }

      /*
      =========================================================
      RESET PASSWORD
      =========================================================
      */

      const studentSnap = await getDoc(doc(db, "students", user.uid));

      if (studentSnap.exists() && studentSnap.data().defaultPassword) {
        navigate("/reset-password");

        return;
      }

      /*
      =========================================================
      ROUTING
      =========================================================
      */

      if (actualRole === "trainer") {
        setRedirectPath("/");
      } else if (actualRole === "institute") {
        setRedirectPath("/");
      } else {
        setRedirectPath("/");
      }

      /*
      =========================================================
      SHOW POPUP
      =========================================================
      */

      setShowWelcomePopup(true);
    } catch (err) {
      console.error(err);

      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErrorMsg("Wrong password. Please try again.");
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        setErrorMsg("No account found with this email.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMsg("Too many attempts. Please wait a moment and try again.");
      } else {
        setErrorMsg("Login failed. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
  =========================================================
  FORGOT PASSWORD
  =========================================================
  */

  const handleForgotPassword = async (e) => {
    e?.preventDefault?.();

    const email = (forgotEmail || formData.emailPhone || "").trim();

    if (!email) {
      setForgotSuccess("");
      setErrorMsg("Enter your registered email to reset the password.");
      return;
    }

    setForgotLoading(true);
    setForgotSuccess("");
    setErrorMsg("");

    try {
      await sendPasswordResetEmail(auth, email);
      setForgotSuccess("Reset link sent to your email.");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        setErrorMsg("No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Please enter a valid email address.");
      } else {
        setErrorMsg(error.message || "Could not send reset email.");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  /*
  =========================================================
  AUTO REDIRECT AFTER POPUP
  =========================================================
  */

  useEffect(() => {
    if (!showWelcomePopup) return;

    const timer = setTimeout(() => {
      navigate(redirectPath, { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [showWelcomePopup, navigate, redirectPath]);

  const fade = useMemo(
    () => ({
      initial: reduceMotion ? false : { opacity: 0, y: 14 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: reduceMotion ? 0 : 0.22, ease: "easeOut" },
    }),
    [reduceMotion],
  );

  return (
    <>
      {/* MAIN PAGE */}
      <div className="min-h-screen relative overflow-hidden bg-[#1A0F08] flex flex-col">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A1608] via-[#FF6A00]/25 to-[#1A0F08]" />
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#FF6A00]/25 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-[#FF9A3C]/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>

        {/* BACK BUTTON — returns to role selection */}
        <motion.button
          type="button"
          onClick={handleBack}
          {...fade}
          className="
            relative z-40
            self-start
            mt-[calc(0.75rem+env(safe-area-inset-top,0px))]
            ml-4
            flex items-center gap-2
            text-white/95
            bg-white/10
            hover:bg-white/15
            border border-white/15
            px-3.5 py-2
            rounded-xl
            backdrop-blur-md
            active:scale-[0.97]
            transition
          "
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </motion.button>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
          {/* LOGIN CARD */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
            className="
              w-full max-w-md
              bg-white
              rounded-[28px]
              shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              border border-orange-50
              p-5 sm:p-8
            "
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[#FF6A00] text-[11px] font-semibold tracking-wide mb-3">
                <Sparkles size={12} />
                Secure sign in
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#2D1400] tracking-tight">
                Welcome back
              </h2>

              <p className="text-center text-gray-500 mt-2 text-sm sm:text-[15px]">
                Sign in to continue to Kridana
              </p>

              {/* Role chip */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFF7F0] border border-orange-100">
                <span className="w-8 h-8 rounded-lg bg-[#FF6A00] text-white flex items-center justify-center">
                  <RoleIcon size={16} />
                </span>
                <div className="text-left">
                  <p className="text-xs text-gray-500 leading-none">
                    Signing in as
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {roleMeta.label}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">{roleMeta.hint}</p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* EMAIL */}
              <div>
                <label className="text-[#FF6A00] font-medium text-sm">
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    name="emailPhone"
                    required
                    autoComplete="email"
                    inputMode="email"
                    value={formData.emailPhone}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="
                      w-full pl-11 pr-4 py-3
                      rounded-2xl border border-gray-200 bg-gray-50/80
                      focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/35
                      focus:border-[#FF6A00] focus:bg-white
                      transition text-sm sm:text-base
                    "
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-[#FF6A00] font-medium text-sm">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="
                      w-full pl-11 pr-12 py-3
                      rounded-2xl border border-gray-200 bg-gray-50/80
                      focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/35
                      focus:border-[#FF6A00] focus:bg-white
                      transition text-sm sm:text-base
                    "
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      text-gray-500 hover:text-gray-700 p-1 rounded-lg
                      active:scale-95 transition
                    "
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot((v) => !v);
                      setForgotEmail(formData.emailPhone);
                      setForgotSuccess("");
                      setErrorMsg("");
                    }}
                    className="text-sm text-[#FF6A00] font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Inline forgot password */}
              <AnimatePresence initial={false}>
                {showForgot && (
                  <motion.div
                    initial={
                      reduceMotion
                        ? { opacity: 1, height: "auto" }
                        : { opacity: 0, height: 0 }
                    }
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-orange-100 bg-[#FFF8F3] p-3.5 space-y-2.5">
                      <p className="text-xs text-gray-600 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#FF6A00]" />
                        We&apos;ll email you a secure reset link
                      </p>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setErrorMsg("");
                          setForgotSuccess("");
                        }}
                        placeholder="Registered email"
                        className="
                          w-full px-3.5 py-2.5 rounded-xl border border-gray-200
                          bg-white text-sm focus:outline-none focus:ring-2
                          focus:ring-[#FF6A00]/30
                        "
                      />
                      <button
                        type="button"
                        disabled={forgotLoading}
                        onClick={handleForgotPassword}
                        className="
                          w-full py-2.5 rounded-xl bg-white border border-orange-200
                          text-[#FF6A00] font-semibold text-sm
                          disabled:opacity-70 active:scale-[0.98] transition
                        "
                      >
                        {forgotLoading ? "Sending..." : "Send reset link"}
                      </button>
                      {forgotSuccess && (
                        <p className="text-xs text-green-600 font-medium">
                          {forgotSuccess}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {errorMsg && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600"
                >
                  {errorMsg}
                </motion.div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full bg-[#FF6A00] hover:bg-[#e85f00]
                  text-white py-3.5 rounded-2xl font-bold
                  flex justify-center items-center gap-2
                  shadow-[0_10px_24px_rgba(255,106,0,0.35)]
                  disabled:opacity-70
                  active:scale-[0.98] transition
                "
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* FOOTER */}
            <p className="text-center mt-6 text-sm text-[#2D1400]">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => navigate(roleMeta.signup)}
                className="text-[#FF6A00] font-bold hover:underline"
              >
                Sign up
              </button>
            </p>

            <button
              type="button"
              onClick={() => navigate("/RoleSelection")}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-[#FF6A00] transition"
            >
              Change account type
            </button>
          </motion.div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* WELCOME POPUP */}
      {/* ===================================================== */}

      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed inset-0 z-[999]
              flex items-center justify-center
              bg-black/50 backdrop-blur-sm
              px-3 sm:px-4
            "
          >
            <motion.div
              initial={
                reduceMotion ? false : { scale: 0.92, y: 20, opacity: 0 }
              }
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.92, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.22 }}
              className="
                relative w-full max-w-[420px]
                rounded-[28px] overflow-hidden bg-white
                shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              "
            >
              <button
                type="button"
                onClick={() => {
                  setShowWelcomePopup(false);
                  navigate(redirectPath, { replace: true });
                }}
                className="
                  absolute top-4 right-4 z-20
                  h-10 w-10 rounded-full bg-white/90
                  flex items-center justify-center shadow-md
                  active:scale-95 transition
                "
              >
                <X size={22} className="text-black" />
              </button>

              <img
                src={popupImage}
                alt="Welcome to Kridana"
                className="w-full h-auto object-cover select-none pointer-events-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
