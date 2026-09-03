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
  return Capacitor.isNativePlatform() || isMobileViewport();
}

function getNavbarBox() {
  const navbar = document.getElementById("bottom-navbar");
  if (!navbar) return null;
  const rect = navbar.getBoundingClientRect();
  if (rect.height < 40) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
  };
}

export default function NavbarTour({ enabled = true }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);
  const [cardBottom, setCardBottom] = useState(72);

  const current = NAVBAR_TOUR_STEPS[step];
  const isLast = step >= NAVBAR_TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    markNavbarTourComplete();
    setActive(false);
    setSpot(null);
  }, []);

  const layout = useCallback((targetId) => {
    const nav = getNavbarBox();
    const viewportH = window.innerHeight;
    const navGap = nav ? Math.max(8, viewportH - nav.top + 8) : 12;
    setCardBottom(navGap);

    if (!targetId) {
      if (nav) {
        setSpot({
          top: nav.top + 4,
          left: 8,
          width: Math.max(40, nav.width - 16),
          height: Math.max(48, nav.height - 8),
          radius: 18,
        });
      } else {
        setSpot(null);
      }
      return;
    }

    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (!el) {
      setSpot(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const padX = 4;
    const padY = 3;
    setSpot({
      top: Math.max(4, rect.top - padY),
      left: Math.max(4, rect.left - padX),
      width: rect.width + padX * 2,
      height: rect.height + padY * 2,
      radius: 14,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !shouldOfferTour()) return undefined;

    let cancelled = false;
    let attempts = 0;

    const tryStart = () => {
      if (cancelled || hasCompletedNavbarTour()) return;
      if (!isMobileViewport()) return;

      const nav = getNavbarBox();
      if (!nav) {
        if (attempts++ < 10) setTimeout(tryStart, 220);
        return;
      }

      setActive(true);
      setStep(0);
    };

    const timer = setTimeout(tryStart, 550);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!active) return undefined;
    layout(current?.target);
    const onResize = () => layout(current?.target);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [active, current?.target, layout, step]);

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
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
        >
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
                    rx={spot.radius || 14}
                    ry={spot.radius || 14}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(12, 8, 5, 0.62)"
              mask="url(#kridana-tour-mask)"
            />
          </svg>

          {spot && (
            <motion.div
              key={`spot-${current.id}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="absolute pointer-events-none ring-2 ring-[#FF6A00] shadow-[0_0_0_3px_rgba(255,106,0,0.22)]"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                borderRadius: spot.radius || 14,
              }}
            />
          )}

          <motion.div
            key={`card-${current.id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            className="absolute left-3 right-3"
            style={{
              bottom: cardBottom,
              maxWidth: 380,
              marginLeft: "auto",
              marginRight: "auto",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navbar-tour-title"
          >
            <div className="rounded-2xl bg-white border border-orange-100 shadow-[0_12px_32px_rgba(0,0,0,0.22)] overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#FF6A00] to-[#FFB347]" />
              <div className="px-3.5 pt-3 pb-3">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#FF6A00] mb-1">
                  <Sparkles size={11} />
                  Kridana guide · {step + 1}/{NAVBAR_TOUR_STEPS.length}
                </div>
                <h2
                  id="navbar-tour-title"
                  className="text-[16px] font-bold text-gray-900 tracking-tight"
                >
                  {current.title}
                </h2>
                <p className="text-[13px] text-gray-600 mt-1 leading-snug">
                  {current.body}
                </p>

                <div className="flex items-center gap-1 mt-3 mb-3">
                  {NAVBAR_TOUR_STEPS.map((s, i) => (
                    <span
                      key={s.id}
                      className={`h-1 rounded-full transition-all duration-200 ${
                        i === step
                          ? "w-5 bg-[#FF6A00]"
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
                    className="px-3 py-2 rounded-xl text-[13px] font-medium text-gray-500 active:scale-[0.98]"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-[#FF6A00] text-white py-2.5 rounded-xl text-[13px] font-bold shadow-[0_6px_16px_rgba(255,106,0,0.32)] active:scale-[0.98]"
                  >
                    {isLast ? "Finish" : "Next"}
                    {!isLast && <ChevronRight size={15} />}
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
