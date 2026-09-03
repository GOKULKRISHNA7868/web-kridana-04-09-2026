import React from "react";
import { Clock } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toClockLabel = (hhmm) => {
  if (!hhmm) return "";
  const [hourRaw, minute = "00"] = hhmm.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return hhmm;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
};

const fromClockLabel = (text = "") => {
  const match = String(text)
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    if (/^\d{2}:\d{2}$/.test(text.trim())) return text.trim();
    return "";
  }
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = (match[3] || "").toUpperCase();
  if (suffix === "PM" && hour < 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
};

export const buildScheduleLabel = (days = [], startTime = "", endTime = "") => {
  if (!days.length) return "";
  const start = toClockLabel(startTime);
  const end = toClockLabel(endTime);
  if (start && end) return `${days.join(", ")} | ${start} – ${end}`;
  if (start) return `${days.join(", ")} | ${start}`;
  return days.join(", ");
};

export const parseSchedule = (program = {}) => {
  if (Array.isArray(program.classDays) && program.classDays.length) {
    return {
      days: program.classDays,
      startTime: program.startTime || "",
      endTime: program.endTime || "",
    };
  }

  const text = String(program.batchTimings || "");
  const days = WEEKDAYS.filter((day) => text.includes(day));
  const timeMatch = text.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
  );

  return {
    days,
    startTime: fromClockLabel(timeMatch?.[1] || ""),
    endTime: fromClockLabel(timeMatch?.[2] || ""),
  };
};

const ClassSchedulePicker = ({
  days = [],
  startTime = "",
  endTime = "",
  error = false,
  onChange,
}) => {
  const emit = (nextDays, start, end) => {
    onChange?.({
      classDays: nextDays,
      startTime: start,
      endTime: end,
      batchTimings: buildScheduleLabel(nextDays, start, end),
    });
  };

  const toggleDay = (day) => {
    const next = days.includes(day)
      ? days.filter((item) => item !== day)
      : [...days, day];
    const ordered = WEEKDAYS.filter((item) => next.includes(item));
    emit(ordered, startTime, endTime);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Class days</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const selected = days.includes(day);
            return (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(day)}
                className={`min-h-[40px] min-w-[44px] px-3 rounded-full text-sm font-semibold border transition ${
                  selected
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
            <Clock size={13} /> Start time
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => emit(days, event.target.value, endTime)}
            className={`w-full min-h-[48px] text-base rounded-xl border px-4 py-3 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 ${
              error && !startTime ? "border-red-500" : "border-gray-200"
            }`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
            <Clock size={13} /> End time
          </span>
          <input
            type="time"
            value={endTime}
            onChange={(event) => emit(days, startTime, event.target.value)}
            className="w-full min-h-[48px] text-base rounded-xl border border-gray-200 px-4 py-3 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </label>
      </div>
    </div>
  );
};

export default ClassSchedulePicker;
