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
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Users,
  Trophy,
  Award,
  Briefcase,
  Eye,
  Share2,
  X,
  Globe,
  UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

        if (snap.exists()) {
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
          const trainingImages = data.trainingImages || [];
          const mediaTraining = data.mediaGallery?.trainingImages || [];
          const extraGallery = [
            ...(data.mediaGallery?.facilityImages || []),
            ...(data.mediaGallery?.equipmentImages || []),
            ...(data.mediaGallery?.uniformImages || []),
          ];
          const allImages = [
            ...trainingImages,
            ...mediaTraining,
            ...extraGallery,
          ];
          const seenMediaUrls = new Set();

          allImages.forEach((item, i) => {
            const url = typeof item === "string" ? item : item?.url;
            const about = typeof item === "string" ? "" : item?.about || "";
            if (!url) return;
            const urlKey = String(url).split("?")[0].trim();
            if (seenMediaUrls.has(urlKey)) return;
            seenMediaUrls.add(urlKey);

            posts.push({
              id: `post_${id}_img_${i}`,
              type: "image",
              url,
              title: about || "Training Photo",
            });
          });

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
              type: "video",
              url,
              title: about || "Trainer Reel",
            });
          });

          setMediaPosts(posts);
        } else {
          setTrainer({});
          setMediaPosts([]);
        }
      } catch (error) {
        console.log(error);
        setTrainer({});
        setMediaPosts([]);
      } finally {
        setPageLoading(false);
      }
    };

    loadTrainer();
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, "followers"), where("profileId", "==", id));

    const unsub = onSnapshot(q, (snap) => {
      setFollowersCount(snap.size);
    });

    return () => unsub();
  }, [id]);

  const startTrainerChat = async () => {
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

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    `${trainer.city || "Bengaluru"}, ${trainer.state || "Karnataka"}`,
  )}&output=embed`;

  function AboutSection({ text }) {
    const [expanded, setExpanded] = useState(false);
    const shouldTrim = text?.length > 180;

  return (
      <div className="bg-orange-50 rounded-2xl p-4">
        <p
          className={`text-sm text-gray-700 leading-7 whitespace-pre-wrap break-words transition-all duration-300 ${
            expanded ? "" : "line-clamp-4"
          }`}
        >
          {text || "No description available"}
        </p>
        {shouldTrim && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-[#FF6B00] font-semibold text-sm active:scale-95 transition"
          >
            {expanded ? "Read Less" : "Read More"}
          </button>
        )}
      </div>
    );
  }

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
  const experienceLabel = trainer.experience
    ? trainer.experience
    : experienceYears
      ? `${experienceYears} Years`
      : "0 Years";

  const availableSports = [];
  const seenSports = new Set();
  const categoriesMap = trainer.categories || {};
  const detailsMap = trainer.sportDetails || {};

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

  if (availableSports.length === 0 && trainer.subCategory) {
    availableSports.push({
      category: trainer.category || "Sport",
      name: trainer.subCategory,
      shortDescription: "",
    });
  }

  const displayName =
    trainer.trainerName ||
    `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
    "Trainer";
  const heroImage =
    mediaPosts.find((p) => p.type === "image")?.url ||
    trainer.profileImageUrl ||
    "";
  const locationLabel = [trainer.city, trainer.state].filter(Boolean).join(", ");
  const programs = trainer.trainingPrograms || [];
  const normText = (value) => String(value || "").trim().toLowerCase();
  const matchesSport = (item, sport) => {
    if (!item || !sport) return false;
    const sportName = normText(sport.name);
    const sportCat = normText(sport.category);
    const itemSport = normText(
      item.subCategory || item.name || item.programName,
    );
    const itemCat = normText(item.category);
    if (itemSport && sportName && itemSport === sportName) return true;
    if (itemCat && sportCat && itemCat === sportCat && !itemSport) return true;
    if (
      itemSport &&
      sportName &&
      (itemSport.includes(sportName) || sportName.includes(itemSport))
    ) {
      return true;
    }
    return false;
  };
  const isGeneralFee = (pkg) => !normText(pkg?.subCategory);

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
    savedPackages.length > 0 ? savedPackages : programFeePackages;

  const selectedPrograms = selectedSport
    ? programs.filter((program) => matchesSport(program, selectedSport))
    : [];
  const selectedFees = selectedSport
    ? [
        ...pricingPackages.filter(
          (pkg) => matchesSport(pkg, selectedSport) || isGeneralFee(pkg),
        ),
        ...(!savedPackages.length
          ? []
          : programFeePackages.filter((pkg) =>
              matchesSport(pkg, selectedSport),
            )),
      ]
    : [];
  const facilityList = trainer.facilityTags || [];
  const websiteUrl =
    trainer.websiteLink ||
    trainer.website ||
    trainer.locationAccessibility?.website ||
    "";
  const coachName = trainer.founderName || trainer.headCoach || "";
  const highlightList = Array.isArray(trainer.achievementHighlights)
    ? trainer.achievementHighlights.filter((item) => item?.title)
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
  const aboutText =
    trainer.description || trainer.about || trainer.designation || "";

  return (
    <div className="page-content min-h-screen bg-[#F4F5F7] flex justify-center">
      <div className="w-full max-w-lg relative">
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
                trainer.profileImageUrl ||
                "https://via.placeholder.com/100x100.png?text=Profile"
              }
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {trainer.organizationType ||
                  trainer.designation ||
                  trainer.type ||
                  "Trainer"}
              </p>
              {(locationLabel || trainer.locationName) && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-[#FF6B00]" />
                  <span className="truncate">
                    {locationLabel ||
                      trainer.locationName ||
                      trainer.locationAccessibility?.fullAddress}
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

          {trainer.designation ? (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              {trainer.designation}
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
              onClick={startTrainerChat}
              className="min-h-[44px] bg-[#FF6B00] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <a
              href={trainer.phoneNumber ? `tel:${trainer.phoneNumber}` : undefined}
              onClick={(e) => {
                if (!trainer.phoneNumber) {
                  e.preventDefault();
                  alert("Phone number not available");
                }
              }}
              className="min-h-[44px] border border-[#FF6B00] text-[#FF6B00] rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Phone size={16} />
              Call
            </a>
            <a
              href={trainer.email ? `mailto:${trainer.email}` : undefined}
              onClick={(e) => {
                if (!trainer.email) {
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
              value={`${trainer.students?.length || 0}+`}
            />
            <StatCard
              icon={Heart}
              label="Followers"
              value={`${followersCount}+`}
            />
            <StatCard icon={Trophy} label="Awards" value={totalAwards || 0} />
            <StatCard icon={Briefcase} label="Exp" value={experienceLabel} />
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
                {trainer.locationAccessibility?.landmark ||
                trainer.locationAccessibility?.fullAddress ? (
                  <p className="text-xs text-gray-600 px-3 pt-3">
                    {[
                      trainer.locationAccessibility?.fullAddress,
                      trainer.locationAccessibility?.landmark,
                    ]
                      .filter(Boolean)
                      .join(", ")}
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
              <AboutSection text={aboutText} />
            </Section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Section title="Training Programs">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                {programs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 font-medium">
                      No Training Programs Available
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(showAllPrograms ? programs : programs.slice(0, 2)).map(
                        (program, index) => (
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
                              {program.skillLevel ? (
                                <span className="bg-[#FF6B00] text-white text-xs px-3 py-1 rounded-full">
                                  {program.skillLevel}
                                </span>
                              ) : null}
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
                              <Info
                                title="Seats"
                                value={program.seatsAvailable}
                              />
                              <Info title="Trial" value={program.trialSessions} />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                    {programs.length > 2 && (
                      <button
                        onClick={() => setShowAllPrograms(!showAllPrograms)}
                        className="w-full mt-5 bg-[#FF6B00] text-white rounded-xl py-3 font-semibold active:scale-95 transition"
                      >
                        {showAllPrograms
                          ? "See less"
                          : `See more (${programs.length} programs)`}
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
                      <Award
                        size={14}
                        className="text-[#FF6B00] mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {item.title}
                        </p>
                        {item.year || item.summary || item.description ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[item.year, item.summary || item.description]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {trainer?.achievements ? (
                Object.entries(trainer.achievements).map(([level, medals]) => (
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
                  {trainer.pricing?.paymentMethods ? (
                    <p className="text-xs text-gray-500 px-1">
                      Payments accepted: {trainer.pricing.paymentMethods}
                    </p>
                  ) : null}
                  {trainer.pricing?.refundPolicy ? (
                    <p className="text-xs text-gray-500 px-1">
                      Refund: {trainer.pricing.refundPolicy}
                    </p>
                  ) : null}
          </div>
        </Section>
            </motion.div>
          )}

          {(trainer.email || trainer.phoneNumber || websiteUrl) && (
            <Section title="Contact">
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {trainer.phoneNumber ? (
                  <a
                    href={`tel:${trainer.phoneNumber}`}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <span className="w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                      <Phone size={15} />
                    </span>
                    {trainer.phoneNumber}
                  </a>
                ) : null}
                {trainer.email ? (
                  <a
                    href={`mailto:${trainer.email}`}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <span className="w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                      <Mail size={15} />
                    </span>
                    {trainer.email}
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

          {facilityList.length > 0 || trainer.facilitiesInfrastructure ? (
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
                {trainer.facilitiesInfrastructure ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {trainer.facilitiesInfrastructure}
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
                    <MediaCard key={post.id} post={post} />
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
                    "Description will appear here once the trainer adds it."}
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
                            {[
                              program.ageGroup,
                              program.batchTimings,
                              program.duration,
                            ]
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
                    Fees and class timings will show here when the trainer adds
                    them.
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <button
                    onClick={startTrainerChat}
                    className="min-h-[44px] rounded-xl bg-[#FF6B00] text-white text-sm font-semibold active:scale-95 transition"
                  >
                    Chat
                  </button>
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
                    className="min-h-[44px] rounded-xl border border-[#FF6B00] text-[#FF6B00] text-sm font-semibold flex items-center justify-center active:scale-95 transition"
                  >
                    Call
                  </a>
                  <a
                    href={trainer.email ? `mailto:${trainer.email}` : undefined}
                    onClick={(e) => {
                      if (!trainer.email) {
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

function MediaCard({ post }) {
  const isReel = post.type === "video";
  const [openImage, setOpenImage] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(0);
  const [liked, setLiked] = useState(false);

  const [showComments, setShowComments] = useState(false);
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
  }, [itemId]);

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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {isReel ? (
        <video
          src={post.url}
          controls
          onPlay={handleView}
          className="w-full max-h-[280px] sm:max-h-[380px] object-cover"
        />
      ) : (
        <>
          <img
            src={post.url}
            onClick={() => {
              handleView();
              setOpenImage(true);
            }}
            className="w-full max-h-[280px] sm:max-h-[380px] object-cover bg-gray-100 cursor-pointer"
            alt=""
          />

          {openImage && (
            <div className="fixed inset-0 z-[99999] bg-white flex items-center justify-center">
              <button
                onClick={() => setOpenImage(false)}
                className="absolute top-4 right-4 z-50 bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg"
              >
                ✕
              </button>

              <img
                src={post.url}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </>
      )}

      <div className="p-4">
        {post.title && (
          <p className="text-sm text-gray-800 leading-6 break-words whitespace-pre-wrap mb-3">
            {post.title}
          </p>
        )}

        <div className="flex justify-between text-sm text-gray-500">
          <button
            onClick={handleLike}
            className={`flex gap-1 items-center ${liked ? "text-red-500" : ""}`}
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
            {likes}
          </button>

          <div className="flex gap-1 items-center">
            <Eye size={17} />
            {views}
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex gap-1 items-center"
          >
            <MessageCircle size={17} />
            {comments}
          </button>
        </div>

        {showComments && (
          <div className="mt-4 border-t pt-3">
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write comment..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />

              <button
                onClick={sendComment}
                className="bg-[#FF6B00] text-white px-4 rounded-lg text-sm"
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

              {commentList.length === 0 && (
                <p className="text-xs text-gray-400">No comments yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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
      <div className="text-yellow-500">Gold {g}</div>
      <div className="text-gray-500">Silver {s}</div>
      <div className="text-orange-700">Bronze {b}</div>
    </div>
  );
}
