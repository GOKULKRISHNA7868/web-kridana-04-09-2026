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
  const itemsPerPage = 10;
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

  // Filter Students (JOIN DATE + LEFT DATE LOGIC)
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();

      const matchSearch = name.includes(search.toLowerCase());

      const statusOk = !s.status || s.status === "Active";

      const joinedOk = !s.joiningDate || s.joiningDate <= selectedDate;

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

      return (
        matchSearch &&
        statusOk &&
        joinedOk &&
        matchBranch &&
        sportMatch &&
        matchSession &&
        matchTime
      );
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
    <div className="relative h-full w-full bg-[#F4F6FB] rounded-none md:rounded-2xl overflow-hidden flex flex-col">
      {/* ================= FIXED HEADER ================= */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-orange-100/80 shadow-sm z-20">
        <div className="px-3 py-3 sm:px-5 sm:py-4 md:px-8 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 animate-moreFadeUp">
            <div className="min-w-0 flex items-start gap-3">
              <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FF8A3D] text-white items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                <UserCheck size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">
                  Customer Attendance
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                  Mark present or absent ·{" "}
                  <span className="text-[#FF6A00] font-medium">
                    {selectedDate === today ? "Today" : selectedDate}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 hover:border-orange-300 transition focus-within:border-[#FF6A00] focus-within:ring-2 focus-within:ring-orange-100">
                <CalendarDays size={16} className="text-[#FF6A00] shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm text-gray-800 bg-transparent outline-none w-[132px] sm:w-[150px]"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 h-10 px-3 sm:px-4 border border-gray-200 rounded-xl bg-white text-[#FF6A00] font-semibold text-sm hover:bg-orange-50 active:scale-95 transition shadow-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 md:mt-4">
            {[
              [
                "Total",
                summary.totalStudents,
                "from-orange-50 to-white border-orange-100 text-orange-600",
                Users,
              ],
              [
                "Present",
                summary.presentToday,
                "from-emerald-50 to-white border-emerald-100 text-emerald-600",
                UserCheck,
              ],
              [
                "Absent",
                summary.absentToday,
                "from-rose-50 to-white border-rose-100 text-rose-600",
                UserX,
              ],
            ].map(([label, val, tone, Icon]) => (
              <div
                key={label}
                className={`bg-gradient-to-br ${tone} border rounded-2xl py-2.5 sm:py-3.5 px-2 sm:px-4 shadow-sm text-center md:text-left md:flex md:items-center md:gap-3`}
              >
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-white/80 items-center justify-center shrink-0 shadow-sm">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {label}
                  </div>
                  <div className="font-bold text-base sm:text-xl text-gray-900 tabular-nums">
                    {val}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 md:mt-4 flex flex-col lg:flex-row gap-2.5 lg:gap-3">
            <div className="flex flex-1 items-center border border-gray-200 rounded-xl px-3 bg-gray-50 focus-within:border-[#FF6A00] focus-within:ring-2 focus-within:ring-orange-100 transition">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                placeholder="Search student by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2.5 py-2.5 outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:w-[min(100%,36rem)]">
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm w-full bg-gray-50 text-gray-800 outline-none focus:border-[#FF6A00]"
              >
                <option value="">Session</option>
                {SESSIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm w-full bg-gray-50 text-gray-800 outline-none focus:border-[#FF6A00]"
              >
                <option value="">Branch</option>
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => openCategoryPicker()}
                className={`col-span-2 md:col-span-1 flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-left min-h-[44px] transition hover:shadow-sm ${
                  categoryReady
                    ? "bg-orange-50 border-orange-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <span className="min-w-0 flex items-center gap-2">
                  <Layers size={15} className="text-[#FF6A00] shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] text-gray-500 leading-none font-medium">
                      Category
                    </span>
                    <span className="block text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {categoryReady
                        ? `${selectedCategory} · ${selectedSubCategory}`
                        : "Choose before marking"}
                    </span>
                  </span>
                </span>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SCROLL STUDENTS ONLY ================= */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overflow-x-hidden px-3 sm:px-5 md:px-8 lg:px-10 py-3 sm:py-4 scrollbar-hide"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {!categoryReady && (
            <button
              type="button"
              onClick={() => openCategoryPicker()}
              className="w-full rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white px-4 py-4 text-left hover:shadow-md active:scale-[0.99] transition mb-3"
            >
              <p className="text-sm sm:text-base font-semibold text-[#FF6A00]">
                Choose category first
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Select sport category and sub-category, then mark attendance.
              </p>
            </button>
          )}

          {paginatedStudents.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-300 mb-3">
                <Users size={26} />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                No students found
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Try another date, branch, session, or search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {paginatedStudents.map((s, index) => {
                const key = `${s.uid}||${selectedCategory}||${selectedSubCategory}`;
                const record = draftAttendance[key];
                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <div
                    key={s.uid}
                    className="bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-orange-100 transition-all animate-moreFadeUp"
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-[#FF6A00] flex items-center justify-center font-bold text-sm shrink-0 border border-orange-100">
                        {(s.firstName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base leading-snug break-words">
                          <span className="text-gray-400 font-medium mr-1">
                            {rowNumber}.
                          </span>
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">
                          {s.sessions || "No session set"}
                          {s.branch ? ` · ${s.branch}` : ""}
                        </p>
                        {record?.status && record?.markedByName && (
                          <p className="text-[11px] sm:text-xs text-[#C2410C] mt-1.5 leading-snug bg-orange-50/80 rounded-lg px-2 py-1.5 border border-orange-100">
                            Already marked by {record.markedByName}
                            {record.markedByRole === "trainer"
                              ? " (trainer)"
                              : " (academy)"}
                            {record.markedAtLabel
                              ? ` · ${record.markedAtLabel}`
                              : ""}
                            . You can edit.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => saveAttendance(s, "present")}
                        className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border text-sm font-semibold transition active:scale-95 ${
                          record?.status === "present"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/40"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            record?.status === "present"
                              ? "border-emerald-500"
                              : "border-gray-300"
                          }`}
                        >
                          {record?.status === "present" && (
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                          )}
                        </span>
                        Present
                      </button>

                      <button
                        type="button"
                        onClick={() => saveAttendance(s, "absent")}
                        className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border text-sm font-semibold transition active:scale-95 ${
                          record?.status === "absent"
                            ? "bg-rose-50 border-rose-300 text-rose-700 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-rose-200 hover:bg-rose-50/40"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            record?.status === "absent"
                              ? "border-rose-500"
                              : "border-gray-300"
                          }`}
                        >
                          {record?.status === "absent" && (
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                          )}
                        </span>
                        Absent
                      </button>
                    </div>

                    {record?.status === "absent" && (
                      <select
                        value={record?.reason || ""}
                        onChange={(e) =>
                          saveAttendance(s, "absent", e.target.value)
                        }
                        className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 outline-none focus:border-[#FF6A00] animate-moreFadeUp"
                      >
                        <option value="">Select reason</option>
                        {absenceReasons.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= STATIC FOOTER ================= */}
      <div className="shrink-0 bg-white/95 backdrop-blur border-t border-gray-100 px-3 sm:px-5 md:px-8 lg:px-10 py-3 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="order-2 sm:order-1">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          <div className="order-1 sm:order-2 flex justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={clearAllAttendance}
              disabled={!hasChanges}
              className={`px-4 sm:px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border transition ${
                hasChanges
                  ? "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 active:scale-95"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
            >
              Clear All
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
              className={`px-6 sm:px-8 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl text-white transition ${
                hasChanges && !saving
                  ? "bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-95"
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
