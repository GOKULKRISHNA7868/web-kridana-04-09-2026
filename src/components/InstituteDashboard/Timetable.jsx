import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
export default function ClassTime() {
  const [instituteId, setInstituteId] = useState("");
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [categoriesMap, setCategoriesMap] = useState({});
  const calendarRef = React.useRef(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [calendarView, setCalendarView] = useState("timeGridDay");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarTitle, setCalendarTitle] = useState("");
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
        /* ---------------- TRAINERS ---------------- */
        const trainerSnap = await getDocs(
          query(
            collection(db, "InstituteTrainers"),
            where("instituteId", "==", instituteId),
          ),
        );

        setTrainers(trainerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

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

        const studentList = studentSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setStudents(studentList);

        /* ---------------- BRANCHES (FIXED) ---------------- */
        const branchSet = new Set();

        studentList.forEach((s) => {
          if (s.branch && s.branch.trim() !== "") {
            branchSet.add(s.branch.trim());
          }
        });

        setBranches([...branchSet]);

        console.log("Students:", studentList);
        console.log("Branches:", [...branchSet]);

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
      }
    };

    loadData();
  }, [instituteId]);
  const filteredStudents = students.filter((s) => s.branch === form.branch);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  /* ---------------- SAVE ---------------- */
  const saveClass = async () => {
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

    const startDateTime = new Date(`${form.date}T${form.startTime}`);
    const endDateTime = new Date(`${form.date}T${form.endTime}`);

    const payload = {
      title: form.subCategory,
      category: form.category,
      subCategory: form.subCategory,
      branch: form.branch,
      start: startDateTime,
      end: endDateTime,
      trainerId: trainer.id,
      trainerName: trainer.firstName,
      students: form.students,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editId) {
        // 🔥 UPDATE
        await updateDoc(
          doc(db, "institutes", instituteId, "timetable", editId),
          payload,
        );

        // ✅ update state locally
        setSchedule((prev) =>
          prev.map((item) =>
            item.id === editId ? { ...item, ...payload } : item,
          ),
        );
      } else {
        // 🔥 ADD
        const docRef = await addDoc(
          collection(db, "institutes", instituteId, "timetable"),
          {
            ...payload,
            createdAt: serverTimestamp(),
          },
        );

        // ✅ add to state locally
        setSchedule((prev) => [...prev, { id: docRef.id, ...payload }]);
      }

      // ✅ close modal & reset
      setShowModal(false);
      setEditId(null);
    } catch (err) {
      console.error("Save error:", err);
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

      console.log("Selected Branch:", form.branch);
      console.log("Matched Students:", autoStudents);

      setForm((prev) => ({
        ...prev,
        students: autoStudents,
      }));
    }
  }, [form.branch, students, editId]);
  /* ---------------- FORMAT EVENTS ---------------- */
  const events = schedule.map((s) => ({
    id: s.id,
    title: s.cancelled ? `❌ Cancelled - ${s.subCategory}` : s.subCategory,
    start: s.start?.toDate ? s.start.toDate() : s.start,
    end: s.end?.toDate ? s.end.toDate() : s.end,

    extendedProps: {
      trainer: s.trainerName,
      count: s.students?.length || 0,
      cancelled: s.cancelled || false,
      cancelReason: s.cancelReason || "",
    },
  }));
  const filteredEvents = events.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const toJsDate = (value) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const padTime = (n) => String(n).padStart(2, "0");

  const localDateParts = (value) => {
    const d = toJsDate(value);
    if (!d) return { date: "", time: "" };
    return {
      date: `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`,
      time: `${padTime(d.getHours())}:${padTime(d.getMinutes())}`,
    };
  };

  const formatClock = (value) => {
    const d = toJsDate(value);
    if (!d) return "";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !is24Hour,
    });
  };

  const classAccent = (category, cancelled) => {
    if (cancelled) {
      return { bar: "bg-red-500", tag: "bg-red-50 text-red-700" };
    }
    const map = {
      "Martial Arts": { bar: "bg-sky-500", tag: "bg-sky-50 text-sky-700" },
      Fitness: { bar: "bg-violet-500", tag: "bg-violet-50 text-violet-700" },
      "Racket Sports": { bar: "bg-emerald-500", tag: "bg-emerald-50 text-emerald-700" },
      Dance: { bar: "bg-pink-500", tag: "bg-pink-50 text-pink-700" },
      Wellness: { bar: "bg-teal-500", tag: "bg-teal-50 text-teal-700" },
      "Team Ball Sports": { bar: "bg-indigo-500", tag: "bg-indigo-50 text-indigo-700" },
      "Aquatic Sports": { bar: "bg-cyan-500", tag: "bg-cyan-50 text-cyan-700" },
    };
    return map[category] || { bar: "bg-[#ff6a00]", tag: "bg-orange-50 text-[#ff6a00]" };
  };

  const matchesSearch = (item) => {
    const title = item.cancelled
      ? `❌ Cancelled - ${item.subCategory}`
      : item.subCategory;
    return title?.toLowerCase().includes(search.toLowerCase());
  };

  const selectedDayClasses = schedule
    .filter((s) => isSameDay(toJsDate(s.start), selectedDate) && matchesSearch(s))
    .sort((a, b) => (toJsDate(a.start)?.getTime() || 0) - (toJsDate(b.start)?.getTime() || 0));

  const monthClassCount = schedule.filter((s) => {
    const start = toJsDate(s.start);
    return (
      start &&
      start.getMonth() === selectedDate.getMonth() &&
      start.getFullYear() === selectedDate.getFullYear()
    );
  }).length;

  const todayClassCount = schedule.filter((s) =>
    isSameDay(toJsDate(s.start), new Date()),
  ).length;

  const selectedDayLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const getCalApi = () => calendarRef.current?.getApi();

  const changeCalendarView = (view) => {
    setCalendarView(view);
    getCalApi()?.changeView(view);
  };

  const goToday = () => {
    getCalApi()?.today();
    setSelectedDate(new Date());
  };

  const openScheduledClass = (event) => {
    const start = localDateParts(event.start);
    const end = localDateParts(event.end);
    setEditId(event.id);
    setForm({
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      category: event.category || "",
      subCategory: event.subCategory || "",
      branch: event.branch || "",
      trainerId: event.trainerId || "",
      students: event.students || [],
    });
    setShowModal(true);
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
  const views = [
    { id: "dayGridMonth", label: "Month" },
    { id: "timeGridWeek", label: "Week" },
    { id: "timeGridDay", label: "Day" },
    { id: "listWeek", label: "List" },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-transparent">
      <div className="shrink-0 pb-2 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-2xl font-bold text-gray-900 leading-tight">
              Calendar
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              View and manage all your classes.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#ff6a00] hover:bg-[#e85f00] text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm"
          >
            <Plus size={16} />
            Add New
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={goToday}
              className="shrink-0 h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700"
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
                className={`h-9 px-2.5 ${
                  !is24Hour ? "bg-[#ff6a00] text-white" : "text-gray-600"
                }`}
              >
                12 hrs
              </button>
              <button
                type="button"
                onClick={() => setIs24Hour(true)}
                className={`h-9 px-2.5 ${
                  is24Hour ? "bg-[#ff6a00] text-white" : "text-gray-600"
                }`}
              >
                24 hrs
              </button>
            </div>
            <div className="relative min-w-[140px] flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search here..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="sm:hidden shrink-0 inline-flex items-center gap-1 bg-[#ff6a00] text-white h-9 px-3 rounded-xl text-sm font-semibold"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1 w-full sm:w-auto self-start">
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => changeCalendarView(view.id)}
                className={`h-8 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  calendarView === view.id
                    ? "bg-[#ff6a00] text-white shadow-sm"
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
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="shrink-0 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-gray-100">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {calendarTitle || "Calendar"}
            </h2>
          </div>

          <div className="flex-1 min-h-0 kridana-cal px-1 sm:px-2">
            <FullCalendar
              ref={calendarRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                listPlugin,
              ]}
              headerToolbar={false}
              initialView="timeGridDay"
              height="100%"
              contentHeight="auto"
              allDaySlot={false}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              scrollTime="06:00:00"
              scrollTimeReset={false}
              nowIndicator={true}
              stickyHeaderDates={true}
              expandRows={true}
              handleWindowResize={true}
              windowResizeDelay={100}
              longPressDelay={100}
              selectLongPressDelay={100}
              eventLongPressDelay={100}
              dayMaxEvents={true}
              dayMaxEventRows={2}
              slotMinWidth={36}
              dayHeaderFormat={{
                weekday: "short",
                month: "numeric",
                day: "numeric",
              }}
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
              events={filteredEvents}
              selectable={true}
              dayCellClassNames={(arg) =>
                isSameDay(arg.date, selectedDate) ? ["kridana-cal-selected"] : []
              }
              datesSet={(info) => {
                setCalendarTitle(info.view.title);
                setCalendarView(info.view.type);
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
              dateClick={(info) => setSelectedDate(info.date)}
              select={(info) => {
                const date = info.startStr.split("T")[0];
                const start = info.startStr.split("T")[1]?.slice(0, 5);
                const end = info.endStr.split("T")[1]?.slice(0, 5);

                setEditId(null);

                setForm({
                  date,
                  startTime: start,
                  endTime: end,
                  category: "",
                  subCategory: "",
                  branch: "",
                  trainerId: "",
                  students: [],
                });

                setShowModal(true);
              }}
              eventClick={(info) => {
                const event = schedule.find((s) => s.id === info.event.id);
                if (!event) return;
                if (info.event.start) setSelectedDate(info.event.start);

                setEditId(event.id);

                setForm({
                  date: info.event.startStr.split("T")[0],
                  startTime: info.event.startStr.split("T")[1]?.slice(0, 5),
                  endTime: info.event.endStr.split("T")[1]?.slice(0, 5),
                  category: event.category || "",
                  subCategory: event.subCategory || "",
                  branch: event.branch || "",
                  trainerId: event.trainerId || "",
                  students: event.students || [],
                });

                setShowModal(true);
              }}
              eventContent={(info) =>
                info.view.type === "dayGridMonth" ? (
                  <div
                    className={`truncate rounded-full px-1.5 py-[1px] text-[9px] sm:text-[10px] font-semibold ${
                      info.event.extendedProps.cancelled
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-50 text-[#ff6a00]"
                    }`}
                  >
                    • {info.event.title}
                  </div>
                ) : (
                  <div
                    className={`rounded-md px-2 py-1 text-xs
      ${
        info.event.extendedProps.cancelled
          ? "bg-red-200 text-red-800"
          : "bg-orange-200"
      }
    `}
                  >
                    <div className="font-semibold">{info.event.title}</div>

                    <div>👤 {info.event.extendedProps.trainer}</div>

                    <div>👥 {info.event.extendedProps.count}</div>

                    {info.event.extendedProps.cancelled && (
                      <div className="mt-1 text-[10px] font-medium">
                        Reason: {info.event.extendedProps.cancelReason}
                      </div>
                    )}
                  </div>
                )
              }
            />
          </div>

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-[#f6f7fb] border-t border-gray-100 flex items-center justify-between gap-2">
            <p className="text-[11px] sm:text-xs text-gray-600">
              Total classes this month{" "}
              <span className="font-semibold text-gray-800">
                ({monthClassCount} {monthClassCount === 1 ? "Class" : "Classes"})
              </span>
              <span className="hidden sm:inline text-gray-400"> · </span>
              <span className="hidden sm:inline">
                Upcoming today ({todayClassCount})
              </span>
            </p>
            <button
              type="button"
              onClick={goToday}
              className="shrink-0 h-8 px-3 rounded-lg bg-white border border-gray-200 text-[11px] sm:text-xs font-semibold text-gray-700"
            >
              View Today
            </button>
          </div>
        </div>

        <aside className="h-[36%] min-h-[200px] lg:h-auto lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              Classes on {selectedDayLabel}
            </h3>
            <span className="h-6 min-w-[24px] px-1.5 rounded-full bg-[#ff6a00] text-white text-xs font-bold flex items-center justify-center">
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
                const accent = classAccent(cls.category, cls.cancelled);
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cls.cancelled
                              ? `Cancelled - ${cls.subCategory}`
                              : cls.subCategory}
                          </p>
                          {cls.category ? (
                            <span
                              className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${accent.tag}`}
                            >
                              {cls.category}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {cls.trainerName || "Trainer"}
                          {cls.branch ? ` · ${cls.branch}` : ""}
                        </p>
                        <p className="text-xs font-medium text-gray-700 mt-1.5">
                          {formatClock(cls.start)} – {formatClock(cls.end)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {cls.students?.length || 0} students
                        </p>
                        {cls.cancelled && cls.cancelReason ? (
                          <p className="text-[11px] text-red-600 mt-1">
                            Reason: {cls.cancelReason}
                          </p>
                        ) : null}
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
              onClick={() => {
                changeCalendarView("timeGridDay");
                getCalApi()?.gotoDate(selectedDate);
              }}
              className="w-full h-10 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 inline-flex items-center justify-center gap-2"
            >
              <CalendarDays size={16} className="text-[#ff6a00]" />
              View Day ({selectedDate.getDate()}{" "}
              {selectedDate.toLocaleDateString("en-US", { month: "short" })})
            </button>
          </div>
        </aside>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white p-4 sm:p-6 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-xl space-y-4 max-h-[88dvh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-center">
              {isEdit ? "Edit Class" : "Schedule Class"}
            </h3>

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
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
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
