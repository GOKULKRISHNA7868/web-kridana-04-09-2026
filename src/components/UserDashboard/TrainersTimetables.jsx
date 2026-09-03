import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import CustomerCalendarShell from "../shared/CustomerCalendarShell";
import {
  formatCalendarDate,
  formatCalendarTime,
  parseFirestoreDate,
  uniqueValues,
} from "../../utils/calendarHelpers";

export default function TrainersTimetables() {
  const [studentId, setStudentId] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    category: "all",
    trainerName: "all",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setStudentId(user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const loadTimetable = async () => {
      setLoading(true);

      try {
        const trainerSnap = await getDocs(collection(db, "trainers"));
        const promises = trainerSnap.docs.map((trainerDoc) =>
          getDocs(
            collection(db, "trainers", trainerDoc.id, "timetable"),
          ).then((snap) =>
            snap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })),
          ),
        );

        const results = await Promise.all(promises);
        const allEvents = results.flat().filter((data) =>
          data.students?.some(
            (id) => id === studentId || id.startsWith(studentId),
          ),
        );

        const formatted = allEvents
          .map((slot) => {
            const start = parseFirestoreDate(slot.start);
            const end = parseFirestoreDate(slot.end);
            if (!start || !end) return null;

            return {
              id: slot.id,
              title: `${slot.title || slot.subCategory || "Class"} · ${slot.trainerName || "Trainer"}`,
              start,
              end,
              extendedProps: {
                category: slot.category || "",
                subCategory: slot.subCategory || "",
                trainerName: slot.trainerName || "",
                students: slot.students || [],
                raw: slot,
              },
            };
          })
          .filter(Boolean);

        setEvents(formatted);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTimetable();
  }, [studentId]);

  const filterOptions = useMemo(
    () => [
      {
        key: "category",
        label: "Category",
        options: uniqueValues(events, (e) => e.extendedProps?.category),
      },
      {
        key: "trainerName",
        label: "Trainer",
        options: uniqueValues(events, (e) => e.extendedProps?.trainerName),
      },
    ],
    [events],
  );

  return (
    <CustomerCalendarShell
      title="Trainer Class Schedule"
      subtitle="All sessions linked to your trainer profile"
      loading={loading}
      events={events}
      filterOptions={filterOptions}
      activeFilters={filters}
      onFilterChange={(key, value) =>
        setFilters((prev) => ({ ...prev, [key]: value }))
      }
      emptyTitle="No trainer classes yet"
      emptyHint="When your trainer adds sessions, they will show here automatically."
      alert={
        events.length > 0
          ? "Use Week or Agenda view on mobile for the clearest schedule."
          : null
      }
      selectedEvent={selectedEvent}
      onCloseDetail={() => setSelectedEvent(null)}
      onEventClick={(info) => {
        setSelectedEvent({
          title: info.event.title,
          start: info.event.start,
          end: info.event.end,
          ...info.event.extendedProps,
        });
      }}
      renderEventDetail={(event) => (
        <EventDetailModal event={event} onClose={() => setSelectedEvent(null)} />
      )}
      sidePanel={
        <AgendaPanel
          events={events}
          onSelect={(event) => setSelectedEvent(event)}
        />
      }
    />
  );
}

const AgendaPanel = ({ events, onSelect }) => {
  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((e) => e.start && new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 8);
  }, [events]);

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Upcoming</h3>
        <p className="text-xs text-gray-500 mt-0.5">Your next trainer sessions</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nothing upcoming</p>
        ) : (
          upcoming.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() =>
                onSelect({
                  title: event.title,
                  start: event.start,
                  end: event.end,
                  ...event.extendedProps,
                })
              }
              className="w-full text-left rounded-xl border border-gray-100 px-3 py-2.5 hover:border-orange-200 hover:bg-orange-50/50 active:scale-[0.99] transition"
            >
              <p className="font-semibold text-sm text-gray-900 truncate">
                {event.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCalendarDate(event.start, true)} ·{" "}
                {formatCalendarTime(event.start)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const EventDetailModal = ({ event, onClose }) => (
  <>
    <div className="px-5 pt-5 pb-3 border-b border-gray-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF6A00]">
        Session details
      </p>
      <h3 className="text-lg font-bold text-gray-900 mt-1 leading-snug">
        {event.title}
      </h3>
    </div>
    <div className="px-5 py-4 space-y-3 text-sm">
      <DetailRow label="Date" value={formatCalendarDate(event.start, true)} />
      <DetailRow
        label="Time"
        value={`${formatCalendarTime(event.start)} – ${formatCalendarTime(event.end)}`}
      />
      {event.category && <DetailRow label="Category" value={event.category} />}
      {event.subCategory && (
        <DetailRow label="Sub category" value={event.subCategory} />
      )}
      {event.trainerName && (
        <DetailRow label="Trainer" value={event.trainerName} />
      )}
      <DetailRow
        label="Students"
        value={String(event.students?.length || 0)}
      />
    </div>
    <div className="px-5 pb-5">
      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[48px] rounded-xl bg-gray-100 text-gray-800 font-semibold"
      >
        Close
      </button>
    </div>
  </>
);

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="font-semibold text-gray-900 text-right">{value || "—"}</span>
  </div>
);
