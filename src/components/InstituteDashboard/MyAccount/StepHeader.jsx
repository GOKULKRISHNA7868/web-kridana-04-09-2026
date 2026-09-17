import React from "react";
import { ArrowLeft } from "lucide-react";

const StepHeader = ({
  title,
  subtitle,
  onBack,
  onSave,
  saving,
  hideSave = false,
  badge,
}) => {
  return (
    <div className="sticky top-0 z-20 bg-[#F4F6FB]/95 backdrop-blur-md pb-3 pt-1 -mx-1 px-1 border-b border-slate-200/80 mb-4">
      <div className="flex items-center justify-between gap-2 min-h-[48px]">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft size={20} className="text-slate-800" />
        </button>

        <div className="flex-1 min-w-0 text-center px-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-[17px] font-semibold text-slate-900 truncate">
              {title}
            </h1>
            {badge ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {subtitle}
            </p>
          ) : null}
        </div>

        {hideSave ? (
          <div className="w-11 h-11" />
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold shadow-sm shadow-orange-500/25 disabled:opacity-50 active:scale-95 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
};

export default StepHeader;
