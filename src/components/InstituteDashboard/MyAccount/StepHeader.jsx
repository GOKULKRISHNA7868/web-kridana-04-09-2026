import React from "react";
import { ArrowLeft } from "lucide-react";

const StepHeader = ({ title, onBack, onSave, saving, hideSave = false }) => {
  return (
    <div className="sticky top-0 z-20 bg-[#F4F6FB]/95 backdrop-blur-md pb-2 pt-1 -mx-1 px-1 border-b border-orange-100/80">
      <div className="flex items-center justify-between gap-2 min-h-[48px]">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-200"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-gray-900" />
        </button>

        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 truncate px-1">
          {title}
        </h1>

        {hideSave ? (
          <div className="w-11 h-11" />
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-[44px] px-3 text-[16px] font-semibold text-orange-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
};

export default StepHeader;
