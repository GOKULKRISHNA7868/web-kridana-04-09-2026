import { Trash2, X } from "lucide-react";

export default function ChatSelectionToolbar({ count, onCancel, onDelete }) {
  const label =
    count === 1 ? "1 message selected" : `${count} messages selected`;

  return (
    <div className="flex items-center justify-between w-full gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel selection"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 active:scale-95 transition"
        >
          <X size={20} />
        </button>
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${count} selected message${count === 1 ? "" : "s"}`}
        className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 active:scale-95 transition shadow-sm"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
