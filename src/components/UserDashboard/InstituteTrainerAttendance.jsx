import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { CalendarDays, Check, X } from "lucide-react";

const InstituteTrainerAttendance = ({ staffProfile }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const load = async () => {
      if (!staffProfile?.instituteId || !staffProfile?.trainerUid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, "employeeAttendance"),
            where("instituteId", "==", staffProfile.instituteId),
            where("employeeId", "==", staffProfile.trainerUid),
          ),
        );
        setRecords(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [staffProfile]);

  const monthRecords = useMemo(
    () => records.filter((item) => String(item.date || "").startsWith(month)),
    [records, month],
  );

  const present = monthRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "present",
  ).length;
  const absent = monthRecords.filter(
    (item) => String(item.status || "").toLowerCase() === "absent",
  ).length;
  const percent = monthRecords.length
    ? Math.round((present / monthRecords.length) * 100)
    : 0;

  return (
    <div className="pb-8">
      <h2 className="text-xl font-bold text-gray-900">My attendance</h2>
      <p className="text-sm text-gray-500 mt-1">
        Shown as marked by your academy
      </p>

      <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4">
        <label className="text-xs font-semibold text-gray-500">Month</label>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="mt-2 w-full min-h-[44px] border border-gray-200 rounded-xl px-3"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-xs text-emerald-700">Present</p>
          <p className="text-xl font-bold text-emerald-800">{present}</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-3 text-center">
          <p className="text-xs text-red-600">Absent</p>
          <p className="text-xl font-bold text-red-600">{absent}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Percent</p>
          <p className="text-xl font-bold text-orange-600">{percent}%</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 mt-6">Loading attendance...</p>
      ) : monthRecords.length === 0 ? (
        <p className="text-sm text-gray-500 mt-6">
          No attendance marked for this month yet.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {monthRecords
            .slice()
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .map((item) => {
              const presentDay =
                String(item.status || "").toLowerCase() === "present";
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {item.date}
                      </p>
                      {item.reason ? (
                        <p className="text-xs text-gray-400">{item.reason}</p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      presentDay
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {presentDay ? <Check size={12} /> : <X size={12} />}
                    {presentDay ? "Present" : "Absent"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default InstituteTrainerAttendance;
