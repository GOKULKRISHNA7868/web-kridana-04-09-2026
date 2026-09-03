import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import StepCounter from "../../plugins/StepCounter";
import { requestWalkNotificationPermission } from "./walkingNotifications";

async function readNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return "web";
  try {
    const permission = await LocalNotifications.checkPermissions();
    return permission?.display === "granted" ? "granted" : "denied";
  } catch {
    return "unknown";
  }
}
export async function readWalkPermissions() {
  const isNative = Capacitor.isNativePlatform();
  const notifications = await readNotificationPermission();

  if (!isNative) {
    return {
      activity: "web",
      notifications: notifications === "web" ? "denied" : notifications,
      sensor: "none",
      isNative: false,
    };
  }

  try {
    const status = await StepCounter.getStatus();
    const sensor =
      status?.sensor && status.sensor !== "none" ? status.sensor : "motion";
    return {
      activity: status?.activityRecognition || "unknown",
      notifications: status?.notifications || notifications,
      sensor: status?.available === false ? "none" : sensor,
      isNative: true,
    };
  } catch {
    return {
      activity: "unknown",
      notifications,
      sensor: "motion",
      isNative: true,
    };
  }
}

export async function requestWalkPermissions() {
  const isNative = Capacitor.isNativePlatform();
  const notificationsGranted = await requestWalkNotificationPermission();

  if (!isNative) {
    return {
      activity: "web",
      notifications: notificationsGranted ? "granted" : "denied",
      sensor: "none",
      isNative: false,
      message: notificationsGranted
        ? "Notification preference saved for this browser session."
        : "Notifications are limited in browser mode. Install the Kridana app for full walk alerts.",
    };
  }

  try {
    let status = {};
    try {
      status = await StepCounter.requestPermissions();
    } catch {
      status = await StepCounter.getStatus();
    }

    const activity = status?.activityRecognition || "denied";
    const notifications =
      status?.notifications || (notificationsGranted ? "granted" : "denied");
    const sensor =
      status?.sensor && status.sensor !== "none" ? status.sensor : "motion";

    let message = "";
    if (activity === "granted" && notifications === "granted") {
      message = "All set. Step counting and walk alerts are enabled.";
    } else if (activity === "granted") {
      message =
        "Activity access allowed. Turn on notifications in phone settings for walk reminders.";
    } else if (activity === "denied") {
      message =
        "Physical activity was not allowed. Open Settings → Apps → Kridana → Permissions to enable it.";
    } else {
      message = "Please allow Physical activity when your phone asks.";
    }

    return {
      activity,
      notifications,
      sensor: status?.available === false ? "none" : sensor,
      isNative: true,
      message,
    };
  } catch {
    return {
      activity: "unknown",
      notifications: notificationsGranted ? "granted" : "denied",
      sensor: "motion",
      isNative: true,
      message: "Could not update permissions. Please try again.",
    };
  }
}

export function activityPermissionUI(status) {
  if (!Capacitor.isNativePlatform()) {
    return {
      key: "activity",
      status: "web",
      label: "Browser",
      title: "Install the Kridana app",
      description:
        "Live step counting works on the mobile app. Browser mode shows your saved walk history only.",
      tone: "neutral",
      canEnable: false,
      buttonLabel: "App required",
    };
  }

  if (status === "granted") {
    return {
      key: "activity",
      status: "granted",
      label: "Allowed",
      title: "Physical activity access",
      description: "Step counting is enabled on this phone.",
      tone: "success",
      canEnable: false,
      buttonLabel: "Already allowed",
    };
  }

  if (status === "denied") {
    return {
      key: "activity",
      status: "denied",
      label: "Blocked",
      title: "Physical activity not allowed",
      description:
        "You chose Don't allow, or it was turned off in settings. Go to Settings → Apps → Kridana → Permissions → Physical activity → Allow, then return here.",
      tone: "danger",
      canEnable: true,
      buttonLabel: "Try again",
    };
  }

  return {
    key: "activity",
    status: "prompt",
    label: "Required",
    title: "Allow physical activity",
    description:
      "Kridana needs this to count your steps while you walk. Tap Enable and choose Allow on the next screen.",
    tone: "warning",
    canEnable: true,
    buttonLabel: "Enable activity access",
  };
}

export function notificationPermissionUI(status) {
  if (!Capacitor.isNativePlatform()) {
    return {
      key: "notifications",
      status: "web",
      label: "Limited",
      title: "Walk notifications",
      description: "Full walk alerts are available in the Kridana mobile app.",
      tone: "neutral",
      canEnable: false,
      buttonLabel: "Not available",
    };
  }

  if (status === "granted") {
    return {
      key: "notifications",
      status: "granted",
      label: "Allowed",
      title: "Walk notifications",
      description: "You will receive live walk updates, goal alerts, and daily reminders.",
      tone: "success",
      canEnable: false,
      buttonLabel: "Already allowed",
    };
  }

  if (status === "denied") {
    return {
      key: "notifications",
      status: "denied",
      label: "Blocked",
      title: "Notifications not allowed",
      description:
        "Open Settings → Apps → Kridana → Notifications and turn them on for walk reminders.",
      tone: "danger",
      canEnable: true,
      buttonLabel: "Try again",
    };
  }

  return {
    key: "notifications",
    status: "prompt",
    label: "Optional",
    title: "Enable walk notifications",
    description:
      "Get live walk progress, halfway alerts, and a gentle daily reminder at 7:00 PM.",
    tone: "warning",
    canEnable: true,
    buttonLabel: "Enable notifications",
  };
}

export function toneClasses(tone) {
  switch (tone) {
    case "success":
      return {
        card: "bg-emerald-50 border-emerald-200",
        badge: "bg-emerald-100 text-emerald-800",
        icon: "text-emerald-600",
      };
    case "danger":
      return {
        card: "bg-red-50 border-red-200",
        badge: "bg-red-100 text-red-800",
        icon: "text-red-600",
      };
    case "warning":
      return {
        card: "bg-amber-50 border-amber-200",
        badge: "bg-amber-100 text-amber-900",
        icon: "text-amber-600",
      };
    default:
      return {
        card: "bg-gray-50 border-gray-200",
        badge: "bg-gray-100 text-gray-700",
        icon: "text-gray-500",
      };
  }
}
