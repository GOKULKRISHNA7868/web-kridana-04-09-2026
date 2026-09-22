import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Clock,
  Bell,
} from "lucide-react";
import {
  formatCalendarDate,
  formatCalendarTime,
  isSameDay,
  isToday,
  isThisWeek,
} from "../../utils/calendarHelpers";

const VIEWS = [
  { id: "timeGridDay", label: "Day" },
  { id: "timeGridWeek", label: "Week" },
  { id: "dayGridMonth", label: "Month" },
  { id: "listWeek", label: "Agenda" },
];

const CustomerCalendarShell = ({
  title = "Schedule",
  subtitle = "Your classes and sessions",
  loading = false,
  events = [],
  emptyTitle = "No classes scheduled",
  emptyHint = "When your academy adds classes, they will appear here.",
  alert,
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
  onEventClick,
  renderEventDetail,
  selectedEvent,
  onCloseDetail,
  sidePanel,
}) => {
  const calendarRef = useRef(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [search, setSearch] = useState("");
  const [calendarView, setCalendarView] = useState("timeGridWeek");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showFilters, setShowFilters] = useState(false);

  const getCalApi = () => calendarRef.current?.getApi?.();

  useEffect(() => {
    const api = getCalApi();
    if (!api) return;
    const id = requestAnimationFrame(() => {
      try {
        api.updateSize();
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [calendarView]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return events.filter((event) => {
      if (keyword && !String(event.title || "").toLowerCase().includes(keyword)) {
        return false;
      }
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value || value === "all") continue;
        const eventValue = event.extendedProps?.[key] ?? event[key];
        if (String(eventValue || "") !== String(value)) return false;
      }
      return true;
    });
  }, [events, search, activeFilters]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayCount = filteredEvents.filter((e) =>
      isToday(parseEventDate(e.start)),
    ).length;
    const weekCount = filteredEvents.filter((e) =>
      isThisWeek(parseEventDate(e.start)),
    ).length;
    const upcoming = [...filteredEvents]
      .map((e) => ({ ...e, startDate: parseEventDate(e.start) }))
      .filter((e) => e.startDate && e.startDate >= now)
      .sort((a, b) => a.startDate - b.startDate)[0];
    return { todayCount, weekCount, upcoming };
  }, [filteredEvents]);

  const changeCalendarView = (viewId) => {
    setCalendarView(viewId);
    getCalApi()?.changeView(viewId);
  };

  const goToday = () => {
    getCalApi()?.today();
    setSelectedDate(new Date());
  };

  const hasActiveFilters = Object.values(activeFilters).some(
    (v) => v && v !== "all",
  );

  if (loading) {
    return (
      <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-gray-500 bg-[#F4F6FB] rounded-2xl">
        <div className="w-10 h-10 border-2 border-orange-200 border-t-[#FF6A00] rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#F4F6FB] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-1 sm:px-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
              <CalendarDays size={20} className="text-[#FF6A00] shrink-0" />
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <StatPill label="Today" value={stats.todayCount} />
            <StatPill label="Week" value={stats.weekCount} accent />
          </div>
        </div>

        {alert && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-900">
            <Bell size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-snug">{alert}</p>
          </div>
        )}

        {stats.upcoming && (
          <div className="mt-3 bg-white border border-orange-100 rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm">
            <Clock size={16} className="text-[#FF6A00] shrink-0" />
            <p className="text-gray-700 truncate">
              <span className="font-semibold text-gray-900">Next: </span>
              {stats.upcoming.title} ·{" "}
              {formatCalendarDate(stats.upcoming.startDate, true)} at{" "}
              {formatCalendarTime(stats.upcoming.startDate, is24Hour)}
            </p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-3 mb-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              type="button"
              onClick={goToday}
              className="shrink-0 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:scale-[0.98]"
            >
              Today
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => getCalApi()?.prev()}
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => getCalApi()?.next()}
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-white text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIs24Hour(false)}
                className={`h-9 px-2.5 ${!is24Hour ? "bg-[#FF6A00] text-white" : "text-gray-600"}`}
              >
                12h
              </button>
              <button
                type="button"
                onClick={() => setIs24Hour(true)}
                className={`h-9 px-2.5 ${is24Hour ? "bg-[#FF6A00] text-white" : "text-gray-600"}`}
              >
                24h
              </button>
            </div>
            {filterOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`shrink-0 h-9 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${
                  showFilters || hasActiveFilters
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <Filter size={15} />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#FF6A00]" />
                )}
              </button>
            )}
            <div className="relative min-w-[120px] flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:bg-white"
              />
            </div>
          </div>

          {showFilters && filterOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 border-t border-gray-100">
              {filterOptions.map((filter) => (
                <label key={filter.key} className="block">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {filter.label}
                  </span>
                  <select
                    value={activeFilters[filter.key] || "all"}
                    onChange={(e) =>
                      onFilterChange?.(filter.key, e.target.value)
                    }
                    className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800"
                  >
                    <option value="all">All {filter.label}</option>
                    {filter.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          <div className="flex rounded-xl bg-gray-100 p-1 w-full sm:w-auto self-start overflow-x-auto scrollbar-hide">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => changeCalendarView(view.id)}
                className={`shrink-0 h-8 px-3 sm:px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  calendarView === view.id
                    ? "bg-[#FF6A00] text-white shadow-sm"
                    : "text-gray-600"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-gray-100">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {calendarTitle || "Calendar"}
            </h2>
            <span className="text-xs text-gray-400 shrink-0">
              {filteredEvents.length} class
              {filteredEvents.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] flex flex-col overflow-hidden">
            {filteredEvents.length === 0 ? (
              <div className="absolute inset-x-0 top-0 z-10 pointer-events-none flex justify-center px-2 pt-2">
                <div className="pointer-events-auto max-w-sm w-full rounded-lg border border-dashed border-orange-200 bg-orange-50/95 px-2.5 py-1.5 text-center shadow-sm">
                  <p className="text-xs font-semibold text-gray-800">
                    {emptyTitle}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{emptyHint}</p>
                </div>
              </div>
            ) : null}

            <div
              className={`flex-1 min-h-0 overflow-hidden kridana-cal px-1 sm:px-2 pb-2 ${
                calendarView === "dayGridMonth" ? "is-month" : "is-time"
              }`}
            >
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                headerToolbar={false}
                initialView="timeGridWeek"
                height="100%"
                allDaySlot={false}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                slotMinHeight={26}
                scrollTime="07:00:00"
                scrollTimeReset={false}
                nowIndicator
                stickyHeaderDates
                expandRows={calendarView === "dayGridMonth"}
                handleWindowResize
                windowResizeDelay={80}
                dayMaxEvents={calendarView === "dayGridMonth" ? 2 : true}
                events={filteredEvents}
                slotLabelFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: !is24Hour,
                }}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: !is24Hour,
                }}
                dayHeaderFormat={
                  calendarView === "dayGridMonth"
                    ? { weekday: "short" }
                    : {
                        weekday: "short",
                        month: "numeric",
                        day: "numeric",
                      }
                }
                dayCellClassNames={(arg) =>
                  isSameDay(arg.date, selectedDate)
                    ? ["kridana-cal-selected"]
                    : []
                }
                datesSet={(info) => {
                  setCalendarTitle(info.view.title);
                  setCalendarView(info.view.type);
                  requestAnimationFrame(() => {
                    try {
                      info.view.calendar.updateSize();
                    } catch {
                      /* ignore */
                    }
                  });
                  setSelectedDate(info.view.calendar.getDate());
                }}
                dateClick={(info) => setSelectedDate(info.date)}
                eventClick={(info) => {
                  if (info.event.start) setSelectedDate(info.event.start);
                  onEventClick?.(info);
                }}
                eventContent={(info) => (
                  <CalendarEventChip event={info.event} />
                )}
              />
            </div>
          </div>
        </div>

        {sidePanel && (
          <div className="lg:w-72 xl:w-80 shrink-0 min-h-0 max-h-[40vh] lg:max-h-none overflow-hidden flex flex-col">
            {sidePanel}
          </div>
        )}
      </div>

      {selectedEvent && renderEventDetail && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onCloseDetail}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto pb-[max(16px,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderEventDetail(selectedEvent)}
          </div>
        </div>
      )}
    </div>
  );
};

const parseEventDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const StatPill = ({ label, value, accent }) => (
  <div
    className={`rounded-xl px-2.5 py-1.5 text-center min-w-[52px] border ${
      accent
        ? "bg-orange-50 border-orange-100"
        : "bg-white border-gray-100"
    }`}
  >
    <p
      className={`text-base font-bold leading-none ${accent ? "text-[#FF6A00]" : "text-gray-900"}`}
    >
      {value}
    </p>
    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
  </div>
);

const CalendarEventChip = ({ event }) => {
  const tone = event.extendedProps?.attendanceTone || "default";
  const toneClass =
    tone === "present"
      ? "bg-emerald-100 text-emerald-900 border-emerald-200"
      : tone === "absent"
        ? "bg-red-100 text-red-900 border-red-200"
        : "bg-orange-100 text-orange-900 border-orange-200";

  return (
    <div
      className={`rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] leading-tight border truncate ${toneClass}`}
    >
      <div className="font-semibold truncate">{event.title}</div>
    </div>
  );
};

export default CustomerCalendarShell;
