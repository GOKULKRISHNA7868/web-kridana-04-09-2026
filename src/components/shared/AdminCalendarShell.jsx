import React, { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Clock,
  Bell,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
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

const parseEventDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const StatPill = ({ label, value, accent }) => (
  <div
    className={`rounded-xl px-2.5 py-1.5 text-center min-w-[52px] border ${
      accent ? "bg-orange-50 border-orange-100" : "bg-white border-gray-100"
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

const DefaultEventChip = ({ event, viewType }) => {
  const cancelled = event.extendedProps?.cancelled;
  const category = event.extendedProps?.category;
  const tone =
    event.extendedProps?.chipClass ||
    (cancelled
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-orange-100 text-orange-900 border-orange-200");

  if (viewType === "dayGridMonth") {
    return (
      <div
        className={`truncate rounded-full px-1.5 py-[1px] text-[9px] sm:text-[10px] font-semibold border ${tone}`}
      >
        • {event.title}
      </div>
    );
  }

  return (
    <div className={`rounded-md px-1.5 py-1 text-[10px] sm:text-[11px] leading-tight border overflow-hidden ${tone}`}>
      <div className="font-semibold truncate">{event.title}</div>
      {event.extendedProps?.trainer ? (
        <div className="truncate opacity-90">{event.extendedProps.trainer}</div>
      ) : null}
      {event.extendedProps?.count != null ? (
        <div className="opacity-80">{event.extendedProps.count} students</div>
      ) : null}
      {category ? (
        <div className="truncate opacity-75 text-[9px]">{category}</div>
      ) : null}
    </div>
  );
};

export default function AdminCalendarShell({
  title = "Calendar",
  subtitle = "Manage your class schedule",
  loading = false,
  events = [],
  emptyTitle = "No classes scheduled",
  emptyHint = "Tap a time slot or add a class to get started.",
  alert,
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
  onEventClick,
  onDateClick,
  onRangeSelect,
  selectable = true,
  onAddClick,
  addLabel = "Add class",
  sidePanel,
  footerStats,
  aiInsights = [],
  initialView = "timeGridWeek",
  slotMinTime = "06:00:00",
  slotMaxTime = "22:00:00",
  renderEventChip,
  onCalendarReady,
}) {
  const calendarRef = useRef(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [search, setSearch] = useState("");
  const [calendarView, setCalendarView] = useState(initialView);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);

  const getCalApi = () => calendarRef.current?.getApi?.();

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return events.filter((event) => {
      if (keyword) {
        const haystack = [
          event.title,
          event.extendedProps?.trainer,
          event.extendedProps?.category,
          event.extendedProps?.branch,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
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
        <p className="text-sm font-medium">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-transparent overflow-hidden">
      <div className="shrink-0 pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
              <CalendarDays size={20} className="text-[#FF6A00] shrink-0" />
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <StatPill label="Today" value={stats.todayCount} />
            <StatPill label="Week" value={stats.weekCount} accent />
            {onAddClick ? (
              <button
                type="button"
                onClick={onAddClick}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#FF6A00] hover:bg-[#e85f00] text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-sm h-fit self-center"
              >
                <Plus size={16} />
                {addLabel}
              </button>
            ) : null}
          </div>
        </div>

        {alert ? (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-900">
            <Bell size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-snug">{alert}</p>
          </div>
        ) : null}

        {stats.upcoming ? (
          <div className="mt-3 bg-white border border-orange-100 rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm">
            <Clock size={16} className="text-[#FF6A00] shrink-0" />
            <p className="text-gray-700 truncate">
              <span className="font-semibold text-gray-900">Next: </span>
              {stats.upcoming.title} ·{" "}
              {formatCalendarDate(stats.upcoming.startDate, true)} at{" "}
              {formatCalendarTime(stats.upcoming.startDate, is24Hour)}
            </p>
          </div>
        ) : null}

        {aiInsights.length > 0 ? (
          <div className="mt-3 bg-white border border-violet-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAiPanel((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                <Sparkles size={16} className="text-violet-600" />
                Smart schedule insights
              </span>
              {showAiPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showAiPanel ? (
              <ul className="px-3 pb-3 space-y-1.5">
                {aiInsights.map((item, index) => (
                  <li
                    key={index}
                    className={`text-xs sm:text-sm rounded-lg px-2.5 py-2 leading-snug ${
                      item.type === "warn"
                        ? "bg-red-50 text-red-800 border border-red-100"
                        : item.type === "tip"
                          ? "bg-violet-50 text-violet-900 border border-violet-100"
                          : "bg-gray-50 text-gray-700 border border-gray-100"
                    }`}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-3 mb-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              type="button"
              onClick={goToday}
              className="shrink-0 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
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
            {filterOptions.length > 0 ? (
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
                {hasActiveFilters ? (
                  <span className="w-2 h-2 rounded-full bg-[#FF6A00]" />
                ) : null}
              </button>
            ) : null}
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
            {onAddClick ? (
              <button
                type="button"
                onClick={onAddClick}
                className="sm:hidden shrink-0 inline-flex items-center gap-1 bg-[#FF6A00] text-white h-9 px-3 rounded-xl text-sm font-semibold"
              >
                <Plus size={16} />
                Add
              </button>
            ) : null}
          </div>

          {showFilters && filterOptions.length > 0 ? (
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
          ) : null}

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

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        <div className="flex-1 min-h-[320px] lg:min-h-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-gray-100">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {calendarTitle || "Calendar"}
            </h2>
            <span className="text-xs text-gray-400 shrink-0">
              {filteredEvents.length} class
              {filteredEvents.length === 1 ? "" : "es"}
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
              <CalendarDays size={40} className="text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">{emptyTitle}</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">{emptyHint}</p>
              {onAddClick ? (
                <button
                  type="button"
                  onClick={onAddClick}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#FF6A00] text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
                >
                  <Plus size={16} />
                  {addLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 min-h-[280px] sm:min-h-[360px] kridana-cal px-1 sm:px-2 pb-2 overflow-auto">
              <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  listPlugin,
                  interactionPlugin,
                ]}
                headerToolbar={false}
                initialView={initialView}
                height="100%"
                contentHeight="auto"
                allDaySlot={false}
                slotMinTime={slotMinTime}
                slotMaxTime={slotMaxTime}
                slotDuration="00:30:00"
                slotLabelInterval="01:00:00"
                scrollTime="08:00:00"
                scrollTimeReset={false}
                nowIndicator
                stickyHeaderDates
                expandRows
                handleWindowResize
                windowResizeDelay={100}
                longPressDelay={150}
                selectLongPressDelay={150}
                dayMaxEvents
                dayMaxEventRows={3}
                selectable={selectable}
                selectMirror={selectable}
                unselectAuto
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
                dayHeaderFormat={{
                  weekday: "short",
                  month: "numeric",
                  day: "numeric",
                }}
                dayCellClassNames={(arg) =>
                  isSameDay(arg.date, selectedDate)
                    ? ["kridana-cal-selected"]
                    : []
                }
                datesSet={(info) => {
                  setCalendarTitle(info.view.title);
                  setCalendarView(info.view.type);
                  onCalendarReady?.(info.view.calendar);
                  const current = info.view.calendar.getDate();
                  setSelectedDate((prev) => {
                    if (
                      info.view.type === "dayGridMonth" &&
                      prev.getMonth() === current.getMonth() &&
                      prev.getFullYear() === current.getFullYear()
                    ) {
                      return prev;
                    }
                    return current;
                  });
                }}
                dateClick={(info) => {
                  setSelectedDate(info.date);
                  onDateClick?.(info);
                }}
                select={(info) => {
                  setSelectedDate(info.start);
                  onRangeSelect?.(info);
                }}
                eventClick={(info) => {
                  if (info.event.start) setSelectedDate(info.event.start);
                  onEventClick?.(info);
                }}
                eventContent={(info) =>
                  renderEventChip ? (
                    renderEventChip(info)
                  ) : (
                    <DefaultEventChip event={info.event} viewType={info.view.type} />
                  )
                }
              />
            </div>
          )}

          {footerStats ? (
            <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-[#f6f7fb] border-t border-gray-100 flex items-center justify-between gap-2">
              {footerStats}
            </div>
          ) : null}
        </div>

        {sidePanel ? (
          <div className="lg:w-[320px] xl:w-[360px] shrink-0 min-h-0 flex flex-col">
            <button
              type="button"
              onClick={() => setShowSidePanel((v) => !v)}
              className="lg:hidden mb-2 flex items-center justify-between w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800"
            >
              <span>Day schedule</span>
              {showSidePanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div
              className={`${
                showSidePanel ? "flex" : "hidden lg:flex"
              } flex-col min-h-[200px] max-h-[42vh] lg:max-h-none lg:h-full flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}
            >
              {sidePanel}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
