import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const DEFAULT_TRAINER_ACCESS = {
  studentAttendance: false,
  addStudents: false,
  timetable: false,
  instituteProfile: false,
  dailyBill: false,
  fees: false,
};

export const ACCESS_OPTIONS = [
  {
    key: "studentAttendance",
    label: "Students attendance",
    hint: "Same category and subcategory marking as the academy",
  },
  {
    key: "addStudents",
    label: "Add students",
    hint: "Add new students to this academy",
  },
  {
    key: "timetable",
    label: "Time table",
    hint: "View academy class schedule",
  },
  {
    key: "instituteProfile",
    label: "Academy profile",
    hint: "Edit the same academy profile sections as institute login",
  },
  {
    key: "dailyBill",
    label: "Daily bill",
    hint: "Create walk-in bills. Academy can see who saved each bill",
  },
  {
    key: "fees",
    label: "Fee details",
    hint: "View and update student fees. Changes are logged for the academy",
  },
];

export const normalizeTrainerAccess = (access = {}) => ({
  ...DEFAULT_TRAINER_ACCESS,
  ...(access || {}),
});

export const trainerDisplayName = (data = {}) =>
  [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Trainer";

export const actorFromStaff = (staffProfile) => {
  if (!staffProfile?.trainerUid && !staffProfile?.uid) return null;
  return {
    trainerUid: staffProfile.trainerUid || staffProfile.uid,
    name: trainerDisplayName(staffProfile),
    role: "trainer",
  };
};

export const attendanceMarkMeta = (actor, user) => ({
  markedBy: actor?.trainerUid || user?.uid || "",
  markedByName: actor?.name || "Academy",
  markedByRole: actor?.role || "institute",
});

export const formatStaffTime = (value) => {
  try {
    const date = value?.toDate
      ? value.toDate()
      : value?.seconds
        ? new Date(value.seconds * 1000)
        : value
          ? new Date(value)
          : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const logStaffAction = async ({
  instituteId,
  trainerUid,
  trainerName,
  action,
  page,
  details = "",
}) => {
  if (!instituteId || !trainerUid) return;
  try {
    await addDoc(collection(db, "institutes", instituteId, "staffAudit"), {
      instituteId,
      trainerUid,
      trainerName: trainerName || "",
      action,
      page,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Staff audit log error:", error);
  }
};
