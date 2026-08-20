// src/pages/FitnessDashboard.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Menu,
  Bell,
  Footprints,
  Flame,
  Timer,
  MapPin,
  Trophy,
  ChevronRight,
  TrendingUp,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
} from "recharts";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDashboardGreeting } from "../../utils/dashboardGreeting";

const DAILY_GOAL = 10000;
const STEP_LENGTH = 0.72;
const CALORIES_PER_STEP = 0.04;
const STEPS_PER_MINUTE = 110;

const weekNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const gradient = "bg-gradient-to-r from-[#ff7a00] via-[#ff6b00] to-[#ff7a00]";

const summaryCard =
  "rounded-3xl bg-white shadow-lg border border-orange-50 p-4";

function formatDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getWeekDates() {
  const today = new Date();
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    result.push({
      date: d.toISOString().split("T")[0],
      day: weekNames[(d.getDay() + 6) % 7],
    });
  }

  return result;
}

function calculateDistance(steps) {
  return Number(((steps * STEP_LENGTH) / 1000).toFixed(1));
}

function calculateCalories(steps) {
  return Math.round(steps * CALORIES_PER_STEP);
}

function calculateMinutes(steps) {
  return Math.round(steps / STEPS_PER_MINUTE);
}

function minutesToText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h}h ${m}m`;
}

function calculateProgress(steps) {
  return Math.min(100, Math.round((steps / DAILY_GOAL) * 100));
}

function comparePercent(today, yesterday) {
  if (!yesterday) return 0;

  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function FitnessDashboard() {
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  const [userName, setUserName] = useState("");

  const [todaySteps, setTodaySteps] = useState(0);

  const [goal, setGoal] = useState(DAILY_GOAL);

  const [distance, setDistance] = useState(0);

  const [calories, setCalories] = useState(0);

  const [activeMinutes, setActiveMinutes] = useState(0);

  const [progress, setProgress] = useState(0);

  const [todayDate] = useState(formatDate());

  const [history, setHistory] = useState([]);

  const [chartData, setChartData] = useState([]);

  const [achievements, setAchievements] = useState({
    streak: 0,
    bestSteps: 0,
    badges: [],
  });

  const [comparison, setComparison] = useState({
    steps: 0,
    distance: 0,
    calories: 0,
    active: 0,
  });

  const fitnessRef = useMemo(() => {
    if (!user) return null;

    return doc(db, "fitness", user.uid);
  }, [user]);

  const historyCollection = useMemo(() => {
    if (!user) return null;

    return collection(db, "fitness", user.uid, "history");
  }, [user]);

  const achievementRef = useMemo(() => {
    if (!user) return null;

    return doc(db, "fitness", user.uid, "achievements", "data");
  }, [user]);

  const loadUserProfile = useCallback(async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        const data = snap.data();

        setUserName(data.name || "User");
      }
    } catch (e) {
      console.log(e);
    }
  }, []);

  const createTodayDocument = useCallback(async () => {
    if (!fitnessRef) return;

    const snap = await getDoc(fitnessRef);

    if (snap.exists()) return;

    await setDoc(fitnessRef, {
      today: {
        date: todayDate,
        steps: 0,
        goal: DAILY_GOAL,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [fitnessRef, todayDate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      await loadUserProfile(currentUser.uid);

      setLoading(false);
    });

    return unsubscribe;
  }, [loadUserProfile]);

  useEffect(() => {
    if (!user) return;

    createTodayDocument();
  }, [user, createTodayDocument]);

  useEffect(() => {
    if (!fitnessRef) return;

    const unsubscribe = onSnapshot(fitnessRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      const today = data.today || {};

      const steps = Number(today.steps || 0);

      const goalValue = Number(today.goal || DAILY_GOAL);

      setGoal(goalValue);

      setTodaySteps(steps);

      setDistance(calculateDistance(steps));

      setCalories(calculateCalories(steps));

      setActiveMinutes(calculateMinutes(steps));

      setProgress(Math.round((steps / goalValue) * 100));
    });

    return unsubscribe;
  }, [fitnessRef]);

  useEffect(() => {
    if (!historyCollection) return;

    const unsubscribe = onSnapshot(historyCollection, (snapshot) => {
      const records = [];

      snapshot.forEach((docSnap) => {
        records.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      records.sort((a, b) => a.date.localeCompare(b.date));

      setHistory(records);

      const week = getWeekDates();

      const chart = week.map((day) => {
        const found = records.find((r) => r.date === day.date);

        return {
          day: day.day,
          date: day.date,
          steps: found ? Number(found.steps || 0) : 0,
        };
      });

      setChartData(chart);

      if (chart.length >= 2) {
        const todayValue = chart[6].steps;
        const yesterdayValue = chart[5].steps;

        setComparison({
          steps: comparePercent(todayValue, yesterdayValue),
          distance: comparePercent(
            calculateDistance(todayValue),
            calculateDistance(yesterdayValue),
          ),
          calories: comparePercent(
            calculateCalories(todayValue),
            calculateCalories(yesterdayValue),
          ),
          active: comparePercent(
            calculateMinutes(todayValue),
            calculateMinutes(yesterdayValue),
          ),
        });
      }
    });

    return unsubscribe;
  }, [historyCollection]);

  useEffect(() => {
    if (!achievementRef) return;

    const unsubscribe = onSnapshot(achievementRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAchievements({
          streak: 0,
          bestSteps: 0,
          badges: [],
        });

        return;
      }

      const data = snapshot.data();

      setAchievements({
        streak: Number(data.streak || 0),
        bestSteps: Number(data.bestSteps || 0),
        badges: data.badges || [],
      });
    });

    return unsubscribe;
  }, [achievementRef]);

  const updateTodaySteps = useCallback(
    async (steps) => {
      if (!fitnessRef || !historyCollection) return;

      const value = Math.max(0, Number(steps));

      await updateDoc(fitnessRef, {
        "today.steps": value,
        "today.goal": goal,
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(historyCollection, todayDate),
        {
          date: todayDate,
          steps: value,
          distance: calculateDistance(value),
          calories: calculateCalories(value),
          activeMinutes: calculateMinutes(value),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [fitnessRef, historyCollection, todayDate, goal],
  );

  const updateGoal = useCallback(
    async (newGoal) => {
      if (!fitnessRef) return;

      await updateDoc(fitnessRef, {
        "today.goal": Number(newGoal),
        updatedAt: serverTimestamp(),
      });
    },
    [fitnessRef],
  );

  const calculateStreak = useCallback(() => {
    if (history.length === 0) return 0;

    let streak = 0;

    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

    for (const item of sorted) {
      if ((item.steps || 0) >= goal) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [history, goal]);

  useEffect(() => {
    if (!achievementRef) return;

    const streak = calculateStreak();

    const bestSteps =
      history.length > 0
        ? Math.max(...history.map((x) => Number(x.steps || 0)))
        : todaySteps;

    const badges = [];

    if (bestSteps >= 5000)
      badges.push({
        title: "5K Steps",
        icon: "👟",
      });

    if (bestSteps >= 10000)
      badges.push({
        title: "10K Champion",
        icon: "🏆",
      });

    if (streak >= 7)
      badges.push({
        title: "7 Day Streak",
        icon: "🔥",
      });

    if (calculateCalories(todaySteps) >= 250)
      badges.push({
        title: "250 Calories",
        icon: "🔥",
      });

    setDoc(
      achievementRef,
      {
        streak,
        bestSteps,
        badges,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, [achievementRef, history, todaySteps, goal, calculateStreak]);

  const stats = useMemo(() => {
    return {
      steps: todaySteps,
      distance,
      calories,
      activeMinutes,
      activeText: minutesToText(activeMinutes),
      progress,
      remaining: Math.max(goal - todaySteps, 0),
    };
  }, [todaySteps, distance, calories, activeMinutes, progress, goal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-32">
      {/* Header */}
      <div className="px-5 pt-6">
        <div className="mt-6">
          <p className="text-gray-500 text-sm font-medium">
            {getDashboardGreeting()}
          </p>

          <h1 className="text-3xl font-bold text-gray-900 mt-1">{userName}</h1>
        </div>
      </div>

      {/* Main Steps Card */}
      <div className="px-5 mt-6">
        <div
          className={`${gradient} rounded-[34px] p-6 shadow-xl text-white overflow-hidden relative`}
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Today's Steps</p>

                <h2 className="text-5xl font-extrabold mt-2">
                  {stats.steps.toLocaleString()}
                </h2>

                <p className="text-white/90 mt-2">
                  Goal {goal.toLocaleString()} steps
                </p>
              </div>

              {/* Progress Circle */}
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="10"
                  />

                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={314}
                    strokeDashoffset={314 - (314 * progress) / 100}
                    transform="rotate(-90 60 60)"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{progress}%</span>

                  <span className="text-xs text-white/80">Complete</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs mt-2 text-white/90">
                <span>{stats.steps.toLocaleString()} Steps</span>

                <span>{stats.remaining.toLocaleString()} Remaining</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-7">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span className="text-xs">Distance</span>
                </div>

                <h4 className="font-bold text-lg mt-2">{stats.distance}</h4>

                <p className="text-xs text-white/80">KM Walked</p>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <Flame size={16} />
                  <span className="text-xs">Calories</span>
                </div>

                <h4 className="font-bold text-lg mt-2">{stats.calories}</h4>

                <p className="text-xs text-white/80">Burned</p>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <Timer size={16} />
                  <span className="text-xs">Time</span>
                </div>

                <h4 className="font-bold text-lg mt-2">{stats.activeText}</h4>

                <p className="text-xs text-white/80">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary Title */}
      <div className="px-5 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Activity Summary</h2>

          <button className="text-orange-500 flex items-center gap-1 text-sm font-semibold">
            View All
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={summaryCard}>
            <div className="flex items-center justify-between">
              <Footprints size={22} className="text-orange-500" />

              <TrendingUp size={18} className="text-green-500" />
            </div>

            <h3 className="text-2xl font-bold mt-4">
              {stats.steps.toLocaleString()}
            </h3>

            <p className="text-gray-500 text-sm mt-1">Total Steps</p>

            <p className="text-green-500 text-xs mt-3">
              {comparison.steps >= 0 ? "+" : ""}
              {comparison.steps}% vs yesterday
            </p>
          </div>

          <div className={summaryCard}>
            <div className="flex items-center justify-between">
              <Flame size={22} className="text-orange-500" />

              <TrendingUp size={18} className="text-green-500" />
            </div>

            <h3 className="text-2xl font-bold mt-4">{stats.calories}</h3>

            <p className="text-gray-500 text-sm mt-1">Calories Burned</p>

            <p className="text-green-500 text-xs mt-3">
              {comparison.calories >= 0 ? "+" : ""}
              {comparison.calories}% vs yesterday
            </p>
          </div>
        </div>
      </div>
      {/* Weekly Trend */}
      <div className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Steps Trend</h2>

          <div className="flex items-center gap-2 text-orange-500 font-semibold text-sm">
            <Activity size={16} />
            Last 7 Days
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-orange-50 p-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#F3F4F6"
                />

                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 12,
                    fill: "#9CA3AF",
                  }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "#9CA3AF",
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: "#FFF7ED",
                  }}
                  formatter={(value) => [`${value} Steps`, "Steps"]}
                />

                <Bar dataKey="steps" radius={[12, 12, 0, 0]}>
                  {chartData.map((item, index) => (
                    <Cell
                      key={index}
                      fill={item.steps >= goal ? "#ff6b00" : "#FDBA74"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center">
              <p className="text-gray-400 text-xs">Average</p>

              <h3 className="font-bold text-lg mt-1">
                {chartData.length
                  ? Math.round(
                      chartData.reduce((sum, d) => sum + d.steps, 0) /
                        chartData.length,
                    ).toLocaleString()
                  : 0}
              </h3>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-xs">Highest</p>

              <h3 className="font-bold text-lg mt-1">
                {chartData.length
                  ? Math.max(...chartData.map((d) => d.steps)).toLocaleString()
                  : 0}
              </h3>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-xs">Goal Days</p>

              <h3 className="font-bold text-lg mt-1">
                {chartData.filter((d) => d.steps >= goal).length}
                /7
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* More Summary */}
      <div className="px-5 mt-8">
        <div className="grid grid-cols-2 gap-4">
          <div className={summaryCard}>
            <div className="flex items-center justify-between">
              <MapPin size={22} className="text-orange-500" />

              <TrendingUp size={18} className="text-green-500" />
            </div>

            <h3 className="text-2xl font-bold mt-4">{stats.distance} km</h3>

            <p className="text-gray-500 text-sm mt-1">Distance</p>

            <p className="text-green-500 text-xs mt-3">
              {comparison.distance >= 0 ? "+" : ""}
              {comparison.distance}% vs yesterday
            </p>
          </div>

          <div className={summaryCard}>
            <div className="flex items-center justify-between">
              <Timer size={22} className="text-orange-500" />

              <TrendingUp size={18} className="text-green-500" />
            </div>

            <h3 className="text-2xl font-bold mt-4">{stats.activeText}</h3>

            <p className="text-gray-500 text-sm mt-1">Active Time</p>

            <p className="text-green-500 text-xs mt-3">
              {comparison.active >= 0 ? "+" : ""}
              {comparison.active}% vs yesterday
            </p>
          </div>
        </div>
      </div>

      {/* Achievement Header */}
      <div className="px-5 mt-8 flex items-center justify-between">
        <h2 className="text-xl font-bold">Achievements</h2>

        <Trophy className="text-yellow-500" size={22} />
      </div>

      <div className="px-5 mt-4">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Current Streak</p>

              <h2 className="text-4xl font-bold mt-2">
                🔥 {achievements.streak}
              </h2>

              <p className="text-gray-500 mt-2">Keep walking every day.</p>
            </div>

            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <Trophy size={40} className="text-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {achievements.badges.length === 0 ? (
              <div className="col-span-2 text-center text-gray-400 py-6">
                No badges yet
              </div>
            ) : (
              achievements.badges.map((badge, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-orange-50 p-4 flex items-center gap-3"
                >
                  <div className="text-3xl">{badge.icon}</div>

                  <div>
                    <h4 className="font-semibold">{badge.title}</h4>

                    <p className="text-xs text-gray-500">
                      Achievement Unlocked
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Daily Goal */}
      <div className="px-5 mt-8">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Daily Goal</p>

              <h2 className="text-3xl font-bold mt-2">
                {goal.toLocaleString()} Steps
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Change your daily walking goal.
              </p>
            </div>

            <button
              onClick={() => {
                const value = prompt("Enter Daily Goal", goal);

                if (!value) return;

                const newGoal = Number(value);

                if (newGoal > 0) {
                  updateGoal(newGoal);
                }
              }}
              className="bg-orange-500 text-white rounded-2xl px-5 py-3 font-semibold active:scale-95 transition"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Motivational Card */}
      <div className="px-5 mt-8">
        <div className={`${gradient} rounded-[30px] p-6 text-white shadow-xl`}>
          <div className="flex items-center justify-between">
            <div className="max-w-[70%]">
              <p className="text-white/80 text-sm">Today's Motivation</p>

              <h2 className="text-2xl font-bold mt-2 leading-snug">
                Every step brings you closer to a healthier life.
              </h2>

              <p className="text-white/80 mt-3 text-sm">
                You have completed{" "}
                <span className="font-bold">{progress}%</span> of today's goal.
              </p>

              <button
                className="mt-6 bg-white text-orange-600 rounded-2xl px-6 py-3 font-bold shadow active:scale-95 transition"
                onClick={() => alert("Keep Walking 🚶")}
              >
                Let's Walk
              </button>
            </div>

            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
              <Footprints size={52} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Demo Buttons (Remove when connected to real step counter) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        <button
          onClick={() => updateTodaySteps(todaySteps + 500)}
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-xl text-2xl font-bold active:scale-95"
        >
          +
        </button>

        <button
          onClick={() => updateTodaySteps(Math.max(todaySteps - 500, 0))}
          className="h-14 w-14 rounded-full bg-gray-800 text-white shadow-xl text-2xl font-bold active:scale-95"
        >
          −
        </button>
      </div>
    </div>
  );
}
