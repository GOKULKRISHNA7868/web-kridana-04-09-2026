// src/pages/TrainerDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import {
  collection,
  doc,
  query,
  where,
  setDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import SeoHead, { buildTrainerJsonLd } from "../components/SeoHead";
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
  IndianRupee,
  Clock,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";

export default function TrainerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [mediaPosts, setMediaPosts] = useState([]);
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);
  const [showAllMedia, setShowAllMedia] = useState(false);

  const handleShare = async () => {
    try {
      const profileUrl = `${window.location.origin}/trainers/${trainer.id}`;
      const title =
        trainer.trainerName ||
        `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
        "Trainer";

      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title,
          text: "Check out this trainer on Kridana",
          url: profileUrl,
          dialogTitle: "Share Trainer",
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title,
          text: "Check out this trainer on Kridana",
          url: profileUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      alert("Profile link copied to clipboard!");
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    const loadTrainer = async () => {
      try {
        setPageLoading(true);

        const snap = await getDoc(doc(db, "trainers", id));

        if (!snap.exists()) {
          setTrainer({});
          setMediaPosts([]);
          return;
        }

        const data = { id: snap.id, ...snap.data() };

        if (
          !Array.isArray(data.trainingPrograms) ||
          data.trainingPrograms.length === 0
        ) {
          try {
            const activitySnap = await getDoc(doc(db, "myactivity", id));
            if (activitySnap.exists() && activitySnap.data()?.programName) {
              data.trainingPrograms = [activitySnap.data()];
            }
          } catch (err) {
            console.log(err);
          }
        }

        setTrainer(data);

        const posts = [];
        const seenMediaUrls = new Set();

        const pushImage = (item, i, fallbackTitle) => {
          const url = typeof item === "string" ? item : item?.url;
          const about = typeof item === "string" ? "" : item?.about || "";
          if (!url) return;
          const urlKey = String(url).split("?")[0].trim();
          if (seenMediaUrls.has(urlKey)) return;
          seenMediaUrls.add(urlKey);
          posts.push({
            id: `post_${id}_img_${i}_${posts.length}`,
            postId: `post_${id}_img_${i}_${posts.length}`,
            ownerId: id,
            ownerType: "trainer",
            type: "image",
            url,
            title: about || fallbackTitle,
          });
        };

        const trainingImages = data.trainingImages || [];
        const mediaTraining = data.mediaGallery?.trainingImages || [];
        const extraGallery = [
          ...(data.mediaGallery?.facilityImages || []),
          ...(data.mediaGallery?.equipmentImages || []),
          ...(data.mediaGallery?.uniformImages || []),
        ];
        const awardsImages = data.awardsImages || [];
        const plainImages = data.images || [];

        [
          ...trainingImages,
          ...mediaTraining,
          ...extraGallery,
          ...awardsImages,
          ...plainImages,
        ].forEach((item, i) => pushImage(item, i, "Training Photo"));

        if (data.coverImageUrl) {
          pushImage(data.coverImageUrl, "cover", "Cover Photo");
        }

        const reels = data.reels || [];
        reels.forEach((item, i) => {
          const url = typeof item === "string" ? item : item?.url;
          const about = typeof item === "string" ? "" : item?.about || "";
          if (!url) return;
          const urlKey = String(url).split("?")[0].trim();
          if (seenMediaUrls.has(urlKey)) return;
          seenMediaUrls.add(urlKey);
          posts.push({
            id: `trainer_${id}_${i}`,
            reelId: `trainer_${id}_${i}`,
            ownerId: id,
            ownerType: "trainer",
            type: "video",
            url,
            title: about || "Trainer Reel",
          });
        });

        setMediaPosts(posts);
      } catch (error) {
        console.log(error);
        setTrainer({});
        setMediaPosts([]);
      } finally {
        setPageLoading(false);
      }
    };

    if (id) loadTrainer();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, "followers"), where("profileId", "==", id));

    const unsub = onSnapshot(q, (snap) => {
      setFollowersCount(snap.size);
    });

    return () => unsub();
  }, [id]);

  const startTrainerChat = async () => {
    if (trainer?.chatEnabled === false) {
      alert("Chat is disabled by this trainer");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first");
      return;
    }

    const chatId = [user.uid, trainer.id].sort().join("_");

    await setDoc(
      doc(db, "chats", chatId),
      {
        type: "trainer",
        members: [user.uid, trainer.id],
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    navigate(`/chat/${chatId}`);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (!trainer || Object.keys(trainer).length === 0) {
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-500">
        No Trainer Found
      </div>
    );
  }

  const displayName =
    trainer.trainerName ||
    `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
    "Trainer";

  const chatEnabled = trainer.chatEnabled !== false;

  const mapQuery =
    trainer.latitude && trainer.longitude
      ? `${trainer.latitude},${trainer.longitude}`
      : [
          trainer.street,
          trainer.landmark,
          trainer.locationAccessibility?.fullAddress,
          trainer.city,
          trainer.state,
        ]
          .filter(Boolean)
          .join(", ") ||
        [trainer.city, trainer.state].filter(Boolean).join(", ") ||
        trainer.locationName ||
        "India";

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&output=embed`;

  const directionsUrl =
    trainer.latitude && trainer.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${trainer.latitude},${trainer.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          mapQuery,
        )}`;

  const achievements = trainer.achievements || {};
  const totalAwards = Object.values(achievements).reduce((sum, level) => {
    return (
      sum +
      Number(level?.gold || 0) +
      Number(level?.silver || 0) +
      Number(level?.bronze || 0)
    );
  }, 0);

  const experienceYears = trainer.yearFounded
    ? Math.max(0, new Date().getFullYear() - Number(trainer.yearFounded))
    : 0;

  const coachName =
    trainer.founderName ||
    trainer.headCoach ||
    displayName;
  const coachBg = trainer.founderBackground || trainer.designation || "";
  const websiteUrl =
    trainer.websiteLink ||
    trainer.website ||
    trainer.locationAccessibility?.website ||
    "";
  const facilityList = Array.isArray(trainer.facilityTags)
    ? trainer.facilityTags
    : [];
  const highlightList = Array.isArray(trainer.achievementHighlights)
    ? trainer.achievementHighlights.filter((item) => item?.title)
    : [];

  const savedPackages =
    Array.isArray(trainer.pricing?.packages) && trainer.pricing.packages.length
      ? trainer.pricing.packages
      : trainer.pricing?.monthlyFees ||
          trainer.pricing?.registrationFees ||
          trainer.pricing?.uniformCost
        ? [
            {
              billingCycle: "Standard fees",
              monthlyFee: trainer.pricing?.monthlyFees,
              registrationFee: trainer.pricing?.registrationFees,
              uniformFee: trainer.pricing?.uniformCost,
            },
          ]
        : [];

  const programs = Array.isArray(trainer.trainingPrograms)
    ? trainer.trainingPrograms
    : [];

  const programFeePackages = programs
    .filter((program) => program.fees)
    .map((program, index) => ({
      id: program.id || `program-fee-${index}`,
      category: program.category || "",
      subCategory: program.subCategory || program.programName || "",
      name: program.programName || program.subCategory || "Class fee",
      billingCycle: program.feeCycle || "Class fee",
      otherFee: program.fees,
      otherFeeName: program.programName || "Class fee",
      notes: [program.ageGroup, program.batchTimings, program.duration]
        .filter(Boolean)
        .join(" · "),
      fromProgram: true,
    }));

  const pricingPackages =
    savedPackages.length > 0
      ? savedPackages
      : programFeePackages.length > 0
        ? programFeePackages
        : [];

  const availableSports = [];
  const seenSports = new Set();
  const categoriesMap = trainer.categories || {};
  const detailsMap = trainer.sportDetails || {};

  const pushSport = (category, name, meta = {}) => {
    if (!name) return;
    const cat = category || "Sport";
    const key = `${cat}__${name}`;
    if (seenSports.has(key)) return;
    seenSports.add(key);
    const detail = detailsMap?.[cat]?.[name] || meta || {};
    const relatedPrograms = programs.filter(
      (p) =>
        p.subCategory === name ||
        p.programName === name ||
        (p.category === cat &&
          (p.subCategory === name || p.programName === name)),
    );
    const relatedPackages = pricingPackages.filter(
      (p) =>
        (p.subCategory === name || p.name === name) &&
        (!p.category || p.category === cat),
    );
    const pkg = relatedPackages[0] || {};
    availableSports.push({
      key,
      category: cat,
      name,
      shortDescription: detail.shortDescription || "",
      ageGroups: detail.ageGroups || [],
      trainingLevels: detail.trainingLevels || [],
      specialPrograms: detail.specialPrograms || [],
      monthlyFee: detail.monthlyFee || pkg.monthlyFee || "",
      yearlyFee: detail.yearlyFee || pkg.yearlyFee || "",
      registrationFee: detail.registrationFee || pkg.registrationFee || "",
      uniformFee: detail.uniformFee || pkg.uniformFee || "",
      otherFee: detail.otherFee || pkg.otherFee || "",
      otherFeeName: detail.otherFeeName || pkg.otherFeeName || "Other fee",
      billingCycle: detail.billingCycle || pkg.billingCycle || "",
      feeNotes:
        detail.feeNotes ||
        detail.notes ||
        (pkg.notes && !detail.monthlyFee && !detail.yearlyFee
          ? pkg.notes
          : "") ||
        "",
      courseDuration: detail.courseDuration || "",
      classesPerWeek: detail.classesPerWeek || "",
      classDuration: detail.classDuration || "",
      image: detail.image || "",
      programs: relatedPrograms,
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

  programs.forEach((program) => {
    const name = program.subCategory || program.programName;
    if (name) pushSport(program.category || "Sport", name);
  });

  pricingPackages.forEach((pkg) => {
    const name = pkg.subCategory || pkg.name;
    if (name) pushSport(pkg.category || "Sport", name);
  });

  if (availableSports.length === 0 && trainer.subCategory) {
    pushSport(trainer.category || "Sport", trainer.subCategory);
  }

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

  const heroImage = trainer.coverImageUrl || "";
  const heroFallback =
    uniqueMediaPosts.find((p) => p.type === "image")?.url ||
    trainer.profileImageUrl ||
    "";
  const bannerSrc = heroImage || heroFallback;
  const galleryImages = uniqueMediaPosts.filter((p) => p.type === "image");
  const galleryVideos = uniqueMediaPosts.filter((p) => p.type === "video");

  const locationParts = [
    trainer.street,
    trainer.landmark,
    trainer.locationAccessibility?.fullAddress,
    trainer.city,
    trainer.state,
  ].filter(Boolean);
  const locationLabel =
    locationParts.join(", ") ||
    trainer.locationName ||
    "Location not listed";
  const shortLocation =
    [trainer.city, trainer.state].filter(Boolean).join(", ") ||
    trainer.landmark ||
    trainer.street ||
    "India";

  const yearsShown =
    Number(trainer.yearsInOperation) ||
    Number(trainer.experience) ||
    (experienceYears > 0 ? experienceYears : 0);
  const studentsShown =
    Number(trainer.totalStudentsTrained) ||
    (Array.isArray(trainer.students) ? trainer.students.length : 0) ||
    0;
  const rating = Number(trainer.rating || 0);
  const reviewCount = Number(trainer.reviewCount || 0);

  const selected =
    availableSports.find((s) => s.key === selectedSport?.key) ||
    availableSports[0] ||
    null;

  const formatFee = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const num = Number(v);
    if (Number.isNaN(num)) return String(v);
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const selectedHasFees = Boolean(
    selected &&
      (selected.monthlyFee ||
        selected.yearlyFee ||
        selected.registrationFee ||
        selected.uniformFee ||
        selected.otherFee ||
        selected.programs?.some((p) => p.fees)),
  );

  const orphanPackages = pricingPackages.filter((pkg) => {
    const sportName = pkg.subCategory || pkg.name || "";
    const match = availableSports.find(
      (s) =>
        s.name === sportName &&
        (!pkg.category || pkg.category === s.category),
    );
    if (!match) return true;
    const sportAlreadyShows =
      match.monthlyFee ||
      match.yearlyFee ||
      match.registrationFee ||
      match.uniformFee ||
      match.otherFee;
    return !sportAlreadyShows;
  });

  const showFeesOverview =
    orphanPackages.length > 0 ||
    ((trainer.pricing?.paymentMethods || trainer.pricing?.refundPolicy) &&
      availableSports.length === 0);

  const aboutText =
    trainer.description || trainer.about || trainer.designation || "";

  return (
    <div className="page-content min-h-screen bg-[#F5F6F8] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <SeoHead
        title={`${displayName}${shortLocation ? ` · ${shortLocation}` : ""} — Solo Trainer`}
        description={
          (
            aboutText ||
            `${displayName} is a sports trainer on Kridana. ${shortLocation}. View sports, fees, and book a session.`
          ).slice(0, 300)
        }
        path={`/trainers/${trainer.id}`}
        image={
          trainer.profileImageUrl ||
          trainer.coverImageUrl ||
          "/Kridana logo.png"
        }
        type="profile"
        jsonLdId="trainer"
        jsonLd={buildTrainerJsonLd(trainer, `/trainers/${trainer.id}`)}
      />
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
            {displayName}
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
        {/* Hero banner */}
        <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-200 border border-slate-200">
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt={`${displayName} banner`}
              className="w-full aspect-[8/3] object-cover object-center"
            />
          ) : (
            <div className="w-full aspect-[8/3] bg-gradient-to-br from-slate-800 via-slate-700 to-[#FF6A00]" />
          )}
        </div>

        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
              {trainer.profileImageUrl ? (
                <img
                  src={trainer.profileImageUrl}
                  alt={`${displayName} profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#FF6A00]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {displayName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {trainer.organizationType ||
                  trainer.designation ||
                  trainer.type ||
                  "Solo Trainer"}
              </p>
              <p className="text-sm text-slate-600 mt-2 flex items-start gap-1.5">
                <MapPin size={15} className="text-[#FF6A00] mt-0.5 shrink-0" />
                <span>{locationLabel}</span>
              </p>
              {coachName ? (
                <p className="text-sm text-slate-600 mt-1.5 flex items-center gap-1.5">
                  <UserRound size={15} className="text-[#FF6A00] shrink-0" />
                  <span>
                    Coach:{" "}
                    <span className="font-semibold text-slate-800">
                      {coachName}
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
              href={trainer.phoneNumber ? `tel:${trainer.phoneNumber}` : undefined}
              onClick={(e) => {
                if (!trainer.phoneNumber) {
                  e.preventDefault();
                  alert("Phone number not available");
                }
              }}
              className="min-h-[48px] rounded-xl bg-[#FF6A00] text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Phone size={16} />
              Call Trainer
            </a>
            {chatEnabled ? (
              <button
                type="button"
                onClick={startTrainerChat}
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
              <p className="text-sm font-bold text-slate-900">
                {studentsShown || "—"}
              </p>
              <p className="text-[11px] text-slate-500">Students</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Heart size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">{followersCount}</p>
              <p className="text-[11px] text-slate-500">Followers</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Trophy size={16} className="mx-auto text-[#FF6A00] mb-1" />
              <p className="text-sm font-bold text-slate-900">
                {totalAwards || highlightList.length || "—"}
              </p>
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
                About {displayName}
              </h2>
              <AboutBlock
                text={aboutText}
                emptyText="This trainer has not added a description yet."
              />
              {coachName && coachBg && coachBg !== aboutText ? (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    About the coach
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-medium text-slate-800">
                      {coachName}
                    </span>
                    {" — "}
                    {coachBg}
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
                            onClick={() => {
                              setSelectedSport(sport);
                              setShowAllPrograms(false);
                            }}
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
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-5 py-4 text-white">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {selected.image ? (
                            <img
                              src={selected.image}
                              alt={selected.name}
                              className="w-full sm:w-28 h-28 rounded-xl object-cover border border-white/20 shrink-0"
                            />
                          ) : (
                            <div className="w-full sm:w-28 h-28 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                              <Trophy className="text-[#FF6A00]" size={32} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">
                              {selected.category}
                            </p>
                            <h3 className="text-xl font-bold mt-0.5">
                              {selected.name}
                            </h3>
                            {selected.shortDescription ? (
                              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                                {selected.shortDescription}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400 mt-2">
                                Program details will appear when the trainer
                                adds them.
                              </p>
                            )}
                            {selected.billingCycle ? (
                              <p className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold bg-white/10 text-orange-200 px-2.5 py-1 rounded-lg">
                                <BadgeCheck size={14} />
                                Billed {selected.billingCycle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-5">
                        {(selected.ageGroups?.length > 0 ||
                          selected.trainingLevels?.length > 0 ||
                          selected.specialPrograms?.length > 0) && (
                          <div className="space-y-3">
                            {selected.ageGroups?.length > 0 ? (
                              <ChipGroup
                                title="Age groups"
                                items={selected.ageGroups}
                              />
                            ) : null}
                            {selected.trainingLevels?.length > 0 ? (
                              <ChipGroup
                                title="Training levels"
                                items={selected.trainingLevels}
                              />
                            ) : null}
                            {selected.specialPrograms?.length > 0 ? (
                              <ChipGroup
                                title="Special programs"
                                items={selected.specialPrograms}
                              />
                            ) : null}
                          </div>
                        )}

                        <div className="rounded-2xl border border-orange-100 bg-orange-50/40 overflow-hidden">
                          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-orange-100/80 bg-orange-50">
                            <span className="w-9 h-9 rounded-xl bg-[#FF6A00] text-white flex items-center justify-center shrink-0">
                              <IndianRupee size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">
                                Fee details — {selected.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Transparent pricing for this sport
                              </p>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            {selectedHasFees ? (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  {selected.monthlyFee ? (
                                    <FeeHighlight
                                      label="Monthly fee"
                                      value={formatFee(selected.monthlyFee)}
                                      accent
                                    />
                                  ) : null}
                                  {selected.yearlyFee ? (
                                    <FeeHighlight
                                      label="Yearly fee"
                                      value={formatFee(selected.yearlyFee)}
                                      accent
                                    />
                                  ) : null}
                                  {selected.registrationFee ? (
                                    <FeeHighlight
                                      label="Registration"
                                      value={formatFee(
                                        selected.registrationFee,
                                      )}
                                    />
                                  ) : null}
                                  {selected.uniformFee ? (
                                    <FeeHighlight
                                      label="Kit / Uniform"
                                      value={formatFee(selected.uniformFee)}
                                    />
                                  ) : null}
                                  {selected.otherFee ? (
                                    <FeeHighlight
                                      label={
                                        selected.otherFeeName || "Other fee"
                                      }
                                      value={formatFee(selected.otherFee)}
                                    />
                                  ) : null}
                                </div>

                                {selected.feeNotes ? (
                                  <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
                                    <span className="font-semibold text-slate-800">
                                      Note:{" "}
                                    </span>
                                    {selected.feeNotes}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <p className="text-sm text-slate-500 text-center py-4">
                                Fees for this sport will show here when the
                                trainer adds them.
                              </p>
                            )}
                          </div>
                        </div>

                        {(selected.courseDuration ||
                          selected.classesPerWeek ||
                          selected.classDuration) && (
                          <div>
                            <div className="flex items-center gap-2 mb-2.5">
                              <Clock size={16} className="text-[#FF6A00]" />
                              <p className="text-sm font-bold text-slate-900">
                                Schedule & structure
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {selected.courseDuration ? (
                                <InfoTile
                                  icon={CalendarDays}
                                  label="Course duration"
                                  value={selected.courseDuration}
                                />
                              ) : null}
                              {selected.classesPerWeek ? (
                                <InfoTile
                                  icon={CalendarDays}
                                  label="Classes / week"
                                  value={`${selected.classesPerWeek}`}
                                />
                              ) : null}
                              {selected.classDuration ? (
                                <InfoTile
                                  icon={Clock}
                                  label="Class length"
                                  value={`${selected.classDuration} mins`}
                                />
                              ) : null}
                            </div>
                          </div>
                        )}

                        {(trainer.pricing?.paymentMethods ||
                          trainer.pricing?.refundPolicy) && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Payment & policies
                            </p>
                            {trainer.pricing.paymentMethods ? (
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">
                                  Payments:{" "}
                                </span>
                                {trainer.pricing.paymentMethods}
                              </p>
                            ) : null}
                            {trainer.pricing.refundPolicy ? (
                              <p className="text-sm text-slate-700 leading-relaxed">
                                <span className="font-semibold text-slate-900">
                                  Refund:{" "}
                                </span>
                                {trainer.pricing.refundPolicy}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {selected.programs.length > 0 ? (
                          <div>
                            <p className="text-sm font-bold text-slate-900 mb-2.5">
                              Class batches
                            </p>
                            <div className="space-y-2.5">
                              {(showAllPrograms
                                ? selected.programs
                                : selected.programs.slice(0, 3)
                              ).map((program, index) => (
                                <div
                                  key={program.id || index}
                                  className="rounded-xl bg-slate-50 border border-slate-200 p-3.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
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
                                          .join(" · ") ||
                                          "Schedule details coming soon"}
                                      </p>
                                    </div>
                                    {program.fees &&
                                    String(program.fees) !==
                                      String(selected.monthlyFee || "") ? (
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-[#FF6A00]">
                                          {formatFee(program.fees)}
                                        </p>
                                        {program.feeCycle ? (
                                          <p className="text-[11px] text-slate-500">
                                            / {program.feeCycle}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                    {program.ageGroup ? (
                                      <FeeTile
                                        label="Age"
                                        value={program.ageGroup}
                                      />
                                    ) : null}
                                    {program.batchTimings ? (
                                      <FeeTile
                                        label="Timings"
                                        value={program.batchTimings}
                                      />
                                    ) : null}
                                    {program.duration ? (
                                      <FeeTile
                                        label="Duration"
                                        value={program.duration}
                                      />
                                    ) : null}
                                    {program.skillLevel ? (
                                      <FeeTile
                                        label="Level"
                                        value={program.skillLevel}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {selected.programs.length > 3 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAllPrograms((v) => !v)
                                }
                                className="mt-2.5 text-sm font-semibold text-[#FF6A00]"
                              >
                                {showAllPrograms
                                  ? "Show less"
                                  : `View all ${selected.programs.length} batches`}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

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
                              <FeeTile
                                label="Age group"
                                value={program.ageGroup}
                              />
                              <FeeTile
                                label="Schedule"
                                value={program.batchTimings}
                              />
                              <FeeTile
                                label="Duration"
                                value={program.duration}
                              />
                              <FeeTile
                                label={
                                  program.feeCycle
                                    ? `Fee / ${program.feeCycle}`
                                    : "Fee"
                                }
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

            {/* Facilities */}
            {(facilityList.length > 0 || trainer.facilitiesInfrastructure) && (
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
                {trainer.facilitiesInfrastructure ? (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {trainer.facilitiesInfrastructure}
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
                {trainer.achievements ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-4 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                      <span>Level</span>
                      <span>Gold</span>
                      <span>Silver</span>
                      <span>Bronze</span>
                    </div>
                    {Object.entries(trainer.achievements).map(
                      ([level, medals]) => (
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
                      ),
                    )}
                  </div>
                ) : null}
              </section>
            )}

            {/* Fees overview — orphan packages only */}
            {showFeesOverview ? (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Fees & Packages
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Additional fee packages
                </p>
                {orphanPackages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {orphanPackages.map((pkg, i) => (
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
                          {pkg.otherFee ? (
                            <FeeTile
                              label={pkg.otherFeeName || "Other"}
                              value={formatFee(pkg.otherFee)}
                            />
                          ) : null}
                        </div>
                        {pkg.notes ? (
                          <p className="text-xs text-slate-500 mt-2">
                            {pkg.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {(trainer.pricing?.paymentMethods ||
                  trainer.pricing?.refundPolicy) &&
                availableSports.length === 0 ? (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-sm text-slate-600">
                    {trainer.pricing.paymentMethods ? (
                      <p>
                        <span className="font-semibold text-slate-800">
                          Payments:
                        </span>{" "}
                        {trainer.pricing.paymentMethods}
                      </p>
                    ) : null}
                    {trainer.pricing.refundPolicy ? (
                      <p>
                        <span className="font-semibold text-slate-800">
                          Refund:
                        </span>{" "}
                        {trainer.pricing.refundPolicy}
                      </p>
                    ) : null}
                  </div>
                ) : null}
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
            {(trainer.phoneNumber || trainer.email || websiteUrl) && (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  Contact
                </h2>
                <div className="space-y-3">
                  {trainer.phoneNumber ? (
                    <a
                      href={`tel:${trainer.phoneNumber}`}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <span className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                        <Phone size={16} />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Phone</p>
                        <p className="font-semibold">
                          {trainer.countryCode ? `${trainer.countryCode} ` : ""}
                          {trainer.phoneNumber}
                        </p>
                      </div>
                    </a>
                  ) : null}
                  {trainer.email ? (
                    <a
                      href={`mailto:${trainer.email}`}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <span className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                        <Mail size={16} />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="font-semibold break-all">
                          {trainer.email}
                        </p>
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
              <p className="font-semibold">Interested in training?</p>
              <p className="text-xs text-white/70 mt-1 mb-3">
                Reach out to {displayName} for a trial or more details.
              </p>
              <div className="space-y-2">
                <a
                  href={
                    trainer.phoneNumber ? `tel:${trainer.phoneNumber}` : undefined
                  }
                  onClick={(e) => {
                    if (!trainer.phoneNumber) {
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
                    onClick={startTrainerChat}
                    className="w-full min-h-[44px] rounded-xl bg-white/10 border border-white/20 flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <MessageCircle size={15} /> Start chat
                  </button>
                ) : (
                  <p className="text-[11px] text-white/50 text-center py-1">
                    Chat is currently disabled by this trainer
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
            href={trainer.phoneNumber ? `tel:${trainer.phoneNumber}` : undefined}
            onClick={(e) => {
              if (!trainer.phoneNumber) {
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
              onClick={startTrainerChat}
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

function FeeHighlight({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        accent
          ? "bg-white border-orange-200 shadow-sm"
          : "bg-white border-slate-200"
      }`}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={`text-base font-bold mt-1 break-words ${
          value
            ? accent
              ? "text-[#FF6A00]"
              : "text-slate-900"
            : "text-slate-400"
        }`}
      >
        {value || "Not listed"}
      </p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-3 flex gap-3 items-start">
      {Icon ? (
        <span className="w-9 h-9 rounded-lg bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0">
          <Icon size={16} />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function ChipGroup({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    let unsub1, unsub2, unsub3;

    if (isReel) {
      unsub1 = onSnapshot(
        query(collection(db, "reelLikes"), where("reelId", "==", itemId)),
        (snap) => {
          setLikes(snap.size);
          if (user) {
            setLiked(snap.docs.some((d) => d.data().userId === user.uid));
          }
        },
      );

      unsub2 = onSnapshot(
        query(collection(db, "reelViews"), where("reelId", "==", itemId)),
        (snap) => setViews(snap.size),
      );

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
      unsub1 = onSnapshot(
        query(collection(db, "postlikes"), where("postId", "==", itemId)),
        (snap) => {
          setLikes(snap.size);
          if (user) {
            setLiked(snap.docs.some((d) => d.data().userId === user.uid));
          }
        },
      );

      unsub2 = onSnapshot(
        query(collection(db, "postviews"), where("postId", "==", itemId)),
        (snap) => setViews(snap.size),
      );

      unsub3 = onSnapshot(
        query(collection(db, "postcomments"), where("postId", "==", itemId)),
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
    }

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
      unsub3 && unsub3();
    };
  }, [itemId, isReel, user]);

  const handleLike = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    const docId = `${itemId}_${user.uid}`;

    if (isReel) {
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

  const handleView = async () => {
    if (!user) return;

    const docId = `${itemId}_${user.uid}`;

    if (isReel) {
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

      {openPreview && (
        <div className="fixed inset-0 z-[999] bg-black">
          <button
            onClick={() => setOpenPreview(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-2xl"
          >
            ✕
          </button>
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
