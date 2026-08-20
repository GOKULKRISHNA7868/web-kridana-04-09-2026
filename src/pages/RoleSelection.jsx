import { useState } from "react";
import {
  ChevronRight,
  User,
  Users,
  Building2,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function RoleSelection() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);
  const reduceMotion = useReducedMotion();

  const toggleRole = (role) => {
    setActiveRole(activeRole === role ? null : role);
  };

  const roles = [
    {
      id: "user",
      title: "Customer",
      subtitle: "Train, book ",
      icon: User,
      points: [
        "View available training sessions, book slots, and track schedule updates.",
        "Purchase gym merchandise, supplements, and training equipment conveniently.",
        "Access instructional and workout videos for guided training anytime.",
        "Connect with trainers for personalized guidance, feedback, and improvement tips.",
      ],
    },
    {
      id: "trainer",
      title: "Solo Coach",
      subtitle: "Grow your coaching practice",
      icon: Users,
      points: [
        "Build and manage your coaching practice with professionalism and ease.",
        "Streamline member management, progress tracking, and communication.",
        "Present a compelling personal profile to attract and engage prospective clients.",
        "Maintain accurate records of attendance and payments.",
        "Expand your reach by promoting services, merchandise, and partner offerings.",
      ],
    },
    {
      id: "institute",
      title: "Academy",
      subtitle: "Run your institute at scale",
      icon: Building2,
      points: [
        "Operate and scale your academy with complete control and visibility.",
        "Centralize member management, performance tracking, and communication.",
        "Establish a high-impact academy profile showcasing achievements and specialties, accessible to customers 24/7.",
        "Oversee trainer operations, including attendance, compensation, and skill management.",
        "Gain full visibility into member attendance and payment workflows.",
        "Drive growth by promoting services, merchandise, and strategic partner offerings.",
      ],
    },
  ];

  const getSignupPath = (role) => {
    switch (role) {
      case "user":
        return "/signup";
      case "trainer":
        return "/trainer-signup";
      case "institute":
        return "/institute-signup";
      default:
        return "/signup";
    }
  };

  const fadeUp = (i = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.22,
      delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.15),
      ease: "easeOut",
    },
  });

  return (
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

      {/* Back */}
      <motion.button
        type="button"
        onClick={() => navigate("/")}
        {...fadeUp(0)}
        className="
          relative z-20
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

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Brand header */}
          <motion.div {...fadeUp(0)} className="text-center mb-7 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-orange-100 text-[11px] font-semibold tracking-wide mb-3">
              <Sparkles size={12} className="text-[#FFB347]" />
              Get started in seconds
            </div>
            <h1 className="text-3xl sm:text-[2rem] font-bold text-white tracking-tight">
              Welcome to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB347] to-[#FF6A00]">
                Kridana
              </span>
            </h1>
            <p className="text-white/70 mt-2 text-sm sm:text-[15px] leading-relaxed max-w-sm mx-auto">
              Choose how you want to join — pick a role to see what you can do,
              then sign up or sign in.
            </p>
          </motion.div>

          {/* Role cards */}
          <div className="space-y-3">
            {roles.map((role, index) => {
              const Icon = role.icon;
              const isOpen = activeRole === role.id;

              return (
                <motion.div
                  key={role.id}
                  {...fadeUp(index + 1)}
                  className={`
                    rounded-2xl overflow-hidden
                    border transition-colors duration-200
                    ${
                      isOpen
                        ? "border-[#FF6A00]/55 bg-white shadow-[0_12px_40px_rgba(255,106,0,0.22)]"
                        : "border-white/10 bg-white/95 shadow-lg shadow-black/20"
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    aria-expanded={isOpen}
                    className="
                      w-full flex items-center justify-between gap-3
                      px-4 py-3.5 sm:px-5 sm:py-4
                      text-left
                      active:scale-[0.99]
                      transition
                    "
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`
                          w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                          transition-colors duration-200
                          ${
                            isOpen
                              ? "bg-[#FF6A00] text-white"
                              : "bg-orange-50 text-[#FF6A00]"
                          }
                        `}
                      >
                        <Icon size={22} strokeWidth={2.1} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-[15px] sm:text-base truncate">
                          {role.title}
                        </p>
                        <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5 truncate">
                          {role.subtitle}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`
                        flex-shrink-0 text-gray-400 transition-transform duration-200
                        ${isOpen ? "rotate-90 text-[#FF6A00]" : ""}
                      `}
                      size={20}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        initial={
                          reduceMotion
                            ? { opacity: 1, height: "auto" }
                            : { opacity: 0, height: 0 }
                        }
                        animate={{ opacity: 1, height: "auto" }}
                        exit={
                          reduceMotion
                            ? { opacity: 0, height: 0 }
                            : { opacity: 0, height: 0 }
                        }
                        transition={{
                          duration: reduceMotion ? 0.01 : 0.2,
                          ease: "easeOut",
                        }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-4 pt-0 border-t border-orange-50">
                          <ul className="space-y-2.5 pt-3.5">
                            {role.points.map((point, i) => (
                              <li
                                key={i}
                                className="flex gap-2.5 text-left text-[13px] sm:text-sm text-gray-700 leading-snug"
                              >
                                <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-50 text-[#FF6A00] flex items-center justify-center flex-shrink-0">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(getSignupPath(role.id))
                              }
                              className="
                                w-full bg-[#FF6A00] hover:bg-[#e85f00]
                                text-white py-3 rounded-xl font-semibold text-sm
                                shadow-[0_8px_20px_rgba(255,106,0,0.35)]
                                active:scale-[0.98] transition
                              "
                            >
                              Sign Up
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/login?role=${role.id}`)
                              }
                              className="
                                w-full bg-white border border-gray-200
                                hover:border-orange-200 hover:bg-orange-50/40
                                py-3 rounded-xl font-semibold text-sm text-gray-900
                                active:scale-[0.98] transition
                              "
                            >
                              Sign In
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            {...fadeUp(4)}
            className="text-center text-white/45 text-xs mt-6"
          >
            Already decided? Open a role and tap Sign In.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
