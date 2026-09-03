import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ClipboardCheck,
  UserCheck,
  UserPlus,
  Building2,
  ChevronRight,
  Receipt,
  IndianRupee,
} from "lucide-react";
import { trainerDisplayName } from "../../utils/trainerAccess";

const todayISO = () => new Date().toISOString().split("T")[0];

const InstituteTrainerHome = ({ staffProfile, access, onOpen }) => {
  const [monthStats, setMonthStats] = useState({ present: 0, total: 0 });
  const name = trainerDisplayName(staffProfile);
  const photo = staffProfile?.profileImageUrl || "";
  const roleLine = [staffProfile?.subCategory, staffProfile?.category]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    const load = async () => {
      if (!staffProfile?.instituteId || !staffProfile?.trainerUid) return;
      const monthPrefix = todayISO().slice(0, 7);
      try {
        const snap = await getDocs(
          query(
            collection(db, "employeeAttendance"),
            where("instituteId", "==", staffProfile.instituteId),
            where("employeeId", "==", staffProfile.trainerUid),
          ),
        );
        let present = 0;
        let total = 0;
        snap.forEach((item) => {
          const data = item.data();
          if (!String(data.date || "").startsWith(monthPrefix)) return;
          total += 1;
          if (String(data.status || "").toLowerCase() === "present") present += 1;
        });
        setMonthStats({ present, total });
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [staffProfile]);

  const shortcuts = useMemo(() => {
    const items = [
      {
        id: "StaffMyAttendance",
        title: "My Attendance",
        hint: "Mark & view",
        icon: ClipboardCheck,
        show: true,
      },
      {
        id: "StaffStudentAttendance",
        title: "Students Attendance",
        hint: "View & mark",
        icon: UserCheck,
        show: access?.studentAttendance,
      },
      {
        id: "StaffAddStudent",
        title: "Add Students",
        hint: "Add new students",
        icon: UserPlus,
        show: access?.addStudents,
      },
      {
        id: "StaffTimetable",
        title: "Time Table",
        hint: "View classes",
        icon: CalendarDays,
        show: access?.timetable,
      },
      {
        id: "StaffInstituteProfile",
        title: "Academy Profile",
        hint: "Edit if allowed",
        icon: Building2,
        show: access?.instituteProfile,
      },
      {
        id: "StaffDailyBill",
        title: "Daily Bill",
        hint: "Walk-in billing",
        icon: Receipt,
        show: access?.dailyBill,
      },
      {
        id: "StaffFees",
        title: "Fee Details",
        hint: "View & update fees",
        icon: IndianRupee,
        show: access?.fees,
      },
    ];
    return items.filter((item) => item.show);
  }, [access]);

  return (
    <div className="pb-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111827] rounded-3xl p-5 text-white overflow-hidden relative"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-orange-500/30 flex items-center justify-center text-2xl font-bold">
              {name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold truncate">{name}</p>
            <p className="text-sm text-white/70 truncate">
              {roleLine || staffProfile?.designation || "Academy trainer"}
            </p>
            <span className="inline-flex mt-2 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">This month</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {monthStats.present} / {monthStats.total || "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Days present</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Access</p>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {shortcuts.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Allowed pages</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-900 mt-6 mb-3">Quick access</h3>
      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="bg-white border border-gray-100 rounded-2xl p-4 text-left active:scale-[0.99] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
                <Icon size={18} />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.hint}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onOpen("StaffMyAttendance")}
        className="mt-4 w-full bg-orange-500 text-white min-h-[48px] rounded-2xl font-semibold flex items-center justify-between px-4"
      >
        Open my attendance
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default InstituteTrainerHome;
