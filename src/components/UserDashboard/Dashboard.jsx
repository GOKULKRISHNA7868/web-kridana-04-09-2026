import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  CalendarDays,
  Clock,
  Star,
  Medal,
  Dumbbell,
  Shield,
  Users,
  Flame,
  PersonStanding,
  Zap,
  HeartPulse,
  Activity,
  MessageSquareQuote,
  MapPin,
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
import { getDashboardGreeting } from "../../utils/dashboardGreeting";

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.03, 0.12), duration: 0.22, ease: "easeOut" },
  }),
};

const MetricBar = ({ icon, label, observation, total, color = "#f97316" }) => {
  const percent = total > 0 ? Math.min((observation / total) * 100, 100) : 0;

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {icon}
        </div>

        <div className="w-[88px] text-[13px] font-medium text-gray-700 shrink-0">
          {label}
        </div>

        <div className="flex-1 min-w-0">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{ background: color }}
            />
          </div>
        </div>

        <div className="text-[13px] font-semibold w-10 text-right text-gray-800">
          {Math.round(percent)}%
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [trainingMetrics, setTrainingMetrics] = useState(null);
  const [physicalMetrics, setPhysicalMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [role, setRole] = useState("student");
  const { selectedStudentUid } = useSelectedStudent();
  const [trainingObservations, setTrainingObservations] = useState(null);
  const [metricObservations, setMetricObservations] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  const userName =
    students.find((s) => s.id === selectedStudentUid)?.studentName ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Student";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setAttendanceData([]);
        setTrainingMetrics(null);
        setPhysicalMetrics(null);

        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        let targetStudentId = selectedStudentUid || user.uid;

        const studentRef = doc(db, "students", targetStudentId);
        const studentSnap = await getDoc(studentRef);

        let instituteId = null;

        if (studentSnap.exists()) {
          setRole("student");
          const studentData = studentSnap.data();
          instituteId = studentData.instituteId;
        } else {
          setRole("family");

          const familyRef = doc(db, "families", user.uid);
          const familySnap = await getDoc(familyRef);

          if (!familySnap.exists()) {
            setLoading(false);
            return;
          }

          const familyData = familySnap.data();
          const studentIds = familyData.students || [];

          if (studentIds.length === 0) {
            setLoading(false);
            return;
          }

          const studentDocs = await Promise.all(
            studentIds.map((id) => getDoc(doc(db, "students", id))),
          );

          const studentList = studentDocs
            .filter((s) => s.exists())
            .map((s) => ({ id: s.id, ...s.data() }));

          setStudents(studentList);

          const selected = studentList.find((s) => s.id === selectedStudentUid);

          targetStudentId = selected?.id || studentList[0].id;
          instituteId = selected?.instituteId || studentList[0].instituteId;
        }

        if (!targetStudentId || !instituteId) {
          setLoading(false);
          return;
        }

        const eventsQuery = query(
          collection(db, "events"),
          where("basicInfo.instituteId", "==", instituteId),
        );

        const eventsSnap = await getDocs(eventsQuery);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = eventsSnap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((event) => {
            if (event.basicInfo?.instituteId !== instituteId) return false;

            const endDate = event.schedule?.endDate;
            if (!endDate) return false;

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            return end >= today;
          })
          .sort((a, b) => {
            const aDate = new Date(a.schedule?.startDate || 0);
            const bDate = new Date(b.schedule?.startDate || 0);
            return aDate - bDate;
          });

        setEvents(upcomingEvents);

        const q = query(
          collection(db, `institutes/${instituteId}/performancestudents`),
          where("studentId", "==", targetStudentId),
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setAttendanceData([]);
          setTrainingMetrics(null);
          setPhysicalMetrics(null);
          setAvailableMonths([]);
          setLoading(false);
          return;
        }

        const sortedDocs = [...snap.docs].sort(
          (a, b) =>
            (b.data().createdAt?.seconds || 0) -
            (a.data().createdAt?.seconds || 0),
        );

        const months = [
          ...new Set(
            sortedDocs
              .map((d) => d.data().month)
              .filter(Boolean),
          ),
        ];
        setAvailableMonths(months);

        let selectedDoc = sortedDocs[0].data();
        if (selectedMonth) {
          const match = sortedDocs.find(
            (d) => d.data().month === selectedMonth,
          );
          if (match) selectedDoc = match.data();
        } else if (months.length > 0) {
          setSelectedMonth(months[0]);
          const match = sortedDocs.find((d) => d.data().month === months[0]);
          if (match) selectedDoc = match.data();
        }

        const attendanceResult = [];
        let training = null;
        let physical = null;
        let observations = null;
        let trainerNote = null;

        if (selectedDoc.categories) {
          selectedDoc.categories.forEach((cat) => {
            (cat.subCategories || []).forEach((sub) => {
              if (sub.metrics && !training) {
                training = sub.metrics;
              }

              if (sub.metricObservations && !observations) {
                observations = sub.metricObservations;
              }

              if (sub.physicalFitness && !physical) {
                physical = sub.physicalFitness;
              }

              if (sub.trainerObservation && !trainerNote) {
                trainerNote = sub.trainerObservation;
              }

              if (sub.attendance) {
                attendanceResult.push({
                  title: `${cat.category} - ${sub.name}`,
                  total: Number(sub.attendance.totalClasses || 0),
                  present: Number(sub.attendance.presentClasses || 0),
                  absent: Number(sub.attendance.absentClasses || 0),
                  percent: sub.attendance.percent || "0%",
                });
              }
            });
          });
        }

        setAttendanceData(attendanceResult);
        setTrainingMetrics(training);
        setPhysicalMetrics(physical);
        setMetricObservations(observations);
        setTrainingObservations(trainerNote);
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
  }, [selectedStudentUid, selectedMonth]);

  useEffect(() => {
    setAttendanceData([]);
    setTrainingMetrics(null);
    setPhysicalMetrics(null);
    setEvents([]);
    setSelectedMonth("");
    setAvailableMonths([]);
  }, [selectedStudentUid]);

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

  return (
    <div
      className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
    >
      <div className="pb-6 space-y-4">
        {/* Welcome */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-2xl bg-gradient-to-br from-[#FF6A00] via-[#FF7A1A] to-[#FF8F3C] p-5 shadow-[0_10px_28px_rgba(255,106,0,0.28)] relative overflow-hidden"
        >
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/15" />
          <div className="absolute right-10 -bottom-10 w-24 h-24 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-orange-100 text-xs font-medium tracking-wide">
                {getDashboardGreeting()}
              </p>
              <h2 className="text-white text-xl sm:text-2xl font-bold mt-1 truncate">
                {userName}
              </h2>
              <p className="text-orange-50/90 mt-2 text-sm">
                Keep training strong — your progress is here.
              </p>
            </div>

            <div className="w-11 h-11 rounded-2xl bg-white shadow-md flex items-center justify-center flex-shrink-0">
              <Award size={22} className="text-[#FF6A00]" />
            </div>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.section
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={18} className="text-[#FF6A00]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-[15px]">
                  Upcoming Events
                </h3>
                <p className="text-xs text-gray-500">
                  {events.length}{" "}
                  {events.length === 1 ? "event coming up" : "events coming up"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            {events.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {events.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={event.id}
                    custom={index}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="rounded-xl border border-gray-100 bg-[#FAFBFC] px-3.5 py-3 active:scale-[0.99] transition"
                  >
                    <p className="font-semibold text-sm text-gray-900 line-clamp-1">
                      {event.basicInfo?.eventName || "Event"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {event.schedule?.startDate || "—"}
                        {event.schedule?.startTime
                          ? ` · ${event.schedule.startTime}`
                          : ""}
                      </span>
                      {event.schedule?.venueName ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {event.schedule.venueName}
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Training Progress */}
        <motion.section
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <Activity size={18} className="text-[#FF6A00] flex-shrink-0" />
              <h2 className="font-semibold text-gray-900 text-[15px] truncate">
                Training Progress
              </h2>
            </div>

            {availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs sm:text-sm border border-gray-200 rounded-xl px-2.5 py-2 bg-gray-50 text-gray-700 max-w-[46%] outline-none focus:ring-2 focus:ring-orange-200"
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(`${month}-01`).toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!trainingMetrics ? (
            <div className="py-12 px-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Activity size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No training data available</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Coach Evaluation
                </h3>

                <MetricBar
                  icon={<Star size={16} />}
                  label="Coach Rating"
                  observation={parseScore(metricObservations?.coach)}
                  total={parseScore(trainingMetrics?.coach)}
                  color="#ff6b00"
                />
                <MetricBar
                  icon={<Medal size={16} />}
                  label="Skill Progress"
                  observation={parseScore(metricObservations?.skill)}
                  total={parseScore(trainingMetrics?.skill)}
                  color="#ff9800"
                />
                <MetricBar
                  icon={<Dumbbell size={16} />}
                  label="Fitness"
                  observation={parseScore(metricObservations?.fitness)}
                  total={parseScore(trainingMetrics?.fitness)}
                  color="#22c55e"
                />
                <MetricBar
                  icon={<Shield size={16} />}
                  label="Discipline"
                  observation={parseScore(metricObservations?.discipline)}
                  total={parseScore(trainingMetrics?.discipline)}
                  color="#7c3aed"
                />
                <MetricBar
                  icon={<Users size={16} />}
                  label="Team Work"
                  observation={parseScore(metricObservations?.team)}
                  total={parseScore(trainingMetrics?.team)}
                  color="#2563eb"
                />
                <MetricBar
                  icon={<Flame size={16} />}
                  label="Effort"
                  observation={parseScore(metricObservations?.focus)}
                  total={parseScore(trainingMetrics?.focus)}
                  color="#ef4444"
                />
              </div>

              {physicalMetrics && (
                <div className="px-4 py-3 border-t border-gray-50">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    Physical Attributes
                  </h3>

                  <MetricBar
                    icon={<PersonStanding size={16} />}
                    label="Speed"
                    observation={parseScore(
                      physicalMetrics?.speed?.observation,
                    )}
                    total={parseScore(physicalMetrics?.speed?.value)}
                    color="#ff6b00"
                  />
                  <MetricBar
                    icon={<Zap size={16} />}
                    label="Agility"
                    observation={parseScore(
                      physicalMetrics?.agility?.observation,
                    )}
                    total={parseScore(physicalMetrics?.agility?.value)}
                    color="#f59e0b"
                  />
                  <MetricBar
                    icon={<HeartPulse size={16} />}
                    label="Stamina"
                    observation={parseScore(
                      physicalMetrics?.stamina?.observation,
                    )}
                    total={parseScore(physicalMetrics?.stamina?.value)}
                    color="#22c55e"
                  />
                  <MetricBar
                    icon={<Activity size={16} />}
                    label="Flexibility"
                    observation={parseScore(
                      physicalMetrics?.flexibility?.observation,
                    )}
                    total={parseScore(physicalMetrics?.flexibility?.value)}
                    color="#2563eb"
                  />
                </div>
              )}

              <div className="p-4 border-t border-gray-50">
                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareQuote size={16} className="text-[#FF6A00]" />
                    <h4 className="font-semibold text-sm text-gray-900">
                      Trainer Observation
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-6">
                    {trainingObservations ||
                      "Demonstrates consistent dedication, strong discipline, and steady improvement across all training sessions."}
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.section>

        {/* Attendance */}
        <motion.section
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-50">
            <Clock size={18} className="text-gray-600" />
            <h2 className="font-semibold text-gray-900 text-[15px]">
              Attendance Summary
            </h2>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center py-10">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-[#FF6A00]" />
                <p className="text-gray-400 text-sm mt-4">
                  Loading attendance...
                </p>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <CalendarDays size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  No attendance data available
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceData.map((item, index) => {
                  const percentage = item.total
                    ? Math.round((item.present / item.total) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={`${item.title}-${index}`}
                      custom={index}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4"
                    >
                      <div className="flex justify-between items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {item.title}
                        </h3>
                        <span className="text-[#FF6A00] font-bold text-sm flex-shrink-0">
                          {percentage}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 mt-4">
                        <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                          <p className="text-[11px] text-gray-500">Total</p>
                          <p className="font-bold text-gray-800 mt-1">
                            {item.total}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                          <p className="text-[11px] text-gray-500">Present</p>
                          <p className="font-bold text-green-600 mt-1">
                            {item.present}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                          <p className="text-[11px] text-gray-500">Absent</p>
                          <p className="font-bold text-red-500 mt-1">
                            {item.absent}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] text-gray-500 mb-2">
                          <span>Attendance rate</span>
                          <span>
                            {item.present}/{item.total}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[#FF6A00]"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;
