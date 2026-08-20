import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import StepCounter from "../../plugins/StepCounter";
import {
  ArrowLeft,
  Footprints,
  Flame,
  MapPinned,
  Clock3,
  Pause,
  Play,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  CALORIES_PER_STEP,
  DEFAULT_GOAL,
  IDLE_MS,
  formatClock,
  localDateKey,
  monthKey,
  resolveWalkingUser,
  stepsToCalories,
  stepsToDistanceKm,
  weekKey,
  yearKey,
} from "./walkingIdentity";
import {
  notifyWalkMilestone,
  notifyWalkSaved,
  notifyWalkStarted,
  requestWalkNotificationPermission,
  updateLiveWalkNotification,
} from "./walkingNotifications";

export default function ActiveWalk() {
  const navigate = useNavigate();

  const startTimeRef = useRef(new Date());
  const stepsRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const lastStepAtRef = useRef(0);
  const walkerRef = useRef(null);
  const goalRef = useRef(DEFAULT_GOAL);
  const notifiedHalfRef = useRef(false);
  const notifiedGoalRef = useRef(false);
  const savingRef = useRef(false);
  const pausedRef = useRef(false);
  const lastNativeRef = useRef(0);
  const displayOffsetRef = useRef(0);

  const [walker, setWalker] = useState(null);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [steps, setSteps] = useState(0);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [moving, setMoving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [sensorError, setSensorError] = useState("");
  const [sensorName, setSensorName] = useState("");

  const distance = useMemo(() => stepsToDistanceKm(steps), [steps]);
  const calories = useMemo(() => stepsToCalories(steps), [steps]);
  const progress = Math.min((steps / Math.max(goal, 1)) * 100, 100);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/Fitness/fitnessdashboard");
  };

  useEffect(() => {
    let listener = null;
    let cancelled = false;

    async function boot() {
      const identity = await resolveWalkingUser();
      if (!identity) {
        setLoading(false);
        navigate("/login?role=user", { replace: true });
        return;
      }

      walkerRef.current = identity;
      setWalker(identity);

      try {
        const goalSnap = await getDoc(doc(db, "walking", identity.uid));
        const legacyGoal = await getDoc(doc(db, "walkingGoals", identity.uid));
        const nextGoal =
          goalSnap.data()?.currentGoal ||
          legacyGoal.data()?.currentGoal ||
          DEFAULT_GOAL;
        goalRef.current = Number(nextGoal) || DEFAULT_GOAL;
        setGoal(goalRef.current);

        await setDoc(
          doc(db, "walking", identity.uid),
          {
            uid: identity.uid,
            role: identity.role,
            displayName: identity.displayName,
            email: identity.email,
            source: identity.source,
            currentGoal: goalRef.current,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error(error);
      }

      await requestWalkNotificationPermission();

      if (Capacitor.isNativePlatform()) {
        try {
          try {
            await StepCounter.requestPermissions();
          } catch {
            /* accelerometer tracking still works without activity permission */
          }

          listener = await StepCounter.addListener("stepChanged", (event) => {
            if (cancelled) return;
            const nativeSteps = Math.max(0, Number(event.steps) || 0);
            lastNativeRef.current = nativeSteps;
            if (pausedRef.current) return;

            const next = Math.max(0, nativeSteps - displayOffsetRef.current);
            if (next < stepsRef.current) return;
            if (next === stepsRef.current && !event.moving) return;

            if (next > stepsRef.current) {
              stepsRef.current = next;
              lastStepAtRef.current = Date.now();
              setSteps(next);
              setMoving(true);
              if (event?.sensor) setSensorName(event.sensor);
            }
          });

          const started = await StepCounter.start();
          setSensorName(started?.sensor || "motion");
          setPermissionDenied(false);
          setSensorError("");
          setTracking(true);
          await notifyWalkStarted();
        } catch (error) {
          const message = String(error?.message || error);
          if (message.includes("not implemented") || message.includes("UNIMPLEMENTED")) {
            setSensorError(
              "Walk tracking is not linked in this install. Rebuild the Android app and try again.",
            );
          } else if (message.includes("ACTIVITY_PERMISSION_DENIED")) {
            setPermissionDenied(true);
          } else if (message.includes("NO_STEP_SENSOR") || message.includes("WALK_WEB_UNSUPPORTED")) {
            setSensorError(
              "This phone could not start motion tracking. Allow Physical activity if asked, then tap Try again.",
            );
          } else {
            setSensorError("Unable to start walking on this phone. Tap Try again.");
          }
        }
      } else {
        setSensorError(
          "Live step counting works in the Kridana mobile app. Browser mode cannot read your phone sensors.",
        );
      }

      if (!cancelled) setLoading(false);
    }

    boot();

    return () => {
      cancelled = true;
      listener?.remove?.();
      StepCounter.stop().catch(() => {});
    };
  }, [navigate]);

  useEffect(() => {
    if (!tracking || paused || permissionDenied) return;

    const timer = setInterval(() => {
      const recentlyStepped = Date.now() - lastStepAtRef.current <= IDLE_MS;
      if (stepsRef.current > 0 && recentlyStepped) {
        activeSecondsRef.current += 1;
        setActiveSeconds(activeSecondsRef.current);
        setMoving(true);
      } else {
        setMoving(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tracking, paused, permissionDenied]);

  useEffect(() => {
    if (!tracking || steps === 0) return;

    const percent = (steps / Math.max(goal, 1)) * 100;
    if (percent >= 50 && !notifiedHalfRef.current) {
      notifiedHalfRef.current = true;
      notifyWalkMilestone(50);
    }
    if (percent >= 100 && !notifiedGoalRef.current) {
      notifiedGoalRef.current = true;
      notifyWalkMilestone(100);
    }

    updateLiveWalkNotification({
      steps,
      goal,
      moving,
    });
  }, [steps, goal, moving, tracking]);

  async function addToReport(pathSegments, extra = {}) {
    const identity = walkerRef.current;
    if (!identity) return;

    const sessionSteps = stepsRef.current;
    const sessionDistance = stepsToDistanceKm(sessionSteps);
    const sessionCalories = stepsToCalories(sessionSteps);
    const sessionDuration = Math.max(
      activeSecondsRef.current,
      sessionSteps > 0 ? 1 : 0,
    );
    const ref = doc(db, ...pathSegments);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const prev = snap.exists() ? snap.data() : {};
      const nextSteps = Number(prev.steps || 0) + sessionSteps;

      transaction.set(
        ref,
        {
          uid: identity.uid,
          role: identity.role,
          displayName: identity.displayName,
          steps: nextSteps,
          distance: Number(prev.distance || 0) + sessionDistance,
          calories: Number(prev.calories || 0) + sessionCalories,
          duration: Number(prev.duration || 0) + sessionDuration,
          goal: goalRef.current,
          completed: nextSteps >= goalRef.current,
          updatedAt: serverTimestamp(),
          createdAt: prev.createdAt || serverTimestamp(),
          ...extra,
        },
        { merge: true },
      );
    });
  }

  async function saveWalkingSession() {
    const identity = walkerRef.current;
    const sessionDuration = Math.max(
      activeSecondsRef.current,
      stepsRef.current > 0 ? 1 : 0,
    );
    if (!identity || stepsRef.current < 1) {
      return false;
    }

    const now = new Date();
    const payload = {
      uid: identity.uid,
      role: identity.role,
      displayName: identity.displayName,
      email: identity.email,
      source: identity.source,
      startTime: startTimeRef.current,
      endTime: now,
      duration: sessionDuration,
      steps: stepsRef.current,
      distance: stepsToDistanceKm(stepsRef.current),
      calories: stepsToCalories(stepsRef.current),
      caloriesPerStep: CALORIES_PER_STEP,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "walking", identity.uid, "sessions"), payload);

    await Promise.all([
      addToReport(["walking", identity.uid, "daily", localDateKey(now)]),
      addToReport(["walking", identity.uid, "weekly", weekKey(now)]),
      addToReport(["walking", identity.uid, "monthly", monthKey(now)]),
      addToReport(["walking", identity.uid, "yearly", yearKey(now)]),
    ]);

    await setDoc(
      doc(db, "walking", identity.uid),
      {
        uid: identity.uid,
        role: identity.role,
        lastWalkAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return true;
  }

  async function handleStopWalk() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setTracking(false);
    setPaused(true);

    try {
      await StepCounter.stop();
      const saved = await saveWalkingSession();
      await notifyWalkSaved({
        steps: stepsRef.current,
        distance: stepsToDistanceKm(stepsRef.current),
        calories: stepsToCalories(stepsRef.current),
      });
      if (!saved && stepsRef.current < 1) {
        // still leave the page
      }
      goBack();
    } catch (error) {
      console.error("Failed to save walking session", error);
      savingRef.current = false;
      setSaving(false);
      setPaused(false);
      setTracking(true);
      alert("Unable to save your walking session. Please try again.");
    }
  }

  async function retryPermissions() {
    setPermissionDenied(false);
    setSensorError("");
    setLoading(true);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F7F8FC]">
        <div className="text-center px-8">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="mt-4 text-sm text-gray-500">Preparing your walk...</p>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-16 w-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        <h2 className="mt-6 text-xl font-bold text-gray-900">Saving to your account</h2>
        <p className="text-gray-500 mt-2 text-sm">
          {walker?.displayName ? `${walker.displayName} · ${walker.role}` : "Logged-in user"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleStopWalk}
            className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-lg text-gray-900">Live walk</h1>
            <p className="text-[11px] text-gray-400 capitalize">
              {walker?.role || "user"} · {walker?.displayName || "Account"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center">
            <ShieldCheck size={18} className="text-orange-500" />
          </div>
        </div>
      </div>

      {(permissionDenied || sensorError) && (
        <div className="mx-5 mt-4 rounded-2xl bg-white border border-orange-100 p-4">
          <div className="flex items-start gap-3">
            <WifiOff className="text-orange-500 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {permissionDenied ? "Physical activity permission needed" : "Walking could not start"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {permissionDenied
                  ? "Allow Physical activity if your phone asks for it. Motion tracking can still run without a dedicated step sensor."
                  : sensorError}
              </p>
              <button
                type="button"
                onClick={retryPermissions}
                className="mt-3 text-sm font-semibold text-orange-600"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-6 py-5 flex flex-col items-center">
        <div
          className={`flex items-center gap-2 font-semibold ${
            moving ? "text-green-600" : "text-amber-600"
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              moving ? "bg-green-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          {paused
            ? "Paused"
            : steps === 0
              ? "Waiting for your first step"
              : moving
                ? "Walking · counting"
                : "Standing still · not counting"}
        </div>

        <h2 className="text-5xl font-black mt-7 tracking-tight text-gray-900">
          {formatClock(activeSeconds)}
        </h2>
        <p className="text-gray-400 mt-1 text-sm">Active walking time</p>

        <div
          className="relative mt-8 w-72 h-72 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: `conic-gradient(#f97316 ${progress}%, #FFE8D8 ${progress}% 100%)`,
          }}
        >
          <div className="w-60 h-60 rounded-full bg-white flex flex-col items-center justify-center">
            <Footprints size={36} className="text-orange-500" />
            <h2 className="text-5xl font-black mt-3 text-gray-900">
              {steps.toLocaleString()}
            </h2>
            <p className="text-gray-500 mt-1">Steps</p>
          </div>
        </div>

        <p className="text-gray-500 mt-6 text-sm">
          Goal {goal.toLocaleString()} · {Math.round(progress)}%
        </p>
        {sensorName ? (
          <p className="text-[11px] text-gray-400 mt-1">
            Sensor: {sensorName.replace(/_/g, " ")}
          </p>
        ) : null}

        <div className="w-full mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={MapPinned} color="text-blue-500" bg="bg-blue-50" value={distance.toFixed(2)} label="KM" />
            <Stat icon={Flame} color="text-orange-500" bg="bg-orange-50" value={calories} label="Calories" />
            <Stat icon={Clock3} color="text-purple-500" bg="bg-purple-50" value={formatClock(activeSeconds)} label="Active" />
          </div>
        </div>

        <div className="mt-5 w-full rounded-3xl bg-orange-50 border border-orange-100 p-4">
          <p className="text-sm text-orange-800 leading-relaxed">
            Distance, calories and time update only after a real step. Standing, shaking the screen, or leaving the phone still will not add data.
          </p>
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 p-5 grid grid-cols-[auto_1fr] gap-3">
        <button
          type="button"
          onClick={() => {
            setPaused((value) => {
              const nextPaused = !value;
              pausedRef.current = nextPaused;
              if (!nextPaused) {
                displayOffsetRef.current =
                  lastNativeRef.current - stepsRef.current;
              }
              return nextPaused;
            });
          }}
          disabled={!tracking}
          className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center disabled:opacity-50"
        >
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </button>
        <button
          type="button"
          onClick={handleStopWalk}
          className="h-14 rounded-2xl bg-red-600 text-white font-bold text-lg shadow-lg active:scale-95 transition"
        >
          Stop & save
        </button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, color, bg, value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-2`}>
        <Icon className={color} size={22} />
      </div>
      <h3 className="text-xl font-bold text-gray-900">{value}</h3>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}
