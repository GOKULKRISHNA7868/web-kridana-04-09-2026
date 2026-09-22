import React, { useEffect, useMemo, useState, useRef } from "react";

import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { updateDoc, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { ChevronDown, Download } from "lucide-react";
import { isPersonActiveOnDate } from "../../utils/personStatus";
const absenceReasons = [
  "On Leave",
  "Not Working Day",
  "Week Off",
  "Sick Leave",
  "Other",
];

const formatName = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z.\s]/g, "")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
};

const EmployeeAttendancePage = () => {
  const handleAdd = () => {
    setShowAddModal(true);
  };
  /* 🔹 Update Employee */
  const updateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      await updateDoc(doc(db, "InstituteTrainers", selectedEmployee.uid), {
        firstName: editData.firstName,
        lastName: editData.lastName,
        designation: editData.designation,
      });

      setShowEditModal(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.log(err);
    }
  };

  /* 🔹 Add Employee */
  const addEmployee = async () => {
    if (!addData.firstName) return;

    try {
      const newRef = doc(collection(db, "InstituteTrainers"));

      await setDoc(newRef, {
        ...addData,
        instituteId: user.uid,
        createdAt: serverTimestamp(),
      });

      setShowAddModal(false);

      setAddData({
        firstName: "",
        lastName: "",
        designation: "",
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleEdit = () => {
    if (!selectedEmployee) {
      alert("Select an employee first");
      return;
    }

    setEditData({
      firstName: selectedEmployee.firstName || "",
      lastName: selectedEmployee.lastName || "",
      designation: selectedEmployee.designation || "",
    });

    setShowEditModal(true);
  };

  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [draftAttendance, setDraftAttendance] = useState({});
  const [search, setSearch] = useState("");
  const exportAttendanceRange = async () => {
    if (!exportFromDate || !exportToDate) {
      alert("Select From and To dates");
      return;
    }

    const q = query(
      collection(db, "employeeAttendance"),
      where("instituteId", "==", user.uid),
    );

    const snap = await getDocs(q);

    const attendanceMap = {};

    snap.forEach((doc) => {
      const data = doc.data();

      if (
        data.instituteId === user.uid &&
        data.date >= exportFromDate &&
        data.date <= exportToDate
      ) {
        const key = `${data.employeeId}_${data.date}`;

        attendanceMap[key] = {
          status: data.status,
          reason: data.reason || "",
        };
      }
    });

    const attendanceRows = [];
    const summaryRows = [];

    filteredEmployees.forEach((emp) => {
      let currentDate = new Date(exportFromDate);
      const endDate = new Date(exportToDate);

      let present = 0;
      let total = 0;

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0]; // ✅ FIX

        const key = `${emp.uid}_${dateStr}`; // ✅ FIX

        const record = attendanceMap[key] || {};
        const status = record.status || "Not Marked";
        const reason = record.reason || "";

        if (status === "present") present++;
        if (status !== "Not Marked") total++;

        attendanceRows.push({
          Name: `${emp.firstName} ${emp.lastName}`,
          Date: dateStr,
          Designation: emp.designation || "-",
          Status: status,
          Reason: status === "absent" ? reason : "",
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const percent = total ? ((present / total) * 100).toFixed(1) : 0;

      summaryRows.push({
        Name: `${emp.firstName} ${emp.lastName}`,
        Present: present,
        TotalMarkedDays: total,
        AttendancePercentage: `${percent}%`,
      });
    });

    const workbook = XLSX.utils.book_new();

    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceRows);
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Attendance");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    XLSX.writeFile(
      workbook,
      `employee_attendance_${exportFromDate}_to_${exportToDate}.xlsx`,
    );

    setShowExportModal(false);
  };
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
  });
  const [addData, setAddData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
  });

  /* 🔹 Load Employees */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "InstituteTrainers"),
      where("instituteId", "==", user.uid),
    );

    return onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
  }, [user]);

  /* 🔹 Load Attendance */

  useEffect(() => {
    if (!user || !selectedDate) {
      setAttendance({});
      setDraftAttendance({});
      return;
    }

    // ✅ CLEAR instantly when date changes
    setAttendance({});
    setDraftAttendance({});

    const q = query(
      collection(db, "employeeAttendance"),
      where("instituteId", "==", user.uid),
      where("date", "==", selectedDate),
    );

    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.data().employeeId] = d.data();
      });

      setAttendance(map);
      setDraftAttendance({ ...map });
    });

    return unsub;
  }, [user, selectedDate]);

  /* 🔹 Filter + Sort — show trainers active on the selected date (history-aware) */
  const filteredEmployees = useMemo(() => {
    const searchText = search.toLowerCase();

    return employees
      .filter((emp) => {
        const nameOk = `${emp.firstName || ""} ${emp.lastName || ""}`
          .toLowerCase()
          .includes(searchText);
        if (!nameOk) return false;
        return isPersonActiveOnDate(emp, selectedDate);
      })
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
  }, [employees, search, selectedDate]);

  /* 🔹 Save Attendance */
  const saveAttendance = (emp, status, reason = "") => {
    if (!selectedDate) {
      alert("Please select date");
      return;
    }

    setDraftAttendance((prev) => ({
      ...prev,
      [emp.uid]: {
        employeeId: emp.uid,
        instituteId: user.uid,
        date: selectedDate,
        status,
        reason,
      },
    }));
  };
  const handleSaveAll = async () => {
    if (!selectedDate) {
      alert("Select date");
      return;
    }

    for (const rec of Object.values(draftAttendance)) {
      if (rec.status === "absent" && !rec.reason) {
        alert("Please select reason for all absent employees");
        return;
      }
    }

    try {
      setSaving(true);

      const changedRecords = Object.values(draftAttendance).filter((rec) => {
        const original = attendance[rec.employeeId];

        return JSON.stringify(original) !== JSON.stringify(rec);
      });

      const promises = changedRecords.map((rec) =>
        setDoc(
          doc(db, "employeeAttendance", `${rec.employeeId}_${selectedDate}`),
          {
            ...rec,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        ),
      );

      await Promise.all(promises);

      alert("Attendance saved successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setDraftAttendance({ ...attendance });
    // revert changes
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(draftAttendance) !== JSON.stringify(attendance);
  }, [draftAttendance, attendance]);

  return (
    <div className="bg-[#f3f4f6] h-[calc(100dvh-80px)] flex flex-col overflow-hidden min-h-0 pt-10 pb-10 px-4 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Employee Attendance</h1>

        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setAttendance({});
              setDraftAttendance({});
              setSelectedDate(e.target.value);
            }}
            className="border bg-orange-500 border-orange-400 rounded-md px-4 py-2"
          />
        </div>
      </div>
      <div className="mb-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        {/* LEFT → SEARCH */}
        <div className="relative w-full lg:w-80">
          <img
            src="/search-icon.png"
            alt="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
          />

          <input
            type="text"
            placeholder="Search here..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-orange-400 rounded-md px-10 py-2 w-full 
                 focus:outline-none focus:ring-0 focus:border-orange-400"
          />
        </div>

        {/* RIGHT → BUTTONS */}
        <div className="flex gap-3 ml-auto">
          <button
            onClick={() => setShowExportModal(true)}
            className="border border-orange-400 px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* TABLE */}
      {/* ================= RESPONSIVE ATTENDANCE TABLE ================= */}
      <div className="border-2 border-orange-300 rounded-xl overflow-hidden bg-white flex-1 flex flex-col min-h-0">
        {/* ================= DESKTOP VIEW ================= */}
        <div className="hidden lg:block flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {/* HEADER */}
          <div className="grid grid-cols-5 bg-black text-orange-500 font-semibold px-6 py-3 text-sm">
            <div>Employee Name</div>
            <div>Designation</div>
            <div className="text-center">Present</div>
            <div className="text-center">Absent</div>
            <div>Reason</div>
          </div>

          {/* BODY */}
          {filteredEmployees.map((emp, index) => {
            const record = draftAttendance[emp.uid];

            return (
              <div
                key={emp.uid}
                onClick={() => setSelectedEmployee(emp)}
                onDoubleClick={() => setSelectedEmployee(null)}
                className={`grid grid-cols-5 px-6 py-4 border-t items-center cursor-pointer transition
          ${
            selectedEmployee?.uid === emp.uid
              ? "bg-orange-50 border-l-4 border-orange-500"
              : "hover:bg-gray-50"
          }`}
              >
                {/* Name */}
                <div className="font-medium text-gray-800">
                  {index + 1}. {emp.firstName} {emp.lastName}
                </div>

                {/* Designation */}
                <div className="text-gray-600">{emp.designation || "-"}</div>

                {/* Present */}
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-green-500"
                    checked={record?.status === "present"}
                    onChange={() => saveAttendance(emp, "present")}
                  />
                </div>

                {/* Absent */}
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-red-500"
                    checked={record?.status === "absent"}
                    onChange={() => saveAttendance(emp, "absent")}
                  />
                </div>

                {/* Reason */}
                <div>
                  {record?.status === "absent" ? (
                    <select
                      value={record?.reason || ""}
                      onChange={(e) =>
                        saveAttendance(emp, "absent", e.target.value)
                      }
                      className="border rounded-md px-2 py-1 w-full"
                    >
                      <option value="">Select</option>
                      {absenceReasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= MOBILE VIEW ================= */}
        <div className="lg:hidden flex-1 overflow-y-auto min-h-0 divide-y">
          {filteredEmployees.map((emp, index) => {
            const record = draftAttendance[emp.uid];

            return (
              <div
                key={emp.uid}
                onClick={() => setSelectedEmployee(emp)}
                className={`p-3 transition ${
                  selectedEmployee?.uid === emp.uid
                    ? "bg-orange-50"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Top Row */}
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      {index + 1}. {emp.firstName} {emp.lastName}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      {emp.designation || "No Designation"}
                    </p>
                  </div>

                  <span className="text-[10px] px-2 py-1 rounded-full bg-orange-100 text-orange-600 whitespace-nowrap">
                    Employee
                  </span>
                </div>

                {/* Attendance Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => saveAttendance(emp, "present")}
                    className={`rounded-lg py-3 text-sm font-semibold border transition ${
                      record?.status === "present"
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    Present
                  </button>

                  <button
                    onClick={() => saveAttendance(emp, "absent")}
                    className={`rounded-lg py-3 text-sm font-semibold border transition ${
                      record?.status === "absent"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    Absent
                  </button>
                </div>

                {/* Reason */}
                {record?.status === "absent" && (
                  <div className="mt-3">
                    <select
                      value={record?.reason || ""}
                      onChange={(e) =>
                        saveAttendance(emp, "absent", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm"
                    >
                      <option value="">Select Reason</option>
                      {absenceReasons.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
        <button
          onClick={handleCancel}
          className="border border-gray-400 px-5 py-2 rounded-md"
        >
          Cancel
        </button>

        <button
          onClick={handleSaveAll}
          disabled={!hasChanges || saving}
          className={`px-5 py-2 rounded-md text-white ${
            !hasChanges || saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-orange-500"
          }`}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 space-y-4">
            <h2 className="text-lg font-semibold">Add Employee</h2>

            <input
              className="border w-full p-2 rounded"
              placeholder="First Name"
              value={addData.firstName}
              onChange={(e) =>
                setAddData({
                  ...addData,
                  firstName: formatName(e.target.value),
                })
              }
            />

            <input
              className="border w-full p-2 rounded"
              placeholder="Last Name"
              value={addData.lastName}
              onChange={(e) =>
                setAddData({ ...addData, lastName: formatName(e.target.value) })
              }
            />

            <input
              className="border w-full p-2 rounded"
              placeholder="Designation"
              value={addData.designation}
              onChange={(e) =>
                setAddData({
                  ...addData,
                  designation: formatName(e.target.value),
                })
              }
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)}>Cancel</button>

              <button
                onClick={addEmployee}
                className="bg-orange-500 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 space-y-4">
            <h2 className="text-lg font-semibold">
              Edit {selectedEmployee.firstName}
            </h2>

            <input
              className="border w-full p-2 rounded"
              placeholder="First Name"
              value={editData.firstName}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  firstName: formatName(e.target.value),
                })
              }
            />

            <input
              className="border w-full p-2 rounded"
              placeholder="Last Name"
              value={editData.lastName}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  lastName: formatName(e.target.value),
                })
              }
            />

            <input
              className="border w-full p-2 rounded"
              placeholder="Designation"
              value={editData.designation}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  designation: formatName(e.target.value),
                })
              }
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)}>Cancel</button>

              <button
                onClick={updateEmployee}
                className="bg-orange-500 text-white px-4 py-2 rounded"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[350px] space-y-4">
            <h2 className="text-lg font-semibold">Export Attendance</h2>

            <div>
              <label className="text-sm font-medium">From Date</label>
              <input
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
                className="w-full border border-orange-300 rounded-lg px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">To Date</label>
              <input
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
                className="w-full border border-orange-300 rounded-lg px-3 py-2 mt-1"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="border px-4 py-1 rounded"
              >
                Cancel
              </button>

              <button
                onClick={exportAttendanceRange}
                className="bg-orange-500 text-white px-4 py-1 rounded"
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

export default EmployeeAttendancePage;
