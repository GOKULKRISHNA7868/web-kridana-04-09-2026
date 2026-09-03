import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { CalendarDays } from "lucide-react";

const InstituteStaffTimetable = ({ staffProfile }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!staffProfile?.instituteId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDocs(
          collection(db, "institutes", staffProfile.instituteId, "timetable"),
        );
        setSlots(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [staffProfile]);

  return (
    <div className="pb-8">
      <h2 className="text-xl font-bold text-gray-900">Time table</h2>
      <p className="text-sm text-gray-500 mt-1">Academy class schedule</p>
      {loading ? (
        <p className="text-sm text-gray-500 mt-6">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-gray-500 mt-6">No classes found yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white border border-gray-100 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <CalendarDays size={16} />
                <p className="font-semibold text-gray-900">
                  {slot.category || "Class"}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {slot.day || slot.date || ""} {slot.time || slot.startTime || ""}
              </p>
              {slot.subCategory ? (
                <p className="text-xs text-gray-400 mt-1">{slot.subCategory}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstituteStaffTimetable;
