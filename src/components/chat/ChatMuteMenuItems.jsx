import React from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

export default function ChatMuteMenuItems({
  conversationMuted,
  globalMuted,
  onToggleConversation,
  onToggleGlobal,
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleConversation}
        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
      >
        {conversationMuted ? <Bell size={16} /> : <BellOff size={16} />}
        <span className="min-w-0">
          <span className="block font-medium text-gray-800">
            {conversationMuted ? "Unmute this chat" : "Mute this chat"}
          </span>
          <span className="block text-[11px] text-gray-400">
            {conversationMuted
              ? "Alerts for this conversation are off"
              : "Silence only this conversation"}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleGlobal}
        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
      >
        {globalMuted ? <BellRing size={16} /> : <BellOff size={16} />}
        <span className="min-w-0">
          <span className="block font-medium text-gray-800">
            {globalMuted ? "Unmute all chats" : "Mute all chats"}
          </span>
          <span className="block text-[11px] text-gray-400">
            {globalMuted
              ? "Phone alerts are paused for every chat"
              : "Turn off alerts from every conversation"}
          </span>
        </span>
      </button>
    </>
  );
}
