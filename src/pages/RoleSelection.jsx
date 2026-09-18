import { useState } from "react";
import {
  User,
  Users,
  Building2,
  GraduationCap,
  ArrowLeft,
  Check,
  Sparkles,
  LogIn,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

const ROLES = [
  {
    id: "user",
    title: "Customer",
    subtitle: "Book training & shop",
    icon: User,
    color: "from-sky-500 to-blue-600",
    points: [
      "Browse academies and book sessions",
      "Track schedules, fees and attendance",
      "Shop gear and watch training content",
    ],
    signup: "/signup",
    signupLabel: "Create customer account",
  },
  {
    id: "staff",
    title: "Academy Trainer",
    subtitle: "Staff login for an institute",
    icon: GraduationCap,
    color: "from-violet-500 to-purple-600",
    points: [
      "Sign in with credentials from your academy",
      "Manage assigned students and batches",
      "Mark attendance and update fee details",
    ],
    signup: null,
    signupLabel: null,
    note: "Your academy creates this account from Add Trainers.",
  },
  {
    id: "trainer",
    title: "Solo Coach",
    subtitle: "Independent coaching practice",
    icon: Users,
    color: "from-emerald-500 to-teal-600",
    points: [
      "Run your own coaching business",
      "Manage clients, fees and timetable",
      "Build a public coach profile",
    ],
    signup: "/trainer-signup",
    signupLabel: "Register as solo coach",
  },
  {
    id: "institute",
    title: "Academy",
    subtitle: "Institute / sports academy",
    icon: Building2,
    color: "from-[#FF8A3D] to-[#FF6A00]",
    points: [
      "Operate your academy dashboard",
      "Add trainers, students and programs",
      "Track fees, attendance and growth",
    ],
    signup: "/institute-signup",
    signupLabel: "Register academy",
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("user");
  const reduceMotion = useReducedMotion();

  const active = ROLES.find((r) => r.id === selected) || ROLES[0];
  const ActiveIcon = active.icon;

  const fade = (i = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.22,
      delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.16),
      ease: "easeOut",
    },
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0F172A] flex flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1e293b] to-[#0F172A]" />
        <div className="absolute -top-24 right-0 w-96 h-96 rounded-full bg-[#FF6A00]/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <motion.button
        type="button"
        onClick={() => navigate("/")}
        {...fade(0)}
        className="
          relative z-20 self-start
          mt-[calc(0.75rem+env(safe-area-inset-top,0px))]
          ml-4 sm:ml-6
          flex items-center gap-2 text-white/90
          bg-white/10 hover:bg-white/15 border border-white/15
          px-3.5 py-2 rounded-xl backdrop-blur-md transition
        "
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </motion.button>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-10 lg:py-12">
        <div className="w-full max-w-5xl mx-auto">
          <motion.div {...fade(0)} className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-orange-100 text-[11px] font-semibold tracking-wide mb-3">
              <Sparkles size={12} className="text-[#FFB347]" />
              Choose your account type
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Sign in to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB347] to-[#FF6A00]">
                Kridana
              </span>
            </h1>
            <p className="text-slate-300 mt-2.5 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Pick who you are — Customer, Academy Trainer, Solo Coach, or
              Academy — so you land in the right place every time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5 lg:gap-6 items-start">
            {/* Role grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {ROLES.map((role, index) => {
                const Icon = role.icon;
                const isActive = selected === role.id;
                return (
                  <motion.button
                    key={role.id}
                    type="button"
                    {...fade(index + 1)}
                    onClick={() => setSelected(role.id)}
                    className={`
                      text-left rounded-2xl border p-4 sm:p-5 transition
                      ${
                        isActive
                          ? "bg-white border-[#FF6A00] shadow-[0_12px_40px_rgba(255,106,0,0.25)] ring-2 ring-[#FF6A00]/25"
                          : "bg-white/95 border-white/20 hover:border-orange-200 hover:shadow-lg"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`
                          w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white
                          bg-gradient-to-br ${role.color}
                        `}
                      >
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900 text-[15px]">
                            {role.title}
                          </p>
                          {isActive ? (
                            <span className="w-5 h-5 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shrink-0">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {role.subtitle}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Detail panel */}
            <motion.div
              key={active.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`w-12 h-12 rounded-xl text-white flex items-center justify-center bg-gradient-to-br ${active.color}`}
                >
                  <ActiveIcon size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {active.title}
                  </h2>
                  <p className="text-sm text-slate-500">{active.subtitle}</p>
                </div>
              </div>

              <ul className="space-y-2.5 mb-5">
                {active.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-2.5 text-sm text-slate-700 leading-snug"
                  >
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {active.note ? (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
                  {active.note}
                </p>
              ) : null}

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/login?role=${active.id}`)}
                  className="
                    w-full min-h-[48px] rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]
                    text-white font-semibold text-sm
                    inline-flex items-center justify-center gap-2
                    shadow-[0_8px_20px_rgba(255,106,0,0.35)] transition
                  "
                >
                  <LogIn size={16} />
                  Sign in as {active.title}
                </button>

                {active.signup ? (
                  <button
                    type="button"
                    onClick={() => navigate(active.signup)}
                    className="
                      w-full min-h-[48px] rounded-xl border border-slate-200
                      bg-white hover:bg-slate-50 text-slate-800
                      font-semibold text-sm transition
                    "
                  >
                    {active.signupLabel}
                  </button>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-1">
                    No self sign-up — use the account your academy shared.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
