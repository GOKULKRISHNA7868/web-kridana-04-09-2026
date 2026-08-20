/* FULL 400+ LINES DYNAMIC DASHBOARD CODE
   FIXES:
   - trainingMetrics undefined
   - physicalMetrics undefined
   - dynamic instituteId based on login
   - reloads empty if no data
   - no stale previous selection
   - UI unchanged
*/

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell } from "recharts";
import {
  CalendarDays,
  Activity,
  Clock,
  Star,
  Award,
  Dumbbell,
  Shield,
  Users,
  Flame,
  Zap,
  HeartPulse,
  PersonStanding,
  MessageSquareQuote,
  Accessibility,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useSelectedStudent } from "../../context/SelectedStudentContext";
/* ---------------- Donut Component ---------------- */
const ProgressRow = ({ icon, label, value, color = "text-orange-500" }) => {
  const percent = Math.min(Number(value || 0), 100);

  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`${color}`}>{icon}</div>

            <span className="text-[15px] font-medium text-gray-700">
              {label}
            </span>
          </div>

          <span className="text-sm font-semibold text-gray-800">
            {percent}%
          </span>
        </div>

        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-700"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>
      </div>

      {/* Tablet/Desktop */}

      <div className="hidden sm:flex items-center gap-4">
        <div className={`w-10 flex justify-center ${color}`}>{icon}</div>

        <div className="w-40 font-medium text-gray-700">{label}</div>

        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-700"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        <div className="w-12 text-right font-semibold">{percent}%</div>
      </div>
    </div>
  );
};
const Donut = ({ data }) => {
  return (
    <PieChart width={180} height={180} className="sm:w-[220px] sm:h-[220px]">
      <Pie
        data={data}
        innerRadius={70}
        outerRadius={90}
        dataKey="value"
        paddingAngle={2}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
};

/* ---------------- Dashboard ---------------- */

const Dashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [trainingMetrics, setTrainingMetrics] = useState(null);
  const [physicalMetrics, setPhysicalMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedStudentUid } = useSelectedStudent();
  const [events, setEvents] = useState([]);
  /* ---------------- FETCH DATA ---------------- */

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setAttendanceData([]);
        setTrainingMetrics(null);
        setPhysicalMetrics(null);

        const user = auth.currentUser;

        const studentUid = selectedStudentUid || user?.uid;

        if (!studentUid) {
          setLoading(false);
          return;
        }

        let studentSnap = await getDoc(doc(db, "trainerstudents", studentUid));

        if (!studentSnap.exists()) {
          studentSnap = await getDoc(doc(db, "students", studentUid));
        }

        if (!studentSnap.exists()) {
          setLoading(false);
          return;
        }

        if (!studentSnap.exists()) {
          setLoading(false);
          return;
        }

        const { trainerId } = studentSnap.data(); // <-- use trainerId
        if (!trainerId) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, `/trainers/${trainerId}/performancestudents`),
          where("studentId", "==", studentUid),
        );
        /* -------- FETCH TRAINER EVENTS -------- */

        const eventsQuery = query(
          collection(db, "events"),
          where("instituteId", "==", trainerId),
        );

        const eventsSnap = await getDocs(eventsQuery);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = eventsSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((event) => {
            if (!event.schedule?.endDate) return false;

            const endDate = new Date(event.schedule.endDate);
            endDate.setHours(23, 59, 59, 999);

            return endDate >= today;
          })
          .sort(
            (a, b) =>
              new Date(a.schedule.startDate) - new Date(b.schedule.startDate),
          );

        setEvents(upcomingEvents);
        const snap = await getDocs(q);

        if (snap.empty) {
          setLoading(false);
          return;
        }

        const attendanceResult = [];
        let latestTraining = null;
        let latestPhysical = null;

        snap.docs.forEach((docSnap) => {
          const docData = docSnap.data();

          if (!Array.isArray(docData.categories)) return;

          docData.categories.forEach((cat) => {
            (cat.subCategories || []).forEach((sub) => {
              let attendance = null;

              if (sub.attendance) {
                attendance = sub.attendance;
              } else if (
                Array.isArray(sub.attendanceHistory) &&
                sub.attendanceHistory.length
              ) {
                attendance =
                  sub.attendanceHistory[sub.attendanceHistory.length - 1];
              }

              if (attendance) {
                attendanceResult.push({
                  title: `${sub.name} Sessions`,
                  total: attendance.totalClasses || 0,
                  present: attendance.presentClasses || 0,
                  absent: attendance.absentClasses || 0,
                });
              }

              if (sub.metrics) {
                latestTraining = sub.metrics;
              }

              if (sub.physicalFitness) {
                latestPhysical = sub.physicalFitness;
              }
            });
          });
        });

        setAttendanceData(attendanceResult);
        setTrainingMetrics(latestTraining);
        setPhysicalMetrics(latestPhysical);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setAttendanceData([]);
        setTrainingMetrics(null);
        setPhysicalMetrics(null);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStudentUid]);

  /* ---------------- Helpers ---------------- */

  const parseScore = (val) => {
    if (!val) return 0;
    if (typeof val === "string" && val.includes("/")) {
      return Number(val.split("/")[0]) || 0;
    }
    if (typeof val === "string" && val.includes("%")) {
      return Number(val.replace("%", "")) || 0;
    }
    return Number(val) || 0;
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#F6F7FB] px-4 py-4 pb-24">
      {/* Upcoming Events */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <CalendarDays size={17} className="text-orange-500" />
          </div>

          <h2 className="font-semibold text-[16px] text-gray-800">
            Upcoming Events
          </h2>
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-6 mb-8">
        {/* Upcoming Events */}
        <div className="col-span-1 lg:h-full">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 px-2 sm:px-0">
            Upcoming Events
          </h2>

          <div className="bg-white border border-orange-400 rounded-lg p-4 h-full flex flex-col">
            <div className="divide-y divide-gray-200 overflow-y-auto flex-1">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm py-3 text-center">
                  No upcoming events
                </p>
              ) : (
                events.slice(0, 5).map((event) => (
                  <div key={event.id} className="py-3">
                    <h4 className="font-semibold">
                      {event.basicInfo?.eventName}
                    </h4>

                    <p className="text-sm text-gray-500">
                      {event.schedule?.startDate} | {event.schedule?.startTime}
                    </p>

                    <p className="text-sm text-gray-500">
                      {event.schedule?.venueName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Training Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* Header */}

          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />

              <h2 className="font-semibold text-lg">Training Progress</h2>
            </div>

            <select className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none">
              <option>This Month</option>
            </select>
          </div>

          {/* Coach Evaluation */}

          <div className="px-6 pb-3">
            <h3 className="font-bold text-xl mb-2">Coach Evaluation</h3>

            <ProgressRow
              icon={<Star size={22} />}
              label="Coach Rating"
              value={parseScore(trainingMetrics?.coach)}
              color="text-orange-500"
            />

            <ProgressRow
              icon={<Award size={22} />}
              label="Skill Progress"
              value={parseScore(trainingMetrics?.skill)}
              color="text-yellow-500"
            />

            <ProgressRow
              icon={<Dumbbell size={22} />}
              label="Fitness"
              value={parseScore(trainingMetrics?.fitness)}
              color="text-green-500"
            />

            <ProgressRow
              icon={<Shield size={22} />}
              label="Discipline"
              value={parseScore(trainingMetrics?.discipline)}
              color="text-purple-500"
            />

            <ProgressRow
              icon={<Users size={22} />}
              label="Team Work"
              value={parseScore(trainingMetrics?.team)}
              color="text-blue-500"
            />

            <ProgressRow
              icon={<Flame size={22} />}
              label="Effort"
              value={parseScore(trainingMetrics?.focus)}
              color="text-red-500"
            />
          </div>

          {/* Physical */}

          <div className="border-t px-6 py-5">
            <h3 className="font-bold text-xl mb-2">Physical Attributes</h3>

            <ProgressRow
              icon={<Activity size={22} />}
              label="Speed"
              value={parseScore(physicalMetrics?.speed?.value)}
              color="text-orange-500"
            />

            <ProgressRow
              icon={<Zap size={22} />}
              label="Agility"
              value={parseScore(physicalMetrics?.agility?.value)}
              color="text-yellow-500"
            />

            <ProgressRow
              icon={<HeartPulse size={22} />}
              label="Stamina"
              value={parseScore(physicalMetrics?.stamina?.value)}
              color="text-green-500"
            />

            <ProgressRow
              icon={<Accessibility size={22} />}
              label="Flexibility"
              value={parseScore(physicalMetrics?.flexibility?.value)}
              color="text-blue-500"
            />
          </div>

          {/* Observation */}

          <div className="p-6">
            <div className="bg-orange-50 rounded-2xl p-5">
              <div className="font-bold mb-2">Trainer Observation</div>

              <p className="text-gray-600 leading-7">
                Demonstrates consistent dedication, strong discipline, and
                steady improvement across all training sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      {/* Attendance Summary */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Clock size={17} className="text-gray-700" />
          </div>

          <h2 className="font-semibold text-[16px] text-gray-800">
            Attendance Summary
          </h2>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-5"></div>

              <div className="h-4 bg-gray-200 rounded w-40 mx-auto"></div>
            </div>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            <div className="flex flex-col items-center">
              <img
                src="https://cdn-icons-png.flaticon.com/512/3652/3652191.png"
                alt=""
                className="w-24 opacity-20 mb-5"
              />

              <p className="text-gray-400 text-sm">
                No attendance data available
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {attendanceData.map((item, index) => {
              const percentage = item.total
                ? ((item.present / item.total) * 100).toFixed(0)
                : 0;

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                >
                  {/* Header */}

                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-800">
                      {item.title}
                    </h3>

                    <span className="text-orange-500 font-bold text-lg">
                      {percentage}%
                    </span>
                  </div>

                  {/* Stats */}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Sessions</span>

                      <span className="font-semibold">{item.total}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-green-600">Present</span>

                      <span className="font-semibold text-green-600">
                        {item.present}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-red-500">Absent</span>

                      <span className="font-semibold text-red-500">
                        {item.absent}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}

                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Attendance</span>

                      <span>
                        {item.present}/{item.total}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
