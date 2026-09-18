import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import { uploadToCloudinary } from "./cloudinaryUpload";
import {
  CATEGORIES,
  SUB_CATEGORY_MAP,
} from "../../InstituteDashboard/MyAccount/sportCategories";
import {
  ArrowLeft,
  Eye,
  Plus,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Camera,
  Trophy,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const AGE_OPTIONS = [
  "4 - 8 years",
  "9 - 12 years",
  "13 - 18 years",
  "4 - 18 years",
  "Adults",
  "All levels",
];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const SPECIAL_OPTIONS = [
  "Self Defence",
  "Competition Training",
  "Fitness",
  "Trial Class",
  "Kids Batch",
];
const FACILITY_OPTIONS = [
  "Training Area",
  "Swimming Pool",
  "Indoor Court",
  "Outdoor Ground",
  "Changing Rooms",
  "Parking",
  "First Aid",
  "Washrooms",
  "Drinking Water",
  "AC / Cooling",
  "CCTV",
  "Equipment Provided",
];
const TRAINER_TYPE_OPTIONS = ["Trainer", "Therapist"];

const emptySportMeta = () => ({
  shortDescription: "",
  ageGroups: [],
  trainingLevels: [],
  specialPrograms: [],
  monthlyFee: "",
  yearlyFee: "",
  registrationFee: "",
  courseDuration: "",
  classesPerWeek: "",
  classDuration: "",
  image: "",
});

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const splitName = (full = "") => {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const inputCls =
  "w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";
const areaCls = `${inputCls} py-3 resize-none leading-relaxed`;

const Field = ({ label, children, hint, required }) => (
  <div className="block w-full">
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </span>
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </div>
    {children}
  </div>
);

const Section = ({ number, title, subtitle, done, children, id }) => (
  <section
    id={id}
    className="bg-white rounded-2xl border border-slate-200 scroll-mt-24"
  >
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <span
        className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
          done
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {done ? "Complete" : "Incomplete"}
      </span>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </section>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[40px] px-3.5 rounded-xl text-sm font-medium border transition ${
      active
        ? "bg-[#FF6A00] text-white border-[#FF6A00]"
        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
    }`}
  >
    {children}
  </button>
);

const Toggle = ({ value, onChange, onLabel = "On", offLabel = "Off" }) => (
  <div className="flex w-full min-h-[48px] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`flex-1 rounded-lg text-sm font-semibold transition ${
        value ? "bg-[#FF6A00] text-white shadow-sm" : "text-slate-500"
      }`}
    >
      {onLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`flex-1 rounded-lg text-sm font-semibold transition ${
        !value ? "bg-slate-800 text-white shadow-sm" : "text-slate-500"
      }`}
    >
      {offLabel}
    </button>
  </div>
);

const MoneyInput = ({ label, value, onChange, placeholder }) => (
  <Field label={label}>
    <div className="flex items-stretch rounded-xl border border-slate-200 focus-within:border-[#FF6A00] focus-within:ring-2 focus-within:ring-orange-100 bg-white overflow-hidden">
      <span className="px-4 flex items-center text-slate-500 font-medium text-sm bg-slate-50 border-r border-slate-200">
        ₹
      </span>
      <input
        type="text"
        inputMode="numeric"
        className="flex-1 min-h-[48px] min-w-0 px-4 text-[15px] outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
      />
    </div>
  </Field>
);

const toggleInArray = (arr, value) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

const flattenSports = (categories = {}, sportDetails = {}) => {
  const list = [];
  Object.entries(categories || {}).forEach(([category, sports]) => {
    const names = Array.isArray(sports)
      ? sports
      : sports && typeof sports === "object"
        ? Object.keys(sports)
        : [];
    names.forEach((name) => {
      list.push({
        key: `${category}__${name}`,
        category,
        name,
        meta: {
          ...emptySportMeta(),
          ...(sportDetails?.[category]?.[name] || {}),
        },
      });
    });
  });
  return list;
};

const computePercent = (data) => {
  const sports = flattenSports(data.categories || {}, data.sportDetails || {});
  const hasFees = sports.some((s) => s.meta?.monthlyFee || s.meta?.yearlyFee);
  const checks = [
    Boolean(data.trainerName && data.profileImageUrl && data.description),
    Boolean(data.street && data.phoneNumber),
    sports.length > 0,
    hasFees,
    Boolean((data.facilityTags || []).length),
    Boolean((data.achievementHighlights || []).length),
    Boolean(
      (data.mediaGallery?.trainingImages || []).length ||
        (data.mediaGallery?.facilityImages || []).length,
    ),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const TrainerProfileWorkspace = ({ trainerUid }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [uploading, setUploading] = useState("");
  const [openSportKey, setOpenSportKey] = useState("");
  const [addSportOpen, setAddSportOpen] = useState(false);
  const [newSportCategory, setNewSportCategory] = useState(CATEGORIES[0]);
  const [newSportName, setNewSportName] = useState("");
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [form, setForm] = useState({
    trainerName: "",
    description: "",
    yearFounded: "",
    organizationType: "Trainer",
    type: "Trainer",
    profileImageUrl: "",
    coverImageUrl: "",
    phoneNumber: "",
    countryCode: "+91",
    email: "",
    websiteLink: "",
    chatEnabled: true,
    street: "",
    landmark: "",
    latitude: "",
    longitude: "",
    locationName: "",
    categories: {},
    sportDetails: {},
    facilityTags: [],
    facilitiesInfrastructure: "",
    achievementHighlights: [],
    achievements: {
      district: { gold: 0, silver: 0, bronze: 0 },
      state: { gold: 0, silver: 0, bronze: 0 },
      national: { gold: 0, silver: 0, bronze: 0 },
    },
    yearsInOperation: "",
    totalStudentsTrained: "",
    mediaGallery: {
      trainingImages: [],
      facilityImages: [],
      equipmentImages: [],
      uniformImages: [],
    },
    reels: [],
    trainingPrograms: [],
    pricing: { packages: [], paymentMethods: "", refundPolicy: "" },
  });

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const sportsList = useMemo(
    () => flattenSports(form.categories, form.sportDetails),
    [form.categories, form.sportDetails],
  );

  useEffect(() => {
    if (sportsList.length && !sportsList.find((s) => s.key === openSportKey)) {
      setOpenSportKey(sportsList[0].key);
    }
  }, [sportsList, openSportKey]);

  useEffect(() => {
    const load = async () => {
      if (!trainerUid) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "trainers", trainerUid));
        const d = snap.exists() ? snap.data() : {};
        const resolvedName =
          d.trainerName ||
          [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
          "";
        const orgType =
          d.organizationType ||
          d.type ||
          (TRAINER_TYPE_OPTIONS.includes(d.type) ? d.type : "Trainer");
        setForm((prev) => ({
          ...prev,
          trainerName: resolvedName,
          description: d.description || d.about || "",
          yearFounded: d.yearFounded
            ? String(d.yearFounded)
            : d.establishedYear
              ? String(d.establishedYear)
              : "",
          organizationType: orgType,
          type: orgType,
          profileImageUrl: d.profileImageUrl || d.logo || "",
          coverImageUrl: d.coverImageUrl || "",
          phoneNumber: d.phoneNumber || "",
          countryCode: d.countryCode || "+91",
          email: d.email || "",
          websiteLink: d.websiteLink || d.website || "",
          chatEnabled: d.chatEnabled !== false,
          street: d.street || d.locationAccessibility?.fullAddress || "",
          landmark: d.landmark || "",
          latitude: d.latitude ?? "",
          longitude: d.longitude ?? "",
          locationName: d.locationName || "",
          categories: d.categories || {},
          sportDetails: d.sportDetails || {},
          facilityTags: d.facilityTags || [],
          facilitiesInfrastructure: d.facilitiesInfrastructure || "",
          achievementHighlights: d.achievementHighlights || [],
          achievements: d.achievements || prev.achievements,
          yearsInOperation: d.yearsInOperation
            ? String(d.yearsInOperation)
            : "",
          totalStudentsTrained: d.totalStudentsTrained
            ? String(d.totalStudentsTrained)
            : "",
          mediaGallery: {
            trainingImages: d.mediaGallery?.trainingImages || [],
            facilityImages: d.mediaGallery?.facilityImages || [],
            equipmentImages: d.mediaGallery?.equipmentImages || [],
            uniformImages: d.mediaGallery?.uniformImages || [],
          },
          reels: d.reels || [],
          trainingPrograms: d.trainingPrograms || [],
          pricing: {
            packages: d.pricing?.packages || [],
            paymentMethods: d.pricing?.paymentMethods || "",
            refundPolicy: d.pricing?.refundPolicy || "",
          },
        }));
        const flat = flattenSports(d.categories || {}, d.sportDetails || {});
        if (flat[0]) setOpenSportKey(flat[0].key);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [trainerUid]);

  const percent = useMemo(() => computePercent(form), [form]);

  const flashNotice = (msg) => {
    setSaveNotice(msg);
    window.setTimeout(() => setSaveNotice(""), 3500);
  };

  const updateSportMeta = (category, name, patch) => {
    setForm((prev) => ({
      ...prev,
      sportDetails: {
        ...prev.sportDetails,
        [category]: {
          ...(prev.sportDetails[category] || {}),
          [name]: {
            ...emptySportMeta(),
            ...(prev.sportDetails[category]?.[name] || {}),
            ...patch,
          },
        },
      },
    }));
  };

  const addSport = () => {
    if (!newSportCategory || !newSportName) {
      flashNotice("Select a category and sport first.");
      return;
    }
    setForm((prev) => {
      const existing = Array.isArray(prev.categories[newSportCategory])
        ? prev.categories[newSportCategory]
        : [];
      if (existing.includes(newSportName)) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [newSportCategory]: [...existing, newSportName],
        },
        sportDetails: {
          ...prev.sportDetails,
          [newSportCategory]: {
            ...(prev.sportDetails[newSportCategory] || {}),
            [newSportName]: emptySportMeta(),
          },
        },
      };
    });
    setOpenSportKey(`${newSportCategory}__${newSportName}`);
    setAddSportOpen(false);
    setNewSportName("");
  };

  const removeSport = (category, name) => {
    setForm((prev) => {
      const nextCats = { ...prev.categories };
      nextCats[category] = (nextCats[category] || []).filter((n) => n !== name);
      if (!nextCats[category]?.length) delete nextCats[category];
      const nextDetails = { ...prev.sportDetails };
      if (nextDetails[category]) {
        const copy = { ...nextDetails[category] };
        delete copy[name];
        nextDetails[category] = copy;
      }
      return { ...prev, categories: nextCats, sportDetails: nextDetails };
    });
  };

  const handleUpload = async (file, target, sportRef = null) => {
    if (!file) return;
    try {
      setUploading(target);
      const url = await uploadToCloudinary(file, "image");
      if (target === "logo") setField("profileImageUrl", url);
      if (target === "cover") setField("coverImageUrl", url);
      if (target === "sport" && sportRef) {
        updateSportMeta(sportRef.category, sportRef.name, { image: url });
      }
      if (target === "gallery") {
        setForm((prev) => ({
          ...prev,
          mediaGallery: {
            ...prev.mediaGallery,
            trainingImages: [...(prev.mediaGallery.trainingImages || []), url],
          },
        }));
      }
      if (target === "facility") {
        setForm((prev) => ({
          ...prev,
          mediaGallery: {
            ...prev.mediaGallery,
            facilityImages: [...(prev.mediaGallery.facilityImages || []), url],
          },
        }));
      }
    } catch (e) {
      console.error(e);
      flashNotice("Upload failed. Try again.");
    } finally {
      setUploading("");
    }
  };

  const syncPackagesFromSports = () =>
    flattenSports(form.categories, form.sportDetails)
      .filter((s) => s.meta?.monthlyFee || s.meta?.yearlyFee)
      .map((sport) => {
        const m = sport.meta || {};
        return {
          id: uid(),
          category: sport.category,
          subCategory: sport.name,
          name: sport.name,
          billingCycle: "Monthly",
          monthlyFee: m.monthlyFee || "",
          yearlyFee: m.yearlyFee || "",
          registrationFee: m.registrationFee || "",
          uniformFee: "",
          otherFeeName: "",
          otherFee: "",
          notes: [
            m.courseDuration ? `Duration: ${m.courseDuration}` : "",
            m.classesPerWeek ? `${m.classesPerWeek} / week` : "",
            m.classDuration ? `${m.classDuration} mins` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        };
      });

  const syncProgramsFromSports = () =>
    flattenSports(form.categories, form.sportDetails).map((sport) => {
      const m = sport.meta || {};
      const prev = (form.trainingPrograms || []).find(
        (p) =>
          p.category === sport.category &&
          (p.subCategory === sport.name || p.programName === sport.name),
      );
      return {
        id: prev?.id || uid(),
        category: sport.category,
        subCategory: sport.name,
        programName: prev?.programName || sport.name,
        ageGroups: m.ageGroups || [],
        ageGroup: (m.ageGroups || []).join(", "),
        skillLevel: (m.trainingLevels || [])[0] || prev?.skillLevel || "",
        batchTimings: prev?.batchTimings || "",
        classDays: prev?.classDays || [],
        startTime: prev?.startTime || "",
        endTime: prev?.endTime || "",
        duration: m.classDuration
          ? `${m.classDuration} mins`
          : prev?.duration || "",
        fees: m.monthlyFee || prev?.fees || "",
        feeCycle: "Monthly",
        seatsAvailable: prev?.seatsAvailable || "",
        trialSessions: prev?.trialSessions || "",
      };
    });

  const handleSave = async () => {
    if (!trainerUid) {
      flashNotice("Not logged in.");
      return;
    }
    try {
      setSaving(true);
      const packages = syncPackagesFromSports();
      const trainingPrograms = syncProgramsFromSports();
      const { firstName, lastName } = splitName(form.trainerName);
      const orgType = form.organizationType || form.type || "Trainer";
      await setDoc(
        doc(db, "trainers", trainerUid),
        {
          trainerName: form.trainerName,
          firstName,
          lastName,
          founderName: form.trainerName,
          description: form.description,
          about: form.description,
          yearFounded: form.yearFounded,
          establishedYear: form.yearFounded,
          organizationType: orgType,
          type: orgType,
          profileImageUrl: form.profileImageUrl,
          logo: form.profileImageUrl,
          coverImageUrl: form.coverImageUrl,
          phoneNumber: form.phoneNumber,
          countryCode: form.countryCode,
          email: form.email,
          websiteLink: form.websiteLink,
          chatEnabled: form.chatEnabled,
          street: form.street,
          landmark: form.landmark,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
          locationName: form.locationName || form.street,
          categories: form.categories,
          sportDetails: form.sportDetails,
          facilityTags: form.facilityTags,
          facilitiesInfrastructure: form.facilitiesInfrastructure,
          achievementHighlights: form.achievementHighlights,
          achievements: form.achievements,
          yearsInOperation: form.yearsInOperation,
          totalStudentsTrained: form.totalStudentsTrained,
          mediaGallery: form.mediaGallery,
          reels: form.reels,
          trainingPrograms,
          sportsOffered: sportsList.map((s) => s.name),
          pricing: {
            packages,
            paymentMethods: form.pricing.paymentMethods,
            refundPolicy: form.pricing.refundPolicy,
            monthlyFees: Number(packages[0]?.monthlyFee || 0),
            registrationFees: Number(packages[0]?.registrationFee || 0),
            uniformCost: 0,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      flashNotice("Profile saved successfully.");
    } catch (e) {
      console.error(e);
      flashNotice("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        }),
      );
      const { latitude, longitude } = pos.coords;
      setForm((prev) => ({ ...prev, latitude, longitude }));
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        );
        const json = await res.json();
        setForm((prev) => ({
          ...prev,
          street: json.display_name || prev.street,
          locationName: json.display_name || prev.locationName,
        }));
      } catch {
        /* ignore */
      }
    } catch {
      flashNotice("Could not get location.");
    }
  };

  const galleryUrls = [
    ...(form.mediaGallery.trainingImages || []),
    ...(form.mediaGallery.facilityImages || []),
    ...(form.mediaGallery.equipmentImages || []),
    ...(form.mediaGallery.uniformImages || []),
  ]
    .map((item) => (typeof item === "string" ? item : item?.url))
    .filter(Boolean);

  const cover =
    form.coverImageUrl || galleryUrls[0] || form.profileImageUrl || "";

  const mapSrc =
    form.latitude && form.longitude
      ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(
          form.street || form.locationName || "India",
        )}&output=embed`;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Loading trainer profile...
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#F5F6F8]">
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                Edit Trainer Profile
              </h1>
              <div className="flex items-center gap-2 mt-1.5 max-w-md">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#FF6A00] rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#FF6A00] tabular-nums">
                  {percent}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saveNotice ? (
              <span
                className={`text-xs font-semibold px-3 py-2 rounded-xl ${
                  saveNotice.toLowerCase().includes("saved")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {saveNotice}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(`/trainers/${trainerUid}`)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50"
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 pb-16">
          <div className="space-y-5 min-w-0">
            <Section
              id="section-basic"
              number={1}
              title="Basic Information"
              subtitle="Public name, photo and trainer story"
              done={Boolean(
                form.trainerName && form.profileImageUrl && form.description,
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-[72px] h-[72px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                  {form.profileImageUrl ? (
                    <img
                      src={form.profileImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={22} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Profile photo
                  </p>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {uploading === "logo" ? "Uploading..." : "Upload photo"}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Square · 400 × 400 px or larger
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0], "logo")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Profile banner
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shown as the top banner on the public trainer page
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {form.coverImageUrl ? (
                      <button
                        type="button"
                        onClick={() => setField("coverImageUrl", "")}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
                    >
                      {uploading === "cover"
                        ? "Uploading..."
                        : form.coverImageUrl
                          ? "Change banner"
                          : "Upload banner"}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleUpload(e.target.files?.[0], "cover")
                      }
                    />
                  </div>
                </div>

                <div className="w-full aspect-[8/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
                  {form.coverImageUrl ? (
                    <img
                      src={form.coverImageUrl}
                      alt="Trainer banner"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 via-slate-700 to-[#FF6A00]/70 text-white/90 px-4 text-center">
                      <Camera size={28} className="opacity-80" />
                      <p className="text-xs font-medium">
                        Banner preview (same crop as customer page)
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-3 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">
                    Recommended size for a sharp banner
                  </p>
                  <p>
                    Width:{" "}
                    <span className="font-semibold text-slate-900">1600 px</span>{" "}
                    · Height:{" "}
                    <span className="font-semibold text-slate-900">600 px</span>{" "}
                    (ratio 8:3 landscape)
                  </p>
                  <p>
                    Format: JPG / PNG / WebP · Keep important content in the
                    center · Avoid tall portrait images
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Trainer name" required>
                  <input
                    className={inputCls}
                    value={form.trainerName}
                    onChange={(e) => setField("trainerName", e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </Field>
                <Field label="Type">
                  <div className="flex gap-2">
                    {TRAINER_TYPE_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        active={form.organizationType === opt}
                        onClick={() => {
                          setField("organizationType", opt);
                          setField("type", opt);
                        }}
                      >
                        {opt}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>

              <Field
                label="Trainer story"
                required
                hint={`${(form.description || "").length}/1000`}
              >
                <textarea
                  className={areaCls}
                  rows={4}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="What makes your training special?"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Year started">
                  <input
                    type="text"
                    inputMode="numeric"
                    className={inputCls}
                    value={form.yearFounded}
                    onChange={(e) =>
                      setField(
                        "yearFounded",
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="2012"
                  />
                </Field>
                <Field label="Chat with customers">
                  <Toggle
                    value={form.chatEnabled}
                    onChange={(v) => setField("chatEnabled", v)}
                    onLabel="Enabled"
                    offLabel="Disabled"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact number" required>
                  <div className="flex gap-2">
                    <select
                      className="w-[88px] min-h-[48px] rounded-xl border border-slate-200 px-2 text-sm bg-white"
                      value={form.countryCode}
                      onChange={(e) => setField("countryCode", e.target.value)}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                    </select>
                    <input
                      className={inputCls}
                      value={form.phoneNumber}
                      onChange={(e) =>
                        setField(
                          "phoneNumber",
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      placeholder="10-digit mobile"
                    />
                  </div>
                </Field>
                <Field label="Email">
                  <input
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="trainer@email.com"
                  />
                </Field>
              </div>

              <Field label="Website">
                <input
                  className={inputCls}
                  value={form.websiteLink}
                  onChange={(e) => setField("websiteLink", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </Section>

            <Section
              id="section-location"
              number={2}
              title="Location"
              subtitle="Help students find your training spot"
              done={Boolean(form.street && form.phoneNumber)}
            >
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-100">
                <iframe
                  title="map"
                  src={mapSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Use current location
              </button>
              <Field label="Full address" required>
                <textarea
                  className={areaCls}
                  rows={2}
                  value={form.street}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="Street, area, city, state, PIN"
                />
              </Field>
              <Field label="Landmark">
                <input
                  className={inputCls}
                  value={form.landmark}
                  onChange={(e) => setField("landmark", e.target.value)}
                  placeholder="Near metro / landmark"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Latitude">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputCls}
                    value={form.latitude}
                    onChange={(e) => setField("latitude", e.target.value)}
                    placeholder="12.9716"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputCls}
                    value={form.longitude}
                    onChange={(e) => setField("longitude", e.target.value)}
                    placeholder="77.5946"
                  />
                </Field>
              </div>
            </Section>

            <Section
              id="section-sports"
              number={3}
              title="Sports, Programs & Fees"
              subtitle="Add each sport, then set its fees in the same card"
              done={sportsList.length > 0}
            >
              <div className="space-y-3">
                {sportsList.map((sport) => {
                  const open = openSportKey === sport.key;
                  const m = sport.meta || emptySportMeta();
                  return (
                    <div
                      key={sport.key}
                      className={`rounded-2xl border ${
                        open ? "border-[#FF6A00]" : "border-slate-200"
                      } bg-white overflow-hidden`}
                    >
                      <div className="flex items-center gap-2 px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSportKey(open ? "" : sport.key)
                          }
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {m.image ? (
                              <img
                                src={m.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                {sport.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {sport.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {sport.category}
                              {m.monthlyFee
                                ? ` · ₹${m.monthlyFee}/mo`
                                : " · Fees not set"}
                            </p>
                          </div>
                          {open ? (
                            <ChevronUp size={18} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            removeSport(sport.category, sport.name)
                          }
                          className="shrink-0 min-h-[36px] px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>

                      {open ? (
                        <div className="px-4 pb-5 pt-1 border-t border-slate-100 space-y-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 inline-flex items-center cursor-pointer hover:bg-slate-50">
                              {uploading === "sport"
                                ? "Uploading..."
                                : "Upload sport image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleUpload(e.target.files?.[0], "sport", {
                                    category: sport.category,
                                    name: sport.name,
                                  })
                                }
                              />
                            </label>
                          </div>

                          <Field label={`About ${sport.name}`}>
                            <textarea
                              className={areaCls}
                              rows={3}
                              value={m.shortDescription || ""}
                              onChange={(e) =>
                                updateSportMeta(sport.category, sport.name, {
                                  shortDescription: e.target.value,
                                })
                              }
                              placeholder={`Describe the ${sport.name} program`}
                            />
                          </Field>

                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Age groups
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {AGE_OPTIONS.map((opt) => (
                                <Chip
                                  key={opt}
                                  active={(m.ageGroups || []).includes(opt)}
                                  onClick={() =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        ageGroups: toggleInArray(
                                          m.ageGroups || [],
                                          opt,
                                        ),
                                      },
                                    )
                                  }
                                >
                                  {opt}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Training level
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {LEVEL_OPTIONS.map((opt) => (
                                <Chip
                                  key={opt}
                                  active={(m.trainingLevels || []).includes(
                                    opt,
                                  )}
                                  onClick={() =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        trainingLevels: toggleInArray(
                                          m.trainingLevels || [],
                                          opt,
                                        ),
                                      },
                                    )
                                  }
                                >
                                  {opt}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Special programs
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {SPECIAL_OPTIONS.map((opt) => (
                                <Chip
                                  key={opt}
                                  active={(m.specialPrograms || []).includes(
                                    opt,
                                  )}
                                  onClick={() =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        specialPrograms: toggleInArray(
                                          m.specialPrograms || [],
                                          opt,
                                        ),
                                      },
                                    )
                                  }
                                >
                                  {opt}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Fees for {sport.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                These prices show only for this sport on the
                                customer page
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <MoneyInput
                                label="Monthly fee"
                                value={m.monthlyFee || ""}
                                placeholder="1500"
                                onChange={(v) =>
                                  updateSportMeta(sport.category, sport.name, {
                                    monthlyFee: v,
                                  })
                                }
                              />
                              <MoneyInput
                                label="Yearly fee"
                                value={m.yearlyFee || ""}
                                placeholder="15000"
                                onChange={(v) =>
                                  updateSportMeta(sport.category, sport.name, {
                                    yearlyFee: v,
                                  })
                                }
                              />
                              <MoneyInput
                                label="Registration fee"
                                value={m.registrationFee || ""}
                                placeholder="500"
                                onChange={(v) =>
                                  updateSportMeta(sport.category, sport.name, {
                                    registrationFee: v,
                                  })
                                }
                              />
                              <Field label="Course duration">
                                <input
                                  className={inputCls}
                                  value={m.courseDuration || ""}
                                  onChange={(e) =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        courseDuration: e.target.value,
                                      },
                                    )
                                  }
                                  placeholder="e.g. 12 months"
                                />
                              </Field>
                              <Field label="Classes per week">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className={inputCls}
                                  value={m.classesPerWeek || ""}
                                  onChange={(e) =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        classesPerWeek: e.target.value.replace(
                                          /\D/g,
                                          "",
                                        ),
                                      },
                                    )
                                  }
                                  placeholder="e.g. 3"
                                />
                              </Field>
                              <Field label="Class duration (minutes)">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className={inputCls}
                                  value={m.classDuration || ""}
                                  onChange={(e) =>
                                    updateSportMeta(
                                      sport.category,
                                      sport.name,
                                      {
                                        classDuration: e.target.value.replace(
                                          /\D/g,
                                          "",
                                        ),
                                      },
                                    )
                                  }
                                  placeholder="e.g. 60"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setAddSportOpen(true)}
                className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:border-[#FF6A00] hover:text-[#FF6A00]"
              >
                <Plus size={18} />
                Add sport
              </button>

              <div className="pt-2 border-t border-slate-100 space-y-4">
                <p className="text-sm font-semibold text-slate-900">
                  Payment & refund (all sports)
                </p>
                <Field label="Payment methods">
                  <input
                    className={inputCls}
                    value={form.pricing.paymentMethods}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          paymentMethods: e.target.value,
                        },
                      }))
                    }
                    placeholder="UPI, Cash, Card, Bank transfer"
                  />
                </Field>
                <Field label="Refund policy">
                  <textarea
                    className={areaCls}
                    rows={3}
                    value={form.pricing.refundPolicy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          refundPolicy: e.target.value,
                        },
                      }))
                    }
                    placeholder="Explain refund / pause rules for students"
                  />
                </Field>
              </div>
            </Section>

            <Section
              id="section-facilities"
              number={4}
              title="Facilities"
              subtitle="Amenities available at your venue"
              done={(form.facilityTags || []).length > 0}
            >
              <div className="flex flex-wrap gap-2">
                {FACILITY_OPTIONS.map((tag) => (
                  <Chip
                    key={tag}
                    active={(form.facilityTags || []).includes(tag)}
                    onClick={() =>
                      setField(
                        "facilityTags",
                        toggleInArray(form.facilityTags || [], tag),
                      )
                    }
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
              <Field label="Extra facility details">
                <textarea
                  className={areaCls}
                  rows={3}
                  value={form.facilitiesInfrastructure}
                  onChange={(e) =>
                    setField("facilitiesInfrastructure", e.target.value)
                  }
                  placeholder="Anything else students should know"
                />
              </Field>
            </Section>

            <Section
              id="section-achievements"
              number={5}
              title="Achievements"
              subtitle="Awards and medals shown on your public profile"
              done={(form.achievementHighlights || []).length > 0}
            >
              <div className="space-y-3">
                {(form.achievementHighlights || []).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl border border-slate-200 p-4 space-y-3"
                  >
                    <Field label="Title">
                      <input
                        className={inputCls}
                        value={item.title || ""}
                        onChange={(e) => {
                          const next = [...form.achievementHighlights];
                          next[idx] = { ...item, title: e.target.value };
                          setField("achievementHighlights", next);
                        }}
                        placeholder="e.g. Karnataka State Championship"
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Year">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={inputCls}
                          value={item.year || ""}
                          onChange={(e) => {
                            const next = [...form.achievementHighlights];
                            next[idx] = {
                              ...item,
                              year: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            };
                            setField("achievementHighlights", next);
                          }}
                          placeholder="2024"
                        />
                      </Field>
                      <Field label="Short note">
                        <input
                          className={inputCls}
                          value={item.description || item.summary || ""}
                          onChange={(e) => {
                            const next = [...form.achievementHighlights];
                            next[idx] = {
                              ...item,
                              description: e.target.value,
                            };
                            setField("achievementHighlights", next);
                          }}
                          placeholder="Gold / team result"
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setField(
                          "achievementHighlights",
                          form.achievementHighlights.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-sm font-semibold text-red-600"
                    >
                      Remove achievement
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setField("achievementHighlights", [
                    ...form.achievementHighlights,
                    { id: uid(), title: "", year: "", description: "" },
                  ])
                }
                className="w-full min-h-[48px] rounded-xl border border-dashed border-slate-300 text-sm font-semibold"
              >
                + Add achievement
              </button>

              <div className="pt-2">
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  Medal counts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["district", "state", "national"].map((level) => (
                    <div
                      key={level}
                      className="rounded-2xl border border-slate-200 p-4 space-y-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {level}
                      </p>
                      {["gold", "silver", "bronze"].map((medal) => (
                        <Field key={medal} label={medal}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={inputCls}
                            value={
                              form.achievements?.[level]?.[medal] === 0 ||
                              form.achievements?.[level]?.[medal]
                                ? String(form.achievements[level][medal])
                                : ""
                            }
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setForm((prev) => ({
                                ...prev,
                                achievements: {
                                  ...prev.achievements,
                                  [level]: {
                                    ...prev.achievements[level],
                                    [medal]: raw === "" ? 0 : Number(raw),
                                  },
                                },
                              }));
                            }}
                            placeholder="0"
                          />
                        </Field>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Years training">
                  <input
                    type="text"
                    inputMode="numeric"
                    className={inputCls}
                    value={form.yearsInOperation}
                    onChange={(e) =>
                      setField(
                        "yearsInOperation",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    placeholder="10"
                  />
                </Field>
                <Field label="Students trained">
                  <input
                    type="text"
                    inputMode="numeric"
                    className={inputCls}
                    value={form.totalStudentsTrained}
                    onChange={(e) =>
                      setField(
                        "totalStudentsTrained",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    placeholder="500"
                  />
                </Field>
              </div>
            </Section>

            <Section
              id="section-media"
              number={6}
              title="Gallery & Videos"
              subtitle="Photos and reels for your public profile"
              done={galleryUrls.length > 0}
            >
              {galleryUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryUrls.slice(0, 12).map((url, i) => (
                    <div key={`${url}-${i}`} className="space-y-1.5">
                      <img
                        src={url}
                        alt=""
                        className="w-full aspect-square rounded-xl object-cover border border-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            mediaGallery: {
                              ...prev.mediaGallery,
                              trainingImages: (
                                prev.mediaGallery.trainingImages || []
                              ).filter(
                                (u) =>
                                  (typeof u === "string" ? u : u?.url) !== url,
                              ),
                              facilityImages: (
                                prev.mediaGallery.facilityImages || []
                              ).filter(
                                (u) =>
                                  (typeof u === "string" ? u : u?.url) !== url,
                              ),
                              equipmentImages: (
                                prev.mediaGallery.equipmentImages || []
                              ).filter(
                                (u) =>
                                  (typeof u === "string" ? u : u?.url) !== url,
                              ),
                              uniformImages: (
                                prev.mediaGallery.uniformImages || []
                              ).filter(
                                (u) =>
                                  (typeof u === "string" ? u : u?.url) !== url,
                              ),
                            },
                          }))
                        }
                        className="w-full text-xs font-semibold text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No photos yet</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("trainer-gallery-upload")?.click()
                  }
                  className="min-h-[44px] px-4 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
                >
                  {uploading === "gallery" ? "Uploading..." : "Add photos"}
                </button>
                <input
                  id="trainer-gallery-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0], "gallery")}
                />
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("trainer-facility-photo-upload")
                      ?.click()
                  }
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  {uploading === "facility"
                    ? "Uploading..."
                    : "Add facility photos"}
                </button>
                <input
                  id="trainer-facility-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleUpload(e.target.files?.[0], "facility")
                  }
                />
                <label className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold inline-flex items-center cursor-pointer">
                  {uploading === "reel" ? "Uploading..." : "Upload reel"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading("reel");
                      try {
                        const url = await uploadToCloudinary(file, "video");
                        setForm((prev) => ({
                          ...prev,
                          reels: [...(prev.reels || []), url],
                        }));
                      } catch {
                        flashNotice("Reel upload failed.");
                      } finally {
                        setUploading("");
                      }
                    }}
                  />
                </label>
              </div>
            </Section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer preview
                  </p>
                </div>
                <div className="aspect-[8/3] bg-slate-200">
                  {form.coverImageUrl ? (
                    <img
                      src={form.coverImageUrl}
                      alt=""
                      className="w-full h-full object-cover object-center"
                    />
                  ) : cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover object-center opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-orange-600" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white overflow-hidden shrink-0">
                      {form.profileImageUrl ? (
                        <img
                          src={form.profileImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#FF6A00] font-bold">
                          {(form.trainerName || "T").charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {form.trainerName || "Trainer Profile"}
                        </p>
                        <BadgeCheck
                          size={14}
                          className="text-sky-500 shrink-0"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {form.organizationType || "Trainer"}
                        {form.street ? ` · ${form.street}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    {[
                      ["Call", Phone],
                      ["Chat", MessageCircle],
                      ["Map", MapPin],
                    ].map(([label, Icon]) => (
                      <div
                        key={label}
                        className="min-h-[34px] rounded-lg bg-orange-50 text-[#FF6A00] text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Icon size={12} />
                        {label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 line-clamp-3">
                    {form.description || "Trainer story appears here."}
                  </p>
                  {sportsList.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-900">
                        Sports
                      </p>
                      {sportsList.slice(0, 4).map((s) => (
                        <div
                          key={s.key}
                          className="flex justify-between text-xs text-slate-600"
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="tabular-nums text-slate-900 font-medium">
                            {s.meta?.monthlyFee
                              ? `₹${s.meta.monthlyFee}`
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {(form.achievementHighlights || []).length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-900">
                        Achievements
                      </p>
                      {form.achievementHighlights.slice(0, 3).map((a, i) => (
                        <div
                          key={a.id || i}
                          className="flex gap-1.5 text-xs text-slate-600"
                        >
                          <Trophy
                            size={12}
                            className="text-[#FF6A00] mt-0.5 shrink-0"
                          />
                          <span className="truncate">
                            {a.title || "Untitled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {(form.facilityTags || []).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-900 mb-1.5">
                        Facilities
                      </p>
                      <ul className="space-y-1">
                        {form.facilityTags.slice(0, 5).map((tag) => (
                          <li
                            key={tag}
                            className="text-xs text-slate-600 flex items-center gap-1.5"
                          >
                            <CheckCircle2
                              size={12}
                              className="text-[#FF6A00]"
                            />
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] text-center text-slate-400 px-2">
                Preview updates live. Use Save Changes when finished.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {addSportOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Add sport</h3>
              <button
                type="button"
                onClick={() => setAddSportOpen(false)}
                className="text-sm font-semibold text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Category">
                <select
                  className={inputCls}
                  value={newSportCategory}
                  onChange={(e) => {
                    setNewSportCategory(e.target.value);
                    setNewSportName("");
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sport">
                <select
                  className={inputCls}
                  value={newSportName}
                  onChange={(e) => setNewSportName(e.target.value)}
                >
                  <option value="">Select sport</option>
                  {(SUB_CATEGORY_MAP[newSportCategory] || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={addSport}
                className="w-full min-h-[48px] rounded-xl bg-[#FF6A00] text-white font-semibold"
              >
                Add sport
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const MyAccountLayout = () => {
  const { user } = useAuth();
  const trainerUid = user?.uid || null;
  return <TrainerProfileWorkspace trainerUid={trainerUid} />;
};

export default MyAccountLayout;
