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
import { Search, Download, ChevronDown, Check, Layers, X } from "lucide-react";
import * as XLSX from "xlsx";

const today = new Date().toISOString().split("T")[0];

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

const StudentsAttendancePage = () => {
  const [selectedTime, setSelectedTime] = useState("");
  const timeRef = useRef(null);
  const [absenceReasons, setAbsenceReasons] = useState({});
  const { user, institute } = useAuth(); // user = trainer now
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [search, setSearch] = useState("");
  const [draftAttendance, setDraftAttendance] = useState({});

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerSubCategory, setPickerSubCategory] = useState("");
  const pendingMarkRef = useRef(null);
  const categories = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (sp.category) set.add(sp.category);
        });
      }
    });

    return [...set];
  }, [students]);
  const subCategories = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (
            (!selectedCategory || sp.category === selectedCategory) &&
            sp.subCategory
          ) {
            set.add(sp.subCategory);
          }
        });
      }
    });

    return [...set];
  }, [students, selectedCategory]);

  const pickerSubCategories = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (Array.isArray(s.sports)) {
        s.sports.forEach((sp) => {
          if (
            (!pickerCategory || sp.category === pickerCategory) &&
            sp.subCategory
          ) {
            set.add(sp.subCategory);
          }
        });
      }
    });
    return [...set];
  }, [students, pickerCategory]);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ==============================
  // LOAD TRAINER STUDENTS
  // ==============================
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "trainerstudents"),
      where("trainerId", "==", user.uid),
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setStudents(list);
    });
  }, [user]);

  // ==============================
  // FETCH ATTENDANCE (TRAINER)
  // ==============================
  useEffect(() => {
    if (!user || !selectedDate) {
      setAttendance({});
      setDraftAttendance({});
      return;
    }

    setAttendance({});
    setDraftAttendance({});

    const fetchData = async () => {
      const colRef = collection(db, "trainers", user.uid, "attendance");
      const snap = await getDocs(colRef);

      const map = {};

      snap.forEach((d) => {
        const data = d.data();

        const matchDate = data.date === selectedDate;
        const matchCategory =
          !selectedCategory || data.category === selectedCategory;
        const matchSub =
          !selectedSubCategory || data.subCategory === selectedSubCategory;

        if (matchDate && matchCategory && matchSub) {
          map[data.studentId] = data.status;
          if (data.reason) {
            setAbsenceReasons((prev) => ({
              ...prev,
              [data.studentId]: data.reason,
            }));
          }
        }
      });

      setAttendance(map);
      setDraftAttendance({ ...map });
    };

    fetchData();
  }, [user, selectedDate, selectedCategory, selectedSubCategory]);

  const ABSENCE_OPTIONS = [
    "On Leave",
    "Not Working Day",
    "Week Off",
    "Sick Leave",
    "Other",
  ];

  // ==============================
  // FILTER STUDENTS (JOIN + LEFT LOGIC)
  // ==============================
  // ==============================
  // FILTER STUDENTS (STATUS LOGIC)
  // ==============================
  const filteredStudents = useMemo(() => {
    const sortedStudents = [...students].sort((a, b) =>
      (a.firstName || "").localeCompare(b.firstName || ""),
    );

    return sortedStudents.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchSearch = name.includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (!isPersonActiveOnDate(s, selectedDate)) return false;

      const matchSession = !selectedSession || s.sessions === selectedSession;
      const matchTime = !selectedTime || s.timings === selectedTime;
      const matchSport = s.sports?.some((sp) => {
        const categoryMatch =
          !selectedCategory || sp.category === selectedCategory;
        const subCategoryMatch =
          !selectedSubCategory || sp.subCategory === selectedSubCategory;
        const sessionMatch =
          !selectedSession || sp.sessions === selectedSession;
        const timeMatch = !selectedTime || sp.timings === selectedTime;

        return categoryMatch && subCategoryMatch && sessionMatch && timeMatch;
      });
      return matchSport;
    });
  }, [
    students,
    search,
    selectedDate,
    selectedSession,
    selectedTime,
    selectedCategory,
    selectedSubCategory,
  ]);

  // ==============================
  // SUMMARY
  // ==============================
  useEffect(() => {
    const total = filteredStudents.length;
    let present = 0;
    let absent = 0;

    filteredStudents.forEach((student) => {
      const status = draftAttendance[student.uid];
      if (status === "present") present++;
      if (status === "absent") absent++;
    });

    setSummary({
      totalStudents: total,
      presentToday: present,
      absentToday: absent,
    });
  }, [filteredStudents, draftAttendance]);

  // ==============================
  // PAGINATION
  // ==============================
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // ==============================
  // SAVE ATTENDANCE (TRAINER)
  // ==============================
  const categoryReady = Boolean(selectedCategory && selectedSubCategory);

  const openCategorySheet = (pending = null) => {
    pendingMarkRef.current = pending;
    setPickerCategory(selectedCategory);
    setPickerSubCategory(selectedSubCategory);
    setShowCategorySheet(true);
  };

  const confirmCategorySheet = () => {
    if (!pickerCategory || !pickerSubCategory) return;
    setSelectedCategory(pickerCategory);
    setSelectedSubCategory(pickerSubCategory);
    setShowCategorySheet(false);

    const pending = pendingMarkRef.current;
    pendingMarkRef.current = null;
    if (pending?.student) {
      applyMark(pending.student, pending.status);
    }
  };

  const applyMark = (student, status) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [student.uid]: status,
    }));

    if (status === "present") {
      setAbsenceReasons((prev) => {
        const copy = { ...prev };
        delete copy[student.uid];
        return copy;
      });
    }
  };

  const saveAttendance = (student, status) => {
    if (!selectedCategory || !selectedSubCategory) {
      openCategorySheet({ student, status });
      return;
    }
    applyMark(student, status);
  };

  const handleSaveAll = async () => {
    if (!selectedCategory || !selectedSubCategory) {
      openCategorySheet();
      return;
    }
    const dayName = getDayName(selectedDate);
    for (let [studentId, status] of Object.entries(draftAttendance)) {
      if (status === "absent" && !absenceReasons[studentId]) {
        alert("Please enter reason for all absent students ❌");
        return;
      }
    }

    const promises = Object.entries(draftAttendance).map(
      ([studentId, status]) => {
        const student = Array.isArray(students)
          ? students.find((s) => s.uid === studentId)
          : null;

        return setDoc(
          doc(
            db,
            "trainers",
            user.uid,
            "attendance",
            `${studentId}_${selectedDate}_${selectedCategory}_${selectedSubCategory}`,
          ),
          {
            trainerId: user.uid,
            studentId,
            category: selectedCategory || "",
            subCategory: selectedSubCategory || "",
            session: student?.sessions || "General",
            date: selectedDate,
            day: dayName,
            time: selectedTime || "",
            status,
            reason: absenceReasons[studentId] || "",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
    );

    await Promise.all(promises);
    alert("Attendance saved ✅");
  };

  const handleCancel = () => {
    setDraftAttendance({ ...attendance });
  };

  const hasChanges =
    JSON.stringify(draftAttendance) !== JSON.stringify(attendance);

  // ==============================
  // EXPORT CSV
  // ==============================

  const exportAttendanceRange = async () => {
    if (!exportFromDate || !exportToDate) {
      alert("Select From and To dates");
      return;
    }

    const colRef = collection(db, "trainers", user.uid, "attendance");
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

        // ✅ collect only existing dates
        uniqueDatesSet.add(data.date);
      }
    });

    // ✅ sorted date columns
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
          // ✅ show only if exists
          row[date] =
            record.status === "absent"
              ? `absent (${record.reason || ""})`
              : record.status;

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

    const worksheet = XLSX.utils.json_to_sheet(finalRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    XLSX.writeFile(
      workbook,
      `trainer_attendance_${exportFromDate}_to_${exportToDate}.xlsx`,
    );

    setShowExportModal(false);
  };
  return (
    <div className="relative h-full min-h-0 w-full bg-[#F4F6FB] rounded-2xl overflow-hidden flex flex-col">
      <div className="shrink-0 bg-white border-b border-orange-100">
        <div className="px-3 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#FF6A00] truncate">
                Students Attendance
              </h1>
              <p className="text-[11px] text-gray-400">
                Mark present or absent for today
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => {
                setAttendance({});
                setDraftAttendance({});
                setSelectedDate(e.target.value);
              }}
              className="h-11 min-w-0 w-[138px] px-2 rounded-xl border border-orange-200 bg-orange-50 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              ["Total", summary.totalStudents, "bg-orange-50 text-orange-600"],
              ["Present", summary.presentToday, "bg-green-50 text-green-600"],
              ["Absent", summary.absentToday, "bg-red-50 text-red-500"],
            ].map(([label, value, tone]) => (
              <div key={label} className={`${tone} rounded-xl px-2 py-2 text-center`}>
                <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                <p className="text-lg font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center flex-1 min-h-[44px] rounded-xl bg-gray-50 border border-gray-200 px-3">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                className="ml-2 w-full bg-transparent outline-none text-[16px] sm:text-sm"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="w-11 h-11 rounded-xl bg-[#FF6A00] text-white flex items-center justify-center shrink-0"
              aria-label="Export"
            >
              <Download size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2.5">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-200 rounded-xl px-2 py-2.5 text-xs sm:text-sm bg-gray-50 outline-none min-h-[44px]"
            >
              <option value="">Session</option>
              {SESSIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openCategorySheet()}
              className={`col-span-2 flex items-center justify-between gap-2 border rounded-xl px-3 py-2 min-h-[44px] text-left ${
                categoryReady
                  ? "bg-orange-50 border-orange-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <span className="min-w-0 flex items-center gap-2">
                <Layers size={14} className="text-[#FF6A00] shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] text-gray-400 leading-none">
                    Category
                  </span>
                  <span className="block text-xs sm:text-sm font-semibold text-gray-800 truncate">
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

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 space-y-2.5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {!categoryReady && (
          <button
            type="button"
            onClick={() => openCategorySheet()}
            className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-3 py-3 text-left"
          >
            <p className="text-sm font-semibold text-[#FF6A00]">
              Choose category first
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Select category and sub-category, then mark attendance.
            </p>
          </button>
        )}

        {paginatedStudents.length === 0 ? (
          <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-400">
            No students found
          </div>
        ) : (
          paginatedStudents.map((s, index) => {
            const record = draftAttendance[s.uid];
            return (
              <div
                key={s.uid}
                className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {(currentPage - 1) * itemsPerPage + index + 1}. {s.firstName}{" "}
                      {s.lastName}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {s.sessions || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveAttendance(s, "present")}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold ${
                      record === "present"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAttendance(s, "absent")}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold ${
                      record === "absent"
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    Absent
                  </button>
                </div>

                {record === "absent" && (
                  <select
                    value={absenceReasons[s.uid] || ""}
                    onChange={(e) =>
                      setAbsenceReasons((prev) => ({
                        ...prev,
                        [s.uid]: e.target.value,
                      }))
                    }
                    className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none"
                  >
                    <option value="">Select reason</option>
                    {ABSENCE_OPTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 bg-white border-t border-gray-100 px-3 sm:px-4 py-2.5">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges}
            className={`min-h-[44px] px-5 rounded-xl text-sm font-semibold border ${
              hasChanges
                ? "bg-white text-gray-700 border-gray-300"
                : "bg-gray-100 text-gray-400 border-gray-200"
            }`}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasChanges}
            className={`min-h-[44px] px-6 rounded-xl text-sm font-semibold text-white ${
              hasChanges ? "bg-[#FF6A00]" : "bg-gray-300"
            }`}
          >
            Save
          </button>
        </div>
        <div className="mt-1">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {showCategorySheet && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[min(88dvh,620px)] overflow-hidden"
            style={{
              paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Choose category
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Select both category and sub-category before marking
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pendingMarkRef.current = null;
                    setShowCategorySheet(false);
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setPickerCategory(c);
                        setPickerSubCategory("");
                      }}
                      className={`min-h-[40px] px-3 rounded-xl text-sm font-semibold border ${
                        pickerCategory === c
                          ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {pickerCategory ? (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">
                    Sub category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pickerSubCategories.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPickerSubCategory(s)}
                        className={`min-h-[40px] px-3 rounded-xl text-sm font-semibold border inline-flex items-center gap-1 ${
                          pickerSubCategory === s
                            ? "bg-orange-50 text-[#FF6A00] border-orange-300"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {pickerSubCategory === s && <Check size={14} />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-4 pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  pendingMarkRef.current = null;
                  setShowCategorySheet(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCategorySheet}
                disabled={!pickerCategory || !pickerSubCategory}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white ${
                  pickerCategory && pickerSubCategory
                    ? "bg-[#FF6A00]"
                    : "bg-gray-300"
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="absolute inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Export Attendance
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="min-h-[44px] px-4 rounded-xl border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={exportAttendanceRange}
                className="min-h-[44px] px-5 rounded-xl bg-orange-500 text-white font-semibold"
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
