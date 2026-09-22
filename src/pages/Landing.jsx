import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getCurrentUserLocation } from "../utils/location";
import { db } from "../firebase";
import SeoHead from "../components/SeoHead";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  ArrowRight,
  UserCheck,
  Activity,
  Globe,
  Search,
  SlidersHorizontal,
  UserRound,
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  Grid2X2,
  Bookmark,
  MapPin,
  Star,
  Play,
  Heart,
  MessageCircle,
  Eye,
  X,
  Image as ImageIcon,
  Sparkles,
  Film,
  Clapperboard,
} from "lucide-react";
import {
  FaFistRaised,
  FaFootballBall,
  FaTableTennis,
  FaDumbbell,
  FaBullseye,
  FaHorse,
  FaMountain,
  FaSnowflake,
  FaSwimmer,
  FaSpa,
  FaMusic,
} from "react-icons/fa";
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
} from "@capacitor-community/admob";
import { ADMOB_BANNER_ID, ADMOB_TESTING } from "../constants/admobConfig";
import { initializeAdMob } from "../utils/admob";
import YoutubeStylePlayer from "../components/YoutubeStylePlayer";
const categories = [
  { name: "Martial Arts", path: "/services/martial-arts", icon: FaFistRaised },
  {
    name: "Team Ball Sports",
    path: "/services/teamball",
    icon: FaFootballBall,
  },
  {
    name: "Racket Sports",
    path: "/services/racketsports",
    icon: FaTableTennis,
  },
  { name: "Fitness", path: "/services/fitness", icon: FaDumbbell },
  {
    name: "Target & Precision Sports",
    path: "/services/target-precision-sports",
    icon: FaBullseye,
  },
  {
    name: "Equestrian Sports",
    path: "/services/equestrian-sports",
    icon: FaHorse,
  },
  {
    name: "Adventure & Outdoor Sports",
    path: "/services/adventure-outdoor-sports",
    icon: FaMountain,
  },
  { name: "Ice Sports", path: "/services/ice-sports", icon: FaSnowflake },
  { name: "Aquatic Sports", path: "/services/aquatic", icon: FaSwimmer },
  { name: "Wellness", path: "/services/wellness", icon: FaSpa },
  { name: "Dance", path: "/services/dance", icon: FaMusic },
];
/* ===================================================== */
/* ================= LOADING UI ======================== */
/* ===================================================== */

const SkeletonCircle = ({ size = "42px" }) => (
  <div
    className="rounded-full bg-gray-200 animate-pulse shrink-0"
    style={{ width: size, height: size }}
  />
);

const SkeletonLine = ({ width = "70%", height = "7px" }) => (
  <div
    className="bg-gray-200 rounded-full animate-pulse"
    style={{ width, height }}
  />
);

/* ================= RECOMMENDED LOADING ================= */

const RecommendedSkeleton = () => (
  <div className="flex gap-2 overflow-hidden pb-1">
    {[1, 2].map((item) => (
      <div
        key={item}
        className="
          bg-white
          rounded-[9px]
          border border-[#E9E9E9]
          shadow-[0_2px_6px_rgba(0,0,0,0.04)]
          p-2
          min-w-[calc((100vw-32px)/2)]
          w-[calc((100vw-32px)/2)]
          shrink-0
        "
      >
        <div className="flex items-center gap-1.5">
          <SkeletonCircle size="38px" />

          <div className="flex-1 min-w-0 space-y-1.5">
            <SkeletonLine width="75%" />
            <SkeletonLine width="55%" height="6px" />
            <SkeletonLine width="85%" height="6px" />
          </div>
        </div>

        <div className="flex justify-between items-center mt-3">
          <SkeletonLine width="35%" height="6px" />

          <div className="w-[48px] h-[15px] rounded-[4px] bg-gray-200 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

/* ================= TRAINER / ACADEMY LOADING ================= */

const ProfileSkeleton = () => (
  <div
    className="
      bg-white
      rounded-[9px]
      border border-[#E8E8E8]
      shadow-[0_2px_6px_rgba(0,0,0,0.04)]
      overflow-hidden
      min-w-[calc((100vw-32px)/2)]
      w-[calc((100vw-32px)/2)]
      shrink-0
    "
  >
    <div className="flex p-2 gap-1.5">
      <SkeletonCircle size="42px" />

      <div className="flex-1 min-w-0 space-y-1.5 pt-1">
        <SkeletonLine width="70%" />
        <SkeletonLine width="55%" height="6px" />
        <SkeletonLine width="85%" height="6px" />
        <SkeletonLine width="45%" height="6px" />
      </div>
    </div>

    <div className="flex justify-end px-2 pb-2">
      <SkeletonLine width="55px" height="7px" />
    </div>
  </div>
);

/* ================= VIDEO LOADING ================= */

const VideoSkeleton = () => (
  <div
    className="
      shrink-0
      w-[174px]
      h-[61px]
      bg-white
      rounded-[7px]
      border border-[#E8E8E8]
      shadow-[0_2px_6px_rgba(0,0,0,0.04)]
      overflow-hidden
      flex
    "
  >
    <div className="w-[84px] h-full bg-gray-200 animate-pulse shrink-0" />

    <div className="flex-1 p-1.5 space-y-1.5">
      <SkeletonLine width="90%" height="7px" />
      <SkeletonLine width="70%" height="7px" />
      <SkeletonLine width="40%" height="10px" />
    </div>
  </div>
);

function HScrollTrack({
  children,
  className = "",
  desktopGrid = false,
  itemCount = 0,
}) {
  const scrollerRef = useRef(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;

    if (window.matchMedia("(min-width: 640px)").matches && desktopGrid) {
      setPages(1);
      setPage(0);
      return;
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 12) {
      setPages(1);
      setPage(0);
      return;
    }

    const nextPages = Math.max(
      2,
      Math.ceil(el.scrollWidth / Math.max(el.clientWidth, 1)),
    );
    const nextPage = Math.min(
      nextPages - 1,
      Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)),
    );
    setPages(nextPages);
    setPage(nextPage);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const timer = window.setTimeout(measure, 80);

    let startX = 0;
    let startY = 0;
    let axis = null;

    const onTouchStart = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      axis = null;
    };

    const onTouchMove = (event) => {
      const touch = event.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (axis == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      }

      if (axis === "y") {
        event.preventDefault();
        window.scrollBy(0, -dy);
        startX = touch.clientX;
        startY = touch.clientY;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.clearTimeout(timer);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [itemCount, desktopGrid]);

  const goTo = (index) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({
      left: index * el.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className={`
          flex gap-2 overflow-x-auto overflow-y-hidden
          snap-x snap-mandatory pb-1 scrollbar-hide
          touch-pan-x touch-pan-y [-webkit-overflow-scrolling:touch]
          ${
            desktopGrid
              ? "sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:snap-none"
              : ""
          }
          ${className}
        `}
      >
        {children}
      </div>

      {pages > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-[#FAFAF9] to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#FAFAF9] to-transparent sm:hidden opacity-70" />

          <div className="mt-2 flex items-center justify-center gap-1.5 sm:hidden">
            {page > 0 && (
              <button
                type="button"
                aria-label="Previous"
                onClick={() => goTo(Math.max(0, page - 1))}
                className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500"
              >
                <ChevronLeft size={10} />
              </button>
            )}

            {Array.from({ length: Math.min(pages, 6) }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === page ? "w-4 bg-[#FF6A00]" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}

            {page < pages - 1 && (
              <button
                type="button"
                aria-label="Next"
                onClick={() => goTo(Math.min(pages - 1, page + 1))}
                className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#FF6A00]"
              >
                <ChevronRight size={10} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= DISTANCE ================= */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getCreatedMs = (value) => {
  if (!value) return 0;
  try {
    if (value?.toDate) return value.toDate().getTime();
    if (value?.seconds) return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
};

const getOwnerDisplayName = (data = {}, type) => {
  if (type === "trainer") {
    return (
      data.trainerName ||
      `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
      data.name ||
      "Trainer"
    );
  }
  return data.instituteName || data.name || "Institute";
};

const collectOwnerPosts = (ownerId, data, ownerType) => {
  if (!ownerId || !data || data.isDeleted) return [];

  const ownerName = getOwnerDisplayName(data, ownerType);
  const profileImage = data.profileImageUrl || data.profileImage || "";
  const items = [];
  const seen = new Set();

  const trainingImages = Array.isArray(data.trainingImages)
    ? data.trainingImages
    : [];
  const mediaTraining = Array.isArray(data.mediaGallery?.trainingImages)
    ? data.mediaGallery.trainingImages
    : [];
  const extraGallery = [
    ...(data.mediaGallery?.facilityImages || []),
    ...(data.mediaGallery?.equipmentImages || []),
    ...(data.mediaGallery?.uniformImages || []),
  ];
  const allImages = [...trainingImages, ...mediaTraining, ...extraGallery];

  allImages.forEach((item, index) => {
    const url = typeof item === "string" ? item : item?.url;
    if (!url || String(url).toLowerCase().includes(".mp4")) return;
    const urlKey = String(url).split("?")[0].trim();
    if (!urlKey || seen.has(urlKey)) return;
    seen.add(urlKey);

    const caption =
      typeof item === "string"
        ? ""
        : item?.about || item?.caption || item?.title || item?.description || "";

    items.push({
      id: `post_${ownerId}_img_${index}`,
      mediaType: "image",
      url,
      caption,
      title: (typeof item === "object" && item?.title) || caption,
      category:
        (typeof item === "object" &&
          (item.sportsCategory || item.category)) ||
        data.subCategory ||
        "",
      createdAt: typeof item === "object" ? item?.createdAt : null,
      postType:
        (typeof item === "object" && item?.postType) || "achievement",
      ownerId,
      ownerType,
      ownerName,
      profileImage,
      ownerLat: Number(data.latitude) || null,
      ownerLng: Number(data.longitude) || null,
      city: data.city || data.locationName || "",
    });
  });

  (Array.isArray(data.reels) ? data.reels : []).forEach((item, index) => {
    const url = typeof item === "string" ? item : item?.url;
    if (!url) return;
    const urlKey = String(url).split("?")[0].trim();
    if (!urlKey || seen.has(urlKey)) return;
    seen.add(urlKey);

    const caption =
      typeof item === "string"
        ? ""
        : item?.about || item?.caption || item?.title || item?.description || "";

    const rawType =
      (typeof item === "object" && item?.postType) || "reel";

    items.push({
      id:
        ownerType === "trainer"
          ? `trainer_${ownerId}_${index}`
          : `institute_${ownerId}_${index}`,
      mediaType: "video",
      url,
      coverUrl: typeof item === "object" ? item?.coverUrl || "" : "",
      caption,
      title:
        (typeof item === "object" && (item.title || item.about)) ||
        `${ownerName} reel`,
      category:
        (typeof item === "object" &&
          (item.sportsCategory || item.category)) ||
        data.subCategory ||
        "",
      createdAt: typeof item === "object" ? item?.createdAt : null,
      postType: rawType === "video" ? "video" : "reel",
      ownerId,
      ownerType,
      ownerName,
      profileImage,
      ownerLat: Number(data.latitude) || null,
      ownerLng: Number(data.longitude) || null,
      city: data.city || data.locationName || "",
    });
  });

  return items;
};

const isPhotoPost = (post) => post?.mediaType === "image";
const isReelPost = (post) =>
  post?.mediaType === "video" && post?.postType !== "video";
const isTrainingVideoPost = (post) =>
  post?.mediaType === "video" && post?.postType === "video";

const toReelViewerItem = (post) => ({
  reelId: post.id,
  videoUrl: post.url,
  url: post.url,
  about: post.caption || post.title || "",
  ownerId: post.ownerId,
  type: post.ownerType === "trainer" ? "trainer" : "institute",
  title: post.title || post.ownerName,
  ownerName: post.ownerName,
  ownerPhoto: post.profileImage,
  profileImage: post.profileImage,
  category: post.category || "",
});

/** Free on-device ranking (no paid AI APIs) */
const scoreCommunityPost = (post, userLocation) => {
  let score = 0;
  const ageMs = Date.now() - (getCreatedMs(post.createdAt) || 0);
  const days = ageMs / (1000 * 60 * 60 * 24);
  score += Math.max(0, 40 - days); // fresher posts score higher

  if (post.caption || post.title) score += 8;
  if (post.category) score += 6;
  if (isReelPost(post)) score += 10;
  if (isPhotoPost(post)) score += 4;

  if (
    userLocation &&
    Number.isFinite(post.ownerLat) &&
    Number.isFinite(post.ownerLng)
  ) {
    const distance = getDistance(
      userLocation.lat,
      userLocation.lng,
      post.ownerLat,
      post.ownerLng,
    );
    if (distance <= 5) score += 35;
    else if (distance <= 15) score += 25;
    else if (distance <= 40) score += 15;
    else if (distance <= 80) score += 6;
  }

  return score;
};

/* ===================================================== */
/* ================= LANDING PAGE ====================== */
/* ===================================================== */

const Landing = () => {
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(true);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("top");
  const [instituteMode, setInstituteMode] = useState("top");
  const [trainers, setTrainers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [reels, setReels] = useState([]);
  const [visiblePostCount, setVisiblePostCount] = useState(8);
  const [postFilter, setPostFilter] = useState("All");
  const [selectedPost, setSelectedPost] = useState(null);
  const [youtubeVideo, setYoutubeVideo] = useState(null);

  const [showCommentsFor, setShowCommentsFor] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [showReelViewer, setShowReelViewer] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [videoThumbs, setVideoThumbs] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const locationBoostApplied = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchValue = String(searchTerm || "")
    .toLowerCase()
    .trim();
  const normalizeSearch = (value) => {
    return String(value ?? "")
      .toLowerCase()
      .trim();
  };
  const [suggestedProfiles, setSuggestedProfiles] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [reactionMap, setReactionMap] = useState({});

  const [commentBox, setCommentBox] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentCounts, setCommentCounts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [dislikeCounts, setDislikeCounts] = useState({});
  const generateThumbnail = (videoUrl, reelId) => {
    if (videoThumbs[reelId]) return;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadeddata", () => {
      video.currentTime = 0.2;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const image = canvas.toDataURL("image/jpeg", 0.8);

      setVideoThumbs((prev) => ({
        ...prev,
        [reelId]: image,
      }));
    });
  };
  useEffect(() => {
    reels.forEach((r) => {
      generateThumbnail(r.videoUrl, r.reelId);
    });
  }, [reels]);
  /* ===================================================== */
  /* ================= FETCH SUGGESTED =================== */
  /* ===================================================== */
  // Landing.jsx

  {
    /*} useEffect(() => {
    const handleResize = () => {
      window.dispatchEvent(new Event("showLandingBanner"));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let bannerLoadedListener;
    let bannerFailedListener;

    const loadAds = async () => {
      try {
        await initializeAdMob();

        bannerLoadedListener = await AdMob.addListener("bannerAdLoaded", () => {
          console.log("Banner loaded");
        });

        bannerFailedListener = await AdMob.addListener(
          "bannerAdFailedToLoad",
          (error) => {
            console.log("Banner failed:", error);
          },
        );

        await AdMob.showBanner({
          adId: ADMOB_BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 0,
          isTesting: ADMOB_TESTING,
        });
      } catch (err) {
        console.log(err);
      }
    };

    loadAds();

    return () => {
      AdMob.removeBanner().catch(() => {});
      bannerLoadedListener?.remove();
      bannerFailedListener?.remove();
    };
  }, []);*/
  }
  const openComments = async (item) => {
    const mainCol = item.type === "trainer" ? "trainers" : "institutes";

    const snap = await getDocs(collection(db, mainCol, item.id, "comments"));

    const list = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );

    setCommentsList(list);
    setShowCommentsFor(item);
  };

  useEffect(() => {
    const loadSuggested = async () => {
      setIsLoadingProfiles(true);

      try {
        const trainerSnap = await getDocs(collection(db, "trainers"));
        const instituteSnap = await getDocs(collection(db, "institutes"));

        const trainerList = trainerSnap.docs.map((doc) => ({
          id: doc.id,
          type: "trainer",
          ...doc.data(),
        }));

        const instituteList = instituteSnap.docs.map((doc) => ({
          id: doc.id,
          type: "institute",
          ...doc.data(),
        }));

        let all = [...trainerList, ...instituteList];

        all = all.map((item) => ({
          ...item,
          distance:
            userLocation && item.latitude && item.longitude
              ? getDistance(
                  userLocation.lat,
                  userLocation.lng,
                  Number(item.latitude),
                  Number(item.longitude),
                )
              : null,
        }));

        all.sort((a, b) => {
          if (userLocation) {
            return (a.distance || 9999) - (b.distance || 9999);
          }

          return Number(b.rating || 0) - Number(a.rating || 0);
        });

        setSuggestedProfiles(all.slice(0, 8));
      } catch (error) {
        console.error("Suggested profiles error:", error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    loadSuggested();
  }, [userLocation]);

  /* ===================================================== */
  /* ================= LOAD FOLLOWING ==================== */
  /* ===================================================== */

  /* ================= AUTH ================= */

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);
  useEffect(() => {
    if (!user) return;

    const loadFollowing = async () => {
      const snap = await getDocs(collection(db, "followers"));

      const ids = snap.docs
        .map((d) => d.data())
        .filter((x) => x.followerId === user.uid)
        .map((x) => x.profileId);

      setFollowingIds(ids);
    };

    loadFollowing();
  }, [user]);

  /* ===================================================== */
  /* ================= FOLLOW ============================ */
  /* ===================================================== */

  /* ===================================================== */
  /* ================= FOLLOW (UPDATED) =================== */
  /* ===================================================== */

  const handleFollow = async (profileId) => {
    if (!user) {
      alert("Login First");
      return;
    }

    if (user.uid === profileId) return;

    const followId = `${user.uid}_${profileId}`;
    const followRef = doc(db, "followers", followId);

    try {
      const snap = await getDoc(followRef);

      // already following
      if (snap.exists()) return;

      /* SAVE FOLLOW SAME AS ALLPEOPLEPAGE */
      await setDoc(followRef, {
        followerId: user.uid,
        profileId: profileId,
        createdAt: serverTimestamp(),
      });

      /* UPDATE UI IMMEDIATELY */
      setFollowingIds((prev) => [...prev, profileId]);
    } catch (error) {
      console.log(error);
    }
  };

  /* ===================================================== */
  /* ================= LIKE / DISLIKE ==================== */
  /* ===================================================== */

  const handleReaction = async (item, type) => {
    if (!user) return alert("Login First");

    const mainCol = item.type === "trainer" ? "trainers" : "institutes";

    const reactionRef = doc(db, mainCol, item.id, "reactions", user.uid);

    const snap = await getDoc(reactionRef);
    const oldType = snap.exists() ? snap.data().type : null;

    // SAME CLICK = REMOVE
    if (oldType === type) {
      await deleteDoc(reactionRef);
      setReactionMap((p) => ({ ...p, [item.id]: null }));
    } else {
      // NEW / SWITCH
      await setDoc(reactionRef, {
        uid: user.uid,
        type,
        createdAt: serverTimestamp(),
      });

      setReactionMap((p) => ({
        ...p,
        [item.id]: type,
      }));
    }

    // 🔥 RECALCULATE COUNTS
    const allSnap = await getDocs(
      collection(db, mainCol, item.id, "reactions"),
    );

    let likes = 0;
    let dislikes = 0;

    allSnap.forEach((d) => {
      const t = d.data().type;

      if (t === "like") likes++;
      if (t === "dislike") dislikes++;
    });

    await updateDoc(doc(db, mainCol, item.id), {
      likeCount: likes,
      dislikeCount: dislikes,
    });
  };
  /* ===================================================== */
  /* ================= COMMENT =========================== */
  /* ===================================================== */

  const submitComment = async (item) => {
    if (!user) return alert("Login First");
    if (!commentText.trim()) return;

    const mainCol = item.type === "trainer" ? "trainers" : "institutes";

    await addDoc(collection(db, mainCol, item.id, "comments"), {
      uid: user.uid,
      text: commentText,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, mainCol, item.id), {
      commentCount: increment(1),
    });

    setCommentText("");
    setCommentBox(null);
  };

  /* ===================================================== */
  /* ================= LIVE COUNTS ======================= */
  /* ===================================================== */

  useEffect(() => {
    const unsubs = suggestedProfiles.map((item) => {
      const mainCol = item.type === "trainer" ? "trainers" : "institutes";

      return onSnapshot(doc(db, mainCol, item.id), (snap) => {
        const data = snap.data();

        setLikeCounts((p) => ({
          ...p,
          [item.id]: data?.likeCount || 0,
        }));

        setDislikeCounts((p) => ({
          ...p,
          [item.id]: data?.dislikeCount || 0,
        }));

        setCommentCounts((p) => ({
          ...p,
          [item.id]: data?.commentCount || 0,
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [suggestedProfiles]);

  /* ================= FETCH TRAINERS + INSTITUTES ================= */
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingTrainers(true);
      setIsLoadingInstitutes(true);

      try {
        const [trainerSnap, instituteSnap] = await Promise.all([
          getDocs(collection(db, "trainers")),
          getDocs(collection(db, "institutes")),
        ]);

        const trainerList = trainerSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const instituteList = instituteSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTrainers(trainerList);
        setInstitutes(instituteList);
      } catch (error) {
        console.error("❌ Error fetching data:", error);
      } finally {
        setIsLoadingTrainers(false);
        setIsLoadingInstitutes(false);
      }
    };

    fetchData();
  }, []);
  /* ================= LOCATION ================= */

  useEffect(() => {
    const loadLocation = async () => {
      setLocationStatus("loading");
      const loc = await getCurrentUserLocation();
      if (loc?.lat && loc?.lng) {
        setUserLocation(loc);
        setLocationStatus("ready");
      } else {
        setLocationStatus("denied");
      }
    };

    loadLocation();
  }, []);

  /* Auto-prefer nearby trainers / institutes once location is available */
  useEffect(() => {
    if (!userLocation || locationBoostApplied.current) return;
    locationBoostApplied.current = true;
    setMode("nearby");
    setInstituteMode("nearby");
    setPostFilter((prev) => (prev === "All" ? "Near you" : prev));
  }, [userLocation]);

  /* ================= FETCH TRAINERS + INSTITUTES ================= */

  /* ================= FETCH REELS ================= */
  /* ================= ✅ FETCH REELS FROM TRAINERS + INSTITUTES ================= */

  useEffect(() => {
    const fetchReels = async () => {
      setIsLoadingReels(true);

      try {
        const [trainerSnap, instituteSnap] = await Promise.all([
          getDocs(collection(db, "trainers")),
          getDocs(collection(db, "institutes")),
        ]);

        let all = [];

        trainerSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isDeleted) return;

          if (Array.isArray(data.reels)) {
            data.reels.forEach((video, index) => {
              const videoUrl = typeof video === "string" ? video : video?.url;
              if (!videoUrl) return;
              all.push({
                reelId: `trainer_${docSnap.id}_${index}`,
                videoUrl,
                about:
                  typeof video === "object"
                    ? video?.about || video?.caption || video?.title || ""
                    : "",
                ownerId: docSnap.id,
                type: "trainer",
                title:
                  (typeof video === "object" && (video.title || video.about)) ||
                  getOwnerDisplayName(data, "trainer"),
                ownerName: getOwnerDisplayName(data, "trainer"),
                ownerPhoto: data.profileImageUrl || "",
                category:
                  (typeof video === "object" &&
                    (video.sportsCategory || video.category)) ||
                  data.subCategory ||
                  data.category ||
                  "",
              });
            });
          }
        });

        instituteSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isDeleted) return;

          if (Array.isArray(data.reels)) {
            data.reels.forEach((video, index) => {
              const videoUrl = typeof video === "string" ? video : video?.url;
              if (!videoUrl) return;
              all.push({
                reelId: `institute_${docSnap.id}_${index}`,
                videoUrl,
                about:
                  typeof video === "object"
                    ? video?.about || video?.caption || video?.title || ""
                    : "",
                ownerId: docSnap.id,
                type: "institute",
                title:
                  (typeof video === "object" && (video.title || video.about)) ||
                  getOwnerDisplayName(data, "institute"),
                ownerName: getOwnerDisplayName(data, "institute"),
                ownerPhoto: data.profileImageUrl || "",
                category:
                  (typeof video === "object" &&
                    (video.sportsCategory || video.category)) ||
                  data.subCategory ||
                  data.category ||
                  "",
              });
            });
          }
        });

        all = all.sort(() => Math.random() - 0.5);

        setReels(all);
      } catch (error) {
        console.error("Reels loading error:", error);
      } finally {
        setIsLoadingReels(false);
      }
    };

    fetchReels();
  }, []);
  const searchedTrainers = searchValue
    ? trainers.filter((trainer) => {
        const searchableText = [
          trainer.firstName,
          trainer.lastName,
          trainer.trainerName,
          trainer.name,
          trainer.category,
          trainer.subCategory,
          trainer.city,
          trainer.state,
          trainer.location,
        ]
          .filter(Boolean)
          .map(normalizeSearch)
          .join(" ");

        return searchableText.includes(searchValue);
      })
    : [];

  const communityPosts = React.useMemo(() => {
    const all = [];
    trainers.forEach((trainer) => {
      all.push(...collectOwnerPosts(trainer.id, trainer, "trainer"));
    });
    institutes.forEach((institute) => {
      all.push(...collectOwnerPosts(institute.id, institute, "institute"));
    });

    return all
      .map((post) => {
        const hasCoords =
          userLocation &&
          Number.isFinite(post.ownerLat) &&
          Number.isFinite(post.ownerLng);
        const distance = hasCoords
          ? getDistance(
              userLocation.lat,
              userLocation.lng,
              post.ownerLat,
              post.ownerLng,
            )
          : null;
        return {
          ...post,
          distance,
          aiScore: scoreCommunityPost(
            { ...post, distance },
            userLocation,
          ),
        };
      })
      .sort((a, b) => getCreatedMs(b.createdAt) - getCreatedMs(a.createdAt));
  }, [trainers, institutes, userLocation]);

  const feedPosts = React.useMemo(() => {
    let list = communityPosts.filter((post) => {
      if (postFilter === "Photos" && !isPhotoPost(post)) return false;
      if (postFilter === "Reels" && !isReelPost(post)) return false;
      if (postFilter === "Videos" && !isTrainingVideoPost(post)) return false;
      if (postFilter === "Near you") {
        if (post.distance == null) return false;
        return post.distance <= 80;
      }
      return true;
    });

    if (postFilter === "Near you") {
      list = [...list].sort(
        (a, b) => (a.distance ?? 9999) - (b.distance ?? 9999),
      );
    } else if (postFilter === "For you") {
      list = [...list].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    } else if (userLocation && postFilter === "All") {
      list = [...list].sort((a, b) => {
        const distA = a.distance ?? 9999;
        const distB = b.distance ?? 9999;
        if (Math.abs(distA - distB) > 0.5) return distA - distB;
        return getCreatedMs(b.createdAt) - getCreatedMs(a.createdAt);
      });
    }

    return list;
  }, [communityPosts, postFilter, userLocation]);

  const searchedPosts = searchValue
    ? communityPosts.filter((post) => {
        const searchableText = [
          post.caption,
          post.title,
          post.ownerName,
          post.category,
        ]
          .filter(Boolean)
          .map(normalizeSearch)
          .join(" ");
        return searchableText.includes(searchValue);
      })
    : [];

  const communityVideos = React.useMemo(
    () => communityPosts.filter(isTrainingVideoPost),
    [communityPosts],
  );

  const openCommunityPost = (post) => {
    if (isReelPost(post)) {
      const reelPosts = communityPosts.filter(isReelPost);
      const mapped = reelPosts.map(toReelViewerItem);
      const index = Math.max(
        0,
        reelPosts.findIndex((item) => item.id === post.id),
      );
      navigate(`/reels/${index}`, { state: { reels: mapped } });
      return;
    }

    if (isTrainingVideoPost(post)) {
      setYoutubeVideo(post);
      return;
    }

    setSelectedPost(post);
  };

  /* ================= ACADEMIES SEARCH ================= */

  const searchedInstitutes = searchValue
    ? institutes.filter((institute) => {
        const searchableText = [
          institute.instituteName,
          institute.name,
          institute.category,
          institute.subCategory,
          institute.city,
          institute.state,
          institute.location,
          institute.address,
        ]
          .filter(Boolean)
          .map(normalizeSearch)
          .join(" ");

        return searchableText.includes(searchValue);
      })
    : [];

  /* ================= CATEGORY SEARCH ================= */

  const filteredCategories = searchValue
    ? categories.filter((cat) => {
        const categoryName = normalizeSearch(cat.name);

        return categoryName.includes(searchValue);
      })
    : categories;

  /* ================= SEARCH RESULT CHECK ================= */

  const hasSearchResults =
    searchedTrainers.length > 0 ||
    searchedInstitutes.length > 0 ||
    filteredCategories.length > 0 ||
    searchedPosts.length > 0;
  return (
    <div className="page-content w-full font-sans pb-0 touch-pan-x touch-pan-y">
      <SeoHead
        title="Kridana — Sports Academies & Trainers"
        description="Discover sports academies, institutes, and solo trainers on Kridana. Open public profiles, explore sports and fees, and book demos near you."
        path="/"
        image="/Kridana logo.png"
      />
      {/* 3px white line */}
      <div className="w-full h-[10px] bg-white"></div>

      <section className="w-full bg-[#FFFBF8] border-b border-orange-100 py-2 md:py-20 overflow-hidden">
        {/* ==================== MOBILE VIEW ===================== */}
        {/* ========================================================= */}
        {/* ================= MOBILE LANDING PAGE =================== */}
        {/* ========================================================= */}

        <div
          className="
    landing-shell
    w-full
    max-w-lg
    md:max-w-7xl
    mx-auto
    bg-[#FAFAF9]
    text-[#171717]
    overflow-x-hidden
    overflow-y-visible
    h-auto
    pb-0
  "
        >
          {/* ===================================================== */}
          {/* HEADER / HERO */}
          {/* ===================================================== */}

          <section
            className="
    w-full
    bg-[#FFFBF8]
    border-b
    border-orange-100
    py-3
    px-3
    md:py-20
    overflow-hidden
  "
          >
            {/* Heading */}
            <div className="mb-3">
              <h1 className="text-[22px] md:text-5xl leading-[26px] md:leading-tight font-extrabold tracking-[-0.3px] text-[#171717]">
                Find Your Sport.
              </h1>

              <h2 className="text-[22px] md:text-5xl leading-[26px] md:leading-tight font-extrabold tracking-[-0.3px] text-[#171717]">
                Find Your <span className="text-[#FF6A00]">Community.</span>
              </h2>

              <p className="mt-2 text-[13px] md:text-lg leading-[18px] md:leading-relaxed text-gray-500 max-w-[320px] md:max-w-2xl">
                Discover trainers, academies and posts from the sports community
                around you.
              </p>
            </div>

            {/* ================================================= */}
            {/* SEARCH BAR */}
            {/* ================================================= */}

            <div className="relative mb-2.5">
              <div
                className="
          min-h-[44px]
          w-full
          bg-white
          rounded-[12px]
          border border-[#ECECEC]
          shadow-[0_2px_8px_rgba(0,0,0,0.06)]
          flex items-center
          px-3
        "
              >
                <Search
                  size={16}
                  strokeWidth={2}
                  className="text-gray-400 shrink-0"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => {
                    if (searchTerm.trim()) {
                      setShowSearchResults(true);
                    }
                  }}
                  placeholder="Search sports, trainers, academies, posts..."
                  className="
    flex-1
    min-w-0
    ml-2
    bg-transparent
    outline-none
    text-sm
    text-gray-700
    placeholder:text-gray-400
  "
                />
              </div>
            </div>
            {/* =========================================================
    GLOBAL SEARCH RESULTS
========================================================= */}

            {showSearchResults && searchValue && (
              <div className="mt-2 mb-3">
                {/* SEARCH RESULT HEADER */}

                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[11px] font-extrabold text-[#171717]">
                      Search Results
                    </p>

                    <p className="text-[7px] text-gray-400 mt-0.5">
                      Results for "{searchTerm}"
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setShowSearchResults(false);
                    }}
                    className="
          text-[8px]
          font-semibold
          text-[#FF6A00]
        "
                  >
                    Clear
                  </button>
                </div>

                {/* =====================================================
        RELATED SPORTS / CATEGORIES
    ===================================================== */}

                {filteredCategories.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[9px] font-bold text-[#222]">
                        Sports
                      </h3>
                    </div>

                    <HScrollTrack itemCount={filteredCategories.length} className="gap-1.5">
                      {filteredCategories.slice(0, 8).map((cat, index) => {
                        const Icon = cat.icon;

                        return (
                          <button
                            key={index}
                            onClick={() => {
                              if (cat.path) {
                                navigate(cat.path);
                              }
                            }}
                            className="
                  shrink-0
                  flex
                  items-center
                  gap-1.5
                  px-2
                  py-1.5
                  bg-white
                  border border-[#E8E8E8]
                  rounded-full
                  shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                "
                          >
                            {Icon && (
                              <div
                                className="
                      w-[20px]
                      h-[20px]
                      rounded-full
                      bg-[#FFF0E6]
                      flex
                      items-center
                      justify-center
                    "
                              >
                                <Icon size={11} className="text-[#FF6A00]" />
                              </div>
                            )}

                            <span className="text-[7px] font-semibold text-[#333]">
                              {cat.name}
                            </span>
                          </button>
                        );
                      })}
                    </HScrollTrack>
                  </div>
                )}

                {/* =====================================================
        TRAINERS
    ===================================================== */}

                {searchedTrainers.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[9px] font-bold text-[#222]">
                        Trainers & Coaches
                      </h3>

                      <button
                        onClick={() => navigate("/trainers")}
                        className="text-[7px] font-semibold text-[#FF6A00]"
                      >
                        View All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                      {searchedTrainers.slice(0, 4).map((trainer) => (
                        <button
                          key={trainer.id}
                          onClick={() => navigate(`/trainers/${trainer.id}`)}
                          className="
                text-left
                bg-white
                rounded-[8px]
                border border-[#E8E8E8]
                shadow-[0_2px_6px_rgba(0,0,0,0.04)]
                p-1.5
                active:scale-[0.98]
                transition
              "
                        >
                          <div className="flex gap-1.5">
                            <div
                              className="
                    w-[42px]
                    h-[42px]
                    rounded-full
                    overflow-hidden
                    shrink-0
                    bg-gray-100
                  "
                            >
                              <img
                                src={
                                  trainer.profileImageUrl ||
                                  "/images/default-avatar.png"
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-[7.5px] font-bold truncate text-[#222]">
                                {trainer.firstName} {trainer.lastName}
                              </p>

                              <p className="text-[6px] text-gray-500 truncate">
                                {trainer.subCategory ||
                                  trainer.category ||
                                  "Sports Trainer"}
                              </p>

                              <p className="flex items-center gap-0.5 text-[6px] text-gray-400 mt-0.5 truncate">
                                <MapPin size={7} />
                                {trainer.city ||
                                  trainer.location ||
                                  "Bengaluru"}
                              </p>

                              <p className="flex items-center gap-0.5 text-[6px] text-gray-500 mt-0.5">
                                <Star
                                  size={7}
                                  fill="#FFB800"
                                  className="text-[#FFB800]"
                                />

                                {trainer.rating || "4.7"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right mt-1">
                            <span className="text-[6px] font-semibold text-[#FF6A00]">
                              View Profile →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* =====================================================
        ACADEMIES / INSTITUTES
    ===================================================== */}

                {searchedInstitutes.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[9px] font-bold text-[#222]">
                        Academies
                      </h3>

                      <button
                        onClick={() => navigate("/institutes")}
                        className="text-[7px] font-semibold text-[#FF6A00]"
                      >
                        View All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                      {searchedInstitutes.slice(0, 4).map((institute) => (
                        <button
                          key={institute.id}
                          onClick={() =>
                            navigate(`/institutes/${institute.id}`)
                          }
                          className="
                text-left
                bg-white
                rounded-[8px]
                border border-[#E8E8E8]
                shadow-[0_2px_6px_rgba(0,0,0,0.04)]
                p-1.5
                active:scale-[0.98]
                transition
              "
                        >
                          <div className="flex gap-1.5">
                            <div
                              className="
                    w-[42px]
                    h-[42px]
                    rounded-full
                    overflow-hidden
                    shrink-0
                    bg-gray-50
                    border border-gray-100
                  "
                            >
                              <img
                                src={
                                  institute.profileImageUrl &&
                                  !institute.profileImageUrl.endsWith(".mp4")
                                    ? institute.profileImageUrl
                                    : "/images/default-institute.png"
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-[7.5px] font-bold truncate text-[#222]">
                                {institute.instituteName ||
                                  institute.name ||
                                  "Sports Academy"}
                              </p>

                              <p className="text-[6px] text-gray-500 truncate">
                                {institute.subCategory ||
                                  institute.category ||
                                  "Sports Academy"}
                              </p>

                              <p className="flex items-center gap-0.5 text-[6px] text-gray-400 mt-0.5 truncate">
                                <MapPin size={7} />

                                {institute.city || "Bengaluru"}
                              </p>

                              <p className="flex items-center gap-0.5 text-[6px] text-gray-500 mt-0.5">
                                <Star
                                  size={7}
                                  fill="#FFB800"
                                  className="text-[#FFB800]"
                                />

                                {institute.rating || "4.6"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right mt-1">
                            <span className="text-[6px] font-semibold text-[#FF6A00]">
                              View Profile →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchedPosts.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-extrabold text-[#222]">
                        Posts
                      </h3>
                    </div>
                    <HScrollTrack itemCount={searchedPosts.length}>
                      {searchedPosts.slice(0, 8).map((post) => (
                        <CommunityPostPreview
                          key={post.id}
                          post={post}
                          onOpen={() => openCommunityPost(post)}
                        />
                      ))}
                    </HScrollTrack>
                  </div>
                )}

                {/* =====================================================
        NO RESULTS
    ===================================================== */}

                {!hasSearchResults && (
                  <div
                    className="
          bg-white
          border border-[#E8E8E8]
          rounded-[9px]
          px-3
          py-5
          text-center
        "
                  >
                    <Search size={20} className="mx-auto text-gray-300 mb-2" />

                    <p className="text-[9px] font-semibold text-gray-600">
                      No results found
                    </p>

                    <p className="text-[7px] text-gray-400 mt-1">
                      Try another sport, category, trainer, academy or post.
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* ================================================= */}
            {/* QUICK ACTION CARDS */}
            {/* ================================================= */}

            <div className="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-6 md:max-w-4xl">
              {/* Explore Sports */}
              <button
                onClick={() => navigate("/MobileCategoriesPage")}
                className="
          h-[86px]
          bg-white
          rounded-[9px]
          border border-[#EEEEEE]
          shadow-[0_2px_7px_rgba(0,0,0,0.05)]
          flex flex-col
          items-center
          justify-center
          px-1
          active:scale-[0.98]
          transition
        "
              >
                <div
                  className="
            w-[29px]
            h-[29px]
            rounded-full
            bg-[#FFF0E6]
            flex
            items-center
            justify-center
            mb-2
          "
                >
                  <Trophy
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#FF6A00]"
                  />
                </div>

                <p className="text-[8.5px] font-bold text-[#222]">
                  Explore Sports
                </p>

                <p className="mt-1 text-[6.5px] leading-[8px] text-gray-400 text-center">
                  Find your favorite
                  <br />
                  sports
                </p>
              </button>

              {/* Trainers */}
              <button
                onClick={() => navigate("/trainers")}
                className="
          h-[86px]
          bg-white
          rounded-[9px]
          border border-[#EEEEEE]
          shadow-[0_2px_7px_rgba(0,0,0,0.05)]
          flex flex-col
          items-center
          justify-center
          px-1
          active:scale-[0.98]
          transition
        "
              >
                <div
                  className="
            w-[29px]
            h-[29px]
            rounded-full
            bg-[#EEF8E9]
            flex
            items-center
            justify-center
            mb-2
          "
                >
                  <UserRound
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#72A84F]"
                  />
                </div>

                <p className="text-[8.5px] font-bold text-[#222]">
                  Find Trainers
                </p>

                <p className="mt-1 text-[6.5px] leading-[8px] text-gray-400 text-center">
                  Connect with top
                  <br />
                  coaches
                </p>
              </button>

              {/* Academies */}
              <button
                onClick={() => navigate("/institutes")}
                className="
          h-[86px]
          bg-white
          rounded-[9px]
          border border-[#EEEEEE]
          shadow-[0_2px_7px_rgba(0,0,0,0.05)]
          flex flex-col
          items-center
          justify-center
          px-1
          active:scale-[0.98]
          transition
        "
              >
                <div
                  className="
            w-[29px]
            h-[29px]
            rounded-full
            bg-[#F2EDFF]
            flex
            items-center
            justify-center
            mb-2
          "
                >
                  <Building2
                    size={15}
                    strokeWidth={1.8}
                    className="text-[#8264D8]"
                  />
                </div>

                <p className="text-[8.5px] font-bold text-[#222]">
                  Find Academies
                </p>

                <p className="mt-1 text-[6.5px] leading-[8px] text-gray-400 text-center">
                  Discover top sports
                  <br />
                  academies
                </p>
              </button>

              {/* Community */}
            </div>
          </section>

          {/* ===================================================== */}
          {/* COMMUNITY POSTS FROM TRAINERS + INSTITUTES */}
          {/* ===================================================== */}

          <section className="px-3 pt-3 pb-4">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold text-[#171717]">
                  Community posts
                </h2>
                <p className="text-[7px] text-gray-400 mt-0.5 truncate">
                  {locationStatus === "ready"
                    ? "Showing nearby sports updates first"
                    : locationStatus === "loading"
                      ? "Detecting your location…"
                      : "Photos, reels and academy highlights"}
                </p>
              </div>
              {feedPosts.length > visiblePostCount && (
                <button
                  type="button"
                  onClick={() => setVisiblePostCount((count) => count + 8)}
                  className="text-[8px] font-semibold text-[#FF6A00] shrink-0"
                >
                  See All
                </button>
              )}
            </div>

            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <span
                className={`inline-flex items-center gap-1 shrink-0 h-[20px] px-2 rounded-full text-[6.5px] font-semibold border ${
                  locationStatus === "ready"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : locationStatus === "loading"
                      ? "bg-orange-50 text-orange-600 border-orange-100"
                      : "bg-gray-50 text-gray-500 border-gray-100"
                }`}
              >
                <MapPin size={8} />
                {locationStatus === "ready"
                  ? "Location on"
                  : locationStatus === "loading"
                    ? "Locating…"
                    : "Location off"}
              </span>
              <span className="inline-flex items-center gap-1 shrink-0 h-[20px] px-2 rounded-full text-[6.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                <Sparkles size={8} />
                Free smart sort
              </span>
            </div>

            <div className="flex gap-1.5 mb-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {[
                { id: "All", label: "All", icon: null },
                { id: "For you", label: "For you", icon: Sparkles },
                { id: "Near you", label: "Near you", icon: MapPin },
                { id: "Photos", label: "Photos", icon: ImageIcon },
                { id: "Reels", label: "Reels", icon: Film },
                { id: "Videos", label: "Videos", icon: Clapperboard },
              ].map((filter) => {
                const Icon = filter.icon;
                const active = postFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setPostFilter(filter.id);
                      setVisiblePostCount(8);
                    }}
                    className={`
                      h-[22px]
                      px-2.5
                      rounded-full
                      flex
                      items-center
                      gap-1
                      text-[6.5px]
                      font-semibold
                      transition-all
                      active:scale-95
                      shrink-0
                      ${
                        active
                          ? "bg-[#FF6A00] text-white shadow-sm"
                          : "bg-white border border-[#E8E8E8] text-gray-500"
                      }
                    `}
                  >
                    {Icon ? <Icon size={8} /> : null}
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {isLoadingTrainers || isLoadingInstitutes ? (
              <HScrollTrack itemCount={2}>
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="
                      bg-white rounded-[9px] border border-[#E9E9E9]
                      min-w-[calc((100vw-32px)/2)] w-[calc((100vw-32px)/2)]
                      shrink-0 snap-start overflow-hidden animate-pulse
                    "
                  >
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-[7px] w-[70%] bg-gray-200 rounded-full" />
                      <div className="h-[6px] w-[50%] bg-gray-200 rounded-full" />
                    </div>
                  </div>
                ))}
              </HScrollTrack>
            ) : feedPosts.length === 0 ? (
              <div className="rounded-[9px] bg-white border border-[#E8E8E8] px-3 py-6 text-center">
                <ImageIcon size={22} className="mx-auto text-gray-300" />
                <p className="mt-2 text-[9px] font-semibold text-gray-600">
                  {postFilter === "Near you"
                    ? "No nearby posts yet"
                    : postFilter === "Reels"
                      ? "No reels yet"
                      : "No posts yet"}
                </p>
                <p className="mt-1 text-[7px] text-gray-400">
                  {postFilter === "Near you" && locationStatus !== "ready"
                    ? "Allow location to discover posts around you."
                    : "Try another filter or check back soon."}
                </p>
              </div>
            ) : (
              <HScrollTrack
                  desktopGrid
                  itemCount={feedPosts.slice(0, visiblePostCount).length}
                >
                {feedPosts.slice(0, visiblePostCount).map((post) => (
                  <CommunityPostPreview
                    key={post.id}
                    post={post}
                    onOpen={() => openCommunityPost(post)}
                  />
                ))}
              </HScrollTrack>
            )}
          </section>

          {/* ===================================================== */}
          {/* EXPLORE SPORTS */}
          {/* ===================================================== */}

          <section className="px-3 pt-1 pb-5">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-[11px] font-extrabold text-[#171717]">
                Explore Sports
              </h2>

              <button
                onClick={() => navigate("/MobileCategoriesPage")}
                className="
        flex
        items-center
        gap-0.5
        text-[8px]
        font-semibold
        text-[#FF6A00]
      "
              >
                View All
                <ChevronRight size={10} />
              </button>
            </div>

            {/* 4 Sports + More */}
            <div className="flex items-start justify-between w-full px-1">
              {categories.slice(0, 4).map((cat, index) => {
                const Icon = cat.icon;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(cat.path);
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                    className="
            flex
            flex-col
            items-center
            justify-center
            flex-1
            min-w-0
            active:scale-95
            transition-transform
          "
                  >
                    {/* Icon */}
                    <div
                      className="
              w-[42px]
              h-[42px]
              rounded-full
              bg-white
              border
              border-[#E8E8E8]
              shadow-[0_1px_5px_rgba(0,0,0,0.05)]
              flex
              items-center
              justify-center
            "
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        className="text-[#202020]"
                      />
                    </div>

                    {/* Name */}
                    <span
                      className="
              mt-1.5
              text-[7px]
              text-[#333]
              text-center
              truncate
              max-w-[55px]
            "
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}

              {/* More */}
              <button
                onClick={() => navigate("/MobileCategoriesPage")}
                className="
        flex
        flex-col
        items-center
        justify-center
        flex-1
        min-w-0
        active:scale-95
        transition-transform
      "
              >
                <div
                  className="
          w-[42px]
          h-[42px]
          rounded-full
          bg-white
          border
          border-[#E8E8E8]
          shadow-[0_1px_5px_rgba(0,0,0,0.05)]
          flex
          items-center
          justify-center
        "
                >
                  <Grid2X2
                    size={19}
                    strokeWidth={1.5}
                    className="text-gray-500"
                  />
                </div>

                <span className="mt-1.5 text-[7px] text-gray-500">More</span>
              </button>
            </div>
          </section>

          {/* ===================================================== */}
          {/* RECOMMENDED FOR YOU */}
          {/* ===================================================== */}

          <section className="px-3 pt-1 pb-6">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold">
                  Recommended for You
                </h2>
                <p className="text-[7px] text-gray-400 mt-0.5 truncate">
                  {userLocation
                    ? "Sorted by distance around you"
                    : "Top picks from trainers and academies"}
                </p>
              </div>

              <button
                onClick={() => navigate("/trainers")}
                className="text-[8px] font-semibold text-[#FF6A00] shrink-0"
              >
                See All
              </button>
            </div>

            <div>
              {isLoadingProfiles ? (
                <RecommendedSkeleton />
              ) : suggestedProfiles.length > 0 ? (
                <HScrollTrack
                  desktopGrid
                  itemCount={suggestedProfiles.slice(0, 4).length}
                >
                  {suggestedProfiles.slice(0, 4).map((item) => {
                    const name =
                      item.type === "trainer"
                        ? `${item.firstName || ""} ${
                            item.lastName || ""
                          }`.trim()
                        : item.instituteName || "Academy";

                    const category =
                      item.subCategory || item.category || "Sports";

                    return (
                      <div
                        key={item.id}
                        className="
            bg-white
            rounded-[9px]
            border border-[#E9E9E9]
            shadow-[0_2px_6px_rgba(0,0,0,0.04)]
            p-2
            min-w-[calc((100vw-32px)/2)]
            w-[calc((100vw-32px)/2)]
            snap-start
            shrink-0
            sm:min-w-0
            sm:w-auto
            sm:shrink
          "
                      >
                        {/* Profile Top */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className="
                w-[38px]
                h-[38px]
                rounded-full
                overflow-hidden
                shrink-0
                border border-[#EEEEEE]
                bg-gray-100
              "
                          >
                            <img
                              src={
                                item.profileImageUrl ||
                                "/images/default-avatar.png"
                              }
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-[8px] font-bold text-[#222] truncate">
                                {name}
                              </p>

                              <Bookmark
                                size={10}
                                strokeWidth={1.7}
                                className="text-gray-400 shrink-0"
                              />
                            </div>

                            <p className="text-[6.5px] text-gray-500 truncate">
                              {category}
                            </p>

                            <p className="flex items-center gap-0.5 mt-0.5 text-[6px] text-gray-400 truncate">
                              <MapPin size={7} />
                              {item.city ||
                                item.location ||
                                "Bengaluru, Karnataka"}
                            </p>
                          </div>
                        </div>

                        {/* Rating + Button */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="flex items-center gap-0.5 text-[6px] text-gray-500 whitespace-nowrap">
                            <Star
                              size={7}
                              fill="#FFB800"
                              className="text-[#FFB800]"
                            />
                            {item.rating || "4.8"} ({item.reviewCount || "120"})
                          </span>

                          <button
                            onClick={() =>
                              navigate(
                                item.type === "trainer"
                                  ? `/trainers/${item.id}`
                                  : `/institutes/${item.id}`,
                              )
                            }
                            className="
                border
                border-[#FF6A00]
                text-[#FF6A00]
                rounded-[4px]
                px-1.5
                py-[3px]
                text-[5.5px]
                font-semibold
                leading-none
                whitespace-nowrap
                active:scale-95
                transition-transform
              "
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </HScrollTrack>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-[8px] text-gray-400">
                    No recommendations available yet
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ===================================================== */}
          {/* TOP TRAINERS */}
          {/* ===================================================== */}
          {/* ===================================================== */}
          {/* ================= TOP TRAINERS ====================== */}
          {/* ===================================================== */}

          <section className="px-3 pt-1 pb-2">
            {/* ================= HEADER ================= */}

            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[11px] font-extrabold text-[#171717]">
                Top Trainers & Coaches
              </h2>

              <button
                onClick={() => navigate("/trainers")}
                className="
        text-[8px]
        font-semibold
        text-[#FF6A00]
        active:opacity-70
      "
              >
                See All
              </button>
            </div>

            {/* ================= FILTER ================= */}

            <div className="flex gap-1.5 mb-1.5">
              {/* TOP RATED */}

              <button
                onClick={() => setMode("top")}
                className={`
        h-[20px]
        px-2.5
        rounded-full
        flex
        items-center
        gap-1
        text-[6.5px]
        font-medium
        transition-all
        active:scale-95

        ${
          mode === "top"
            ? "bg-[#FF6A00] text-white"
            : "bg-white border border-[#E8E8E8] text-gray-500"
        }
      `}
              >
                <Star
                  size={8}
                  fill={mode === "top" ? "white" : "#FFB800"}
                  className={mode === "top" ? "text-white" : "text-[#FFB800]"}
                />
                Top Rated
              </button>

              {/* NEAR ME */}

              <button
                onClick={() => setMode("nearby")}
                className={`
        h-[20px]
        px-2.5
        rounded-full
        flex
        items-center
        gap-1
        text-[6.5px]
        font-medium
        transition-all
        active:scale-95

        ${
          mode === "nearby"
            ? "bg-[#FF6A00] text-white"
            : "bg-white border border-[#E8E8E8] text-gray-500"
        }
      `}
              >
                <MapPin size={8} />
                Near Me
              </button>
            </div>

            {/* ===================================================== */}
            {/* ================= LOADING STATE ==================== */}
            {/* ===================================================== */}

            {isLoadingTrainers ? (
              <div
                className="
        flex
        gap-2
        overflow-hidden
        pb-1
      "
              >
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="
            bg-white
            rounded-[9px]
            border border-[#E8E8E8]
            shadow-[0_2px_6px_rgba(0,0,0,0.04)]
            overflow-hidden

            min-w-[calc((100vw-32px)/2)]
            w-[calc((100vw-32px)/2)]

            shrink-0

            animate-pulse
          "
                  >
                    {/* Skeleton Trainer Details */}

                    <div className="flex p-2 gap-1.5">
                      {/* Image Skeleton */}

                      <div
                        className="
                w-[42px]
                h-[42px]
                rounded-full
                shrink-0
                bg-gray-200
              "
                      />

                      {/* Text Skeleton */}

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <div
                            className="
                    h-[7px]
                    w-[58px]
                    bg-gray-200
                    rounded-full
                  "
                          />

                          <div
                            className="
                    w-[9px]
                    h-[9px]
                    bg-gray-200
                    rounded-sm
                  "
                          />
                        </div>

                        <div
                          className="
                  mt-1.5
                  h-[6px]
                  w-[65px]
                  bg-gray-200
                  rounded-full
                "
                        />

                        <div
                          className="
                  mt-1.5
                  h-[6px]
                  w-[72px]
                  bg-gray-200
                  rounded-full
                "
                        />

                        <div
                          className="
                  mt-1.5
                  h-[6px]
                  w-[48px]
                  bg-gray-200
                  rounded-full
                "
                        />
                      </div>
                    </div>

                    {/* Skeleton Button */}

                    <div className="flex justify-end px-2 pb-2">
                      <div
                        className="
                h-[7px]
                w-[52px]
                bg-gray-200
                rounded-full
              "
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* ===================================================== */}
                {/* ================= TRAINERS ========================== */}
                {/* ===================================================== */}

                {(() => {
                  const displayedTrainers =
                    mode === "top"
                      ? [...trainers].sort(
                          (a, b) =>
                            Number(b.rating || 0) - Number(a.rating || 0),
                        )
                      : userLocation
                      ? trainers
                          .filter(
                            (t) =>
                              t.latitude !== undefined &&
                              t.longitude !== undefined &&
                              t.latitude !== null &&
                              t.longitude !== null,
                          )
                          .map((t) => ({
                            ...t,
                            distance: getDistance(
                              userLocation.lat,
                              userLocation.lng,
                              Number(t.latitude),
                              Number(t.longitude),
                            ),
                          }))
                          .sort((a, b) => a.distance - b.distance)
                      : [];

                  const visibleTrainers = displayedTrainers.slice(0, 4);

                  /* ================================================= */
                  /* ================= NO TRAINERS =================== */
                  /* ================================================= */

                  if (visibleTrainers.length === 0) {
                    return (
                      <div
                        className="
                w-full
                bg-white
                border border-[#E8E8E8]
                rounded-[9px]
                px-3
                py-4
                text-center
              "
                      >
                        <div
                          className="
                  w-[30px]
                  h-[30px]
                  rounded-full
                  bg-[#FFF0E6]
                  mx-auto
                  flex
                  items-center
                  justify-center
                  mb-2
                "
                        >
                          <UserRound size={15} className="text-[#FF6A00]" />
                        </div>

                        <p
                          className="
                  text-[8px]
                  font-semibold
                  text-[#333]
                "
                        >
                          {mode === "nearby"
                            ? "No trainers found nearby"
                            : "No trainers available"}
                        </p>

                        <p
                          className="
                  text-[6.5px]
                  text-gray-400
                  mt-1
                "
                        >
                          {mode === "nearby"
                            ? "Try Top Rated to explore trainers."
                            : "Check back soon for trainers and coaches."}
                        </p>

                        {mode === "nearby" && (
                          <button
                            onClick={() => setMode("top")}
                            className="
                    mt-2
                    text-[7px]
                    font-semibold
                    text-[#FF6A00]
                  "
                          >
                            View Top Rated →
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <HScrollTrack
                      desktopGrid
                      itemCount={visibleTrainers.length}
                    >
                      {visibleTrainers.map((t) => (
                        <div
                          key={t.id}
                          className="
                  bg-white
                  rounded-[9px]
                  border border-[#E8E8E8]
                  shadow-[0_2px_6px_rgba(0,0,0,0.04)]
                  overflow-hidden

                  min-w-[calc((100vw-32px)/2)]
                  w-[calc((100vw-32px)/2)]

                  shrink-0
                  snap-start

                  sm:min-w-0
                  sm:w-auto
                  sm:shrink
                "
                        >
                          {/* ======================================= */}
                          {/* TRAINER DETAILS */}
                          {/* ======================================= */}

                          <div className="flex p-2 gap-1.5">
                            {/* Trainer Image */}

                            <div
                              className="
                      w-[42px]
                      h-[42px]
                      rounded-full
                      overflow-hidden
                      shrink-0
                      bg-gray-100
                      border border-[#EEEEEE]
                    "
                            >
                              <img
                                src={
                                  t.profileImageUrl ||
                                  "/images/default-avatar.png"
                                }
                                alt={`${t.firstName || ""} ${t.lastName || ""}`}
                                className="
                        w-full
                        h-full
                        object-cover
                      "
                                loading="lazy"
                              />
                            </div>

                            {/* Trainer Information */}

                            <div className="min-w-0 flex-1">
                              {/* Name + Bookmark */}

                              <div className="flex items-start justify-between gap-1">
                                <p
                                  className="
                          text-[7.5px]
                          font-bold
                          text-[#222]
                          truncate
                        "
                                >
                                  {t.firstName || ""} {t.lastName || ""}
                                </p>

                                <Bookmark
                                  size={9}
                                  strokeWidth={1.7}
                                  className="
                          text-gray-400
                          shrink-0
                        "
                                />
                              </div>

                              {/* Category */}

                              <p
                                className="
                        text-[6px]
                        text-gray-500
                        truncate
                      "
                              >
                                {t.subCategory ||
                                  t.category ||
                                  "Fitness Trainer"}
                              </p>

                              {/* Location */}

                              <p
                                className="
                        flex
                        items-center
                        gap-0.5
                        text-[6px]
                        text-gray-400
                        mt-0.5
                        truncate
                      "
                              >
                                <MapPin size={7} />

                                {t.city || "Bengaluru, Karnataka"}
                              </p>

                              {/* Rating */}

                              <p
                                className="
                        flex
                        items-center
                        gap-0.5
                        text-[6px]
                        text-gray-500
                        mt-0.5
                        whitespace-nowrap
                      "
                              >
                                <Star
                                  size={7}
                                  fill="#FFB800"
                                  className="text-[#FFB800]"
                                />

                                {t.rating || "4.7"}

                                {" ("}

                                {t.reviewCount || "98"}

                                {")"}
                              </p>
                            </div>
                          </div>

                          {/* ======================================= */}
                          {/* PROFILE BUTTON */}
                          {/* ======================================= */}

                          <div
                            className="
                    flex
                    justify-end
                    px-2
                    pb-1.5
                  "
                          >
                            <button
                              onClick={() => navigate(`/trainers/${t.id}`)}
                              className="
                      text-[6px]
                      font-semibold
                      text-[#FF6A00]
                      active:scale-95
                      transition-transform
                      whitespace-nowrap
                    "
                            >
                              View Profile →
                            </button>
                          </div>
                        </div>
                      ))}
                    </HScrollTrack>
                  );
                })()}
              </>
            )}
          </section>

          {/* ===================================================== */}
          {/* FEATURED ACADEMIES */}
          {/* ===================================================== */}

          {/* ===================================================== */}
          {/* ================= FEATURED ACADEMIES ================= */}
          {/* ===================================================== */}

          <section className="px-3 pt-1 pb-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[11px] font-extrabold">Featured Academies</h2>

              <button
                onClick={() => navigate("/institutes")}
                className="text-[8px] font-semibold text-[#FF6A00]"
              >
                See All
              </button>
            </div>

            {/* ===================================================== */}
            {/* FILTERS */}
            {/* ===================================================== */}

            <div className="flex gap-1.5 mb-1.5">
              {/* Top Rated */}
              <button
                onClick={() => setInstituteMode("top")}
                className={`
        h-[20px]
        px-2.5
        rounded-full
        flex
        items-center
        gap-1
        text-[6.5px]
        font-medium
        transition-all
        active:scale-95
        ${
          instituteMode === "top"
            ? "bg-[#FF6A00] text-white"
            : "bg-white border border-[#E8E8E8] text-gray-500"
        }
      `}
              >
                <Star
                  size={8}
                  fill={instituteMode === "top" ? "white" : "#FFB800"}
                  className={
                    instituteMode === "top" ? "text-white" : "text-[#FFB800]"
                  }
                />
                Top Rated
              </button>

              {/* Near Me */}
              <button
                onClick={() => setInstituteMode("nearby")}
                className={`
        h-[20px]
        px-2.5
        rounded-full
        flex
        items-center
        gap-1
        text-[6.5px]
        font-medium
        transition-all
        active:scale-95
        ${
          instituteMode === "nearby"
            ? "bg-[#FF6A00] text-white"
            : "bg-white border border-[#E8E8E8] text-gray-500"
        }
      `}
              >
                <MapPin size={8} />
                Near Me
              </button>
            </div>

            {/* ===================================================== */}
            {/* LOADING / ACADEMIES */}
            {/* ===================================================== */}

            {isLoadingInstitutes ? (
              /* ================= LOADING ================= */

              <div
                className="
        flex
        gap-2
        overflow-hidden
        pb-1
      "
              >
                {[1, 2].map((item) => (
                  <ProfileSkeleton key={item} />
                ))}
              </div>
            ) : (
              /* ================= LOADED ================= */

              <HScrollTrack
                desktopGrid
                itemCount={institutes.length}
              >
                {(instituteMode === "top"
                  ? [...institutes].sort(
                      (a, b) => Number(b.rating || 0) - Number(a.rating || 0),
                    )
                  : userLocation
                  ? institutes
                      .filter(
                        (i) =>
                          i.latitude !== undefined &&
                          i.longitude !== undefined &&
                          i.latitude !== null &&
                          i.longitude !== null,
                      )
                      .map((i) => ({
                        ...i,
                        distance: getDistance(
                          userLocation.lat,
                          userLocation.lng,
                          Number(i.latitude),
                          Number(i.longitude),
                        ),
                      }))
                      .sort((a, b) => a.distance - b.distance)
                  : []
                )
                  .slice(0, 4)
                  .map((i) => (
                    <div
                      key={i.id}
                      className="
              bg-white
              rounded-[9px]
              border border-[#E8E8E8]
              shadow-[0_2px_6px_rgba(0,0,0,0.04)]
              overflow-hidden

              min-w-[calc((100vw-32px)/2)]
              w-[calc((100vw-32px)/2)]
              shrink-0
              snap-start

              sm:min-w-0
              sm:w-auto
              sm:shrink
            "
                    >
                      {/* ================================================= */}
                      {/* ACADEMY DETAILS */}
                      {/* ================================================= */}

                      <div className="flex p-2 gap-1.5">
                        {/* Academy Image */}
                        <div
                          className="
                  w-[42px]
                  h-[42px]
                  rounded-full
                  overflow-hidden
                  shrink-0
                  bg-gray-50
                  border border-gray-100
                "
                        >
                          <img
                            src={
                              i.profileImageUrl &&
                              !i.profileImageUrl.endsWith(".mp4")
                                ? i.profileImageUrl
                                : "/images/default-institute.png"
                            }
                            alt={i.instituteName || "Academy"}
                            className="
                    w-full
                    h-full
                    object-cover
                  "
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/default-institute.png";
                            }}
                          />
                        </div>

                        {/* Academy Info */}
                        <div className="min-w-0 flex-1">
                          {/* Name + Bookmark */}
                          <div className="flex items-start justify-between gap-1">
                            <p
                              className="
                      text-[7.5px]
                      font-bold
                      text-[#222]
                      truncate
                    "
                            >
                              {i.instituteName || i.name || "Sports Academy"}
                            </p>

                            <Bookmark
                              size={9}
                              strokeWidth={1.7}
                              className="
                      text-gray-400
                      shrink-0
                    "
                            />
                          </div>

                          {/* Category */}
                          <p
                            className="
                    text-[6px]
                    text-gray-500
                    truncate
                  "
                          >
                            {i.subCategory || i.category || "Sports Academy"}
                          </p>

                          {/* Location */}
                          <p
                            className="
                    flex
                    items-center
                    gap-0.5
                    text-[6px]
                    text-gray-400
                    mt-0.5
                    truncate
                  "
                          >
                            <MapPin size={7} />

                            {i.city || "Bengaluru"}
                            {i.state ? `, ${i.state}` : ", Karnataka"}
                          </p>

                          {/* Rating */}
                          <p
                            className="
                    flex
                    items-center
                    gap-0.5
                    text-[6px]
                    text-gray-500
                    mt-0.5
                    whitespace-nowrap
                  "
                          >
                            <Star
                              size={7}
                              fill="#FFB800"
                              className="text-[#FFB800]"
                            />
                            {i.rating || "4.6"} ({i.reviewCount || "74"})
                          </p>
                        </div>
                      </div>

                      {/* ================================================= */}
                      {/* VIEW PROFILE */}
                      {/* ================================================= */}

                      <div
                        className="
                flex
                justify-end
                px-2
                pb-1.5
              "
                      >
                        <button
                          onClick={() => navigate(`/institutes/${i.id}`)}
                          className="
                  text-[6px]
                  font-semibold
                  text-[#FF6A00]
                  active:scale-95
                  transition-transform
                  whitespace-nowrap
                "
                        >
                          View Profile →
                        </button>
                      </div>
                    </div>
                  ))}
              </HScrollTrack>
            )}
          </section>
          {/* ===================================================== */}
          {/* TRAINING & SPORTS VIDEOS */}
          {/* ===================================================== */}

          <section className="px-3 pt-1 pb-3">
            <div className="mb-2">
              <h2 className="text-[16px] font-extrabold">
                Training & Sports Videos
              </h2>
            </div>

            {isLoadingReels ? (
              <HScrollTrack itemCount={3}>
                {[1, 2, 3].map((item) => (
                  <VideoSkeleton key={item} />
                ))}
              </HScrollTrack>
            ) : reels.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No videos uploaded yet.</p>
            ) : (
              <HScrollTrack desktopGrid itemCount={reels.slice(0, 8).length}>
                {reels.slice(0, 8).map((r, index) => (
                  <motion.div
                    key={r.reelId}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(`/reels/${index}`, {
                        state: { reels },
                      });
                    }}
                    className="
            shrink-0
            w-[210px]
            bg-white
            rounded-2xl
            border border-[#E8E8E8]
            shadow-[0_2px_6px_rgba(0,0,0,0.04)]
            overflow-hidden
            cursor-pointer
          "
                  >
                    <div className="relative h-[118px] w-full bg-black">
                      <video
                        src={r.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                          <Play
                            size={14}
                            fill="#222"
                            className="text-[#222] ml-[1px]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-bold leading-4 line-clamp-2 text-gray-900">
                        {r.title || r.ownerName || "Training video"}
                      </p>
                      {r.about ? (
                        <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">
                          {r.about}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-[#FF6A00] font-medium mt-1 truncate">
                        {r.category ||
                          (r.type === "trainer" ? "Trainer" : "Institute")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </HScrollTrack>
            )}
          </section>
        </div>

        {/* ==================== DESKTOP VIEW ===================== */}
      </section>
      {/* ================= CATEGORIES ================= */}

      {/* ================= SUGGESTED ================= */}

      {/* ================================================= */}
      {/* ================= SPOTLIGHT REELS ================ */}
      {/* ================================================= */}

      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 right-0 top-0 z-[90] bg-black/50 backdrop-blur-[2px]"
            style={{
              bottom:
                "calc(var(--bottom-navbar-height, 64px) + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-0 mx-auto max-w-lg md:max-w-2xl md:bottom-8 md:rounded-3xl max-h-[88%] overflow-y-auto rounded-t-3xl bg-[#F4F5F7] shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-3 py-2.5 border-b border-gray-100 rounded-t-3xl backdrop-blur">
                <div className="w-10" />
                <div className="w-12 h-1.5 rounded-full bg-gray-200" />
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-3 pb-5">
                <CommunityPostCard
                  post={selectedPost}
                  user={user}
                  navigate={navigate}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {youtubeVideo && (
        <YoutubeStylePlayer
          video={youtubeVideo}
          relatedVideos={communityVideos}
          onClose={() => setYoutubeVideo(null)}
          onSelectRelated={(item) => setYoutubeVideo(item)}
          onViewProfile={(item) => {
            setYoutubeVideo(null);
            if (window.history.state?.kridanaYtPlayer) {
              window.history.replaceState(null, "");
            }
            navigate(
              item.ownerType === "trainer"
                ? `/trainers/${item.ownerId}`
                : `/institutes/${item.ownerId}`,
            );
          }}
        />
      )}
    </div>
  );
};

function CommunityPostPreview({ post, onOpen }) {
  const isReel = isReelPost(post);
  const isVideo = isTrainingVideoPost(post);
  const caption = post.caption || post.title || "";
  const nearLabel =
    post.distance != null && post.distance <= 40
      ? post.distance < 1
        ? "Nearby"
        : `${post.distance.toFixed(1)} km`
      : null;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="
        bg-white
        rounded-[9px]
        border border-[#E9E9E9]
        shadow-[0_2px_6px_rgba(0,0,0,0.04)]
        overflow-hidden
        min-w-[calc((min(100vw,32rem)-32px)/2)]
        w-[calc((min(100vw,32rem)-32px)/2)]
        snap-start
        shrink-0
        sm:min-w-0
        sm:w-auto
        sm:shrink
        text-left
      "
    >
      <div className="relative aspect-square bg-gray-100">
        {post.mediaType === "video" ? (
          <video
            src={post.coverUrl || post.url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover pointer-events-none"
          />
        ) : (
          <img src={post.url} alt="" className="h-full w-full object-cover" />
        )}
        {post.mediaType === "video" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/15">
            <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
              <Play size={11} fill="#222" className="ml-[1px]" />
            </span>
          </span>
        )}
        <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 max-w-[90%]">
          <span className="rounded-full bg-black/55 text-white text-[6px] font-semibold px-1.5 py-0.5 backdrop-blur-sm">
            {isReel ? "Reel" : isVideo ? "Video" : "Photo"}
          </span>
          {nearLabel ? (
            <span className="rounded-full bg-[#FF6A00]/95 text-white text-[6px] font-semibold px-1.5 py-0.5">
              {nearLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-2">
        <div className="flex items-center gap-1.5">
          <img
            src={post.profileImage || "/images/default-avatar.png"}
            alt=""
            className="w-[22px] h-[22px] rounded-full object-cover bg-gray-100 shrink-0"
          />
          <p className="text-[8px] font-bold text-[#222] truncate">
            {post.ownerName}
          </p>
        </div>
        <p className="mt-1 text-[7px] text-gray-500 line-clamp-2 leading-[9px] min-h-[18px]">
          {caption ||
            (post.ownerType === "trainer" ? "Trainer post" : "Academy post")}
        </p>
        <p className="mt-1 text-right text-[6px] font-semibold text-[#FF6A00]">
          View →
        </p>
      </div>
    </motion.button>
  );
}

function CommunityPostCard({ post, user, navigate, compact = false }) {
  const isReel = post.mediaType === "video";
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentList, setCommentList] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [openImage, setOpenImage] = useState(false);
  const itemId = post.id;
  const caption = post.caption || post.title || "";
  const shouldTrim = caption.length > 110;

  useEffect(() => {
    let unsub1;
    let unsub2;
    let unsub3;

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
          setCommentList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
          setCommentList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      if (liked) await deleteDoc(ref);
      else await setDoc(ref, { reelId: itemId, userId: user.uid });
    } else {
      const ref = doc(db, "postlikes", docId);
      if (liked) await deleteDoc(ref);
      else await setDoc(ref, { postId: itemId, userId: user.uid });
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

  const goToProfile = () => {
    navigate(
      post.ownerType === "trainer"
        ? `/trainers/${post.ownerId}`
        : `/institutes/${post.ownerId}`,
    );
  };

  return (
    <article className="overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={goToProfile}
        className="w-full flex items-center gap-3 px-3 py-3 text-left"
      >
        <img
          src={post.profileImage || "/images/default-avatar.png"}
          alt=""
          className="h-10 w-10 rounded-full object-cover bg-gray-100"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {post.ownerName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {post.ownerType === "trainer" ? "Trainer" : "Institute"}
            {post.category ? ` · ${post.category}` : ""}
          </p>
        </div>
      </button>

      <div className={`relative bg-black ${compact ? "aspect-[16/10]" : "aspect-[4/5] sm:aspect-[16/10]"}`}>
        {isReel ? (
          <video
            src={post.coverUrl || post.url}
            controls
            playsInline
            onPlay={handleView}
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={post.url}
            alt=""
            onClick={() => {
              handleView();
              setOpenImage(true);
            }}
            className="h-full w-full object-cover cursor-pointer"
          />
        )}
      </div>

      {caption ? (
        <div className="px-3 pt-3">
          <p
            className={`text-sm text-gray-700 leading-5 ${
              expanded || !shouldTrim ? "" : "line-clamp-2"
            }`}
          >
            {caption}
          </p>
          {shouldTrim && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-sm font-semibold text-[#FF6A00]"
            >
              {expanded ? "See less" : "See more"}
            </button>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between px-3 py-3 text-sm text-gray-500">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1 ${liked ? "text-red-500" : ""}`}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          {likes}
        </button>
        <div className="flex items-center gap-1">
          <Eye size={17} />
          {views}
        </div>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1"
        >
          <MessageCircle size={17} />
          {comments}
        </button>
      </div>

      {showComments && (
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#FF6A00]"
            />
            <button
              type="button"
              onClick={sendComment}
              className="min-h-[44px] rounded-xl bg-[#FF6A00] px-4 text-sm font-semibold text-white"
            >
              Send
            </button>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
            {commentList.map((c) => (
              <div key={c.id} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold text-gray-700">
                  {c.userName || "User"}
                </p>
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
            ))}
            {commentList.length === 0 && (
              <p className="text-xs text-gray-400">No comments yet</p>
            )}
          </div>
        </div>
      )}

      {openImage && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setOpenImage(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <img
            src={post.url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </article>
  );
}

export default Landing;
