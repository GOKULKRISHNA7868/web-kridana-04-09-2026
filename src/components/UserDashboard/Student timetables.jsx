import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import CustomerCalendarShell from "../shared/CustomerCalendarShell";
import {
  formatCalendarDate,
  formatCalendarTime,
  normalizeAttendanceStatus,
  parseFirestoreDate,
  uniqueValues,
} from "../../utils/calendarHelpers";

export default function StudentTimetables() {
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    session: "all",
    category: "all",
    attendance: "all",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);

      const sSnap = await getDoc(doc(db, "students", u.uid));
      if (sSnap.exists()) {
        setStudentProfile(sSnap.data());
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentProfile?.instituteId || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        const [classSnap, attSnap] = await Promise.all([
          getDocs(
            query(
              collection(
                db,
                "institutes",
                studentProfile.instituteId,
                "timetable",
              ),
              where("students", "array-contains", user.uid),
            ),
          ),
          getDocs(
            query(
              collection(
                db,
                "institutes",
                studentProfile.instituteId,
                "attendance",
              ),
              where("studentId", "==", user.uid),
            ),
          ),
        ]);

        setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAttendance(attSnap.docs.map((d) => d.data()));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [studentProfile, user]);

  const attendanceByDate = useMemo(() => {
    const map = {};
    attendance.forEach((row) => {
      if (!row.date) return;
      map[row.date] = normalizeAttendanceStatus(row.status);
    });
    return map;
  }, [attendance]);

  const events = useMemo(() => {
    return classes
      .map((slot) => {
        const start = parseFirestoreDate(slot.start);
        const end = parseFirestoreDate(slot.end);
        if (!start || !end) return null;

        const dateKey = start.toISOString().split("T")[0];
        const att = attendanceByDate[dateKey];
        const attendanceTone =
          att === "present" ? "present" : att === "absent" ? "absent" : "default";

        const attendanceLabel =
          att === "present"
            ? "Present"
            : att === "absent"
              ? "Absent"
              : start >= new Date()
                ? "Upcoming"
                : "";

        return {
          id: slot.id,
          title: `${slot.category || slot.title || "Class"} · ${slot.trainerName || "Trainer"}`,
          start,
          end,
          session: slot.session || "General",
          category: slot.category || "",
          extendedProps: {
            session: slot.session || "General",
            category: slot.category || "",
            subCategory: slot.subCategory || "",
            trainerName: slot.trainerName || "",
            day: slot.day || "",
            time: slot.time || "",
            attendanceStatus: att || "not_marked",
            attendance: attendanceLabel,
            attendanceTone,
            raw: slot,
          },
        };
      })
      .filter(Boolean);
  }, [classes, attendanceByDate]);

  const attendanceStats = useMemo(() => {
    const marked = attendance.filter((a) => a.status);
    const present = marked.filter(
      (a) => normalizeAttendanceStatus(a.status) === "present",
    ).length;
    const absent = marked.filter(
      (a) => normalizeAttendanceStatus(a.status) === "absent",
    ).length;
    const percent =
      marked.length > 0 ? Math.round((present / marked.length) * 100) : 0;
    return { present, absent, total: marked.length, percent };
  }, [attendance]);

  const filterOptions = useMemo(
    () => [
      {
        key: "session",
        label: "Session",
        options: uniqueValues(classes, (c) => c.session || "General"),
      },
      {
        key: "category",
        label: "Category",
        options: uniqueValues(classes, (c) => c.category),
      },
      {
        key: "attendance",
        label: "Attendance",
        options: ["Present", "Absent", "Upcoming"],
      },
    ],
    [classes],
  );

  const shellFilters = useMemo(
    () => ({
      session: filters.session,
      category: filters.category,
      attendance:
        filters.attendance === "all"
          ? "all"
          : filters.attendance.charAt(0).toUpperCase() +
            filters.attendance.slice(1),
    }),
    [filters.session, filters.category, filters.attendance],
  );

  const handleFilterChange = (key, value) => {
    if (key === "attendance") {
      setFilters((prev) => ({
        ...prev,
        attendance:
          value === "all" ? "all" : String(value).toLowerCase(),
      }));
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <CustomerCalendarShell
      title="My Timetable"
      subtitle="Classes with attendance — tap any slot for details"
      loading={loading}
      events={events}
      filterOptions={filterOptions}
      activeFilters={shellFilters}
      onFilterChange={handleFilterChange}
      emptyTitle="No classes in this view"
      emptyHint="Try changing filters or ask your academy to add your timetable."
      alert={
        attendanceStats.total > 0
          ? `Attendance this period: ${attendanceStats.percent}% present (${attendanceStats.present}/${attendanceStats.total}). Green = present, red = absent on the calendar.`
          : "Attendance will appear on class days once your academy marks it."
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
        <AttendancePanel stats={attendanceStats} attendance={attendance} />
      }
    />
  );
}

const AttendancePanel = ({ stats, attendance }) => {
  const recent = useMemo(() => {
    return [...attendance]
      .filter((a) => a.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 10);
  }, [attendance]);

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Attendance</h3>
        <p className="text-xs text-gray-500 mt-0.5">Summary for this student</p>
      </div>

      <div className="shrink-0 grid grid-cols-3 gap-2 p-3 border-b border-gray-100">
        <MiniStat label="Present" value={stats.present} tone="green" />
        <MiniStat label="Absent" value={stats.absent} tone="red" />
        <MiniStat label="Rate" value={`${stats.percent}%`} tone="orange" />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 pt-1">
          Recent
        </p>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No records yet</p>
        ) : (
          recent.map((row, index) => {
            const status = normalizeAttendanceStatus(row.status);
            return (
              <div
                key={`${row.date}-${index}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {row.category || "Class"}
                  </p>
                  <p className="text-xs text-gray-500">{row.date}</p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    status === "present"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "absent"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {row.status || "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MiniStat = ({ label, value, tone }) => {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-[#FF6A00]";
  return (
    <div className="rounded-xl bg-gray-50 px-2 py-2 text-center">
      <p className={`text-base font-bold ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
    </div>
  );
};

const EventDetailModal = ({ event, onClose }) => {
  const status = event.attendanceStatus || "not_marked";
  const statusLabel =
    status === "present"
      ? "Present"
      : status === "absent"
        ? "Absent"
        : "Not marked yet";

  const statusClass =
    status === "present"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "absent"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <>
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#FF6A00]">
          Class & attendance
        </p>
        <h3 className="text-lg font-bold text-gray-900 mt-1 leading-snug">
          {event.title}
        </h3>
      </div>
      <div className="px-5 py-4 space-y-3 text-sm">
        <div
          className={`rounded-xl border px-3 py-2.5 text-center font-semibold ${statusClass}`}
        >
          Attendance: {statusLabel}
        </div>
        <DetailRow label="Date" value={formatCalendarDate(event.start, true)} />
        <DetailRow
          label="Time"
          value={`${formatCalendarTime(event.start)} – ${formatCalendarTime(event.end)}`}
        />
        <DetailRow label="Session" value={event.session || "General"} />
        {event.trainerName && (
          <DetailRow label="Trainer" value={event.trainerName} />
        )}
        {event.category && <DetailRow label="Category" value={event.category} />}
        {event.subCategory && (
          <DetailRow label="Program" value={event.subCategory} />
        )}
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
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="font-semibold text-gray-900 text-right">{value || "—"}</span>
  </div>
);
