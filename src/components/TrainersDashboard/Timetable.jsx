import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { CalendarDays, Sparkles } from "lucide-react";
import AdminCalendarShell from "../shared/AdminCalendarShell";
import {
  formatCalendarTime,
  parseFirestoreDate,
  uniqueValues,
} from "../../utils/calendarHelpers";
import {
  buildScheduleInsights,
  classAccent,
  detectConflicts,
  suggestFreeSlots,
} from "../../utils/calendarAiHelpers";
import {
  SPORT_CATEGORIES as categories,
  SPORT_SUBCATEGORY_MAP as subCategoryMap,
} from "../../constants/sportCategories";

export default function ClassTime() {
  const [trainerId, setTrainerId] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const calendarApiRef = useRef(null);
  const [filters, setFilters] = useState({ category: "all" });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    category: "",
    subCategory: "",
    students: [],
  });

  const isEdit = !!editId;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setTrainerId(user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!trainerId) return;

    const loadData = async () => {
      try {
        setPageLoading(true);
        const trainerDoc = await getDoc(doc(db, "trainers", trainerId));
        const trainerData = trainerDoc.data() || {};
        setTrainerName(trainerData.firstName || "Trainer");

        const studentSnap = await getDocs(collection(db, "trainerstudents"));
        const studentList = studentSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.trainerId === trainerId);
        setStudents(studentList);

        const timetableSnap = await getDocs(
          collection(db, "trainers", trainerId, "timetable"),
        );
        setSchedule(timetableSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading:", err);
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [trainerId]);

  useEffect(() => {
    if (students.length > 0 && !editId) {
      setForm((prev) => ({
        ...prev,
        students: students.map((s) => s.id),
      }));
    }
  }, [students, editId]);

  const saveClass = async () => {
    if (!form.category || !form.subCategory || !form.date) {
      alert("Please fill all required fields");
      return;
    }

    const startDateTime = new Date(`${form.date}T${form.startTime}`);
    const endDateTime = new Date(`${form.date}T${form.endTime}`);
    const payload = {
      title: form.subCategory,
      category: form.category,
      subCategory: form.subCategory,
      start: startDateTime,
      end: endDateTime,
      trainerId,
      trainerName,
      students: form.students,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editId) {
        await updateDoc(
          doc(db, "trainers", trainerId, "timetable", editId),
          payload,
        );
        setSchedule((prev) =>
          prev.map((item) =>
            item.id === editId ? { ...item, ...payload } : item,
          ),
        );
      } else {
        const docRef = await addDoc(
          collection(db, "trainers", trainerId, "timetable"),
          { ...payload, createdAt: serverTimestamp() },
        );
        setSchedule((prev) => [...prev, { id: docRef.id, ...payload }]);
      }
      setShowModal(false);
      setEditId(null);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const events = useMemo(
    () =>
      schedule.map((s) => {
        const accent = classAccent(s.category, s.cancelled);
        return {
          id: s.id,
          title: s.subCategory || s.title,
          start: parseFirestoreDate(s.start),
          end: parseFirestoreDate(s.end),
          extendedProps: {
            trainer: s.trainerName,
            count: s.students?.length || 0,
            category: s.category || "",
            chipClass: accent.chip,
            raw: s,
          },
        };
      }),
    [schedule],
  );

  const scheduleInsights = useMemo(
    () => buildScheduleInsights(schedule),
    [schedule],
  );

  const filterOptions = useMemo(
    () => [
      {
        key: "category",
        label: "Category",
        options: uniqueValues(schedule, (s) => s.category),
      },
    ],
    [schedule],
  );

  const smartSlots = useMemo(
    () => suggestFreeSlots(schedule, form.date || selectedDate, { trainerId }),
    [schedule, form.date, selectedDate, trainerId],
  );

  const formConflicts = useMemo(() => {
    if (!form.date || !form.startTime || !form.endTime) return [];
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    return detectConflicts(schedule, { start, end, trainerId }, editId);
  }, [schedule, form, editId, trainerId]);

  const selectedDayClasses = schedule
    .filter((s) => {
      const start = parseFirestoreDate(s.start);
      return (
        start &&
        start.getFullYear() === selectedDate.getFullYear() &&
        start.getMonth() === selectedDate.getMonth() &&
        start.getDate() === selectedDate.getDate()
      );
    })
    .sort(
      (a, b) =>
        (parseFirestoreDate(a.start)?.getTime() || 0) -
        (parseFirestoreDate(b.start)?.getTime() || 0),
    );

  const selectedDayLabel = selectedDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const formatClock = (value) =>
    formatCalendarTime(parseFirestoreDate(value), false);

  const openNewClass = (prefill = {}) => {
    setEditId(null);
    setForm({
      date: prefill.date || new Date().toISOString().slice(0, 10),
      startTime: prefill.startTime || "",
      endTime: prefill.endTime || "",
      category: "",
      subCategory: "",
      students: students.map((s) => s.id),
    });
    setShowModal(true);
  };

  const openScheduledClass = (item) => {
    const start = parseFirestoreDate(item.start);
    const end = parseFirestoreDate(item.end);
    if (!start || !end) return;
    setEditId(item.id);
    setForm({
      date: start.toISOString().slice(0, 10),
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      category: item.category || "",
      subCategory: item.subCategory || "",
      students: item.students || [],
    });
    setShowModal(true);
  };

  const handleRangeSelect = (info) => {
    const date = info.startStr.split("T")[0];
    const start = info.startStr.split("T")[1]?.slice(0, 5);
    const end = info.endStr.split("T")[1]?.slice(0, 5);
    setSelectedDate(info.start);
    openNewClass({ date, startTime: start, endTime: end });
  };

  const handleEventClick = (info) => {
    const event = schedule.find((s) => s.id === info.event.id);
    if (!event) return;
    if (info.event.start) setSelectedDate(info.event.start);
    openScheduledClass(event);
  };

  const applySmartSlot = (slot) => {
    setForm((prev) => ({
      ...prev,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  };

  const goToSelectedDay = () => {
    calendarApiRef.current?.changeView("timeGridDay");
    calendarApiRef.current?.gotoDate(selectedDate);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <AdminCalendarShell
        title="My Class Calendar"
        subtitle={`Sessions for ${trainerName || "your students"}`}
        loading={pageLoading}
        events={events}
        filterOptions={filterOptions}
        activeFilters={filters}
        onFilterChange={(key, value) =>
          setFilters((prev) => ({ ...prev, [key]: value }))
        }
        aiInsights={scheduleInsights.insights}
        alert="Week and Agenda views work best on mobile. Drag on the calendar to schedule quickly."
        emptyTitle="No classes scheduled"
        emptyHint="Add a class or drag a time slot on the calendar."
        onAddClick={() => openNewClass()}
        addLabel="Schedule class"
        onCalendarReady={(api) => {
          calendarApiRef.current = api;
        }}
        onDateClick={(info) => setSelectedDate(info.date)}
        onRangeSelect={handleRangeSelect}
        onEventClick={handleEventClick}
        initialView="timeGridWeek"
        footerStats={
          <p className="text-[11px] sm:text-xs text-gray-600">
            Students enrolled:{" "}
            <span className="font-semibold text-gray-800">{students.length}</span>
            <span className="hidden sm:inline text-gray-400"> · </span>
            <span className="hidden sm:inline">
              This week: {scheduleInsights.weekCount} classes
            </span>
          </p>
        }
        sidePanel={
          <>
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {selectedDayLabel}
              </h3>
              <span className="h-6 min-w-[24px] px-1.5 rounded-full bg-[#FF6A00] text-white text-xs font-bold flex items-center justify-center">
                {selectedDayClasses.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
              {selectedDayClasses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No classes on this day.
                </p>
              ) : (
                selectedDayClasses.map((cls) => {
                  const accent = classAccent(cls.category);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => openScheduledClass(cls)}
                      className="w-full text-left rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="flex">
                        <span className={`w-1.5 shrink-0 ${accent.bar}`} />
                        <div className="flex-1 min-w-0 p-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cls.subCategory}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cls.category}
                          </p>
                          <p className="text-xs font-medium text-gray-700 mt-1.5">
                            {formatClock(cls.start)} – {formatClock(cls.end)}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {cls.students?.length || 0} students
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="shrink-0 p-3 border-t border-gray-100">
              <button
                type="button"
                onClick={goToSelectedDay}
                className="w-full h-10 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 inline-flex items-center justify-center gap-2"
              >
                <CalendarDays size={16} className="text-[#FF6A00]" />
                Open day view
              </button>
            </div>
          </>
        }
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4">
          <div className="bg-white p-4 sm:p-6 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-xl space-y-4 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-center">
              {isEdit ? "Edit Class" : "Schedule Class"}
            </h3>

            {formConflicts.length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                You already have a class at this time.
              </div>
            ) : null}

            {smartSlots.length > 0 && !isEdit ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                <p className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Suggested free slots
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {smartSlots.map((slot) => (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => applySmartSlot(slot)}
                      className="text-xs font-semibold rounded-lg bg-white border border-violet-200 text-violet-800 px-2.5 py-1.5"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label className="text-sm text-gray-500">Date</label>
              <input
                type="date"
                className="w-full border rounded-lg p-2 mt-1"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Start</label>
                <input
                  type="time"
                  className="w-full border rounded-lg p-2 mt-1"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">End</label>
                <input
                  type="time"
                  className="w-full border rounded-lg p-2 mt-1"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500">Category</label>
              <select
                className="w-full border rounded-lg p-2 mt-1"
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                    subCategory: "",
                  })
                }
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-500">Sub Category</label>
              <select
                className="w-full border rounded-lg p-2 mt-1"
                value={form.subCategory}
                onChange={(e) =>
                  setForm({ ...form, subCategory: e.target.value })
                }
              >
                <option value="">Select SubCategory</option>
                {(subCategoryMap[form.category] || []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 text-blue-700 text-sm p-2.5 rounded-xl text-center">
              {form.students.length} students assigned automatically
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveClass}
                className="flex-1 bg-[#FF6A00] hover:bg-[#e85f00] text-white py-2.5 rounded-lg font-medium"
              >
                {isEdit ? "Update" : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditId(null);
                }}
                className="flex-1 bg-gray-200 py-2.5 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
