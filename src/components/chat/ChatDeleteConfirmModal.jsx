import { Trash2 } from "lucide-react";

const previewText = (message) => {
  if (message?.text) return message.text;
  if (message?.audio) return "Voice message";
  return "Message";
};

export default function ChatDeleteConfirmModal({
  open,
  count,
  messages = [],
  onCancel,
  onConfirm,
  deleting = false,
}) {
  if (!open) return null;

  const title =
    count === 1 ? "Delete this message?" : `Delete ${count} messages?`;

  const description =
    count === 1
      ? "This message will be permanently removed from the chat. This action cannot be undone."
      : `These ${count} messages will be permanently removed from the chat. This action cannot be undone.`;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-delete-title"
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pb-[max(env(safe-area-inset-bottom),24px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <Trash2 size={28} />
          </div>
        </div>

        <h2
          id="chat-delete-title"
          className="text-lg font-bold text-gray-900 text-center"
        >
          {title}
        </h2>

        <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
          {description}
        </p>

        <p className="text-xs text-gray-400 text-center mt-2">
          Only your own messages can be deleted.
        </p>

        {messages.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-2xl p-3 max-h-32 overflow-y-auto space-y-2">
            {messages.slice(0, 5).map((message) => (
              <div
                key={message.id}
                className="bg-white rounded-xl px-3 py-2 border border-gray-100"
              >
                <p className="text-xs text-gray-600 whitespace-pre-wrap break-words line-clamp-2">
                  {previewText(message)}
                </p>
              </div>
            ))}
            {messages.length > 5 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{messages.length - 5} more message
                {messages.length - 5 === 1 ? "" : "s"}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-12 rounded-xl bg-gray-100 text-gray-700 font-semibold active:scale-[0.98] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-12 rounded-xl bg-red-500 text-white font-semibold active:scale-[0.98] shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <Trash2 size={16} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
