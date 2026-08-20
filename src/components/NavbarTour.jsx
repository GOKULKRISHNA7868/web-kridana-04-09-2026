import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Sparkles, ChevronRight } from "lucide-react";
import {
  NAVBAR_TOUR_STEPS,
  hasCompletedNavbarTour,
  markNavbarTourComplete,
} from "../utils/navbarTour";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function shouldOfferTour() {
  if (hasCompletedNavbarTour()) return false;
  // First install on device, or mobile browser first visit
  return Capacitor.isNativePlatform() || isMobileViewport();
}

export default function NavbarTour({ enabled = true }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);

  const current = NAVBAR_TOUR_STEPS[step];
  const isLast = step >= NAVBAR_TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    markNavbarTourComplete();
    setActive(false);
    setSpot(null);
  }, []);

  const measureTarget = useCallback((targetId) => {
    if (!targetId) {
      setSpot(null);
      return;
    }
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (!el) {
      setSpot(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = 8;
    setSpot({
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !shouldOfferTour()) return undefined;

    let cancelled = false;
    let attempts = 0;

    const tryStart = () => {
      if (cancelled || hasCompletedNavbarTour()) return;
      if (!isMobileViewport()) return;

      const navbar = document.getElementById("bottom-navbar");
      if (!navbar) {
        if (attempts++ < 8) setTimeout(tryStart, 250);
        return;
      }

      const rect = navbar.getBoundingClientRect();
      const visible =
        rect.height > 40 &&
        rect.bottom <= window.innerHeight + 2 &&
        rect.top < window.innerHeight;

      if (!visible) {
        if (attempts++ < 8) setTimeout(tryStart, 300);
        return;
      }

      setActive(true);
      setStep(0);
    };

    const timer = setTimeout(tryStart, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!active) return undefined;
    measureTarget(current?.target);
    const onResize = () => measureTarget(current?.target);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [active, current?.target, measureTarget, step]);

  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          key="navbar-tour"
          className="md:hidden fixed inset-0 z-[200000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Dim layer with spotlight hole */}
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <mask id="kridana-tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {spot && (
                  <rect
                    x={spot.left}
                    y={spot.top}
                    width={spot.width}
                    height={spot.height}
                    rx={16}
                    ry={16}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(15, 8, 4, 0.72)"
              mask="url(#kridana-tour-mask)"
            />
          </svg>

          {/* Spotlight ring */}
          {spot && (
            <motion.div
              key={current.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
              className="absolute pointer-events-none rounded-2xl ring-2 ring-[#FF6A00] shadow-[0_0_0_4px_rgba(255,106,0,0.25)]"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
              }}
            />
          )}

          {/* Tip card */}
          <motion.div
            key={`card-${current.id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            className="
              absolute left-4 right-4
              bottom-[calc(72px+env(safe-area-inset-bottom,0px))]
              sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-sm
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="navbar-tour-title"
          >
            <div className="rounded-2xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.28)] border border-orange-100 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#FF6A00] via-[#FF8F3C] to-[#FFB347]" />
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FF6A00] mb-1.5">
                      <Sparkles size={12} />
                      Quick guide · {step + 1}/{NAVBAR_TOUR_STEPS.length}
                    </div>
                    <h2
                      id="navbar-tour-title"
                      className="text-lg font-bold text-gray-900 tracking-tight"
                    >
                      {current.title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                      {current.body}
                    </p>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-4 mb-4">
                  {NAVBAR_TOUR_STEPS.map((s, i) => (
                    <span
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === step
                          ? "w-6 bg-[#FF6A00]"
                          : i < step
                            ? "w-1.5 bg-orange-300"
                            : "w-1.5 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={finish}
                    className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 active:scale-[0.98] transition"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="
                      flex-1 inline-flex items-center justify-center gap-1.5
                      bg-[#FF6A00] hover:bg-[#e85f00] text-white
                      py-2.5 rounded-xl text-sm font-bold
                      shadow-[0_8px_20px_rgba(255,106,0,0.35)]
                      active:scale-[0.98] transition
                    "
                  >
                    {isLast ? "Finish" : "Next"}
                    {!isLast && <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
