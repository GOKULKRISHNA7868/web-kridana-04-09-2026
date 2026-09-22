import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
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
import { filterCurrentlyActive } from "../../utils/personStatus";
import {
  buildScheduleInsights,
  classAccent,
  detectConflicts,
  suggestFreeSlots,
} from "../../utils/calendarAiHelpers";
export default function ClassTime() {
  const [instituteId, setInstituteId] = useState("");
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const calendarApiRef = useRef(null);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branch: "all",
    trainerName: "all",
    category: "all",
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pageLoading, setPageLoading] = useState(true);
  const categories = [
    "Martial Arts",
    "Team Ball Sports",
    "Racket Sports",
    "Fitness",
    "Target & Precision Sports",
    "Equestrian Sports",
    "Adventure & Outdoor Sports",
    "Ice Sports",
    "Aquatic Sports",
    "Wellness",
    "Dance",
  ];

  const subCategoryMap = {
    "Martial Arts": [
      "Karate",
      "Kung Fu",
      "Krav Maga",
      "Muay Thai",
      "Taekwondo",
      "Judo",
      "Brazilian Jiu-Jitsu",
      "Aikido",
      "Jeet Kune Do",
      "Capoeira",
      "Sambo",
      "Silat",
      "Kalaripayattu",
      "Hapkido",
      "Wing Chun",
      "Shaolin",
      "Ninjutsu",
      "Kickboxing",
      "Boxing",
      "Wrestling",
      "Shorinji Kempo",
      "Kyokushin",
      "Goju-ryu",
      "Shotokan",
      "Wushu",
      "Savate",
      "Lethwei",
      "Bajiquan",
      "Hung Gar",
      "Praying Mantis Kung Fu",
    ],
    "Team Ball Sports": [
      "Football / Soccer",
      "Basketball",
      "Handball",
      "Rugby",
      "Futsal",
      "Field Hockey",
      "Lacrosse",
      "Gaelic Football",
      "Volleyball",
      "Beach Volleyball",
      "Sepak Takraw",
      "Roundnet (Spikeball)",
      "Netball",
      "Cricket",
      "Baseball",
      "Softball",
      "Wheelchair Rugby",
      "Dodgeball",
      "Korfball",
    ],
    "Racket Sports": [
      "Tennis",
      "Table Tennis",
      "Badminton",
      "Squash",
      "Racquetball",
      "Padel",
      "Pickleball",
      "Platform Tennis",
      "Real Tennis",
      "Soft Tennis",
      "Frontenis",
      "Speedminton (Crossminton)",
      "Paddle Tennis (POP Tennis)",
      "Speed-ball",
      "Chaza",
      "Totem Tennis (Swingball)",
      "Matkot",
      "Jombola",
    ],
    Fitness: [
      "Gym Workout",
      "Weight Training",
      "Bodybuilding",
      "Powerlifting",
      "CrossFit",
      "Calisthenics",
      "Circuit Training",
      "HIIT",
      "Functional Training",
      "Core Training",
      "Mobility Training",
      "Stretching",
      "Resistance Band Training",
      "Kettlebell Training",
      "Boot Camp Training",
      "Spinning",
      "Step Fitness",
      "Pilates",
      "Yoga",
    ],
    "Target & Precision Sports": [
      "Archery",
      "Golf",
      "Bowling",
      "Darts",
      "Snooker",
      "Pool",
      "Billiards",
      "Target Shooting",
      "Clay Pigeon Shooting",
      "Air Rifle Shooting",
      "Air Pistol Shooting",
      "Croquet",
      "Petanque",
      "Bocce",
      "Lawn Bowls",
      "Carom Billiards",
      "Nine-Pin Bowling",
      "Disc Golf",
      "Kubb",
      "Pitch and Putt",
      "Shove Ha’penny",
      "Toad in the Hole",
      "Bat and Trap",
      "Boccia",
      "Gateball",
    ],
    "Equestrian Sports": [
      "Horse Racing",
      "Barrel Racing",
      "Rodeo",
      "Mounted Archery",
      "Tent Pegging",
    ],
    "Adventure & Outdoor Sports": [
      "Rock Climbing",
      "Mountaineering",
      "Trekking",
      "Hiking",
      "Mountain Biking",
      "Sandboarding",
      "Orienteering",
      "Obstacle Course Racing",
      "Skydiving",
      "Paragliding",
      "Hang Gliding",
      "Parachuting",
      "Hot-air Ballooning",
      "Skiing",
      "Snowboarding",
      "Ice Climbing",
      "Heli-skiing",
      "Bungee Jumping",
      "BASE Jumping",
      "Canyoning",
      "Kite Buggy",
      "Zorbing",
      "Zip Lining",
    ],
    "Aquatic Sports": [
      "Swimming",
      "Water Polo",
      "Surfing",
      "Scuba Diving",
      "Snorkeling",
      "Freediving",
      "Kayaking",
      "Canoeing",
      "Rowing",
      "Sailing",
      "Windsurfing",
      "Kite Surfing",
      "Jet Skiing",
      "Wakeboarding",
      "Water Skiing",
      "Stand-up Paddleboarding",
      "Whitewater Rafting",
      "Dragon Boat Racing",
      "Artistic Swimming",
      "Open Water Swimming",
    ],
    "Ice Sports": [
      "Ice Skating",
      "Figure Skating",
      "Ice Hockey",
      "Speed Skating",
      "Ice Dance",
      "Synchronized Skating",
      "Curling",
      "Broomball",
      "Bobsleigh",
      "Skiboarding",
      "Ice Dragon Boat Racing",
      "Ice Cross Downhill",
    ],
    Wellness: [
      "Yoga & Meditation",
      "Spa & Relaxation",
      "Mental Wellness",
      "Fitness",
      "Nutrition",
      "Traditional & Alternative Therapies",
      "Rehabilitation",
      "Lifestyle Coaching",
    ],
    Dance: [
      "Bharatanatyam",
      "Kathak",
      "Kathakali",
      "Kuchipudi",
      "Odissi",
      "Mohiniyattam",
      "Manipuri",
      "Sattriya",
      "Chhau",
      "Yakshagana",
      "Lavani",
      "Ghoomar",
      "Kalbelia",
      "Garba",
      "Dandiya Raas",
      "Bhangra",
      "Bihu",
      "Dollu Kunitha",
      "Theyyam",
      "Ballet",
      "Contemporary",
      "Hip Hop",
      "Breakdance",
      "Jazz Dance",
      "Tap Dance",
      "Modern Dance",
      "Street Dance",
      "House Dance",
      "Locking",
      "Popping",
      "Krumping",
      "Waacking",
      "Voguing",
      "Salsa",
      "Bachata",
      "Merengue",
      "Cha-Cha",
      "Rumba",
      "Samba",
      "Paso Doble",
      "Jive",
      "Tango",
      "Waltz",
      "Foxtrot",
      "Quickstep",
      "Flamenco",
      "Irish Stepdance",
      "Scottish Highland Dance",
      "Morris Dance",
      "Hula",
      "Maori Haka",
      "African Tribal Dance",
      "Zumba",
      "K-Pop Dance",
      "Shuffle Dance",
      "Electro Dance",
      "Pole Dance",
      "Ballroom Dance",
      "Line Dance",
      "Square Dance",
      "Folk Dance",
      "Contra Dance",
    ],
  };
  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    category: "",
    subCategory: "",
    branch: "",
    trainerId: "",
    students: [],
  });
  const isEdit = !!editId;
  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setInstituteId(user.uid);
    });
    return () => unsub();
  }, []);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (!instituteId) return;

    const loadData = async () => {
      try {
        setPageLoading(true);
        /* ---------------- TRAINERS ---------------- */
        const trainerSnap = await getDocs(
          query(
            collection(db, "InstituteTrainers"),
            where("instituteId", "==", instituteId),
          ),
        );

        setTrainers(
          filterCurrentlyActive(
            trainerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          ),
        );

        /* ---------------- INSTITUTE (CATEGORIES) ---------------- */
        const instituteDoc = await getDoc(doc(db, "institutes", instituteId));

        const instituteData = instituteDoc.data();

        /* ---------------- STUDENTS ---------------- */
        const studentSnap = await getDocs(
          query(
            collection(db, "students"),
            where("instituteId", "==", instituteId),
          ),
        );

        const studentList = filterCurrentlyActive(
          studentSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );

        setStudents(studentList);

        /* ---------------- BRANCHES (FIXED) ---------------- */
        const branchSet = new Set();

        studentList.forEach((s) => {
          const b = String(s.branch || "").trim();
          if (b) branchSet.add(b);
        });

        setBranches([...branchSet].sort((a, b) => a.localeCompare(b)));

        /* ---------------- TIMETABLE ---------------- */
        const timetableSnap = await getDocs(
          collection(db, "institutes", instituteId, "timetable"),
        );

        setSchedule(
          timetableSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [instituteId]);
  const filteredStudents = students.filter(
    (s) =>
      String(s.branch || "")
        .trim()
        .toLowerCase() ===
      String(form.branch || "")
        .trim()
        .toLowerCase(),
  );

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  /* ---------------- SAVE ---------------- */
  const saveClass = async () => {
    if (!form.date || !form.startTime || !form.endTime) {
      alert("Select date, start time and end time");
      return;
    }

    if (
      !form.category ||
      !form.subCategory ||
      !form.branch ||
      !form.trainerId ||
      form.students.length === 0
    ) {
      if (!form.category) {
        alert("Select Category");
        return;
      }

      if (!form.subCategory) {
        alert("Select Sub Category");
        return;
      }

      if (!form.branch) {
        alert("Select Branch");
        return;
      }

      if (!form.trainerId) {
        alert("Select Trainer");
        return;
      }

      if (!form.students || form.students.length === 0) {
        alert("No students found in selected branch");
        return;
      }
      return;
    }

    const trainer = trainers.find((t) => t.id === form.trainerId);
    if (!trainer) {
      alert("Selected trainer not found");
      return;
    }

    const startDateTime = new Date(`${form.date}T${form.startTime}`);
    const endDateTime = new Date(`${form.date}T${form.endTime}`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      alert("Invalid date or time");
      return;
    }

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time");
      return;
    }

    const payload = {
      title: form.subCategory,
      category: form.category,
      subCategory: form.subCategory,
      branch: form.branch,
      start: startDateTime,
      end: endDateTime,
      trainerId: trainer.id,
      trainerName:
        `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
        trainer.name ||
        "Trainer",
      students: form.students,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editId) {
        await updateDoc(
          doc(db, "institutes", instituteId, "timetable", editId),
          payload,
        );

        setSchedule((prev) =>
          prev.map((item) =>
            item.id === editId ? { ...item, ...payload } : item,
          ),
        );
      } else {
        const docRef = await addDoc(
          collection(db, "institutes", instituteId, "timetable"),
          {
            ...payload,
            createdAt: serverTimestamp(),
          },
        );

        setSchedule((prev) => [...prev, { id: docRef.id, ...payload }]);
      }

      setShowModal(false);
      setEditId(null);
    } catch (err) {
      console.error("Save error:", err);
      alert("Could not save class. Please try again.");
    }
  };
  useEffect(() => {
    if (form.branch && students.length > 0 && !editId) {
      const autoStudents = students
        .filter(
          (s) =>
            s.branch?.trim().toLowerCase() ===
            form.branch?.trim().toLowerCase(),
        )
        .map((s) => s.id);

      setForm((prev) => ({
        ...prev,
        students: autoStudents,
      }));
    }
  }, [form.branch, students, editId]);
  const events = useMemo(
    () =>
      schedule
        .map((s) => {
          const start = parseFirestoreDate(s.start);
          const end = parseFirestoreDate(s.end);
          if (!start || !end) return null;
          const accent = classAccent(s.category, s.cancelled);
          return {
            id: s.id,
            title: s.cancelled
              ? `Cancelled · ${s.subCategory}`
              : s.subCategory || s.title || "Class",
            start,
            end,
            extendedProps: {
              trainer: s.trainerName,
              count: s.students?.length || 0,
              cancelled: s.cancelled || false,
              cancelReason: s.cancelReason || "",
              category: s.category || "",
              branch: s.branch || "",
              trainerName: s.trainerName || "",
              chipClass: accent.chip,
              raw: s,
            },
          };
        })
        .filter(Boolean),
    [schedule],
  );

  const scheduleInsights = useMemo(
    () => buildScheduleInsights(schedule),
    [schedule],
  );

  const filterOptions = useMemo(
    () => [
      {
        key: "branch",
        label: "Branch",
        options: uniqueValues(schedule, (s) => s.branch),
      },
      {
        key: "trainerName",
        label: "Trainer",
        options: uniqueValues(schedule, (s) => s.trainerName),
      },
      {
        key: "category",
        label: "Category",
        options: uniqueValues(schedule, (s) => s.category),
      },
    ],
    [schedule],
  );

  const smartSlots = useMemo(
    () =>
      suggestFreeSlots(schedule, form.date || selectedDate, {
        trainerId: form.trainerId || undefined,
      }),
    [schedule, form.date, form.trainerId, selectedDate],
  );

  const formConflicts = useMemo(() => {
    if (!form.date || !form.startTime || !form.endTime) return [];
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    return detectConflicts(
      schedule,
      { start, end, trainerId: form.trainerId },
      editId,
    );
  }, [schedule, form, editId]);

  const toJsDate = (value) => parseFirestoreDate(value);

  const isSameDayLocal = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const formatClock = (value) => formatCalendarTime(parseFirestoreDate(value), false);

  const selectedDayClasses = schedule
    .filter((s) => isSameDayLocal(parseFirestoreDate(s.start), selectedDate))
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

  const monthClassCount = schedule.filter((s) => {
    const start = parseFirestoreDate(s.start);
    return (
      start &&
      start.getMonth() === selectedDate.getMonth() &&
      start.getFullYear() === selectedDate.getFullYear()
    );
  }).length;

  const toLocalDateInput = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const openNewClass = (prefill = {}) => {
    setEditId(null);
    setForm({
      date: prefill.date || toLocalDateInput(new Date()),
      startTime: prefill.startTime || "09:00",
      endTime: prefill.endTime || "10:00",
      category: "",
      subCategory: "",
      branch: "",
      trainerId: "",
      students: [],
    });
    setShowModal(true);
  };

  const openScheduledClass = (event) => {
    const start = parseFirestoreDate(event.start);
    const end = parseFirestoreDate(event.end);
    if (!start || !end) return;
    setEditId(event.id);
    setForm({
      date: toLocalDateInput(start),
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      category: event.category || "",
      subCategory: event.subCategory || "",
      branch: event.branch || "",
      trainerId: event.trainerId || "",
      students: event.students || [],
    });
    setShowModal(true);
  };

  const handleRangeSelect = (info) => {
    const start = info.start;
    const end = info.end;
    const date = toLocalDateInput(start);
    let startTime = "09:00";
    let endTime = "10:00";

    if (!info.allDay && info.startStr?.includes("T")) {
      startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      if (endTime === startTime || end <= start) {
        const adjusted = new Date(start.getTime() + 60 * 60 * 1000);
        endTime = `${String(adjusted.getHours()).padStart(2, "0")}:${String(adjusted.getMinutes()).padStart(2, "0")}`;
      }
    }

    setSelectedDate(start);
    openNewClass({ date, startTime, endTime });
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

  const cancelClass = async () => {
    if (!editId) return;

    if (!cancelReason.trim()) {
      alert("Please enter cancellation reason");
      return;
    }

    try {
      await updateDoc(doc(db, "institutes", instituteId, "timetable", editId), {
        cancelled: true,
        cancelReason: cancelReason,
        cancelledAt: serverTimestamp(),
      });

      setSchedule((prev) =>
        prev.map((item) =>
          item.id === editId
            ? {
                ...item,
                cancelled: true,
                cancelReason,
              }
            : item,
        ),
      );

      setShowCancelModal(false);
      setCancelReason("");
      setShowModal(false);

      alert("Class cancelled successfully");
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <AdminCalendarShell
        title="Class Calendar"
        subtitle="Plan, edit and manage institute sessions"
        loading={pageLoading}
        events={events}
        filterOptions={filterOptions}
        activeFilters={filters}
        onFilterChange={(key, value) =>
          setFilters((prev) => ({ ...prev, [key]: value }))
        }
        aiInsights={scheduleInsights.insights}
        alert={null}
        emptyTitle="No classes this month"
        emptyHint="Drag across dates or tap Add class to schedule."
        onAddClick={() => openNewClass()}
        addLabel="Add class"
        onCalendarReady={(api) => {
          calendarApiRef.current = api;
        }}
        onDateClick={(info) => setSelectedDate(info.date)}
        onRangeSelect={handleRangeSelect}
        onEventClick={handleEventClick}
        initialView="dayGridMonth"
        footerStats={
          <>
            <p className="text-[10px] sm:text-[11px] text-gray-600">
              Month:{" "}
              <span className="font-semibold text-gray-800">
                {monthClassCount}
              </span>
              <span className="text-gray-400"> · </span>
              Today: {scheduleInsights.todayCount}
            </p>
          </>
        }
        sidePanel={
          <>
            <div className="shrink-0 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-gray-900 truncate">
                {selectedDayLabel}
              </h3>
              <span className="h-5 min-w-[20px] px-1 rounded-full bg-[#FF6A00] text-white text-[10px] font-bold flex items-center justify-center">
                {selectedDayClasses.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1.5">
              {selectedDayClasses.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No classes on this day.
                </p>
              ) : (
                selectedDayClasses.map((cls) => {
                  const accent = classAccent(cls.category, cls.cancelled);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => openScheduledClass(cls)}
                      className="w-full text-left rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden active:scale-[0.99] transition"
                    >
                      <div className="flex">
                        <span className={`w-1 shrink-0 ${accent.bar}`} />
                        <div className="flex-1 min-w-0 p-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {cls.cancelled
                              ? `Cancelled · ${cls.subCategory}`
                              : cls.subCategory}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {cls.trainerName || "Trainer"}
                            {cls.branch ? ` · ${cls.branch}` : ""}
                          </p>
                          <p className="text-[10px] font-medium text-gray-700 mt-1">
                            {formatClock(cls.start)} – {formatClock(cls.end)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="shrink-0 p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={goToSelectedDay}
                className="w-full h-8 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 inline-flex items-center justify-center gap-1.5"
              >
                <CalendarDays size={14} className="text-[#FF6A00]" />
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
                <p className="font-semibold">Schedule conflict</p>
                <p className="mt-0.5 text-xs">
                  This trainer already has {formConflicts.length} overlapping
                  class{formConflicts.length === 1 ? "" : "es"} at this time.
                </p>
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
              <input
                type="time"
                className="border p-2 rounded-md w-full"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
              <input
                type="time"
                className="border p-2 rounded-md w-full"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>

            <select
              className="w-full border p-2 rounded-md"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                  subCategory: "",
                })
              }
            >
              <option>Select Category</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <select
              className="w-full border p-2 rounded-md"
              value={form.subCategory}
              onChange={(e) =>
                setForm({
                  ...form,
                  subCategory: e.target.value,
                })
              }
            >
              <option>Select SubCategory</option>
              {(subCategoryMap[form.category] || []).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              className="w-full border p-2 rounded-md"
              value={form.branch}
              onChange={(e) =>
                setForm({
                  ...form,
                  branch: e.target.value,
                })
              }
            >
              <option>Select Branch</option>
              {branches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <select
              className="w-full border p-2 rounded-md"
              value={form.trainerId}
              onChange={(e) =>
                setForm({
                  ...form,
                  trainerId: e.target.value,
                })
              }
            >
              <option>Select Trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName}
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {editId && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium"
                >
                  Cancel Class
                </button>
              )}
              <button
                onClick={saveClass}
                className="flex-1 bg-[#ff6a00] text-white py-2.5 rounded-lg font-medium"
              >
                {editId ? "Update" : "Save"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-2.5 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4">
          <div className="bg-white p-5 rounded-t-3xl sm:rounded-2xl w-full max-w-md">
            <h3 className="font-semibold mb-3">Cancel Class</h3>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="w-full border rounded-lg p-3 h-28"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="border px-4 py-2 rounded-lg"
              >
                Close
              </button>

              <button
                onClick={cancelClass}
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Save Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
