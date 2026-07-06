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
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
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

const StudentsAttendancePage = () => {
  const [selectedTime, setSelectedTime] = useState("");
  const timeRef = useRef(null);

  const { user, institute } = useAuth();

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
    if (!user || institute?.role !== "institute") return;

    const q = query(
      collection(db, "students"),
      where("instituteId", "==", user.uid),
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
  }, [user, institute]);

  // Fetch Attendance (DATE BASED ONLY)
  useEffect(() => {
    if (!user || !selectedDate) {
      setAttendance({});
      setDraftAttendance({});
      return;
    }

    setAttendance({});
    setDraftAttendance({});

    const fetchData = async () => {
      const colRef = collection(db, "institutes", user.uid, "attendance");
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
          };
        }
      });

      setAttendance(map);
      setDraftAttendance({ ...map });
    };

    fetchData();
  }, [user, selectedDate, selectedCategory, selectedSubCategory]);

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

  // Save Attendance
  const saveAttendance = (student, status, reason = "") => {
    const key = `${student.uid}||${selectedCategory}||${selectedSubCategory}`;

    setDraftAttendance((prev) => ({
      ...prev,
      [key]: {
        status,
        reason,
      },
    }));
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
  const branches = useMemo(() => {
    const set = new Set();

    students.forEach((s) => {
      if (s.branch) {
        set.add(s.branch);
      }
    });

    return Array.from(set);
  }, [students]);

  const handleSaveAll = async () => {
    try {
      if (!selectedCategory || !selectedSubCategory) {
        alert("Please select Category and Sub Category ❌");
        return;
      }

      let savedCount = 0;

      const promises = Object.entries(draftAttendance)
        .map(([key, status]) => {
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
            doc(db, "institutes", user.uid, "attendance", docId),
            {
              instituteId: user.uid,
              studentId,
              category,
              subCategory,
              session: student?.sessions || "General",
              date: selectedDate,
              day: getDayName(selectedDate),
              time: selectedTime || "",
              status: status.status,
              reason: status.reason || "",
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        })
        .filter(Boolean);

      await Promise.all(promises);

      // ✅ SUCCESS ALERT
      alert(`Attendance saved successfully ✅ (${savedCount} students)`);
    } catch (error) {
      console.error("Save Error:", error);

      // ❌ ERROR ALERT (IMPORTANT FOR MOBILE DEBUGGING)
      alert("Failed to save attendance ❌ Check console");
    }
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

    const colRef = collection(db, "institutes", user.uid, "attendance");
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

  return (
    <div className="h-full w-full bg-gray-50 rounded-2xl overflow-hidden flex flex-col">
      {/* ================= FIXED HEADER ================= */}
      <div className="shrink-0 bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 md:px-8 md:py-6">
          {/* BACK + TITLE */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-[#FF6A00] truncate">
                Attendance
              </h1>
            </div>

            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm w-[135px]"
            />
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4 mt-3 mb-3">
            {[
              ["Total", summary.totalStudents],
              ["Present", summary.presentToday],
              ["Absent", summary.absentToday],
            ].map(([label, val]) => (
              <div
                key={label}
                className="bg-orange-50 rounded-2xl p-4 shadow-sm text-center"
              >
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-bold text-[#FF6A00]">{val}</div>
              </div>
            ))}
          </div>

          {/* SEARCH */}
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="flex flex-1 items-center border rounded-full px-3">
              <Search size={16} />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-2 outline-none text-sm"
              />
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="p-2 border rounded-full bg-white"
            >
              <Download size={18} />
            </button>
          </div>

          {/* FILTERS */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Session</option>
              {SESSIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Branch</option>
              {branches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory("");
              }}
              className="border rounded-lg px-3 py-2 text-sm min-w-[130px]"
            >
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm min-w-[130px]"
            >
              <option value="">Sub</option>
              {subCategories.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================= SCROLL STUDENTS ONLY ================= */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-3 py-3 space-y-3 scroll-smooth"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {paginatedStudents.map((s, index) => {
            const key = `${s.uid}||${selectedCategory}||${selectedSubCategory}`;
            const record = draftAttendance[key];

            return (
              <div
                key={s.uid}
                className="bg-white border rounded-xl p-3 sm:p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="grid grid-cols-[18px_1fr] gap-1 items-start font-semibold text-gray-800 leading-6">
                    <span>{index + 1}.</span>

                    <span className="break-words">
                      {s.firstName} {s.lastName}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {s.sessions || "-"}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Present */}
                  <div
                    onClick={() => saveAttendance(s, "present")}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full border flex items-center justify-center">
                      {record?.status === "present" && (
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                      )}
                    </div>
                    <span className="text-green-600 font-medium">P</span>
                  </div>

                  {/* Absent */}
                  <div
                    onClick={() => saveAttendance(s, "absent")}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full border flex items-center justify-center">
                      {record?.status === "absent" && (
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                      )}
                    </div>
                    <span className="text-red-500 font-medium">A</span>
                  </div>
                </div>

                {record?.status === "absent" && (
                  <select
                    value={record?.reason || ""}
                    onChange={(e) =>
                      saveAttendance(s, "absent", e.target.value)
                    }
                    className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
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

          {/* SAVE BUTTON */}
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {/* Clear All */}
            <button
              onClick={clearAllAttendance}
              disabled={!hasChanges}
              className={`px-5 py-2 text-sm font-semibold rounded-lg border ${
                hasChanges
                  ? "bg-white text-gray-700 border-gray-300"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            >
              Clear All
            </button>

            {/* Save */}
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

          {/* PAGINATION */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4w-[90%] space-y-3">
            <h2 className="font-semibold">Export Attendance</h2>

            <input
              type="date"
              value={exportFromDate}
              onChange={(e) => setExportFromDate(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <input
              type="date"
              value={exportToDate}
              onChange={(e) => setExportToDate(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={exportAttendanceRange}
                className="px-3 py-1 bg-[#FF6A00] text-white rounded"
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
