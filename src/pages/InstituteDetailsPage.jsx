// src/pages/InstituteDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Eye,
  Share2,
  Phone,
  Mail,
  MapPin,
  Users,
  Trophy,
  Award,
  Briefcase,
  Globe,
  UserRound,
} from "lucide-react";

export default function InstituteDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [inst, setInst] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [mediaPosts, setMediaPosts] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [showAllMedia, setShowAllMedia] = useState(false);
  // ================= FETCH MEDIA FROM FIREBASE =================

  const [pageLoading, setPageLoading] = useState(true);
  const handleShare = async () => {
    try {
      const profileUrl = `${window.location.origin}/institutes/${inst.id}`;

      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: inst.instituteName,
          text: `Check out ${inst.instituteName} on Kridana`,
          url: profileUrl,
          dialogTitle: "Share Institute",
        });
      } else {
        await navigator.share({
          title: inst.instituteName,
          text: `Check out ${inst.instituteName} on Kridana`,
          url: profileUrl,
        });
      }
    } catch (err) {
      console.log(err);
    }
  };
  // ================= FETCH INSTITUTE =================
  // ================= REPLACE ONLY loadData useEffect =================

  useEffect(() => {
    const loadData = async () => {
      try {
        setPageLoading(true);

        const ref = doc(db, "institutes", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setInst({});
          setMediaPosts([]);
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        setInst(data);

        const posts = [];

        // =========================================
        // FETCH TRAINING IMAGES
        // supports:
        // old => ["url1","url2"]
        // new => [{url,about}]
        // =========================================
        const trainingImages = data.trainingImages || [];
        const mediaTraining = data.mediaGallery?.trainingImages || [];
        const extraGallery = [
          ...(data.mediaGallery?.facilityImages || []),
          ...(data.mediaGallery?.equipmentImages || []),
          ...(data.mediaGallery?.uniformImages || []),
        ];

        const allImages = [...trainingImages, ...mediaTraining, ...extraGallery];
        const seenMediaUrls = new Set();

        allImages.forEach((item, i) => {
          const url = typeof item === "string" ? item : item?.url;
          const about = typeof item === "string" ? "" : item?.about || "";

          if (!url) return;
          const urlKey = String(url).split("?")[0].trim();
          if (seenMediaUrls.has(urlKey)) return;
          seenMediaUrls.add(urlKey);

          posts.push({
            id: `post_${id}_img_${i}`, // KEEP SAME SYSTEM
            postId: `post_${id}_img_${i}`,
            ownerId: id,
            ownerType: "institute",
            type: "image",
            url,
            title: about || "Training Session",
          });
        });

        // =========================================
        // FETCH REELS
        // supports:
        // old => ["url.mp4"]
        // new => [{url,about}]
        // =========================================
        const reels = data.reels || [];

        reels.forEach((item, i) => {
          const url = typeof item === "string" ? item : item?.url;
          const about = typeof item === "string" ? "" : item?.about || "";

          if (!url) return;
          const urlKey = String(url).split("?")[0].trim();
          if (seenMediaUrls.has(urlKey)) return;
          seenMediaUrls.add(urlKey);

          posts.push({
            id: `institute_${id}_${i}`, // KEEP SAME REEL ID SYSTEM
            reelId: `institute_${id}_${i}`,
            ownerId: id,
            ownerType: "institute",
            type: "video",
            url,
            title: about || "",
          });
        });

        setMediaPosts(posts);
      } catch (error) {
        console.log(error);
        setInst({});
        setMediaPosts([]);
      } finally {
        setPageLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);
  // ================= LOADING FIX =================

  // MediaCard owns its own view/like handlers; keep toggleLike for legacy prop wiring.
  const handleView = async () => {};

  // ================= LIKE TOGGLE =================
  const toggleLike = async (postId) => {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login first");
      return;
    }

    const likeId = `${postId}_${user.uid}`;
    const likeRef = doc(db, "postlikes", likeId);

    const q = query(
      collection(db, "postlikes"),
      where("__name__", "==", likeId),
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, {
        postId,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    }
  };
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "institutes", id));
      if (snap.exists()) setInst({ id: snap.id, ...snap.data() });
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, "followers"), where("profileId", "==", id));

    const unsub = onSnapshot(q, (snap) => {
      setFollowersCount(snap.size);
    });

    return () => unsub();
  }, [id]);

  const startChat = async () => {
    if (inst?.chatEnabled === false) {
      alert("Chat is disabled by this academy");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first");
      return;
    }

    const chatId = [user.uid, inst.id].sort().join("_");

    await setDoc(
      doc(db, "chats", chatId),
      {
        type: "institute",
        members: [user.uid, inst.id],
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    navigate(`/chat/${chatId}`);
  };

  if (!inst) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const mapQuery =
    inst.latitude && inst.longitude
      ? `${inst.latitude},${inst.longitude}`
      : [inst.street, inst.landmark, inst.city, inst.state]
          .filter(Boolean)
          .join(", ") ||
        [inst.city, inst.state].filter(Boolean).join(", ") ||
        inst.locationName ||
        "India";

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&output=embed`;

  const directionsUrl =
    inst.latitude && inst.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${inst.latitude},${inst.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          mapQuery,
        )}`;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  const achievements = inst.achievements || {};
  const totalAwards = Object.values(achievements).reduce((sum, level) => {
    return (
      sum +
      Number(level.gold || 0) +
      Number(level.silver || 0) +
      Number(level.bronze || 0)
    );
  }, 0);
  const experienceYears = inst.yearFounded
    ? new Date().getFullYear() - Number(inst.yearFounded)
    : 0;
  // ================= NO DATA =================
  if (!inst || Object.keys(inst).length === 0) {
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-500">
        No Institute Found
      </div>
    );
  }

  const chatEnabled = inst.chatEnabled !== false;
  const academyName = inst.instituteName || "Academy";
  const founderName = inst.founderName || inst.headCoach || "";
  const founderBg = inst.founderBackground || inst.designation || "";
  const websiteUrl = inst.websiteLink || inst.website || "";
  const facilityList = Array.isArray(inst.facilityTags) ? inst.facilityTags : [];
  const highlightList = Array.isArray(inst.achievementHighlights)
    ? inst.achievementHighlights.filter((item) => item?.title)
    : [];
  const pricingPackages = Array.isArray(inst.pricing?.packages)
    ? inst.pricing.packages
    : [];
  const programs = Array.isArray(inst.trainingPrograms)
    ? inst.trainingPrograms
    : [];
  const trainerList = Array.isArray(inst.trainers)
    ? inst.trainers
    : Array.isArray(inst.trainerList)
      ? inst.trainerList
      : [];

  const availableSports = [];
  const seenSports = new Set();
  const categoriesMap = inst.categories || {};
  const detailsMap = inst.sportDetails || {};

  const pushSport = (category, name, meta = {}) => {
    const key = `${category}__${name}`;
    if (seenSports.has(key)) return;
    seenSports.add(key);
    const detail = detailsMap?.[category]?.[name] || meta || {};
    const relatedPrograms = programs.filter(
      (p) => p.subCategory === name || p.programName === name,
    );
    const relatedPackages = pricingPackages.filter(
      (p) => p.subCategory === name || p.name === name,
    );
    availableSports.push({
      key,
      category,
      name,
      shortDescription: detail.shortDescription || "",
      ageGroups: detail.ageGroups || [],
      trainingLevels: detail.trainingLevels || [],
      specialPrograms: detail.specialPrograms || [],
      monthlyFee: detail.monthlyFee || relatedPackages[0]?.monthlyFee || "",
      yearlyFee: detail.yearlyFee || relatedPackages[0]?.yearlyFee || "",
      registrationFee:
        detail.registrationFee || relatedPackages[0]?.registrationFee || "",
      courseDuration: detail.courseDuration || "",
      classesPerWeek: detail.classesPerWeek || "",
      classDuration: detail.classDuration || "",
      image: detail.image || "",
      programs: relatedPrograms,
      packages: relatedPackages,
    });
  };

  Object.entries(categoriesMap).forEach(([category, subs]) => {
    const names = Array.isArray(subs)
      ? subs
      : subs && typeof subs === "object"
        ? Object.keys(subs)
        : [];
    names.forEach((name) => pushSport(category, name));
  });
  Object.entries(detailsMap).forEach(([category, sportsMap]) => {
    Object.keys(sportsMap || {}).forEach((name) => pushSport(category, name));
  });

  const uniqueMediaPosts = [];
  const seenDisplayUrls = new Set();
  mediaPosts.forEach((post) => {
    const key = `${post.type || "image"}_${String(post.url || "")
      .split("?")[0]
      .trim()}`;
    if (!post.url || seenDisplayUrls.has(key)) return;
    seenDisplayUrls.add(key);
    uniqueMediaPosts.push(post);
  });

  const heroImage =
    inst.coverImageUrl ||
    uniqueMediaPosts.find((p) => p.type === "image")?.url ||
    inst.profileImageUrl ||
    "";
  const galleryImages = uniqueMediaPosts.filter((p) => p.type === "image");
  const galleryVideos = uniqueMediaPosts.filter((p) => p.type === "video");

  const locationParts = [
    inst.street,
    inst.landmark,
    inst.city,
    inst.state,
  ].filter(Boolean);
  const locationLabel =
    locationParts.join(", ") || inst.locationName || "Location not listed";
  const shortLocation =
    [inst.city, inst.state].filter(Boolean).join(", ") ||
    inst.landmark ||
    inst.street ||
    "India";

  const yearsShown =
    Number(inst.yearsInOperation) ||
    (experienceYears > 0 ? experienceYears : 0);
  const studentsShown =
    Number(inst.totalStudentsTrained) ||
    (Array.isArray(inst.customers) ? inst.customers.length : 0) ||
    0;
  const rating = Number(inst.rating || 0);
  const reviewCount = Number(inst.reviewCount || 0);

  const selected =
    selectedSport ||
    (availableSports.length ? availableSports[0] : null);

  const formatFee = (v) => {
    if (v === undefined || v === null || v === "") return null;
    return `₹${Number(v).toLocaleString("en-IN")}`;
  };

  return (
    <div className="page-content min-h-screen bg-[#F5F6F8] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="flex-1 text-center text-sm font-semibold text-slate-900 truncate px-2">
            {academyName}
          </p>
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800"
            aria-label="Share"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 pt-4 sm:pt-6">
        {/* Hero */}
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-200 border border-slate-200">
          {heroImage ? (
            <img
              src={heroImage}
              alt={academyName}
              className="w-full h-48 sm:h-64 md:h-72 object-cover"
            />
          ) : (
            <div className="w-full h-48 sm:h-64 md:h-72 bg-gradient-to-br from-slate-800 via-slate-700 to-[#FF6A00]" />
          )}
        </div>

        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
              {inst.profileImageUrl ? (
                <img
                  src={inst.profileImageUrl}
                  alt={`${academyName} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#FF6A00]">
                  {academyName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {academyName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {inst.organizationType || "Sports Academy"}
              </p>
              <p className="text-sm text-slate-600 mt-2 flex items-start gap-1.5">
                <MapPin size={15} className="text-[#FF6A00] mt-0.5 shrink-0" />
                <span>{locationLabel}</span>
              </p>
              {founderName ? (
                <p className="text-sm text-slate-600 mt-1.5 flex items-center gap-1.5">
                  <UserRound size={15} className="text-[#FF6A00] shrink-0" />
                  <span>
                    Founder / Coach:{" "}
                    <span className="font-semibold text-slate-800">
                      {founderName}
                    </span>
                  </span>
                </p>
              ) : null}
              {(rating > 0 || reviewCount > 0) && (
                <p className="text-sm text-slate-700 mt-1.5">
                  <span className="text-[#FF6A00] font-bold">★</span>{" "}
                  <span className="font-semibold">
                    {rating ? rating.toFixed(1) : "New"}
                  </span>
                  {reviewCount > 0 ? (
                    <span className="text-slate-400">
                      {" "}
                      · {reviewCount} reviews
                    </span>
                  ) : null}
                </p>
              )}
            </div>
          </div>

          {/* Desktop CTAs */}
          <div
            className={`hidden md:grid gap-2 mt-5 ${
              chatEnabled ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            <a
              href={inst.phoneNumber ? `tel:${inst.phoneNumber}` : undefined}
              onClick={(e) => {
                if (!inst.phoneNumber) {
                  e.preventDefault();
                  alert("Phone number not available");
                }
              }}
              className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Phone size={16} />
              Call Academy
            </a>
            {chatEnabled ? (
              <button
                type="button"
                onClick={startChat}
                className="min-h-[48px] rounded-xl border border-[#FF6A00] text-[#FF6A00] font-semibold text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Chat
              </button>
            ) : null}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[48px] rounded-xl border border-slate-200 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <MapPin size={16} />
              Directions
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Users size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">{studentsShown || "—"}</p>
              <p className="text-[11px] text-slate-500">Students</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Heart size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">{followersCount}</p>
              <p className="text-[11px] text-slate-500">Followers</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Trophy size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">{totalAwards || highlightList.length || "—"}</p>
              <p className="text-[11px] text-slate-500">Awards</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Briefcase size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">
                {yearsShown ? `${yearsShown}+` : "—"}
              </p>
              <p className="text-[11px] text-slate-500">Years</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* About */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                About {academyName}
              </h2>
              <AboutBlock
                text={inst.description || founderBg || ""}
                emptyText="This academy has not added a description yet."
              />
              {founderName && founderBg ? (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    About the founder
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-medium text-slate-800">
                      {founderName}
                    </span>
                    {" — "}
                    {founderBg}
                  </p>
                </div>
              ) : null}
            </section>

            {/* Sports & Programs */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-end justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sports & Programs
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Tap a sport to see fees, age groups and schedule
                  </p>
                </div>
              </div>

              {availableSports.length === 0 && programs.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No sports or programs listed yet.
                </p>
              ) : (
                <>
                  {availableSports.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {availableSports.map((sport) => {
                        const active = selected?.key === sport.key;
                        return (
                          <button
                            key={sport.key}
                            type="button"
                            onClick={() => setSelectedSport(sport)}
                            className={`min-h-[40px] px-3.5 rounded-xl text-sm font-semibold border transition ${
                              active
                                ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {sport.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {selected ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {selected.image ? (
                          <img
                            src={selected.image}
                            alt={selected.name}
                            className="w-full sm:w-36 h-36 rounded-xl object-cover border border-slate-200"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {selected.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Category: {selected.category}
                          </p>
                          {selected.shortDescription ? (
                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                              {selected.shortDescription}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 mt-2">
                              Description will appear when the academy adds it.
                            </p>
                          )}
                        </div>
                      </div>

                      {(selected.ageGroups?.length > 0 ||
                        selected.trainingLevels?.length > 0 ||
                        selected.specialPrograms?.length > 0) && (
                        <div className="space-y-2">
                          {selected.ageGroups?.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">
                                Age groups
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selected.ageGroups.map((a) => (
                                  <span
                                    key={a}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {selected.trainingLevels?.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">
                                Training levels
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selected.trainingLevels.map((a) => (
                                  <span
                                    key={a}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {selected.specialPrograms?.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">
                                Special programs
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selected.specialPrograms.map((a) => (
                                  <span
                                    key={a}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2">
                          Fees for {selected.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <FeeTile
                            label="Monthly"
                            value={formatFee(selected.monthlyFee)}
                          />
                          <FeeTile
                            label="Yearly"
                            value={formatFee(selected.yearlyFee)}
                          />
                          <FeeTile
                            label="Registration"
                            value={formatFee(selected.registrationFee)}
                          />
                        </div>
                        {(selected.courseDuration ||
                          selected.classesPerWeek ||
                          selected.classDuration) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                            {selected.courseDuration ? (
                              <FeeTile
                                label="Course duration"
                                value={selected.courseDuration}
                              />
                            ) : null}
                            {selected.classesPerWeek ? (
                              <FeeTile
                                label="Classes / week"
                                value={selected.classesPerWeek}
                              />
                            ) : null}
                            {selected.classDuration ? (
                              <FeeTile
                                label="Class length"
                                value={`${selected.classDuration} mins`}
                              />
                            ) : null}
                          </div>
                        )}
                        {!selected.monthlyFee &&
                          !selected.yearlyFee &&
                          selected.packages.length === 0 && (
                            <p className="text-xs text-slate-400 mt-2">
                              Fees will show here when the academy adds them.
                            </p>
                          )}
                      </div>

                      {selected.programs.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-2">
                            Class batches
                          </p>
                          <div className="space-y-2">
                            {(showAllPrograms
                              ? selected.programs
                              : selected.programs.slice(0, 3)
                            ).map((program, index) => (
                              <div
                                key={program.id || index}
                                className="rounded-xl bg-white border border-slate-200 p-3"
                              >
                                <p className="font-semibold text-sm text-slate-900">
                                  {program.programName || selected.name}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {[
                                    program.ageGroup,
                                    program.batchTimings,
                                    program.duration,
                                    program.skillLevel,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "Schedule details coming soon"}
                                </p>
                                {program.fees ? (
                                  <p className="text-sm font-semibold text-[#FF6A00] mt-2">
                                    ₹{program.fees}
                                    {program.feeCycle
                                      ? ` / ${program.feeCycle}`
                                      : ""}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          {selected.programs.length > 3 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllPrograms((v) => !v)
                              }
                              className="mt-2 text-sm font-semibold text-[#FF6A00]"
                            >
                              {showAllPrograms
                                ? "Show less"
                                : `View all ${selected.programs.length} batches`}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Fallback program list if no sports categories */}
                  {availableSports.length === 0 && programs.length > 0 ? (
                    <div className="space-y-3">
                      {(showAllPrograms ? programs : programs.slice(0, 4)).map(
                        (program, index) => (
                          <div
                            key={program.id || index}
                            className="rounded-xl border border-orange-100 bg-orange-50/50 p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-slate-900">
                                  {program.programName ||
                                    program.subCategory ||
                                    "Program"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {[program.category, program.subCategory]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              {program.skillLevel ? (
                                <span className="text-xs font-semibold bg-[#FF6A00] text-white px-2.5 py-1 rounded-full">
                                  {program.skillLevel}
                                </span>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <FeeTile label="Age group" value={program.ageGroup} />
                              <FeeTile label="Schedule" value={program.batchTimings} />
                              <FeeTile label="Duration" value={program.duration} />
                              <FeeTile
                                label={program.feeCycle ? `Fee / ${program.feeCycle}` : "Fee"}
                                value={
                                  program.fees ? `₹${program.fees}` : null
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                      {programs.length > 4 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPrograms((v) => !v)}
                          className="w-full min-h-[44px] rounded-xl bg-[#FF6A00] text-white font-semibold text-sm"
                        >
                          {showAllPrograms
                            ? "Show less"
                            : `View all programs (${programs.length})`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {/* Trainers */}
            {trainerList.length > 0 ? (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  Trainers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trainerList.map((t, i) => {
                    const name =
                      typeof t === "string"
                        ? t
                        : t?.name || t?.trainerName || "Trainer";
                    const photo =
                      typeof t === "object"
                        ? t.photo || t.profileImageUrl || ""
                        : "";
                    const role =
                      typeof t === "object"
                        ? t.role || t.specialization || t.experience || ""
                        : "";
                    return (
                      <div
                        key={t?.id || i}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          {photo ? (
                            <img
                              src={photo}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#FF6A00] font-bold">
                              {String(name).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">
                            {name}
                          </p>
                          {role ? (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {role}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* Facilities */}
            {(facilityList.length > 0 || inst.facilitiesInfrastructure) && (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  Facilities
                </h2>
                {facilityList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {facilityList.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 text-[#E85D04] text-xs font-semibold border border-orange-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {inst.facilitiesInfrastructure ? (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {inst.facilitiesInfrastructure}
                  </p>
                ) : null}
              </section>
            )}

            {/* Achievements */}
            {(highlightList.length > 0 || totalAwards > 0) && (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  Achievements
                </h2>
                {highlightList.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {highlightList.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-start gap-2.5 rounded-xl bg-orange-50/80 border border-orange-100 px-3 py-2.5"
                      >
                        <Award
                          size={16}
                          className="text-[#FF6A00] mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                          {(item.year || item.description || item.summary) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[item.year, item.description || item.summary]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {inst.achievements ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-4 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                      <span>Level</span>
                      <span>Gold</span>
                      <span>Silver</span>
                      <span>Bronze</span>
                    </div>
                    {Object.entries(inst.achievements).map(([level, medals]) => (
                      <div
                        key={level}
                        className="grid grid-cols-4 px-3 py-2.5 text-sm border-t border-slate-100"
                      >
                        <span className="font-medium text-slate-800 capitalize">
                          {level}
                        </span>
                        <span>{medals?.gold || 0}</span>
                        <span>{medals?.silver || 0}</span>
                        <span>{medals?.bronze || 0}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            )}

            {/* Fees overview */}
            {pricingPackages.length > 0 ? (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Fees & Packages
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Package overview across sports
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pricingPackages.map((pkg, i) => (
                    <div
                      key={pkg.id || i}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="font-semibold text-slate-900">
                        {pkg.subCategory || pkg.name || "Class fees"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[pkg.category, pkg.billingCycle]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {pkg.monthlyFee ? (
                          <FeeTile
                            label="Monthly"
                            value={formatFee(pkg.monthlyFee)}
                          />
                        ) : null}
                        {pkg.yearlyFee ? (
                          <FeeTile
                            label="Yearly"
                            value={formatFee(pkg.yearlyFee)}
                          />
                        ) : null}
                        {pkg.registrationFee ? (
                          <FeeTile
                            label="Registration"
                            value={formatFee(pkg.registrationFee)}
                          />
                        ) : null}
                        {pkg.uniformFee ? (
                          <FeeTile
                            label="Kit / Uniform"
                            value={formatFee(pkg.uniformFee)}
                          />
                        ) : null}
                      </div>
                      {pkg.notes ? (
                        <p className="text-xs text-slate-500 mt-2">{pkg.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {(inst.pricing?.paymentMethods ||
                  inst.pricing?.refundPolicy) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-sm text-slate-600">
                    {inst.pricing.paymentMethods ? (
                      <p>
                        <span className="font-semibold text-slate-800">
                          Payments:
                        </span>{" "}
                        {inst.pricing.paymentMethods}
                      </p>
                    ) : null}
                    {inst.pricing.refundPolicy ? (
                      <p>
                        <span className="font-semibold text-slate-800">
                          Refund:
                        </span>{" "}
                        {inst.pricing.refundPolicy}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}

            {/* Gallery */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Gallery & Videos
                </h2>
                {uniqueMediaPosts.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllMedia((v) => !v)}
                    className="text-sm font-semibold text-[#FF6A00]"
                  >
                    {showAllMedia ? "Show less" : "View all"}
                  </button>
                ) : null}
              </div>

              {uniqueMediaPosts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No photos or videos yet.
                </p>
              ) : !showAllMedia ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uniqueMediaPosts.slice(0, 6).map((post, idx) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setShowAllMedia(true)}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100"
                    >
                      {post.type === "video" ? (
                        <video
                          src={post.url}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={post.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {idx === 5 && uniqueMediaPosts.length > 6 ? (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
                          +{uniqueMediaPosts.length - 6} more
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {uniqueMediaPosts.map((post) => (
                    <MediaCard key={post.id} post={post} />
                  ))}
                </div>
              )}
              {(galleryImages.length > 0 || galleryVideos.length > 0) && (
                <p className="text-xs text-slate-400 mt-3">
                  {galleryImages.length} photos
                  {galleryVideos.length
                    ? ` · ${galleryVideos.length} videos`
                    : ""}
                </p>
              )}
            </section>

            {/* Contact */}
            {(inst.phoneNumber || inst.email || websiteUrl) && (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  Contact
                </h2>
                <div className="space-y-3">
                  {inst.phoneNumber ? (
                    <a
                      href={`tel:${inst.phoneNumber}`}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <span className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                        <Phone size={16} />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Phone</p>
                        <p className="font-semibold">
                          {inst.countryCode ? `${inst.countryCode} ` : ""}
                          {inst.phoneNumber}
                        </p>
                      </div>
                    </a>
                  ) : null}
                  {inst.email ? (
                    <a
                      href={`mailto:${inst.email}`}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <span className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                        <Mail size={16} />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="font-semibold break-all">{inst.email}</p>
                      </div>
                    </a>
                  ) : null}
                  {websiteUrl ? (
                    <a
                      href={
                        websiteUrl.startsWith("http")
                          ? websiteUrl
                          : `https://${websiteUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 text-sm text-[#FF6A00] font-medium"
                    >
                      <span className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                        <Globe size={16} />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Website</p>
                        <p className="font-semibold break-all">{websiteUrl}</p>
                      </div>
                    </a>
                  ) : null}
                </div>
              </section>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block space-y-4 sticky top-16">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Location
                </h3>
                <p className="text-xs text-slate-500 mt-1">{shortLocation}</p>
              </div>
              <iframe
                title="map"
                src={mapSrc}
                className="w-full h-48 border-0"
                loading="lazy"
              />
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-sm font-semibold text-[#FF6A00] py-3 border-t border-slate-100 hover:bg-orange-50"
              >
                Get directions
              </a>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <p className="font-semibold">Interested in joining?</p>
              <p className="text-xs text-white/70 mt-1 mb-3">
                Reach out to {academyName} for a trial or more details.
              </p>
              <div className="space-y-2">
                <a
                  href={inst.phoneNumber ? `tel:${inst.phoneNumber}` : undefined}
                  onClick={(e) => {
                    if (!inst.phoneNumber) {
                      e.preventDefault();
                      alert("Phone number not available");
                    }
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-[#FF6A00] flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Phone size={15} /> Call now
                </a>
                {chatEnabled ? (
                  <button
                    type="button"
                    onClick={startChat}
                    className="w-full min-h-[44px] rounded-xl bg-white/10 border border-white/20 flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <MessageCircle size={15} /> Start chat
                  </button>
                ) : (
                  <p className="text-[11px] text-white/50 text-center py-1">
                    Chat is currently disabled by this academy
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile map */}
        <section className="lg:hidden mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3">
            <h2 className="text-base font-bold text-slate-900">Location</h2>
            <p className="text-sm text-slate-500 mt-1">{locationLabel}</p>
          </div>
          <iframe
            title="map-mobile"
            src={mapSrc}
            className="w-full h-48 border-0"
            loading="lazy"
          />
        </section>
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="md:hidden fixed left-0 right-0 z-[70] bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2.5"
        style={{
          bottom:
            "calc(var(--bottom-navbar-height, 64px) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className={`grid gap-2 ${
            chatEnabled ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <a
            href={inst.phoneNumber ? `tel:${inst.phoneNumber}` : undefined}
            onClick={(e) => {
              if (!inst.phoneNumber) {
                e.preventDefault();
                alert("Phone number not available");
              }
            }}
            className="min-h-[44px] rounded-xl bg-[#FF6A00] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Phone size={15} /> Call
          </a>
          {chatEnabled ? (
            <button
              type="button"
              onClick={startChat}
              className="min-h-[44px] rounded-xl border border-[#FF6A00] text-[#FF6A00] text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={15} /> Chat
            </button>
          ) : null}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-[44px] rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <MapPin size={15} /> Map
          </a>
        </div>
      </div>
    </div>
  );
}

function AboutBlock({ text, emptyText }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTrim = (text || "").length > 220;
  if (!text) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <div>
      <p
        className={`text-sm text-slate-700 leading-7 whitespace-pre-wrap break-words ${
          expanded ? "" : "line-clamp-5"
        }`}
      >
        {text}
      </p>
      {shouldTrim ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[#FF6A00] font-semibold text-sm"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function FeeTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5 break-words">
        {value || "—"}
      </p>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function MediaCard({ post }) {
  const isReel = post.type === "video";
  const [openPreview, setOpenPreview] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(0);
  const [liked, setLiked] = useState(false);

  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentList, setCommentList] = useState([]);

  const user = auth.currentUser;

  const itemId = post.id;
  // ===================================================
  // MAKE CLEAN REEL ID
  // ===================================================
  // Need post.ownerType = institute / trainer
  // Need post.ownerId = profile id
  // Need post.index = reel index

  // ===================================================
  // FETCH COUNTS
  // ===================================================
  useEffect(() => {
    let unsub1, unsub2, unsub3;

    if (isReel) {
      // LIKE
      const q1 = query(
        collection(db, "reelLikes"),
        where("reelId", "==", itemId),
      );

      unsub1 = onSnapshot(q1, (snap) => {
        setLikes(snap.size);

        if (user) {
          setLiked(snap.docs.some((d) => d.data().userId === user.uid));
        }
      });

      // VIEW
      const q2 = query(
        collection(db, "reelViews"),
        where("reelId", "==", itemId),
      );

      unsub2 = onSnapshot(q2, (snap) => {
        setViews(snap.size);
      });

      // COMMENT
      unsub3 = onSnapshot(
        collection(db, "reelComments", itemId, "comments"),
        (snap) => {
          setComments(snap.size);

          setCommentList(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          );
        },
      );
    } else {
      // IMAGE LIKE
      const q1 = query(
        collection(db, "postlikes"),
        where("postId", "==", itemId),
      );

      unsub1 = onSnapshot(q1, (snap) => {
        setLikes(snap.size);

        if (user) {
          setLiked(snap.docs.some((d) => d.data().userId === user.uid));
        }
      });

      // IMAGE VIEW
      const q2 = query(
        collection(db, "postviews"),
        where("postId", "==", itemId),
      );

      unsub2 = onSnapshot(q2, (snap) => {
        setViews(snap.size);
      });

      // IMAGE COMMENT
      const q3 = query(
        collection(db, "postcomments"),
        where("postId", "==", itemId),
      );

      unsub3 = onSnapshot(q3, (snap) => {
        setComments(snap.size);

        setCommentList(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
      });
    }

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
      unsub3 && unsub3();
    };
  }, [itemId]);

  // ===================================================
  // LIKE
  // ===================================================
  const handleLike = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (isReel) {
      const docId = `${itemId}_${user.uid}`;

      const ref = doc(db, "reelLikes", docId);

      if (liked) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          reelId: itemId,
          userId: user.uid,
        });
      }
    } else {
      const docId = `${itemId}_${user.uid}`;

      const ref = doc(db, "postlikes", docId);

      if (liked) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          postId: itemId,
          userId: user.uid,
        });
      }
    }
  };

  // ===================================================
  // VIEW
  // ===================================================
  const handleView = async () => {
    if (!user) return;

    if (isReel) {
      const docId = `${itemId}_${user.uid}`;

      await setDoc(
        doc(db, "reelViews", docId),
        {
          reelId: itemId,
          userId: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      const docId = `${itemId}_${user.uid}`;

      await setDoc(
        doc(db, "postviews", docId),
        {
          postId: itemId,
          userId: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  };

  // ===================================================
  // COMMENT
  // ===================================================
  const sendComment = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (!commentText.trim()) return;

    if (isReel) {
      await addDoc(collection(db, "reelComments", itemId, "comments"), {
        text: commentText,
        userId: user.uid,
        userName: user.email || "User",
        createdAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "postcomments"), {
        postId: itemId,
        text: commentText,
        userId: user.uid,
        userName: user.email || "User",
        createdAt: serverTimestamp(),
      });
    }

    setCommentText("");
  };

  // ================= REPLACE ONLY MediaCard RETURN =================

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isReel ? (
          <video
            src={post.url}
            controls
            onPlay={handleView}
            onClick={handleView}
            className="w-full max-h-[280px] sm:max-h-[380px] object-cover cursor-pointer"
          />
        ) : (
          <img
            src={post.url}
            alt=""
            onClick={() => {
              handleView();
              setOpenPreview(true);
            }}
            className="w-full max-h-[280px] sm:max-h-[380px] object-cover cursor-pointer"
          />
        )}

        {/* ABOUT TEXT */}
        {post.title && (
          <div className="px-4 pt-3">
            <p className="text-sm sm:text-base text-gray-800 leading-6 break-words whitespace-pre-wrap">
              {post.title}
            </p>
          </div>
        )}

        <div className="p-4">
          <div className="flex justify-between text-sm text-gray-500">
            <button
              onClick={handleLike}
              className={`flex gap-1 items-center ${
                liked ? "text-red-500" : ""
              }`}
            >
              <Heart size={17} fill={liked ? "currentColor" : "none"} />
              {likes}
            </button>

            <div className="flex gap-1 items-center">
              <Eye size={17} />
              {views}
            </div>

            <button
              onClick={() => setShowCommentBox(!showCommentBox)}
              className="flex gap-1 items-center"
            >
              <MessageCircle size={17} />
              {comments}
            </button>
          </div>

          {showCommentBox && (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 border px-3 py-2 rounded-lg text-sm"
                  placeholder="Write comment..."
                />

                <button
                  onClick={sendComment}
                  className="bg-[#FF6B00] text-white px-4 rounded-lg"
                >
                  Send
                </button>
              </div>

              <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                {commentList.map((c) => (
                  <div key={c.id} className="bg-gray-100 px-3 py-2 rounded-lg">
                    <p className="text-xs font-semibold">{c.userName}</p>
                    <p className="text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* FULL SCREEN PREVIEW */}
      {/* FULL SCREEN PREVIEW */}
      {/* FULL SCREEN PREVIEW */}
      {openPreview && (
        <div className="fixed inset-0 z-[999] bg-black">
          {/* CLOSE BUTTON */}
          <button
            onClick={() => setOpenPreview(false)}
            className="absolute top-4 right-4 z-50
                 w-10 h-10 rounded-full
                 bg-black/50 backdrop-blur-md
                 flex items-center justify-center
                 text-white text-2xl"
          >
            ✕
          </button>

          {/* MAIN CONTENT */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            {isReel ? (
              <video
                src={post.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={post.url}
                alt=""
                className="w-full h-full object-contain bg-black select-none"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}