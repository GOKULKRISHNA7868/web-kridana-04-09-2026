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
import { Search, Download, ChevronDown } from "lucide-react";
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

      // ✅ Status rule
      // show if:
      // - status field not present
      // - status === "Active"
      // hide if:
      // - status === "Left"
      const statusOk = !s.status || s.status === "Active";

      // ✅ Joining rule
      const joinedOk = !s.joiningDate || s.joiningDate <= selectedDate;

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
      return matchSearch && statusOk && joinedOk && matchSport;
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
  const saveAttendance = (student, status) => {
    setDraftAttendance((prev) => ({
      ...prev,
      [student.uid]: status,
    }));

    // if switching to present → remove reason
    if (status === "present") {
      setAbsenceReasons((prev) => {
        const copy = { ...prev };
        delete copy[student.uid];
        return copy;
      });
    }
  };

  const handleSaveAll = async () => {
    if (!selectedCategory || !selectedSubCategory) {
      alert("Please select both Category and Sub Category before saving ❌");
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
    <div className="h-full w-full bg-gray-50 rounded-2xl overflow-hidden flex flex-col">
      {/* ================= FIXED HEADER ================= */}
      <div className="shrink-0 bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 md:px-8 md:py-6">
          {/* TITLE */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-800">
              Trainer Students
            </h1>
            <p className="text-sm text-orange-500 font-medium mt-0.5">
              Attendance Management
            </p>
          </div>

          {/* DATE PICKER */}
          <div className="shrink-0">
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => {
                setAttendance({});
                setDraftAttendance({});
                setSelectedDate(e.target.value);
              }}
              className="h-10 px-3 rounded-xl border border-orange-200 bg-orange-50 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            {
              label: "Total",
              value: summary.totalStudents,
              bg: "bg-white",
              text: "text-gray-800",
            },
            {
              label: "Present",
              value: summary.presentToday,
              bg: "bg-green-50",
              text: "text-green-600",
            },
            {
              label: "Absent",
              value: summary.absentToday,
              bg: "bg-red-50",
              text: "text-red-500",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`${item.bg} rounded-2xl px-3 py-3 border border-gray-100 shadow-sm`}
            >
              <p className="text-[11px] text-gray-500 font-medium">
                {item.label}
              </p>
              <h3 className={`text-xl font-bold mt-1 ${item.text}`}>
                {item.value}
              </h3>
            </div>
          ))}
        </div>

        {/* SEARCH + EXPORT */}
        <div className="flex items-center gap-3 mt-4">
          {/* SEARCH */}
          <div className="flex items-center flex-1 h-11 rounded-2xl bg-gray-50 border border-gray-200 px-3 shadow-sm">
            <Search size={17} className="text-gray-400" />

            <input
              className="ml-2 w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* EXPORT */}
          <button
            onClick={() => setShowExportModal(true)}
            className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto mb-4">
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm min-w-[120px]"
        >
          <option value="">Session</option>
          {SESSIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* TIME */}

        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubCategory("");
          }}
          className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
        >
          <option value="">Sub</option>
          {subCategories.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ================= MOBILE VIEW ================= */}
      <div className="block sm:hidden h-[42vh] overflow-y-auto overscroll-y-contain space-y-3 pb-2">
        {paginatedStudents.map((s, index) => {
          const record = draftAttendance[s.uid];

          return (
            <div
              key={s.uid}
              className="bg-white border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-1 flex-1 min-w-0">
                  <span className="w-4 shrink-0 text-sm">
                    {(currentPage - 1) * itemsPerPage + index + 1}.
                  </span>

                  <span className="flex-1 break-words leading-5 text-sm font-semibold">
                    {s.firstName} {s.lastName}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{s.sessions || "-"}</div>
              </div>

              <div className="flex justify-between">
                <div
                  onClick={() => saveAttendance(s, "present")}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-6 h-6 border rounded-full flex items-center justify-center">
                    {record === "present" && (
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    )}
                  </div>
                  <span className="text-green-600">P</span>
                </div>

                <div
                  onClick={() => saveAttendance(s, "absent")}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-6 h-6 border rounded-full flex items-center justify-center">
                    {record === "absent" && (
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <span className="text-red-500">A</span>
                </div>
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
                  className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select reason</option>
                  {ABSENCE_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-20 bg-white pt-5 pb-3 flex justify-center sm:hidden">
        <button
          onClick={handleSaveAll}
          disabled={!hasChanges}
          className={`px-6 py-2 text-sm font-semibold rounded-lg text-white ${
            hasChanges ? "bg-[#FF6A00]" : "bg-gray-300"
          }`}
        >
          Save
        </button>
      </div>
      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden sm:block border rounded-xl overflow-x-auto">
        <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.3fr] min-w-[700px] bg-[#1F2937] text-orange-400 font-semibold p-4">
          <div>Name</div>
          <div>Session</div>
          <div className="text-center">Present</div>
          <div className="text-center">Absent</div>
          <div className="text-center">Reason</div>
        </div>

        {paginatedStudents.map((s, index) => {
          const record = draftAttendance[s.uid];

          return (
            <div
              key={s.uid}
              className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.3fr] min-w-[700px] px-6 py-4 border-t items-center"
            >
              <div className="flex items-start gap-1 min-w-0">
                <span className="w-5 shrink-0">
                  {(currentPage - 1) * itemsPerPage + index + 1}.
                </span>

                <span className="flex-1 break-words leading-6">
                  {s.firstName} {s.lastName}
                </span>
              </div>
              <div>{s.sessions || "-"}</div>

              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={record === "present"}
                  onChange={() => saveAttendance(s, "present")}
                />
              </div>

              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={record === "absent"}
                  onChange={() => saveAttendance(s, "absent")}
                />
              </div>

              <div>
                {record === "absent" && (
                  <select
                    value={absenceReasons[s.uid] || ""}
                    onChange={(e) =>
                      setAbsenceReasons((prev) => ({
                        ...prev,
                        [s.uid]: e.target.value,
                      }))
                    }
                    className="border rounded px-2 py-1 w-full"
                  >
                    <option value="">Select</option>
                    {ABSENCE_OPTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl">
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
                  className="w-full border rounded-xl px-3 py-2"
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
                  className="w-full border rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl border"
              >
                Cancel
              </button>

              <button
                onClick={exportAttendanceRange}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white font-semibold"
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
