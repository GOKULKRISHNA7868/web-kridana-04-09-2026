import React, { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Footprints,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  NOTIFICATION_SOUNDS,
  previewNotificationSound,
} from "../../utils/chatNotifications";

function ToggleRow({ icon, iconClass, title, subtitle, enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800">{title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <span
        className={`w-11 h-6 rounded-full p-0.5 transition flex-shrink-0 ${
          enabled ? "bg-[#FF6A00]" : "bg-gray-300"
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function NotificationPrefsPanel({
  chatMuted,
  walkingMuted,
  alertSound,
  walkingReminders,
  pushPermission,
  onToggleChatMute,
  onToggleWalkingMute,
  onToggleWalkingReminders,
  onAlertSound,
  onEnablePush,
}) {
  const [playingId, setPlayingId] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const activeSound = alertSound || "ding";

  const handleSelectSound = async (soundId) => {
    setPlayingId(soundId);
    await onAlertSound?.(soundId);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
    window.setTimeout(() => setPlayingId(null), 650);
  };

  const handlePreviewOnly = async (event, soundId) => {
    event.stopPropagation();
    if (!NOTIFICATION_SOUNDS.find((s) => s.id === soundId)?.previewSrc) return;
    setPlayingId(soundId);
    await previewNotificationSound(soundId);
    window.setTimeout(() => setPlayingId(null), 650);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center flex-shrink-0">
            <Volume2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-gray-900">Alert tone</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Classic simple sounds for all alerts. Tap play to listen, tap the
              name to save.
            </p>
            {savedFlash ? (
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Check size={12} /> Saved
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-sm">
        {NOTIFICATION_SOUNDS.map((sound, index) => {
          const active = activeSound === sound.id;
          const isPlaying = playingId === sound.id;
          const canPreview = Boolean(sound.previewSrc);
          return (
            <div key={sound.id}>
              {index > 0 ? <div className="h-px bg-gray-100 ml-4" /> : null}
              <div
                className={`flex items-center gap-2.5 px-3.5 py-3 ${
                  active ? "bg-[#FFF7F0]" : "bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSound(sound.id)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      active
                        ? "bg-[#FF6A00] text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {active ? <Check size={16} /> : <Volume2 size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800">
                      {sound.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {sound.hint}
                    </p>
                  </div>
                </button>

                {canPreview ? (
                  <button
                    type="button"
                    onClick={(e) => handlePreviewOnly(e, sound.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition active:scale-95 ${
                      isPlaying
                        ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                        : "bg-white text-[#FF6A00] border-orange-200"
                    }`}
                    aria-label={`Play ${sound.label}`}
                  >
                    <Play size={13} fill="currentColor" className="ml-0.5" />
                  </button>
                ) : (
                  <span className="w-9 text-center text-[9px] font-medium text-gray-300">
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-sm">
        <ToggleRow
          icon={chatMuted ? <BellOff size={18} /> : <Bell size={18} />}
          iconClass="bg-orange-50 text-orange-500"
          title="Chat alerts"
          subtitle={chatMuted ? "Paused" : "Messages & requests"}
          enabled={!chatMuted}
          onToggle={onToggleChatMute}
        />
        <div className="h-px bg-gray-100 ml-[68px]" />
        <ToggleRow
          icon={<Footprints size={18} />}
          iconClass="bg-emerald-50 text-emerald-600"
          title="Walking alerts"
          subtitle={walkingMuted ? "Paused" : "Live walk & goals"}
          enabled={!walkingMuted}
          onToggle={onToggleWalkingMute}
        />
        <div className="h-px bg-gray-100 ml-[68px]" />
        <ToggleRow
          icon={<Bell size={18} />}
          iconClass="bg-blue-50 text-blue-600"
          title="Daily reminder"
          subtitle="Evening walk nudge"
          enabled={walkingReminders && !walkingMuted}
          onToggle={onToggleWalkingReminders}
        />
      </div>

      <div className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={onEnablePush}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-800">
              Phone alerts
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {pushPermission === "granted"
                ? "Allowed on this device"
                : "Enable for background alerts"}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              pushPermission === "granted"
                ? "bg-green-50 text-green-700"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            {pushPermission === "granted" ? "ON" : "Enable"}
          </span>
        </button>
        <div className="h-px bg-gray-100 ml-[68px]" />
        <div className="px-4 py-3.5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-800">Quick tip</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              Tap a notification to open the right screen — chat, walk, or
              requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
