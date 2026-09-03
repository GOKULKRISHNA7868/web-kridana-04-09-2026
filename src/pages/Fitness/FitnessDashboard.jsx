import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Footprints,
  Bell,
  Target,
  TrendingUp,
  Flame,
  MapPinned,
  Clock3,
  Activity,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  DEFAULT_GOAL,
  dateKeysBetween,
  formatDuration,
  localDateKey,
  resolveWalkingUser,
} from "./walkingIdentity";
import {
  requestWalkNotificationPermission,
  scheduleDailyWalkReminder,
} from "./walkingNotifications";
import {
  activityPermissionUI,
  notificationPermissionUI,
  readWalkPermissions,
  requestWalkPermissions,
  toneClasses,
} from "./walkingPermissions";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

const GOAL_OPTIONS = [5000, 8000, 10000, 12000, 15000];

export default function WalkDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [walker, setWalker] = useState(null);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalType, setGoalType] = useState("daily");
  const [todayData, setTodayData] = useState({
    steps: 0,
    distance: 0,
    calories: 0,
    duration: 0,
    completed: false,
  });
  const [dailyRows, setDailyRows] = useState([]);
  const [filter, setFilter] = useState("week");
  const [showNotices, setShowNotices] = useState(false);
  const [permission, setPermission] = useState({
    activity: "unknown",
    notifications: "unknown",
    sensor: "none",
  });
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionFeedback, setPermissionFeedback] = useState("");

  const todayKey = useMemo(() => localDateKey(), []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const identity = await resolveWalkingUser();
      if (!identity) {
        setLoading(false);
        navigate("/login?role=user", { replace: true });
        return;
      }
      if (cancelled) return;

      setWalker(identity);
      await Promise.all([
        loadGoal(identity),
        loadHistory(identity),
        refreshPermissions(),
      ]);
      if (!cancelled) setLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!permissionFeedback) return;
    const timer = setTimeout(() => setPermissionFeedback(""), 4000);
    return () => clearTimeout(timer);
  }, [permissionFeedback]);

  async function refreshPermissions() {
    const next = await readWalkPermissions();
    setPermission(next);
    if (next.notifications === "granted") {
      await scheduleDailyWalkReminder(19);
    }
    return next;
  }

  async function handleEnablePermissions() {
    if (permissionBusy) return;
    setPermissionBusy(true);
    setPermissionFeedback("");
    try {
      const result = await requestWalkPermissions();
      setPermission(result);
      if (result.notifications === "granted") {
        await scheduleDailyWalkReminder(19);
      }
      setPermissionFeedback(result.message || "Permission settings updated.");
    } catch {
      setPermissionFeedback("Something went wrong. Please try again.");
    } finally {
      setPermissionBusy(false);
    }
  }

  async function loadGoal(identity) {
    const ref = doc(db, "walking", identity.uid);
    const snap = await getDoc(ref);
    const legacy = snap.exists()
      ? null
      : await getDoc(doc(db, "walkingGoals", identity.uid));
    const data = snap.exists() ? snap.data() : legacy?.data() || {};
    const nextGoal = Number(data.currentGoal || DEFAULT_GOAL);
    const nextType = data.goalType || "daily";

    setGoal(nextGoal);
    setGoalType(nextType);

    await setDoc(
      ref,
      {
        uid: identity.uid,
        role: identity.role,
        displayName: identity.displayName,
        email: identity.email,
        source: identity.source,
        currentGoal: nextGoal,
        goalType: nextType,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function readDailyMap(uid) {
    const map = new Map();

    const legacySnap = await getDocs(
      collection(db, "walkingReports", uid, "daily"),
    );
    legacySnap.forEach((item) => {
      map.set(item.id, { id: item.id, ...item.data() });
    });

    const primarySnap = await getDocs(collection(db, "walking", uid, "daily"));
    primarySnap.forEach((item) => {
      map.set(item.id, { id: item.id, ...item.data() });
    });

    return map;
  }

  async function loadHistory(identity) {
    const map = await readDailyMap(identity.uid);
    const today = map.get(todayKey);

    setTodayData({
      steps: Number(today?.steps || 0),
      distance: Number(today?.distance || 0),
      calories: Number(today?.calories || 0),
      duration: Number(today?.duration || 0),
      completed: Boolean(today?.completed),
    });

    const rows = Array.from(map.values()).sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    );
    setDailyRows(rows);
  }

  async function persistGoal(nextGoal, nextType) {
    if (!walker?.uid) return;
    await setDoc(
      doc(db, "walking", walker.uid),
      {
        uid: walker.uid,
        role: walker.role,
        currentGoal: Number(nextGoal),
        goalType: nextType,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function updateGoal(value) {
    const next = Number(value);
    setGoal(next);
    await persistGoal(next, goalType);
  }

  async function updateGoalType(value) {
    setGoalType(value);
    await persistGoal(goal, value);
  }

  const chartItems = useMemo(() => {
    const now = new Date();
    const byId = new Map(dailyRows.map((row) => [row.id, row]));

    if (filter === "year") {
      return Array.from({ length: 12 }, (_, index) => {
        const month = `${now.getFullYear()}-${String(index + 1).padStart(2, "0")}`;
        const steps = dailyRows
          .filter((row) => String(row.id).startsWith(month))
          .reduce((sum, row) => sum + Number(row.steps || 0), 0);
        return {
          id: month,
          label: new Date(now.getFullYear(), index, 1).toLocaleString("en", {
            month: "short",
          }),
          steps,
        };
      });
    }

    const start = new Date(now);
    if (filter === "month") start.setDate(1);
    else start.setDate(now.getDate() - 6);

    return dateKeysBetween(start, now).map((key) => {
      const row = byId.get(key);
      const date = new Date(`${key}T00:00:00`);
      return {
        id: key,
        label: date.toLocaleDateString("en", {
          ...(filter === "month"
            ? { day: "numeric" }
            : { weekday: "short" }),
        }),
        steps: Number(row?.steps || 0),
      };
    });
  }, [dailyRows, filter]);

  const periodSteps = chartItems.reduce(
    (sum, item) => sum + Number(item.steps || 0),
    0,
  );

  const progressTarget =
    goalType === "weekly" || goalType === "monthly" ? Math.max(periodSteps, 1) : todayData.steps;
  const progressGoal =
    goalType === "weekly" ? goal * 7 : goalType === "monthly" ? goal * 30 : goal;
  const progress = Math.min((progressTarget / Math.max(progressGoal, 1)) * 100, 100);

  const maxBar = Math.max(goal, ...chartItems.map((item) => item.steps), 1);
  const bottomNavPad = "var(--bottom-navbar-height, 64px)";

  const activityUI = useMemo(
    () => activityPermissionUI(permission.activity),
    [permission.activity],
  );
  const notificationsUI = useMemo(
    () => notificationPermissionUI(permission.notifications),
    [permission.notifications],
  );
  const needsActivityAccess =
    Capacitor.isNativePlatform() && permission.activity !== "granted";

  const startWalk = () => navigate("/Fitness/ActiveWalk");

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
      <div
        className="sticky top-0 z-20 bg-white px-5 pb-4 shadow-sm"
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Footprints size={24} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                Hello, {walker?.displayName || "there"}
              </h1>
              <p className="text-gray-500 text-sm capitalize truncate">
                {walker?.role || "user"} walk log
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNotices(true)}
            className="relative w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0"
          >
            <Bell size={20} className="text-gray-700" />
            {needsActivityAccess ? (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-orange-500" />
            ) : null}
          </button>
        </div>
      </div>

      <div
        className="px-5 pt-5 pb-[calc(var(--bottom-navbar-height,64px)+88px)] md:!pb-10"
      >
        {Capacitor.isNativePlatform() ? (
          permission.activity === "granted" ? (
            <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">
                  Step counting enabled
                </p>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Physical activity access is allowed on this device.
                </p>
              </div>
            </div>
          ) : (
            <PermissionStatusCard
              ui={activityUI}
              busy={permissionBusy}
              onEnable={handleEnablePermissions}
              compact
            />
          )
        ) : (
          <PermissionStatusCard
            ui={activityUI}
            busy={permissionBusy}
            onEnable={handleEnablePermissions}
            compact
          />
        )}

        {permissionFeedback ? (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
              permission.activity === "granted"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : permission.activity === "denied"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            {permissionFeedback}
          </div>
        ) : null}

        <div className="rounded-[30px] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-6 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Footprints size={22} />
                <span className="font-medium">Today's steps</span>
              </div>
              <h2 className="text-5xl font-black mt-5 tracking-tight">
                {todayData.steps.toLocaleString()}
              </h2>
              <p className="opacity-90 mt-2">
                Goal {goal.toLocaleString()} · {goalType}
              </p>
            </div>
            <div className="w-20 h-20 rounded-full border-[6px] border-white/80 flex items-center justify-center">
              <Activity size={32} />
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-sm mb-2">
              <span>{Math.round(progress)}%</span>
              <span>
                {Number(progressTarget).toLocaleString()} / {progressGoal.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 mt-8 border-t border-white/20 pt-5">
            <div>
              <p className="text-2xl font-bold">
                {Number(todayData.distance || 0).toFixed(2)}
              </p>
              <p className="text-sm opacity-90">KM</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{todayData.calories || 0}</p>
              <p className="text-sm opacity-90">Calories</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatDuration(todayData.duration || 0)}
              </p>
              <p className="text-sm opacity-90">Active</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={startWalk}
          className="hidden md:block w-full mt-6 rounded-2xl bg-black text-white py-4 text-lg font-bold active:scale-95 transition"
        >
          Start walking
        </button>

        <div className="bg-white rounded-3xl mt-6 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Target size={22} className="text-orange-500" />
            <h2 className="font-bold text-lg">Walking goal</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={goal}
              onChange={(e) => updateGoal(e.target.value)}
              className="rounded-xl border p-3 outline-none bg-white"
            >
              {GOAL_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.toLocaleString()} steps
                </option>
              ))}
            </select>
            <select
              value={goalType}
              onChange={(e) => updateGoalType(e.target.value)}
              className="rounded-xl border p-3 outline-none bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="mt-5 bg-orange-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Reports are saved under your login ID
              {walker?.uid ? ` (${walker.uid.slice(0, 8)}…)` : ""}. Calories, distance and
              time are added only when you walk.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 mt-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={22} className="text-orange-500" />
              <h2 className="font-bold text-lg">Steps trend</h2>
            </div>
            <div className="flex rounded-xl overflow-hidden border">
              {["week", "month", "year"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`px-3 py-2 text-sm capitalize ${
                    filter === item
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between h-48 gap-1 overflow-x-auto">
            {chartItems.every((item) => item.steps === 0) ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No walking data yet
              </div>
            ) : (
              chartItems.map((item, index) => {
                const height = Math.max((item.steps / maxBar) * 170, item.steps > 0 ? 10 : 4);
                return (
                  <div key={item.id} className="flex flex-col items-center min-w-[28px] flex-1">
                    <span className="text-[10px] text-gray-500 mb-2">
                      {item.steps ? item.steps : ""}
                    </span>
                    <div
                      className={`w-full max-w-7 rounded-t-xl ${
                        index === chartItems.length - 1
                          ? "bg-orange-500"
                          : "bg-orange-200"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                    <span className="mt-2 text-[10px] text-gray-400">{item.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-xl mb-4">Today's activity</h2>
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              icon={Footprints}
              color="text-green-600"
              bg="bg-green-50"
              value={todayData.steps.toLocaleString()}
              label="Steps"
            />
            <SummaryCard
              icon={MapPinned}
              color="text-blue-600"
              bg="bg-blue-50"
              value={Number(todayData.distance || 0).toFixed(2)}
              label="KM"
            />
            <SummaryCard
              icon={Flame}
              color="text-orange-500"
              bg="bg-orange-50"
              value={todayData.calories || 0}
              label="Calories"
            />
            <SummaryCard
              icon={Clock3}
              color="text-purple-600"
              bg="bg-purple-50"
              value={formatDuration(todayData.duration || 0)}
              label="Active time"
            />
          </div>
        </div>
      </div>

      <div
        className="md:hidden fixed inset-x-0 z-[9990] px-4 pt-3 bg-gradient-to-t from-[#F7F8FC] via-[#F7F8FC]/95 to-transparent"
        style={{ bottom: bottomNavPad }}
      >
        <button
          type="button"
          onClick={startWalk}
          className="w-full rounded-2xl bg-black text-white py-3.5 text-base font-bold shadow-lg active:scale-95 transition"
        >
          Start walking
        </button>
      </div>

      {showNotices ? (
        <div
          className="fixed inset-0 z-[10050] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowNotices(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] overflow-y-auto"
            style={{
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="text-orange-500 shrink-0" size={20} />
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900">Walk permissions</h3>
                  <p className="text-xs text-gray-500 truncate">
                    Required for accurate step counting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotices(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <PermissionStatusCard
                ui={activityUI}
                busy={permissionBusy}
                onEnable={handleEnablePermissions}
              />
              <PermissionStatusCard
                ui={notificationsUI}
                busy={permissionBusy}
                onEnable={handleEnablePermissions}
              />

              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-xs font-semibold text-gray-700">Step sensor</p>
                <p className="text-sm text-gray-600 mt-1 capitalize">
                  {permission.sensor === "none"
                    ? "Motion fallback (phone movement)"
                    : String(permission.sensor).replace(/_/g, " ")}
                </p>
              </div>

              {permissionFeedback ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                    permission.activity === "granted" &&
                    permission.notifications === "granted"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : permission.activity === "denied" ||
                          permission.notifications === "denied"
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  {permissionFeedback}
                </div>
              ) : null}

              <p className="text-xs text-gray-500 leading-relaxed px-1">
                Live walk notice, halfway and goal alerts, plus a daily reminder at
                7:00 PM when notifications are allowed.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, color, bg, value, label }) {
  return (
    <div className={`${bg} rounded-2xl p-5`}>
      <Icon className={`${color} mb-3`} size={24} />
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      <p className="text-gray-500">{label}</p>
    </div>
  );
}

function PermissionStatusCard({ ui, busy, onEnable, compact = false }) {
  const tone = toneClasses(ui.tone);
  const granted = ui.status === "granted";
  const denied = ui.status === "denied";

  const StatusIcon =
    granted ? CheckCircle2 : denied ? AlertCircle : Info;

  return (
    <div className={`rounded-2xl border p-4 ${tone.card}`}>
      <div className="flex items-start gap-3">
        <StatusIcon size={20} className={`shrink-0 mt-0.5 ${tone.icon}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm sm:text-base">
              {ui.title}
            </p>
            <span
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${tone.badge}`}
            >
              {ui.label}
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed ${
              compact ? "line-clamp-2 sm:line-clamp-none" : ""
            }`}
          >
            {ui.description}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!ui.canEnable || busy || granted}
        onClick={onEnable}
        className={`w-full mt-3 min-h-[48px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.99] ${
          granted
            ? "bg-emerald-600/90 text-white cursor-default opacity-95"
            : ui.canEnable
              ? denied
                ? "bg-white border border-red-200 text-red-700"
                : "bg-[#FF6A00] text-white shadow-sm"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
        } disabled:opacity-70`}
      >
        {busy && ui.canEnable ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Checking…
          </>
        ) : granted ? (
          <>
            <CheckCircle2 size={16} />
            {ui.buttonLabel}
          </>
        ) : (
          ui.buttonLabel
        )}
      </button>
    </div>
  );
}
