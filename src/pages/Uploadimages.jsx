import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../firebase";
import {
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Info,
  MapPin,
  Play,
  Plus,
  Rocket,
  Search,
  Share2,
  Sparkles,
  Trash2,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";

const ORANGE = "#FF6B00";
const PURPLE = "#A72FB5";
const FALLBACK_SPORTS = [
  "Karate",
  "Taekwondo",
  "Boxing",
  "MMA",
  "Judo",
  "Wrestling",
  "Dance",
  "Yoga",
  "Fitness",
  "Cricket",
  "Football",
  "Basketball",
  "Athletics",
  "Other",
];

const emptyForm = {
  title: "",
  description: "",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  location: "",
  caption: "",
};

const inputClass =
  "w-full min-h-[48px] rounded-xl border border-gray-200 bg-white px-4 text-[16px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100";

function Field({ label, children, required = false }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  maxLength,
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete="off"
      autoCorrect="on"
      autoCapitalize="sentences"
      enterKeyHint="next"
      className={`${inputClass} ${className}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, maxLength, className = "" }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete="off"
      autoCorrect="on"
      enterKeyHint="enter"
      className={`w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-[16px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100 ${className}`}
    />
  );
}

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const formatDate = (value) => {
  if (!value) return "";
  try {
    const date =
      value?.toDate?.() ||
      (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const cleanObject = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const flattenSports = (data = {}) => {
  const names = new Set();
  const categories = data.categories || {};
  Object.values(categories).forEach((subs) => {
    const list = Array.isArray(subs)
      ? subs
      : subs && typeof subs === "object"
        ? Object.keys(subs)
        : [];
    list.forEach((name) => name && names.add(name));
  });
  if (data.subCategory) names.add(data.subCategory);
  if (data.category && typeof data.category === "string") names.add(data.category);
  return Array.from(names);
};

const normalizeMediaItem = (item, index, source, ownerName) => {
  const url = typeof item === "string" ? item : item?.url;
  if (!url) return null;
  const about = typeof item === "string" ? "" : item?.about || "";
  const postType =
    (typeof item === "object" && item?.postType) ||
    (source === "reels" ? "reel" : "achievement");
  return {
    ...(typeof item === "object" ? item : {}),
    url,
    about,
    source,
    postType,
    title:
      (typeof item === "object" && (item.title || item.about)) ||
      (postType === "achievement" ? "Photo" : "Video"),
    id: `${source}_${url}_${index}`,
    ownerName,
  };
};

export default function AcademyPosts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { institute } = useAuth();
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const isStandaloneRoute = /uploadimages/i.test(location.pathname || "");

  const [screen, setScreen] = useState("posts");
  const [postType, setPostType] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [media, setMedia] = useState([]);
  const [cover, setCover] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [posts, setPosts] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [owner, setOwner] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);

  const currentMedia = media[selectedIndex] || media[0];
  const canUploadVideos =
    owner?.role === "trainer" || owner?.role === "institute";
  const isMemberPoster =
    owner?.role === "student" || owner?.role === "user";
  const roleLabel =
    owner?.role === "trainer"
      ? "Trainer"
      : owner?.role === "institute"
        ? "Institute"
        : owner?.role === "student"
          ? "Student"
          : owner?.role === "user"
            ? "Member"
            : "Account";
  const ownerName = owner?.displayName || roleLabel;
  const sportOptions = owner?.sports?.length ? owner.sports : FALLBACK_SPORTS;
  const filterOptions = canUploadVideos
    ? ["All", "Achievements", "Reels", "Videos"]
    : ["All", "Achievements", "Reels"];

  useEffect(() => {
    if (!canUploadVideos && activeFilter === "Videos") {
      setActiveFilter("All");
    }
  }, [canUploadVideos, activeFilter]);

  const revokeMediaUrls = (items) => {
    items.forEach((item) => {
      if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
    });
  };

  useEffect(() => {
    return () => {
      revokeMediaUrls(media);
      if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveOwnerProfile = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Please login first");

    const authRole = String(institute?.role || "").toLowerCase();

    const checksByPriority = {
      institute: [
        { name: "institutes", role: "institute" },
        { name: "trainers", role: "trainer" },
        { name: "InstituteTrainers", role: "trainer" },
        { name: "students", role: "student" },
        { name: "trainerstudents", role: "student" },
        { name: "users", role: "user" },
      ],
      trainer: [
        { name: "trainers", role: "trainer" },
        { name: "InstituteTrainers", role: "trainer" },
        { name: "institutes", role: "institute" },
        { name: "students", role: "student" },
        { name: "trainerstudents", role: "student" },
        { name: "users", role: "user" },
      ],
      student: [
        { name: "students", role: "student" },
        { name: "trainerstudents", role: "student" },
        { name: "users", role: "user" },
        { name: "trainers", role: "trainer" },
        { name: "InstituteTrainers", role: "trainer" },
        { name: "institutes", role: "institute" },
      ],
      user: [
        { name: "users", role: "user" },
        { name: "students", role: "student" },
        { name: "trainerstudents", role: "student" },
        { name: "trainers", role: "trainer" },
        { name: "InstituteTrainers", role: "trainer" },
        { name: "institutes", role: "institute" },
      ],
    };

    const orderedChecks =
      checksByPriority[authRole] || checksByPriority.student;

    for (const check of orderedChecks) {
      const ref = doc(db, check.name, uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;
      const data = snap.data() || {};
      const displayName =
        data.instituteName ||
        data.trainerName ||
        data.studentName ||
        data.academyName ||
        `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
        data.name ||
        data.displayName ||
        (check.role === "trainer"
          ? "Trainer"
          : check.role === "institute"
            ? "Institute"
            : check.role === "student"
              ? "Student"
              : "Member");

      return {
        uid,
        ref,
        collectionName: check.name,
        role: check.role,
        displayName,
        sports: flattenSports(data),
        location:
          data.city ||
          data.locationName ||
          data.locationAccessibility?.fullAddress ||
          "",
        data,
      };
    }

    throw new Error("No profile found for this login. Please complete signup first.");
  };

  const readPostsFromData = (data, displayName) => {
    const all = [];
    const imageSources = [
      ...(Array.isArray(data.trainingImages) ? data.trainingImages : []),
      ...(Array.isArray(data.mediaGallery?.trainingImages)
        ? data.mediaGallery.trainingImages
        : []),
    ];
    imageSources.forEach((item, index) => {
      const parsed = normalizeMediaItem(
        item,
        index,
        "trainingImages",
        displayName,
      );
      if (parsed) all.push(parsed);
    });

    (Array.isArray(data.reels) ? data.reels : []).forEach((item, index) => {
      const parsed = normalizeMediaItem(item, index, "reels", displayName);
      if (parsed) all.push(parsed);
    });

    const unique = new Map();
    all.forEach((item) => {
      const key = String(item.url).split("?")[0];
      if (!unique.has(key)) unique.set(key, item);
    });

    return Array.from(unique.values()).sort((a, b) => {
      const aDate = a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : new Date(a.createdAt || 0).getTime();
      const bDate = b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  };

  const loadPosts = async () => {
    try {
      setPageLoading(true);
      setError("");
      const profile = await resolveOwnerProfile();
      setOwner(profile);
      const snap = await getDoc(profile.ref);
      const data = snap.exists() ? snap.data() : {};
      setPosts(readPostsFromData(data, profile.displayName));
      setForm((prev) => ({
        ...prev,
        category: prev.category || profile.sports[0] || FALLBACK_SPORTS[0],
        location: prev.location || profile.location || "",
      }));
    } catch (err) {
      console.error(err);
      setOwner(null);
      setPosts([]);
      setError(err.message || "Unable to load posts");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPosts = useMemo(() => {
    const queryText = searchText.trim().toLowerCase();
    return posts.filter((post) => {
      if (!canUploadVideos && post.postType === "video") return false;

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Achievements" && post.postType === "achievement") ||
        (activeFilter === "Reels" && post.postType === "reel") ||
        (activeFilter === "Videos" && post.postType === "video");

      const haystack = [
        post.title,
        post.about,
        post.description,
        post.sportsCategory,
        post.category,
        post.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!queryText || haystack.includes(queryText));
    });
  }, [posts, activeFilter, searchText, canUploadVideos]);

  const openCreator = (type) => {
    if (type === "video" && !canUploadVideos) {
      setError("Training videos can only be uploaded by trainers and institutes.");
      return;
    }

    revokeMediaUrls(media);
    if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    setMedia([]);
    setCover(null);
    setSelectedIndex(0);
    setVideoMeta(null);
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
      category: sportOptions[0] || "Other",
      location: owner?.location || "",
    });
    setError("");
    setPostType(type);
    setScreen(
      type === "achievement" ? "achievement" : type === "reel" ? "reel" : "video",
    );
  };

  const backToPosts = () => {
    if (loading) return;
    setScreen("posts");
    setPostType(null);
    setError("");
    revokeMediaUrls(media);
    if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    setMedia([]);
    setCover(null);
    setSelectedIndex(0);
    setVideoMeta(null);
    loadPosts();
  };

  const handleHomeBack = () => {
    if (isStandaloneRoute) navigate(-1);
  };

  const updateForm = (key, value) => {
    setForm((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  };

  const removeCover = () => {
    if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    setCover(null);
    setError("");
  };

  const removeCurrentVideo = () => {
    revokeMediaUrls(media);
    setMedia([]);
    setSelectedIndex(0);
    setVideoMeta(null);
    setError("");
    if (screen === "preview" && (postType === "reel" || postType === "video")) {
      setScreen(postType);
    }
  };

  const replaceVideo = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds = 0) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const pickMedia = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const isAchievement = postType === "achievement";
    const expectedType = isAchievement ? "image" : "video";
    const maxCount = isAchievement ? 10 : 1;
    const accepted = [];
    let count = media.length;

    for (const file of files) {
      const correct = file.type.startsWith(`${expectedType}/`);
      if (!correct) continue;
      if (count >= maxCount) break;
      if (isAchievement && file.size > 12 * 1024 * 1024) {
        setError("Each photo should be under 12 MB.");
        continue;
      }
      if (postType === "reel" && file.size > 100 * 1024 * 1024) {
        setError("This reel is too large. Please select a smaller video.");
        continue;
      }
      const duplicate = media.some(
        (item) => item.file.name === file.name && item.file.size === file.size,
      );
      if (duplicate) continue;
      accepted.push({
        id: makeId(),
        file,
        url: URL.createObjectURL(file),
        type: file.type,
      });
      count += 1;
    }

    if (!accepted.length) {
      setError(
        isAchievement
          ? "Please select image files. Up to 10 photos are allowed."
          : `Please select one ${postType === "reel" ? "reel" : "training video"}.`,
      );
      return;
    }

    if (!isAchievement && media.length) {
      revokeMediaUrls(media);
    }

    setError("");
    setMedia((prev) => (isAchievement ? [...prev, ...accepted] : accepted));
    setSelectedIndex(0);

    if (!isAchievement && accepted[0]?.file) {
      const duration = await getVideoDuration(accepted[0].file);
      setVideoMeta({
        name: accepted[0].file.name,
        size: accepted[0].file.size,
        duration,
      });
    }
  };

  const pickCover = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select an image for the cover.");
      return;
    }
    if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    setCover({ file, url: URL.createObjectURL(file) });
    setError("");
  };

  const removeMedia = (index) => {
    const item = media[index];
    if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
    const next = media.filter((_, i) => i !== index);
    setMedia(next);
    setSelectedIndex(Math.max(0, Math.min(selectedIndex, next.length - 1)));
  };

  const validateForm = () => {
    if (!media.length) {
      setError(
        postType === "achievement"
          ? "Upload at least one photo."
          : `Select your ${postType}.`,
      );
      return false;
    }
    if (!form.title.trim()) {
      setError(
        postType === "achievement"
          ? "Achievement title is required."
          : `${postType === "reel" ? "Reel" : "Video"} title is required.`,
      );
      return false;
    }
    return true;
  };

  const uploadToCloudinary = async (file) => {
    const isVideo = file.type.startsWith("video");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "kirdana");

    const cloudUrl = isVideo
      ? "https://api.cloudinary.com/v1_1/dr0svrhu1/video/upload"
      : "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload";

    const response = await fetch(cloudUrl, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || "Upload failed. Please try again.");
    }
    return data.secure_url;
  };

  const getVideoDuration = (file) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(video.duration || 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      };
      video.src = objectUrl;
    });

  const continueToGalleryOrPreview = async () => {
    if (!validateForm()) return;

    if (postType === "video") {
      const duration = await getVideoDuration(media[0].file);
      if (duration > 0 && duration < 120) {
        setError("Training videos should be at least 2 minutes.");
        return;
      }
    }

    setError("");
    setScreen(postType === "achievement" ? "gallery" : "preview");
  };

  const buildPayload = (item, cloudUrl, index, coverUrl = "") =>
    cleanObject({
      url: cloudUrl,
      about: form.caption || form.description || form.title || "",
      createdAt: new Date().toISOString(),
      postType,
      title: form.title.trim(),
      description: form.description.trim(),
      sportsCategory: form.category || "",
      category: form.category || "",
      location: form.location || "",
      achievementDate: form.date || "",
      coverUrl: coverUrl || "",
      mediaId: item.id,
      order: index,
      ownerId: owner?.uid || auth.currentUser?.uid || "",
      ownerRole: owner?.role || "",
      ownerCollection: owner?.collectionName || "",
    });

  const saveToOwnerProfile = async (uploadedItems) => {
    const profile = owner || (await resolveOwnerProfile());
    if (!profile?.ref) throw new Error("No profile found for this login.");

    if (postType === "video" && profile.role !== "trainer" && profile.role !== "institute") {
      throw new Error("Training videos can only be uploaded by trainers and institutes.");
    }

    const payload = {
      updatedAt: serverTimestamp(),
    };

    if (postType === "achievement") {
      payload.trainingImages = arrayUnion(...uploadedItems);
      payload["mediaGallery.trainingImages"] = arrayUnion(...uploadedItems);
    } else {
      payload.reels = arrayUnion(...uploadedItems);
    }

    try {
      await updateDoc(profile.ref, payload);
    } catch {
      await setDoc(profile.ref, payload, { merge: true });
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    if (postType === "video" && !canUploadVideos) {
      setError("Training videos can only be uploaded by trainers and institutes.");
      return;
    }

    try {
      setLoading(true);
      setProgress(8);
      setError("");

      if (!owner) {
        const profile = await resolveOwnerProfile();
        setOwner(profile);
        if (
          postType === "video" &&
          profile.role !== "trainer" &&
          profile.role !== "institute"
        ) {
          throw new Error(
            "Training videos can only be uploaded by trainers and institutes.",
          );
        }
      }

      let coverUrl = "";
      if (cover?.file) {
        coverUrl = await uploadToCloudinary(cover.file);
        setProgress(20);
      }

      const uploadedItems = [];
      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        const cloudUrl = await uploadToCloudinary(item.file);
        uploadedItems.push(buildPayload(item, cloudUrl, index, coverUrl));
        setProgress(22 + Math.round(((index + 1) / media.length) * 60));
      }

      await saveToOwnerProfile(uploadedItems);
      setProgress(100);
      setScreen("success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed. Please try again.");
      setScreen("preview");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    if (loading) return;
    revokeMediaUrls(media);
    if (cover?.url?.startsWith("blob:")) URL.revokeObjectURL(cover.url);
    setMedia([]);
    setCover(null);
    setSelectedIndex(0);
    setVideoMeta(null);
    setForm(emptyForm);
    setPostType(null);
    setProgress(0);
    setError("");
  };

  useEffect(() => {
    if (screen === "publishing" && !loading && progress === 0) {
      handlePublish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, loading, progress]);

  const shellClass =
    "min-h-[100dvh] bg-[#F4F5F7] flex justify-center";
  const panelClass = "w-full max-w-lg md:max-w-4xl lg:max-w-5xl bg-[#F4F5F7]";

  const renderTopBar = (title, backAction) => (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/95 px-3 backdrop-blur border-b border-gray-100">
      <button
        type="button"
        onClick={backAction}
        className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
        aria-label="Back"
      >
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>
      <h1 className="text-base font-bold text-gray-900">{title}</h1>
      <div className="w-10" />
    </div>
  );

  const renderCategorySelect = () => (
    <div className="relative">
      <select
        value={form.category || sportOptions[0] || "Other"}
        onChange={(e) => updateForm("category", e.target.value)}
        className={`${inputClass} appearance-none pr-10`}
      >
        {sportOptions.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  );

  const renderBottomButton = (label, onClick, disabled = false, color = ORANGE) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[48px] w-full rounded-xl text-sm font-semibold text-white shadow-sm active:scale-[0.99] transition disabled:opacity-50"
      style={{ backgroundColor: color }}
    >
      {label}
    </button>
  );

  const renderError = () =>
    error ? (
      <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
        {error}
      </div>
    ) : null;

  const renderPosts = () => (
    <div className={shellClass}>
      <div className={panelClass}>
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="flex h-14 items-center gap-2 px-3">
            {isStandaloneRoute ? (
              <button
                type="button"
                onClick={handleHomeBack}
                className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-2" />
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900">Posts</h1>
              <p className="text-xs text-gray-500 truncate">
                {owner
                  ? `Saving to ${roleLabel} profile · ${ownerName}`
                  : "Login to share your posts"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pt-4 pb-6">
          {pageLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF6B00] border-t-transparent" />
            </div>
          ) : (
            <>
              {renderError()}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-[#FF6B00]">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {isMemberPoster
                        ? "Share your sports journey"
                        : `Share ${owner?.role === "trainer" ? "your" : "academy"} updates`}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {canUploadVideos
                        ? "Photos, reels and training videos appear on your public profile."
                        : "Post achievements and short reels. Training videos are for trainers and institutes only."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <CreateCard
                    icon={<Trophy size={20} />}
                    iconBg="#FFF0D7"
                    iconColor="#FF9A00"
                    title="Achievement"
                    description="Wins, certificates, belt promotions and awards."
                    button="Create"
                    onClick={() => openCreator("achievement")}
                    buttonColor={ORANGE}
                  />
                  <CreateCard
                    icon={<Film size={20} />}
                    iconBg="#F6E8F8"
                    iconColor={PURPLE}
                    title="Reels"
                    description="Short clips for your profile feed."
                    button="Upload"
                    onClick={() => openCreator("reel")}
                    buttonColor={PURPLE}
                  />
                  {canUploadVideos ? (
                    <CreateCard
                      icon={<Clapperboard size={20} />}
                      iconBg="#FFE9DE"
                      iconColor={ORANGE}
                      title="Videos"
                      description="Full sessions of 2 minutes or longer."
                      button="Upload"
                      onClick={() => openCreator("video")}
                      buttonColor={ORANGE}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3.5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 border border-gray-100">
                          <Clapperboard size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-700">
                            Training videos
                          </p>
                          <p className="mt-0.5 text-xs leading-4 text-gray-500">
                            Available for trainers and institutes only. You can
                            still share achievements and reels.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-gray-800">
                  Your recent posts
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("All");
                    setScreen("academyPosts");
                  }}
                  className="text-sm font-semibold text-[#FF6B00]"
                >
                  View all
                </button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {posts
                  .filter((post) => canUploadVideos || post.postType !== "video")
                  .slice(0, 8)
                  .map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setScreen("academyPosts")}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-200"
                  >
                    {post.postType === "achievement" ? (
                      <img
                        src={post.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="relative h-full w-full">
                        <video
                          src={post.coverUrl || post.url}
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          <Play size={16} fill="white" />
                        </span>
                      </div>
                    )}
                  </button>
                ))}
                {!posts.filter(
                  (post) => canUploadVideos || post.postType !== "video",
                ).length && (
                  <div className="flex h-20 w-full items-center justify-center rounded-xl bg-white text-sm text-gray-500">
                    No posts yet. Create your first post above.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAchievementForm = () => (
    <div className={shellClass}>
      <div className={panelClass}>
        {renderTopBar("Create Achievement", backToPosts)}
        <div className="px-4 pb-8 pt-2">
          <SectionTitle
            icon={<Trophy size={20} />}
            iconBg="#FFF0D7"
            iconColor="#FF9A00"
            title="Achievement details"
          />
          <Field label="Achievement title" required>
            <TextInput
              placeholder="Enter achievement title"
              value={form.title}
              onChange={(value) => updateForm("title", value)}
            />
          </Field>
          <Field label="Description">
            <TextInput
              placeholder="Describe the achievement"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
            />
          </Field>
          <Field label="Sports category">{renderCategorySelect()}</Field>
          <Field label="Achievement date">
            <div className="relative">
              <input
                type="date"
                className={`${inputClass} pr-11`}
                value={form.date}
                onChange={(e) => updateForm("date", e.target.value)}
              />
              <CalendarDays
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
          </Field>
          <Field label="Upload photos">
            <UploadBox
              icon={<ImageIcon size={24} />}
              iconColor={ORANGE}
              text="Tap to upload photos"
              subtext="Max 10 photos, 12 MB each"
              onClick={() => fileInputRef.current?.click()}
            />
          </Field>
          <Field label="Location">
            <div className="relative">
              <TextInput
                className="pl-11"
                placeholder="Enter location"
                value={form.location}
                onChange={(value) => updateForm("location", value)}
              />
              <MapPin
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
          </Field>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={pickMedia}
            className="hidden"
          />

          {media.length > 0 && (
            <div className="mb-4 grid grid-cols-4 sm:grid-cols-5 gap-2">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 ${
                    selectedIndex === index
                      ? "border-[#FF6B00]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      removeMedia(index);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {renderError()}
          {renderBottomButton(
            "Continue",
            continueToGalleryOrPreview,
            false,
            ORANGE,
          )}
        </div>
      </div>
    </div>
  );

  const renderMediaForm = () => {
    const isReel = postType === "reel";
    const accent = isReel ? PURPLE : ORANGE;
    return (
      <div className={shellClass}>
        <div className={panelClass}>
          {renderTopBar(isReel ? "Upload Reel" : "Upload Video", backToPosts)}
          <div className="px-4 pb-8 pt-2">
            <SectionTitle
              icon={isReel ? <Film size={20} /> : <Clapperboard size={20} />}
              iconBg={isReel ? "#F5E7F8" : "#FFE6D9"}
              iconColor={accent}
              title={isReel ? "Create reel" : "Training video"}
            />
            <Field label={isReel ? "Caption" : "Video title"} required>
              <TextInput
                placeholder={
                  isReel ? "Write a caption for your reel" : "Enter video title"
                }
                value={form.title}
                onChange={(value) => updateForm("title", value)}
              />
            </Field>
            {!isReel && (
              <Field label="Description">
                <TextInput
                  placeholder="Write a short description"
                  value={form.description}
                  onChange={(value) => updateForm("description", value)}
                />
              </Field>
            )}
            <Field label="Sports category">{renderCategorySelect()}</Field>
            <Field label={`Select ${isReel ? "reel" : "video"}`}>
              {media.length > 0 ? (
                <VideoPreviewPanel
                  media={media[0]}
                  videoMeta={videoMeta}
                  isReel={isReel}
                  accent={accent}
                  onRemove={removeCurrentVideo}
                  onReplace={replaceVideo}
                  formatDuration={formatDuration}
                  formatFileSize={formatFileSize}
                />
              ) : (
                <UploadBox
                  icon={isReel ? <Film size={24} /> : <Clapperboard size={24} />}
                  iconColor={accent}
                  text={`Tap to select ${isReel ? "reel" : "video"}`}
                  subtext="From gallery"
                  onClick={() => fileInputRef.current?.click()}
                />
              )}
            </Field>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={pickMedia}
              className="hidden"
            />
            <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">
                  Duration limit
                </p>
                <Info size={16} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isReel
                  ? "Any short clip is fine"
                  : "2 minutes or longer"}
              </p>
            </div>
            <Field label={isReel ? "Cover image" : "Thumbnail"}>
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex min-h-[48px] w-full items-center gap-3 text-left"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                    {cover ? (
                      <img
                        src={cover.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Plus size={18} className="text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-800 block">
                      {cover
                        ? "Change cover"
                        : `Upload ${isReel ? "cover" : "thumbnail"}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      Optional image for preview
                    </span>
                  </div>
                </button>
                {cover && (
                  <button
                    type="button"
                    onClick={removeCover}
                    className="mt-3 w-full min-h-[40px] rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={15} />
                    Remove cover
                  </button>
                )}
              </div>
            </Field>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={pickCover}
              className="hidden"
            />
            {renderError()}
            {renderBottomButton(
              isReel ? "Continue" : "Continue",
              continueToGalleryOrPreview,
              !media.length,
              accent,
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGallery = () => (
    <div className={shellClass}>
      <div className={`${panelClass} bg-white`}>
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-3">
          <button
            type="button"
            onClick={() => setScreen("achievement")}
            className="flex h-10 w-10 items-center justify-center rounded-full"
          >
            <X size={20} />
          </button>
          <h2 className="text-base font-semibold">Review photos</h2>
          <div className="w-10" />
        </div>
        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 pb-24">
          {media.map((item, index) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-square overflow-hidden ${
                selectedIndex === index ? "ring-2 ring-[#FF6B00] ring-inset" : ""
              }`}
            >
              <img src={item.url} alt="" className="h-full w-full object-cover" />
              {selectedIndex === index && (
                <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00] text-white">
                  <Check size={13} />
                </span>
              )}
            </button>
          ))}
          {media.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border border-dashed border-gray-300 bg-white text-sm font-semibold text-[#FF6B00]"
            >
              + Add
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={pickMedia}
          className="hidden"
        />
        <div className="fixed left-0 right-0 mx-auto flex max-w-lg md:max-w-4xl lg:max-w-5xl items-center justify-between border-t bg-white px-4 py-3"
          style={{
            bottom:
              "calc(var(--bottom-navbar-height, 64px) + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <span className="text-sm text-gray-600">
            {media.length} photo{media.length === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            onClick={() => setScreen("preview")}
            className="min-h-[44px] rounded-xl bg-[#FF6B00] px-6 text-sm font-semibold text-white"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className={shellClass}>
      <div className={panelClass}>
        {renderTopBar(
          "Preview",
          () => setScreen(postType === "achievement" ? "gallery" : postType),
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={pickMedia}
          className="hidden"
        />
        <div className="px-3 pt-3 pb-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative aspect-square bg-black">
              {currentMedia?.type?.startsWith("video") ? (
                <>
                  <video
                    src={currentMedia.url}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute left-0 right-0 top-0 flex gap-2 p-2 bg-gradient-to-b from-black/60 to-transparent">
                    <button
                      type="button"
                      onClick={replaceVideo}
                      className="flex-1 min-h-[40px] rounded-xl bg-white/95 text-xs sm:text-sm font-semibold text-gray-900 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={15} />
                      Change video
                    </button>
                    <button
                      type="button"
                      onClick={removeCurrentVideo}
                      className="min-h-[40px] px-3 rounded-xl bg-red-500/95 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <img
                  src={currentMedia?.url}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto bg-white p-2">
                {media.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                      selectedIndex === index
                        ? "border-[#FF6B00]"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 px-3 py-3">
              <TextArea
                maxLength={220}
                value={form.caption}
                onChange={(value) => updateForm("caption", value)}
                placeholder="Add a caption students will see..."
                className="h-20"
              />
              <div className="mt-1 text-right text-xs text-gray-400">
                {form.caption.length}/220
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-base font-bold text-gray-900">{form.title}</p>
            <p className="mt-1 text-sm text-gray-500">
              {[form.category, form.location].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Will be saved on your {roleLabel.toLowerCase()} profile
            </p>
          </div>
          {renderError()}
          <div className="mt-4">
            {renderBottomButton(
              "Publish",
              () => {
                setProgress(0);
                setScreen("publishing");
              },
              loading,
              ORANGE,
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPublishing = () => (
    <div className={shellClass}>
      <div className={`${panelClass} flex items-center justify-center px-8`}>
        <div className="w-full max-w-xs text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-36 w-36 items-end justify-center">
              <Rocket size={72} strokeWidth={1.6} className="text-[#FF6B00]" />
              <Sparkles
                size={17}
                className="absolute left-5 top-5 text-[#FFB000]"
              />
            </div>
          </div>
          <h2 className="text-lg font-bold">Uploading your post...</h2>
          <p className="mt-2 text-sm text-gray-500">
            Publishing to your {roleLabel.toLowerCase()} profile.
          </p>
          <div className="mx-auto mt-6 h-2 w-40 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#FF6B00] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-700">{progress}%</p>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className={shellClass}>
      <div className={`${panelClass} flex items-center justify-center px-8`}>
        <div className="w-full max-w-xs text-center">
          <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full bg-[#58B93E]">
            <Check size={50} strokeWidth={2.7} className="text-white" />
          </div>
          <h2 className="text-lg font-bold">Successfully published</h2>
          <p className="mt-2 text-sm text-gray-500">
            Students can now see this on your {roleLabel.toLowerCase()} profile.
          </p>
          <button
            type="button"
            onClick={() => {
              resetFlow();
              setScreen("academyPosts");
              loadPosts();
            }}
            className="mt-7 min-h-[44px] w-40 rounded-xl border border-[#FF6B00] text-sm font-semibold text-[#FF6B00]"
          >
            View posts
          </button>
          <button
            type="button"
            onClick={backToPosts}
            className="mt-4 block w-full text-sm font-semibold text-gray-800"
          >
            Back to create
          </button>
        </div>
      </div>
    </div>
  );

  const renderAcademyPosts = () => (
    <div className={shellClass}>
      <div className={panelClass}>
        <div className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex h-14 items-center gap-2 px-3">
            <button
              type="button"
              onClick={() => setScreen("posts")}
              className="flex h-10 w-10 items-center justify-center rounded-full"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900">
                {roleLabel} posts
              </h1>
              <p className="text-xs text-gray-500 truncate">{ownerName}</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`min-h-[36px] shrink-0 rounded-full px-4 text-sm font-semibold ${
                  activeFilter === filter
                    ? "bg-[#FF6B00] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pt-3 pb-20">
          <div className="mb-3 flex min-h-[48px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
            <Search size={16} className="text-gray-400" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Search posts"
              className="w-full bg-transparent text-[16px] outline-none"
            />
          </div>
          {filteredPosts.length ? (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm">
              <ImageIcon size={34} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm font-semibold text-gray-600">
                No posts found
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {canUploadVideos
                  ? "Create an achievement, reel or video to see it here."
                  : "Create an achievement or reel to see it here."}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openCreator("achievement")}
          className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-lg"
          style={{
            bottom:
              "calc(var(--bottom-navbar-height, 64px) + 16px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );

  if (screen === "posts") return renderPosts();
  if (screen === "achievement") return renderAchievementForm();
  if (screen === "video" && !canUploadVideos) return renderPosts();
  if (screen === "reel" || screen === "video") return renderMediaForm();
  if (screen === "gallery") return renderGallery();
  if (screen === "preview") return renderPreview();
  if (screen === "publishing") return renderPublishing();
  if (screen === "success") return renderSuccess();
  if (screen === "academyPosts") return renderAcademyPosts();
  return renderPosts();
}

function CreateCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  button,
  onClick,
  buttonColor,
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-4 text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="min-h-[40px] shrink-0 rounded-xl px-3 text-sm font-semibold text-white active:scale-95 transition"
        style={{ backgroundColor: buttonColor }}
      >
        {button}
      </button>
    </div>
  );
}

function SectionTitle({ icon, iconBg, iconColor, title }) {
  return (
    <div className="mb-4 mt-2 flex items-center gap-2">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <p className="text-base font-bold text-gray-900">{title}</p>
    </div>
  );
}

function UploadBox({ icon, iconColor, text, subtext, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white active:scale-[0.99] transition"
    >
      <span style={{ color: iconColor }}>{icon}</span>
      <span className="mt-1 text-sm font-semibold text-gray-800">{text}</span>
      <span className="text-xs text-gray-500">{subtext}</span>
    </button>
  );
}

function VideoPreviewPanel({
  media,
  videoMeta,
  isReel,
  accent,
  onRemove,
  onReplace,
  formatDuration,
  formatFileSize,
}) {
  const label = isReel ? "Reel" : "Video";
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="relative bg-black">
        <video
          src={media.url}
          controls
          playsInline
          className="max-h-52 w-full object-contain"
        />
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            {isReel ? <Film size={16} /> : <Clapperboard size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {videoMeta?.name || `${label} selected`}
            </p>
            <p className="text-xs text-gray-500">
              {[
                videoMeta?.duration ? formatDuration(videoMeta.duration) : null,
                videoMeta?.size ? formatFileSize(videoMeta.size) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Ready to upload"}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReplace}
            className="min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
          >
            <RefreshCw size={15} />
            Change {isReel ? "reel" : "video"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="min-h-[44px] rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
          >
            <Trash2 size={15} />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }) {
  const isVideo = post.postType === "reel" || post.postType === "video";
  const title =
    post.title ||
    post.about ||
    (post.postType === "achievement"
      ? "Achievement"
      : post.postType === "reel"
        ? "Reel"
        : "Training video");
  const image = post.coverUrl || post.thumbnailUrl || post.url;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-400">
            {formatDate(post.createdAt) || "Recently"}
            {post.category || post.sportsCategory
              ? ` · ${post.category || post.sportsCategory}`
              : ""}
          </p>
        </div>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {isVideo ? (
          <video src={image} muted playsInline className="h-full w-full object-cover" />
        ) : (
          <img src={image} alt="" className="h-full w-full object-cover" />
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
              <Play size={18} fill="white" />
            </span>
          </span>
        )}
      </div>
      {(post.about || post.description) && (
        <p className="px-3 py-2 text-sm text-gray-600 line-clamp-2">
          {post.about || post.description}
        </p>
      )}
      <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500">
        <Share2 size={14} />
        Visible on your public profile
      </div>
    </article>
  );
}
