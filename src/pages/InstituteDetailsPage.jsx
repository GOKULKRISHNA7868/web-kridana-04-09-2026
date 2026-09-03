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
  X,
  Globe,
  UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // ================= VIEW SAVE =================
  const handleView = async () => {
    if (!user) {
      setOpenPreview(true);
      return;
    }

    try {
      if (isReel) {
        const docId = `${itemId}_${user.uid}`;

        await setDoc(
          doc(db, "reelViews", docId),
          {
            reelId: itemId,
            userId: user.uid,
            createdAt: serverTimestamp(),
          },
          { merge: true }, // duplicate safe
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
          { merge: true }, // duplicate safe
        );
      }
    } catch (error) {
      console.log(error);
    }

    setOpenPreview(true);
  };

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

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    `${inst.city || "Bengaluru"}, ${inst.state || "Karnataka"}`,
  )}&output=embed`;
  if (pageLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  function AboutSection({ text }) {
    const [expanded, setExpanded] = useState(false);

    const shouldTrim = text?.length > 180;

    return (
      <div className="bg-orange-50 rounded-2xl p-4">
        <p
          className={`
          text-sm text-gray-700 leading-7 whitespace-pre-wrap break-words
          transition-all duration-300
          ${expanded ? "" : "line-clamp-4"}
        `}
        >
          {text || "No description available"}
        </p>

        {shouldTrim && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="
            mt-3
            text-[#FF6B00]
            font-semibold
            text-sm
            active:scale-95
            transition
          "
          >
            {expanded ? "Read Less" : "Read More"}
          </button>
        )}
      </div>
    );
  }
  const achievements = inst.achievements || {};
  function Info({ title, value }) {
    return (
      <div className="bg-white rounded-xl border p-3">
        <p className="text-[11px] text-gray-500">{title}</p>
        <p className="font-semibold text-gray-800 break-words">
          {value || "-"}
        </p>
      </div>
    );
  }
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
  const availableSports = [];
  const seenSports = new Set();
  const categoriesMap = inst.categories || {};
  const detailsMap = inst.sportDetails || {};

  Object.entries(categoriesMap).forEach(([category, subs]) => {
    const names = Array.isArray(subs)
      ? subs
      : subs && typeof subs === "object"
        ? Object.keys(subs)
        : [];
    names.forEach((name) => {
      const key = `${category}__${name}`;
      if (seenSports.has(key)) return;
      seenSports.add(key);
      availableSports.push({
        category,
        name,
        shortDescription: detailsMap?.[category]?.[name]?.shortDescription || "",
      });
    });
  });

  Object.entries(detailsMap).forEach(([category, sportsMap]) => {
    Object.keys(sportsMap || {}).forEach((name) => {
      const key = `${category}__${name}`;
      if (seenSports.has(key)) return;
      seenSports.add(key);
      availableSports.push({
        category,
        name,
        shortDescription: sportsMap?.[name]?.shortDescription || "",
      });
    });
  });

  const heroImage =
    mediaPosts.find((p) => p.type === "image")?.url ||
    inst.profileImageUrl ||
    "";
  const locationLabel = [inst.city, inst.state].filter(Boolean).join(", ");
  const selectedFees = selectedSport
    ? (inst.pricing?.packages || []).filter(
        (pkg) =>
          pkg.subCategory === selectedSport.name ||
          pkg.name === selectedSport.name,
      )
    : [];
  const selectedPrograms = selectedSport
    ? (inst.trainingPrograms || []).filter(
        (program) =>
          program.subCategory === selectedSport.name ||
          program.programName === selectedSport.name,
      )
    : [];
  const facilityList = inst.facilityTags || [];
  const websiteUrl = inst.websiteLink || inst.website || "";
  const coachName = inst.founderName || inst.headCoach || "";
  const pricingPackages = Array.isArray(inst.pricing?.packages)
    ? inst.pricing.packages
    : [];
  const highlightList = Array.isArray(inst.achievementHighlights)
    ? inst.achievementHighlights.filter((item) => item?.title)
    : [];
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
  const MEDIA_LIMIT = 2;
  const visibleMedia = showAllMedia
    ? uniqueMediaPosts
    : uniqueMediaPosts.slice(0, MEDIA_LIMIT);

  return (
    <div className="page-content min-h-screen bg-[#F4F5F7] flex justify-center">
      <div className="w-full max-w-lg md:max-w-4xl lg:max-w-5xl relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden"
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="w-full h-48 sm:h-64 object-cover"
            />
          ) : (
            <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-gray-900 shadow-md active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleShare}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-gray-900 shadow-md active:scale-95 transition"
          >
            <Share2 size={16} />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative -mt-12 sm:-mt-16 mx-3 sm:mx-4 bg-white rounded-3xl shadow-[0_10px_32px_rgba(15,23,42,0.10)] p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <img
              src={
                inst.profileImageUrl ||
                "https://via.placeholder.com/100x100.png?text=Profile"
              }
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {inst.instituteName || "Vivek Vardhan"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {inst.organizationType || inst.category || "Sports Academy"}
              </p>
              {(locationLabel || inst.locationName) && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-[#FF6B00]" />
                  <span className="truncate">
                    {locationLabel || inst.locationName}
                  </span>
                </p>
              )}
              {coachName ? (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <UserRound size={12} className="text-[#FF6B00]" />
                  <span className="truncate">Coach: {coachName}</span>
                </p>
              ) : null}
            </div>
          </div>

          {inst.designation ? (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              {inst.designation}
            </p>
          ) : null}

          {availableSports.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-3 pb-0.5 scrollbar-hide">
              {availableSports.map((sport) => (
                <button
                  key={`top-${sport.category}-${sport.name}`}
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-orange-50 text-[#E85D04] text-xs font-semibold border border-orange-100"
                >
                  {sport.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={startChat}
              className="min-h-[44px] bg-[#FF6B00] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <a
              href={`tel:${inst.phoneNumber || "9999999999"}`}
              className="min-h-[44px] border border-[#FF6B00] text-[#FF6B00] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Phone size={16} />
              Call
            </a>
            <a
              href={inst.email ? `mailto:${inst.email}` : undefined}
              onClick={(e) => {
                if (!inst.email) {
                  e.preventDefault();
                  alert("Email not available");
                }
              }}
              className="min-h-[44px] border border-[#FF6B00] text-[#FF6B00] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Mail size={16} />
              Email
            </a>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <StatCard
              icon={Users}
              label="Students"
              value={inst.customers?.length || 0}
            />
            <StatCard icon={Heart} label="Followers" value={followersCount} />
            <StatCard icon={Trophy} label="Awards" value={totalAwards} />
            <StatCard
              icon={Briefcase}
              label="Experience"
              value={`${experienceYears} Years`}
            />
          </div>
        </motion.div>

        <div className="px-3 sm:px-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Section title="Location">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {inst.street || inst.landmark ? (
                  <p className="text-xs text-gray-600 px-3 pt-3">
                    {[inst.street, inst.landmark].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                <iframe
                  title="map"
                  src={mapSrc}
                  className="w-full h-44 sm:h-52 border-0 mt-2"
                  loading="lazy"
                />
              </div>
            </Section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Section title="About">
              <AboutSection text={inst.description || inst.designation || ""} />
            </Section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Section title="Training Programs">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                {!inst.trainingPrograms || inst.trainingPrograms.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🏋️</div>
                    <p className="text-gray-500 font-medium">
                      No Training Programs Available
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(showAllPrograms
                        ? inst.trainingPrograms
                        : inst.trainingPrograms.slice(0, 2)
                      ).map((program, index) => (
                        <div
                          key={program.id || index}
                          className="border border-orange-100 rounded-2xl p-4 bg-orange-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-800 text-base">
                                {program.programName || program.subCategory}
                              </h3>
                              {(program.category || program.subCategory) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {[program.category, program.subCategory]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            <span className="bg-[#FF6B00] text-white text-xs px-3 py-1 rounded-full">
                              {program.skillLevel}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <Info title="Age Group" value={program.ageGroup} />
                            <Info title="Duration" value={program.duration} />
                            <Info title="Batch" value={program.batchTimings} />
                            <Info
                              title={
                                program.feeCycle
                                  ? `Fees / ${program.feeCycle}`
                                  : "Fees"
                              }
                              value={program.fees ? `₹${program.fees}` : "-"}
                            />
                            <Info title="Seats" value={program.seatsAvailable} />
                            <Info title="Trial" value={program.trialSessions} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {inst.trainingPrograms.length > 2 && (
                      <button
                        onClick={() => setShowAllPrograms(!showAllPrograms)}
                        className="w-full mt-5 bg-[#FF6B00] text-white rounded-xl py-3 font-semibold active:scale-95 transition"
                      >
                        {showAllPrograms
                          ? "Show Less"
                          : `View All Programs (${inst.trainingPrograms.length})`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </Section>
          </motion.div>

          <Section title="Achievements">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              {highlightList.length > 0 && (
                <div className="space-y-2 mb-3">
                  {highlightList.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2"
                    >
                      <Award size={14} className="text-[#FF6B00] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {item.title}
                        </p>
                        {item.year || item.description ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[item.year, item.description]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {inst?.achievements ? (
                Object.entries(inst.achievements).map(([level, medals]) => (
                  <AchievementRow
                    key={level}
                    title={level}
                    g={medals?.gold || 0}
                    s={medals?.silver || 0}
                    b={medals?.bronze || 0}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center">
                  No achievements available
                </p>
              )}
            </div>
          </Section>

          {pricingPackages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Section title="Fees & Packages">
                <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  {pricingPackages.map((pkg, i) => (
                    <div
                      key={pkg.id || i}
                      className="border border-orange-100 rounded-xl p-3 bg-orange-50/60"
                    >
                      <p className="font-semibold text-gray-900">
                        {pkg.subCategory || pkg.name || "Class fees"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[pkg.category, pkg.billingCycle]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        {pkg.monthlyFee ? (
                          <Info title="Monthly" value={`₹${pkg.monthlyFee}`} />
                        ) : null}
                        {pkg.yearlyFee ? (
                          <Info title="Yearly" value={`₹${pkg.yearlyFee}`} />
                        ) : null}
                        {pkg.registrationFee ? (
                          <Info
                            title="Registration"
                            value={`₹${pkg.registrationFee}`}
                          />
                        ) : null}
                        {pkg.uniformFee ? (
                          <Info
                            title="Kit / Uniform"
                            value={`₹${pkg.uniformFee}`}
                          />
                        ) : null}
                        {pkg.otherFee ? (
                          <Info
                            title={pkg.otherFeeName || "Other fee"}
                            value={`₹${pkg.otherFee}`}
                          />
                        ) : null}
                      </div>
                      {pkg.notes ? (
                        <p className="text-xs text-gray-600 mt-2">{pkg.notes}</p>
                      ) : null}
                    </div>
                  ))}
                  {inst.pricing.paymentMethods ? (
                    <p className="text-xs text-gray-500 px-1">
                      Payments accepted: {inst.pricing.paymentMethods}
                    </p>
                  ) : null}
                  {inst.pricing.refundPolicy ? (
                    <p className="text-xs text-gray-500 px-1">
                      Refund: {inst.pricing.refundPolicy}
                    </p>
                  ) : null}
                </div>
              </Section>
            </motion.div>
          )}

          {(inst.email || inst.phoneNumber || websiteUrl) && (
            <Section title="Contact">
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {inst.phoneNumber ? (
                  <a
                    href={`tel:${inst.phoneNumber}`}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <span className="w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                      <Phone size={15} />
                    </span>
                    {inst.phoneNumber}
                  </a>
                ) : null}
                {inst.email ? (
                  <a
                    href={`mailto:${inst.email}`}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <span className="w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                      <Mail size={15} />
                    </span>
                    {inst.email}
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
                    className="flex items-center gap-3 text-sm text-[#FF6B00] font-medium"
                  >
                    <span className="w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                      <Globe size={15} />
                    </span>
                    Visit website
                  </a>
                ) : null}
              </div>
            </Section>
          )}

          {facilityList.length > 0 || inst.facilitiesInfrastructure ? (
            <Section title="Facilities">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                {facilityList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {facilityList.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {inst.facilitiesInfrastructure ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {inst.facilitiesInfrastructure}
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          <Section title="Media & Gallery">
            {uniqueMediaPosts.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center text-gray-400">
                No Media Available
              </div>
            ) : (
              <div className="space-y-3">
                {!showAllMedia ? (
                  <div className="grid grid-cols-2 gap-2">
                    {uniqueMediaPosts.slice(0, 4).map((post, idx) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setShowAllMedia(true)}
                        className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100"
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
                        {idx === 3 && uniqueMediaPosts.length > 4 ? (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                            +{uniqueMediaPosts.length - 4} more
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  visibleMedia.map((post) => (
                    <MediaCard
                      key={post.id}
                      post={post}
                      onLike={toggleLike}
                      onView={handleView}
                    />
                  ))
                )}
                {(uniqueMediaPosts.length > MEDIA_LIMIT || showAllMedia) && (
                  <button
                    type="button"
                    onClick={() => setShowAllMedia((v) => !v)}
                    className="w-full min-h-[44px] rounded-xl border border-[#FF6B00] text-[#FF6B00] font-semibold text-sm bg-white active:scale-95 transition"
                  >
                    {showAllMedia
                      ? "See less"
                      : `See more (${uniqueMediaPosts.length} photos & videos)`}
                  </button>
                )}
              </div>
            )}
          </Section>

          {availableSports.length > 0 && (
            <Section title="Sports available">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-gray-500 mb-3">
                  Tap a sport to see description, fees and class details
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSports.map((sport) => {
                    const active =
                      selectedSport?.name === sport.name &&
                      selectedSport?.category === sport.category;
                    return (
                      <motion.button
                        key={`${sport.category}-${sport.name}`}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedSport(sport)}
                        className={`min-h-[38px] px-4 rounded-full text-sm font-semibold border transition ${
                          active
                            ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                            : "bg-orange-50 text-gray-800 border-orange-100"
                        }`}
                      >
                        {sport.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}
        </div>

        <AnimatePresence>
          {selectedSport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed left-0 right-0 top-0 z-[80] bg-black/45 backdrop-blur-[2px]"
              style={{
                bottom:
                  "calc(var(--bottom-navbar-height, 64px) + env(safe-area-inset-bottom, 0px))",
              }}
              onClick={() => setSelectedSport(null)}
            >
              <motion.div
                initial={{ y: 90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 90, opacity: 0 }}
                transition={{ type: "spring", damping: 24, stiffness: 280 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl max-h-[75vh] overflow-y-auto px-4 pt-3 pb-5 shadow-[0_-12px_40px_rgba(0,0,0,0.15)]"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedSport.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedSport.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSport(null)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedSport.shortDescription ||
                    "Description will appear here once the academy adds it."}
                </p>

                {selectedFees.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Related fees
                    </p>
                    <div className="space-y-2">
                      {selectedFees.map((pkg, i) => (
                        <div
                          key={pkg.id || i}
                          className="rounded-2xl border border-orange-100 bg-orange-50 p-3"
                        >
                          <p className="text-xs text-gray-500">
                            {pkg.billingCycle || "Package"}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {pkg.monthlyFee ? (
                              <Info
                                title="Monthly"
                                value={`₹${pkg.monthlyFee}`}
                              />
                            ) : null}
                            {pkg.yearlyFee ? (
                              <Info
                                title="Yearly"
                                value={`₹${pkg.yearlyFee}`}
                              />
                            ) : null}
                            {pkg.registrationFee ? (
                              <Info
                                title="Registration"
                                value={`₹${pkg.registrationFee}`}
                              />
                            ) : null}
                            {pkg.uniformFee ? (
                              <Info
                                title="Kit / Uniform"
                                value={`₹${pkg.uniformFee}`}
                              />
                            ) : null}
                            {pkg.otherFee ? (
                              <Info
                                title={pkg.otherFeeName || "Other fee"}
                                value={`₹${pkg.otherFee}`}
                              />
                            ) : null}
                          </div>
                          {pkg.notes ? (
                            <p className="text-xs text-gray-600 mt-2">
                              {pkg.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPrograms.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Related classes
                    </p>
                    <div className="space-y-2">
                      {selectedPrograms.map((program, index) => (
                        <div
                          key={program.id || index}
                          className="rounded-2xl border border-gray-100 p-3"
                        >
                          <p className="font-semibold text-sm">
                            {program.programName || selectedSport.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {[program.ageGroup, program.batchTimings, program.duration]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {program.fees ? (
                            <p className="text-sm font-semibold text-[#FF6B00] mt-2">
                              ₹{program.fees}
                              {program.feeCycle ? ` / ${program.feeCycle}` : ""}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFees.length === 0 && selectedPrograms.length === 0 && (
                  <p className="text-xs text-gray-400 mt-4">
                    Fees and class timings will show here when the academy adds
                    them.
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <button
                    onClick={startChat}
                    className="min-h-[44px] rounded-xl bg-[#FF6B00] text-white text-sm font-semibold active:scale-95 transition"
                  >
                    Chat
                  </button>
                  <a
                    href={`tel:${inst.phoneNumber || "9999999999"}`}
                    className="min-h-[44px] rounded-xl border border-[#FF6B00] text-[#FF6B00] text-sm font-semibold flex items-center justify-center active:scale-95 transition"
                  >
                    Call
                  </a>
                  <a
                    href={inst.email ? `mailto:${inst.email}` : undefined}
                    onClick={(e) => {
                      if (!inst.email) {
                        e.preventDefault();
                        alert("Email not available");
                      }
                    }}
                    className="min-h-[44px] rounded-xl border border-[#FF6B00] text-[#FF6B00] text-sm font-semibold flex items-center justify-center active:scale-95 transition"
                  >
                    Email
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */
// 🔥 USE THIS MediaCard
// Reel save format fixed:
// institute_{profileId}_{index}_{loginUserId}
// trainer_{profileId}_{index}_{loginUserId}

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
function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h2 className="text-sm font-bold text-gray-800 mb-3 px-1">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
      <Icon size={16} className="mx-auto text-[#FF6B00] mb-1" />
      <p className="text-xs font-semibold text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

function AchievementRow({ title, g, s, b }) {
  const formattedTitle =
    title?.charAt(0).toUpperCase() + title?.slice(1).toLowerCase();

  return (
    <div className="grid grid-cols-4 py-2 border-b last:border-none text-sm">
      <div className="font-medium text-gray-700">{formattedTitle}</div>

      <div className="text-yellow-500">🥇 {g}</div>

      <div className="text-gray-500">🥈 {s}</div>

      <div className="text-orange-700">🥉 {b}</div>
    </div>
  );
}
