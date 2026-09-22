import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { Pagination } from "./shared";
import { isPersonActiveOnDate } from "../../utils/personStatus";
import {
  Search,
  Download,
  ChevronDown,
  Check,
  Layers,
  X,
  Users,
  UserCheck,
  UserX,
  CalendarDays,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  attendanceMarkMeta,
  formatStaffTime,
  logStaffAction,
} from "../../utils/trainerAccess";
const today = new Date().toISOString().split("T")[0];
const absenceReasons = [
  "On Leave",
  "Not Working Day",
  "Week Off",
  "Sick Leave",
  "Other",
];
const TIME_SLOTS = [
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "21:00", label: "09:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

const SESSIONS = ["Morning", "Afternoon", "Evening"];

const getDayName = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long" });
};

const StudentsAttendancePage = ({
  instituteId: instituteIdProp,
  actor = null,
} = {}) => {
  const [selectedTime, setSelectedTime] = useState("");
  const timeRef = useRef(null);

  const { user, institute } = useAuth();
  const instituteId = instituteIdProp || user?.uid;
  const markMeta = attendanceMarkMeta(actor, user);

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [search, setSearch] = useState("");
  const [draftAttendance, setDraftAttendance] = useState({});
  const scrollRef = useRef(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerSubCategory, setPickerSubCategory] = useState("");
  const [showUnmarkedModal, setShowUnmarkedModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingMarkRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ FIRST define this
  const passedBranch = location.state?.branch || "";

  // ✅ THEN use it
  const [selectedBranch, setSelectedBranch] = useState(passedBranch); // ✅ FIX
  const [summary, setSummary] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const clearAllAttendance = () => {
    setDraftAttendance({});
  };
  useEffect(() => {
    if (passedBranch) {
      setSelectedBranch(passedBranch);
    }
  }, [passedBranch]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [
    currentPage,
    selectedDate,
    selectedSession,
    selectedCategory,
    selectedSubCategory,
    selectedBranch,
    search,
  ]);
  // Load Students
  useEffect(() => {
    if (!instituteId) return;

    const q = query(
      collection(db, "students"),
      where("instituteId", "==", instituteId),
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => {
          const nameA = `${a.firstName || ""} ${
            a.lastName || ""
          }`.toLowerCase();
          const nameB = `${b.firstName || ""} ${
            b.lastName || ""
          }`.toLowerCase();

          return nameA.localeCompare(nameB);
        });

      setStudents(list);
    });
  }, [instituteId]);

  // Fetch Attendance (DATE BASED ONLY)
  useEffect(() => {
    if (!instituteId || !selectedDate) {
      setAttendance({});
      setDraftAttendance({});
      return;
    }

    setAttendance({});
    setDraftAttendance({});

    const fetchData = async () => {
      const colRef = collection(db, "institutes", instituteId, "attendance");
      const snap = await getDocs(colRef);

      const map = {};

      snap.forEach((d) => {
        const data = d.data();
        if (
          data.date === selectedDate &&
          (!selectedCategory || data.category === selectedCategory) &&
          (!selectedSubCategory || data.subCategory === selectedSubCategory)
        ) {
          const key = `${data.studentId}||${data.category}||${data.subCategory}`;
          map[key] = {
            status: data.status,
            reason: data.reason || "",
            markedBy: data.markedBy || "",
            markedByName: data.markedByName || "",
            markedByRole: data.markedByRole || "",
            markedAtLabel: formatStaffTime(data.lastMarkedAt || data.updatedAt),
          };
        }
      });

      setAttendance(map);
      setDraftAttendance({ ...map });
    };

    fetchData();
  }, [instituteId, selectedDate, selectedCategory, selectedSubCategory]);

  // Filter Students — history-aware: show Left students only on/before leftDate
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();

      const matchSearch = name.includes(search.toLowerCase());

      if (!matchSearch) return false;
      if (!isPersonActiveOnDate(s, selectedDate)) return false;

      const matchBranch =
        !selectedBranch || (s.branch || "").trim() === selectedBranch.trim();

      const sportMatch = !selectedCategory
        ? true
        : (s.sports || []).some(
            (sp) =>
              sp.category === selectedCategory &&
              (!selectedSubCategory || sp.subCategory === selectedSubCategory),
          );

      const matchSession = !selectedSession
        ? true
        : (s.sports || []).some(
            (sp) =>
              sp.sessions === selectedSession || sp.session === selectedSession,
          );

      const matchTime = !selectedTime
        ? true
        : (s.sports || []).some(
            (sp) => sp.timings === selectedTime || sp.timing === selectedTime,
          );

      return matchBranch && sportMatch && matchSession && matchTime;
    });
  }, [
    students,
    search,
    selectedDate,
    selectedCategory,
    selectedSubCategory,
    selectedSession,
    selectedTime,
    selectedBranch,
  ]);

  // Summary
  useEffect(() => {
    const total = filteredStudents.length;
    let present = 0;
    let absent = 0;

    filteredStudents.forEach((student) => {
      const key = `${student.uid}||${selectedCategory}||${selectedSubCategory}`;
      const status = draftAttendance[key]?.status;

      if (status === "present") present++;
      if (status === "absent") absent++;
    });

    setSummary({
      totalStudents: total,
      presentToday: present,
      absentToday: absent,
    });
  }, [
    filteredStudents,
    draftAttendance,
    selectedCategory,
    selectedSubCategory,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const openCategoryPicker = (pending = null) => {
    pendingMarkRef.current = pending;
    setPickerCategory(selectedCategory);
    setPickerSubCategory(selectedSubCategory);
    setShowCategoryModal(true);
  };

  const applyAttendance = (
    student,
    status,
    reason = "",
    category = selectedCategory,
    subCategory = selectedSubCategory,
  ) => {
    const key = `${student.uid}||${category}||${subCategory}`;
    setDraftAttendance((prev) => ({
      ...prev,
      [key]: {
        status,
        reason,
        ...markMeta,
        markedAtLabel: "Just now",
      },
    }));
  };

  // Save Attendance
  const saveAttendance = (student, status, reason = "") => {
    if (!selectedCategory || !selectedSubCategory) {
      openCategoryPicker({ student, status, reason });
      return;
    }

    applyAttendance(student, status, reason);
  };
  const categories = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (sp.category) set.add(sp.category);
        });
      }
    });

    return Array.from(set);
  }, [students]);
  const subCategories = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (sp.category === selectedCategory && sp.subCategory) {
            set.add(sp.subCategory);
          }
        });
      }
    });

    return Array.from(set);
  }, [students, selectedCategory]);

  const pickerSubCategories = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (sp.category === pickerCategory && sp.subCategory) {
            set.add(sp.subCategory);
          }
        });
      }
    });
    return Array.from(set);
  }, [students, pickerCategory]);

  const confirmCategoryPicker = () => {
    if (!pickerCategory) return;
    if (pickerSubCategories.length > 0 && !pickerSubCategory) return;

    const sub =
      pickerSubCategory ||
      (pickerSubCategories.length === 0 ? "General" : "");

    setSelectedCategory(pickerCategory);
    setSelectedSubCategory(sub);
    setShowCategoryModal(false);

    const pending = pendingMarkRef.current;
    pendingMarkRef.current = null;
    if (pending?.student) {
      applyAttendance(
        pending.student,
        pending.status,
        pending.reason || "",
        pickerCategory,
        sub,
      );
    }
  };
  const branches = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (s.branch) {
        set.add(s.branch);
      }
    });

    return Array.from(set);
  }, [students]);

  const attendanceKey = (uid, category = selectedCategory, subCategory = selectedSubCategory) =>
    `${uid}||${category}||${subCategory}`;

  const unmarkedStudents = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory) return [];
    return filteredStudents.filter((s) => {
      const rec = draftAttendance[attendanceKey(s.uid)];
      return rec?.status !== "present" && rec?.status !== "absent";
    });
  }, [
    filteredStudents,
    draftAttendance,
    selectedCategory,
    selectedSubCategory,
  ]);

  const goToUnmarkedPage = () => {
    const index = filteredStudents.findIndex((s) => {
      const rec = draftAttendance[attendanceKey(s.uid)];
      return rec?.status !== "present" && rec?.status !== "absent";
    });
    if (index >= 0) {
      setCurrentPage(Math.floor(index / itemsPerPage) + 1);
    }
    setShowUnmarkedModal(false);
  };

  const performSave = async () => {
    if (saving) return;

    try {
      if (!selectedCategory || !selectedSubCategory) {
        openCategoryPicker();
        return;
      }

      setSaving(true);
      let savedCount = 0;

      const promises = Object.entries(draftAttendance)
        .map(([key, status]) => {
          if (status?.status !== "present" && status?.status !== "absent") {
            return null;
          }

          const parts = key.split("||");

          const studentId = parts[0];
          const category = parts[1];
          const subCategory = parts[2];

          if (!studentId || !category || !subCategory) return null;

          const student = students.find((s) => s.uid === studentId);

          savedCount++;
          const safeCategory = category.replace(/\//g, "-");
          const safeSubCategory = subCategory.replace(/\//g, "-");

          const docId = `${studentId}_${selectedDate}_${safeCategory}_${safeSubCategory}`;
          return setDoc(
            doc(db, "institutes", instituteId, "attendance", docId),
            {
              instituteId,
              studentId,
              category,
              subCategory,
              session: student?.sessions || "General",
              date: selectedDate,
              day: getDayName(selectedDate),
              time: selectedTime || "",
              status: status.status,
              reason: status.reason || "",
              ...markMeta,
              lastMarkedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        })
        .filter(Boolean);

      await Promise.all(promises);

      if (actor?.trainerUid && savedCount) {
        await logStaffAction({
          instituteId,
          trainerUid: actor.trainerUid,
          trainerName: actor.name,
          action: "attendance_save",
          page: "Students attendance",
          details: `Saved ${savedCount} students for ${selectedDate} · ${selectedCategory} / ${selectedSubCategory}`,
        });
      }

      alert(
        savedCount
          ? `Attendance saved successfully ✅ (${savedCount} students)`
          : "No marked students to save",
      );
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save attendance ❌ Check console");
    } finally {
      setSaving(false);
      setShowUnmarkedModal(false);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedCategory || !selectedSubCategory) {
      openCategoryPicker();
      return;
    }

    if (unmarkedStudents.length > 0) {
      setShowUnmarkedModal(true);
      return;
    }

    await performSave();
  };
  useEffect(() => {
    let startX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;

      if (endX - startX > 100) {
        navigate(-1); // swipe right → back
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedSession,
    selectedCategory,
    selectedSubCategory,
    selectedBranch,
  ]);
  const handleCancel = () => {
    setDraftAttendance({ ...attendance });
  };

  const hasChanges = Object.keys(draftAttendance).length > 0;

  // Export CSV
  const exportAttendanceRange = async () => {
    if (!exportFromDate || !exportToDate) {
      alert("Select From and To dates");
      return;
    }

    const colRef = collection(db, "institutes", instituteId, "attendance");
    const snap = await getDocs(colRef);

    const attendanceMap = {};
    const uniqueDatesSet = new Set();

    snap.forEach((doc) => {
      const data = doc.data();

      if (data.date >= exportFromDate && data.date <= exportToDate) {
        const key = `${data.studentId}_${data.date}`;

        attendanceMap[key] = {
          status: data.status,
          reason: data.reason || "",
        };

        // ✅ Collect only available dates
        uniqueDatesSet.add(data.date);
      }
    });

    // ✅ Convert set → sorted array
    const uniqueDates = Array.from(uniqueDatesSet).sort();

    const finalRows = [];

    filteredStudents.forEach((student) => {
      const row = {
        Name: `${student.firstName} ${student.lastName}`,
        Session: student.sessions || "-",
      };

      let present = 0;
      let total = 0;

      uniqueDates.forEach((date) => {
        const key = `${student.uid}_${date}`;
        const record = attendanceMap[key];

        if (record) {
          row[date] = record.status; // ✅ column-wise

          if (record.status === "present") present++;
          if (record.status === "present" || record.status === "absent")
            total++;
        }
      });

      const percent = total ? ((present / total) * 100).toFixed(1) : 0;

      row["Present"] = present;
      row["Total"] = total;
      row["%"] = `${percent}%`;

      finalRows.push(row);
    });

    // Create sheet
    const worksheet = XLSX.utils.json_to_sheet(finalRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `attendance_${exportFromDate}_to_${exportToDate}.xlsx`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    setShowExportModal(false);
  };

  const categoryReady = Boolean(selectedCategory && selectedSubCategory);

  return (
    <div className="relative h-full w-full min-h-0 bg-[#f5f6f8] rounded-none md:rounded-xl lg:rounded-2xl overflow-hidden flex flex-col">
      {/* Compact toolbar — maximize student list */}
      <div className="shrink-0 bg-white border-b border-gray-100 z-20">
        <div className="px-2 sm:px-3 lg:px-4 pt-2 pb-1.5 space-y-1.5">
          <div className="flex flex-col xl:flex-row xl:items-center gap-1.5 xl:gap-3">
            <div className="flex items-center justify-between gap-2 min-w-0 xl:min-w-[210px]">
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                  Customer Attendance
                </h1>
                <p className="text-[10px] text-gray-400 truncate">
                  Mark present / absent ·{" "}
                  <span className="text-[#FF6A00] font-semibold">
                    {selectedDate === today ? "Today" : selectedDate}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-orange-50 text-[#FF6A00] text-[10px] font-bold border border-orange-100">
                  <Users size={11} />
                  {summary.totalStudents}
                </span>
                <span className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  <UserCheck size={11} />
                  {summary.presentToday}
                </span>
                <span className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold">
                  <UserX size={11} />
                  {summary.absentToday}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 flex-1 min-w-0">
              <label className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg border border-gray-200 bg-gray-50 shrink-0 focus-within:border-orange-400">
                <CalendarDays size={13} className="text-[#FF6A00]" />
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-[11px] sm:text-xs text-gray-800 bg-transparent outline-none w-[118px] sm:w-[132px]"
                />
              </label>

              <div className="relative flex-1 min-w-[140px]">
                <Search
                  size={13}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  placeholder="Search student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-7 pr-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-800 outline-none focus:border-orange-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[#FF6A00] text-[11px] font-semibold shrink-0 hover:bg-orange-50"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="h-8 border border-gray-200 rounded-lg px-2 text-[11px] sm:text-xs bg-gray-50 text-gray-800 outline-none focus:border-orange-400"
            >
              <option value="">Session</option>
              {SESSIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-8 border border-gray-200 rounded-lg px-2 text-[11px] sm:text-xs bg-gray-50 text-gray-800 outline-none focus:border-orange-400"
            >
              <option value="">Branch</option>
              {branches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => openCategoryPicker()}
              className={`col-span-2 sm:col-span-2 flex items-center justify-between gap-2 h-8 px-2.5 rounded-lg border text-left transition ${
                categoryReady
                  ? "bg-orange-50 border-orange-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <span className="min-w-0 flex items-center gap-1.5">
                <Layers size={13} className="text-[#FF6A00] shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate">
                  {categoryReady
                    ? `${selectedCategory} · ${selectedSubCategory}`
                    : "Choose category to mark"}
                </span>
              </span>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Student list — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {!categoryReady && (
            <button
              type="button"
              onClick={() => openCategoryPicker()}
              className="w-full rounded-lg border border-dashed border-orange-300 bg-orange-50/80 px-3 py-2 text-left hover:bg-orange-50 mb-1.5"
            >
              <p className="text-xs font-semibold text-[#FF6A00]">
                Choose category first
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Select sport category and sub-category, then mark attendance.
              </p>
            </button>
          )}

          {paginatedStudents.length === 0 ? (
            <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2">
                <Users size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                No students found
              </p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                Try another date, branch, session, or search term. Left students
                only appear for dates on or before they left.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile compact cards */}
              <div className="lg:hidden space-y-1.5">
                {paginatedStudents.map((s, index) => {
                  const key = `${s.uid}||${selectedCategory}||${selectedSubCategory}`;
                  const record = draftAttendance[key];
                  const rowNumber =
                    (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <div
                      key={s.uid}
                      className="bg-white border border-gray-100 rounded-lg px-2.5 py-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6A00] flex items-center justify-center font-bold text-[11px] shrink-0 border border-orange-100">
                          {(s.firstName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                            <span className="text-gray-400 font-medium mr-1">
                              {rowNumber}.
                            </span>
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {s.sessions || "No session"}
                            {s.branch ? ` · ${s.branch}` : ""}
                          </p>
                        </div>
                      </div>

                      {record?.status && record?.markedByName ? (
                        <p className="text-[10px] text-[#C2410C] mb-1.5 leading-snug bg-orange-50 rounded px-1.5 py-1 border border-orange-100">
                          Marked by {record.markedByName}
                          {record.markedByRole === "trainer"
                            ? " (trainer)"
                            : " (academy)"}
                          {record.markedAtLabel
                            ? ` · ${record.markedAtLabel}`
                            : ""}
                        </p>
                      ) : null}

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveAttendance(s, "present")}
                          className={`h-8 rounded-md border text-[11px] font-semibold transition active:scale-[0.98] ${
                            record?.status === "present"
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => saveAttendance(s, "absent")}
                          className={`h-8 rounded-md border text-[11px] font-semibold transition active:scale-[0.98] ${
                            record?.status === "absent"
                              ? "bg-rose-50 border-rose-300 text-rose-700"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          Absent
                        </button>
                      </div>

                      {record?.status === "absent" ? (
                        <select
                          value={record?.reason || ""}
                          onChange={(e) =>
                            saveAttendance(s, "absent", e.target.value)
                          }
                          className="mt-1.5 w-full h-8 border border-gray-200 rounded-md px-2 text-[11px] text-gray-800 bg-gray-50 outline-none focus:border-[#FF6A00]"
                        >
                          <option value="">Select reason</option>
                          {absenceReasons.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Desktop dense table */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-[#FFF7F0] shadow-[inset_0_-1px_0_#f3e8de]">
                    <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-1.5 font-semibold w-8">#</th>
                      <th className="px-2 py-1.5 font-semibold">Student</th>
                      <th className="px-2 py-1.5 font-semibold">Session</th>
                      <th className="px-2 py-1.5 font-semibold">Branch</th>
                      <th className="px-2 py-1.5 font-semibold">Marked by</th>
                      <th className="px-2 py-1.5 font-semibold text-center w-[200px]">
                        Attendance
                      </th>
                      <th className="px-2 py-1.5 font-semibold min-w-[140px]">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((s, index) => {
                      const key = `${s.uid}||${selectedCategory}||${selectedSubCategory}`;
                      const record = draftAttendance[key];
                      const rowNumber =
                        (currentPage - 1) * itemsPerPage + index + 1;

                      return (
                        <tr
                          key={s.uid}
                          className="border-b border-gray-50 hover:bg-orange-50/40"
                        >
                          <td className="px-2 py-1 text-[11px] text-gray-400 tabular-nums">
                            {rowNumber}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6A00] flex items-center justify-center font-bold text-[10px] shrink-0 border border-orange-100">
                                {(s.firstName || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                                  {s.firstName} {s.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {s.registernumber || s.phone || "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                            {s.sessions || "—"}
                          </td>
                          <td className="px-2 py-1 text-[11px] text-gray-700 whitespace-nowrap">
                            {s.branch || "—"}
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 max-w-[160px]">
                            {record?.status && record?.markedByName ? (
                              <span className="truncate block">
                                {record.markedByName}
                                {record.markedAtLabel
                                  ? ` · ${record.markedAtLabel}`
                                  : ""}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => saveAttendance(s, "present")}
                                className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold transition ${
                                  record?.status === "present"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                    : "bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-200"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => saveAttendance(s, "absent")}
                                className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold transition ${
                                  record?.status === "absent"
                                    ? "bg-rose-50 border-rose-300 text-rose-700"
                                    : "bg-gray-50 border-gray-200 text-gray-600 hover:border-rose-200"
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            {record?.status === "absent" ? (
                              <select
                                value={record?.reason || ""}
                                onChange={(e) =>
                                  saveAttendance(s, "absent", e.target.value)
                                }
                                className="w-full h-7 border border-gray-200 rounded-md px-1.5 text-[11px] text-gray-800 bg-gray-50 outline-none focus:border-[#FF6A00]"
                              >
                                <option value="">Reason</option>
                                {absenceReasons.map((r) => (
                                  <option key={r}>{r}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact footer */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-2 sm:px-3 lg:px-4 py-1.5 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div className="order-2 sm:order-1 scale-95 origin-left sm:scale-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          <div className="order-1 sm:order-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={clearAllAttendance}
              disabled={!hasChanges}
              className={`h-8 px-3 text-[11px] sm:text-xs font-semibold rounded-lg border transition ${
                hasChanges
                  ? "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
              className={`h-8 px-4 text-[11px] sm:text-xs font-semibold rounded-lg text-white transition ${
                hasChanges && !saving
                  ? "bg-[#FF6A00] hover:bg-[#e85f00]"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      {showCategoryModal && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[min(88dvh,680px)]"
            style={{
              paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="shrink-0 px-4 sm:px-5 pt-3 pb-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Choose category
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Required before marking attendance
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pendingMarkRef.current = null;
                    setShowCategoryModal(false);
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 hover:bg-gray-200"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Category
                </p>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No categories found for students.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const active = pickerCategory === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setPickerCategory(c);
                            setPickerSubCategory("");
                          }}
                          className={`max-w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border min-h-[42px] transition ${
                            active
                              ? "bg-[#FF6A00] text-white border-[#FF6A00] shadow-sm"
                              : "bg-gray-50 border-gray-200 text-gray-800 hover:border-orange-200"
                          }`}
                        >
                          <span className="truncate inline-block max-w-[220px] align-bottom">
                            {c}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {pickerCategory ? (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Sub category
                  </p>
                  {pickerSubCategories.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No sub-category for this sport.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pickerSubCategories.map((s) => {
                        const active = pickerSubCategory === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPickerSubCategory(s)}
                            className={`max-w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border min-h-[42px] inline-flex items-center gap-1.5 transition ${
                              active
                                ? "bg-orange-50 text-[#FF6A00] border-orange-300"
                                : "bg-gray-50 border-gray-200 text-gray-800 hover:border-orange-200"
                            }`}
                          >
                            {active && <Check size={14} />}
                            <span className="truncate inline-block max-w-[200px]">
                              {s}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 px-4 sm:px-5 pt-2 pb-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  pendingMarkRef.current = null;
                  setShowCategoryModal(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCategoryPicker}
                disabled={
                  !pickerCategory ||
                  (pickerSubCategories.length > 0 && !pickerSubCategory)
                }
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white ${
                  !pickerCategory ||
                  (pickerSubCategories.length > 0 && !pickerSubCategory)
                    ? "bg-gray-300"
                    : "bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] shadow-md"
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnmarkedModal && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            style={{
              paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="px-4 sm:px-5 pt-4 pb-2">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0 border border-orange-100">
                  <Users size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    More students pending
                  </h2>
                  <p className="text-sm text-gray-600 mt-1 leading-snug">
                    {unmarkedStudents.length} student
                    {unmarkedStudents.length === 1 ? "" : "s"} still need
                    attendance
                    {totalPages > 1 ? ` on other pages` : ""}. Continue
                    marking them, or save only the students already marked.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-5 pt-3 pb-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={goToUnmarkedPage}
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white text-sm font-semibold active:scale-[0.99] shadow-md"
              >
                Continue marking
              </button>
              <button
                type="button"
                onClick={performSave}
                disabled={saving}
                className="w-full min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                {saving ? "Saving..." : "Save marked only"}
              </button>
              <button
                type="button"
                onClick={() => setShowUnmarkedModal(false)}
                className="w-full min-h-[40px] text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-3 shadow-2xl">
            <div>
              <h2 className="font-bold text-lg text-gray-900">
                Export Attendance
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Choose a date range to download the Excel report.
              </p>
            </div>

            <label className="block text-xs font-semibold text-gray-500">
              From
              <input
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
                className="mt-1.5 w-full border border-gray-200 p-3 rounded-xl text-sm text-gray-800 bg-gray-50 outline-none focus:border-[#FF6A00]"
              />
            </label>

            <label className="block text-xs font-semibold text-gray-500">
              To
              <input
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
                className="mt-1.5 w-full border border-gray-200 p-3 rounded-xl text-sm text-gray-800 bg-gray-50 outline-none focus:border-[#FF6A00]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={exportAttendanceRange}
                className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white rounded-xl text-sm font-semibold shadow-md"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsAttendancePage;
