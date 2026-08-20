import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  UserCheck,
  Eye,
  ArrowLeft,
  ThumbsDown,
  X,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";

import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

const getPlayableVideoUrl = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return getPlayableVideoUrl(
      value.url || value.videoUrl || value.secure_url || "",
    );
  }

  const url = String(value).trim();
  if (!url || url === "undefined" || url === "[object Object]") return "";
  if (!/^https?:\/\//i.test(url) && !url.startsWith("blob:")) return "";

  const lower = url.toLowerCase();
  if (lower.includes("/image/upload/")) return "";
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)) return "";

  if (url.includes("/video/upload/") && !url.includes("/f_mp4") && !url.includes("/f_auto")) {
    return url.replace("/video/upload/", "/video/upload/f_mp4,q_auto/");
  }

  return url;
};

const buildReelItem = (docId, data, reelData, idx, type) => {
  const videoUrl = getPlayableVideoUrl(reelData);
  if (!videoUrl) return null;

  const ownerName =
    type === "trainer"
      ? data.trainerName ||
        data.name ||
        `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
        data.displayName ||
        data.userName ||
        "Trainer"
      : data.instituteName ||
        data.name ||
        data.fullName ||
        data.displayName ||
        data.userName ||
        "Institute";

  return {
    reelId: `${type}_${docId}_${idx}`,
    videoUrl,
    about:
      typeof reelData === "object"
        ? reelData?.about || reelData?.caption || reelData?.title || ""
        : "",
    title: ownerName,
    ownerName,
    ownerPhoto: data.profileImageUrl || data.profileImage || data.photoURL || "",
    ownerId: docId,
    type,
  };
};

const ReelViewer = () => {
  const { index } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [reels, setReels] = useState(() => {
    const incoming = location.state?.reels || [];
    return incoming
      .map((item) => ({
        ...item,
        videoUrl: getPlayableVideoUrl(item.videoUrl || item.url || item),
      }))
      .filter((item) => item.videoUrl);
  });
  const [activeIndex, setActiveIndex] = useState(Number(index) || 0);
  const [loading, setLoading] = useState(
    !(Array.isArray(location.state?.reels) && location.state.reels.length),
  );

  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [liked, setLiked] = useState(false);

  const [dislikes, setDislikes] = useState(0);
  const [disliked, setDisliked] = useState(false);

  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [captionOpen, setCaptionOpen] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);
  const [dislikeBurst, setDislikeBurst] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playError, setPlayError] = useState(false);
  const [paused, setPaused] = useState(false);

  const user = auth.currentUser;

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const videoRef = useRef(null);
  const actionLock = useRef(false);
  const lastTapRef = useRef(0);
  const userWantsSound = useRef(false);
  const reel =
    reels.length > 0 && reels[activeIndex] ? reels[activeIndex] : null;

  const playLikeAnimation = () => {
    setLikeBurst(true);
    window.setTimeout(() => setLikeBurst(false), 700);
  };

  const playDislikeAnimation = () => {
    setDislikeBurst(true);
    window.setTimeout(() => setDislikeBurst(false), 650);
  };

  const fetchReels = async () => {
    const hasIncoming =
      Array.isArray(location.state?.reels) && location.state.reels.length > 0;

    try {
      if (!hasIncoming) setLoading(true);

      const trainerSnap = await getDocs(collection(db, "trainers"));
      const instituteSnap = await getDocs(collection(db, "institutes"));

      let allReels = [];

      trainerSnap.forEach((docu) => {
        const data = docu.data();
        if (data.isDeleted) return;
        if (!Array.isArray(data.reels)) return;
        data.reels.forEach((reelData, idx) => {
          const item = buildReelItem(docu.id, data, reelData, idx, "trainer");
          if (item) allReels.push(item);
        });
      });

      instituteSnap.forEach((docu) => {
        const data = docu.data();
        if (data.isDeleted) return;
        if (!Array.isArray(data.reels)) return;
        data.reels.forEach((reelData, idx) => {
          const item = buildReelItem(docu.id, data, reelData, idx, "institute");
          if (item) allReels.push(item);
        });
      });

      if (hasIncoming) {
        setReels((prev) => {
          if (!prev.length) return allReels;
          return prev.map((item) => ({
            ...item,
            videoUrl: getPlayableVideoUrl(item.videoUrl || item.url),
          })).filter((item) => item.videoUrl);
        });
      } else {
        setReels(allReels);
        setActiveIndex(Number(index) || 0);
      }
    } catch (error) {
      console.error("Fetch reels error:", error);
    } finally {
      setLoading(false);
    }
  };

  const requireLogin = () => {
    if (!auth.currentUser) {
      setShowLoginPopup(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const video = videoRef.current;
    const src = getPlayableVideoUrl(reel?.videoUrl);
    if (!video || !src) {
      setPlayError(Boolean(reel) && !src);
      return;
    }

    setPlayError(false);
    setPaused(false);
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.volume = 1;
    video.muted = !userWantsSound.current;
    video.defaultMuted = !userWantsSound.current;
    setMuted(!userWantsSound.current);

    const tryPlay = async () => {
      try {
        video.volume = 1;
        video.muted = !userWantsSound.current;
        await video.play();
        setPaused(false);
        setPlayError(false);
        setMuted(video.muted);
      } catch (err) {
        if (err?.name === "NotAllowedError") {
          try {
            video.muted = true;
            video.defaultMuted = true;
            setMuted(true);
            await video.play();
            setPaused(false);
            setPlayError(false);
          } catch {
            setPaused(true);
          }
          return;
        }
        console.error("Play failed:", err);
        setPlayError(true);
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("canplay", tryPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel?.reelId, reel?.videoUrl]);

  useEffect(() => {
    fetchReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const nav =
      document.querySelector("nav") ||
      document.querySelector(".bottom-navbar") ||
      document.getElementById("bottom-navbar");

    if (nav) {
      nav.style.display = "none";
    }

    return () => {
      document.body.style.overflow = "auto";

      if (nav) {
        nav.style.display = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!reel || !user) return;

    const run = async () => {
      const viewRef = doc(db, "reelViews", `${reel.reelId}_${user.uid}`);
      const reelRef = doc(db, "reels", reel.reelId);

      const viewSnap = await getDoc(viewRef);

      if (!viewSnap.exists()) {
        await setDoc(viewRef, {
          reelId: reel.reelId,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        const reelSnap = await getDoc(reelRef);

        if (!reelSnap.exists()) {
          await setDoc(reelRef, {
            views: 1,
            likes: 0,
            dislikes: 0,
          });
          setViews(1);
        } else {
          const total = (reelSnap.data().views || 0) + 1;
          await updateDoc(reelRef, { views: total });
          setViews(total);
        }
      } else {
        const reelSnap = await getDoc(reelRef);
        if (reelSnap.exists()) setViews(reelSnap.data().views || 0);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel]);

  useEffect(() => {
    if (!reel) return;

    const load = async () => {
      const reelRef = doc(db, "reels", reel.reelId);
      const reelSnap = await getDoc(reelRef);

      if (reelSnap.exists()) {
        setLikes(reelSnap.data().likes || 0);
        setDislikes(reelSnap.data().dislikes || 0);
        if (reelSnap.data().views != null) setViews(reelSnap.data().views || 0);
      } else {
        setLikes(0);
        setDislikes(0);
      }

      if (!user) {
        setLiked(false);
        setDisliked(false);
        return;
      }

      const likeRef = doc(db, "reelLikes", `${reel.reelId}_${user.uid}`);
      const dislikeRef = doc(db, "reelDislikes", `${reel.reelId}_${user.uid}`);
      const likeSnap = await getDoc(likeRef);
      const dislikeSnap = await getDoc(dislikeRef);

      setLiked(likeSnap.exists());
      setDisliked(dislikeSnap.exists());
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel]);

  useEffect(() => {
    if (!reel) return;

    const q = query(
      collection(db, "reelComments", reel.reelId, "comments"),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })),
      );
    });

    return () => unsub();
  }, [reel]);

  useEffect(() => {
    if (!user || !reel) return;

    const followRef = doc(db, "followers", `${user.uid}_${reel.ownerId}`);

    const unsub = onSnapshot(followRef, (snap) => {
      setIsFollowing(snap.exists());
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel]);

  const toggleLike = async () => {
    if (!requireLogin()) return;
    if (!reel || actionLock.current) return;

    actionLock.current = true;
    const currentUser = auth.currentUser;
    const reelRef = doc(db, "reels", reel.reelId);
    const likeRef = doc(db, "reelLikes", `${reel.reelId}_${currentUser.uid}`);
    const dislikeRef = doc(
      db,
      "reelDislikes",
      `${reel.reelId}_${currentUser.uid}`,
    );

    const wasLiked = liked;
    const wasDisliked = disliked;

    if (wasLiked) {
      setLiked(false);
      setLikes((count) => Math.max(count - 1, 0));
    } else {
      playLikeAnimation();
      setLiked(true);
      setLikes((count) => count + 1);
      if (wasDisliked) {
        setDisliked(false);
        setDislikes((count) => Math.max(count - 1, 0));
      }
    }

    try {
      if (wasLiked) {
        await Promise.all([
          deleteDoc(likeRef),
          setDoc(reelRef, { likes: increment(-1) }, { merge: true }),
        ]);
      } else {
        const writes = [
          setDoc(likeRef, {
            reelId: reel.reelId,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
          }),
          setDoc(
            reelRef,
            {
              likes: increment(1),
              ...(wasDisliked ? { dislikes: increment(-1) } : {}),
            },
            { merge: true },
          ),
        ];
        if (wasDisliked) writes.push(deleteDoc(dislikeRef));
        await Promise.all(writes);
      }
    } catch (error) {
      console.error(error);
      setLiked(wasLiked);
      setDisliked(wasDisliked);
      setLikes((count) => (wasLiked ? count + 1 : Math.max(count - 1, 0)));
      if (!wasLiked && wasDisliked) setDislikes((count) => count + 1);
    } finally {
      actionLock.current = false;
    }
  };

  const toggleDislike = async () => {
    if (!requireLogin()) return;
    if (!reel || actionLock.current) return;

    actionLock.current = true;
    const currentUser = auth.currentUser;
    const reelRef = doc(db, "reels", reel.reelId);
    const likeRef = doc(db, "reelLikes", `${reel.reelId}_${currentUser.uid}`);
    const dislikeRef = doc(
      db,
      "reelDislikes",
      `${reel.reelId}_${currentUser.uid}`,
    );

    const wasLiked = liked;
    const wasDisliked = disliked;

    if (wasDisliked) {
      setDisliked(false);
      setDislikes((count) => Math.max(count - 1, 0));
    } else {
      playDislikeAnimation();
      setDisliked(true);
      setDislikes((count) => count + 1);
      if (wasLiked) {
        setLiked(false);
        setLikes((count) => Math.max(count - 1, 0));
      }
    }

    try {
      if (wasDisliked) {
        await Promise.all([
          deleteDoc(dislikeRef),
          setDoc(reelRef, { dislikes: increment(-1) }, { merge: true }),
        ]);
      } else {
        const writes = [
          setDoc(dislikeRef, {
            reelId: reel.reelId,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
          }),
          setDoc(
            reelRef,
            {
              dislikes: increment(1),
              ...(wasLiked ? { likes: increment(-1) } : {}),
            },
            { merge: true },
          ),
        ];
        if (wasLiked) writes.push(deleteDoc(likeRef));
        await Promise.all(writes);
      }
    } catch (error) {
      console.error(error);
      setDisliked(wasDisliked);
      setLiked(wasLiked);
      setDislikes((count) => (wasDisliked ? count + 1 : Math.max(count - 1, 0)));
      if (!wasDisliked && wasLiked) setLikes((count) => count + 1);
    } finally {
      actionLock.current = false;
    }
  };

  const followProfile = async () => {
    if (!requireLogin()) return;
    if (followLoading) return;
    const currentUser = auth.currentUser;

    setFollowLoading(true);

    await setDoc(doc(db, "followers", `${currentUser.uid}_${reel.ownerId}`), {
      followerId: currentUser.uid,
      profileId: reel.ownerId,
      createdAt: serverTimestamp(),
    });

    setFollowLoading(false);
  };

  const unfollowProfile = async () => {
    if (!requireLogin()) return;
    if (followLoading) return;
    const currentUser = auth.currentUser;

    setFollowLoading(true);

    await deleteDoc(doc(db, "followers", `${currentUser.uid}_${reel.ownerId}`));

    setFollowLoading(false);
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;
    if (!requireLogin()) return;

    const currentUser = auth.currentUser;

    await addDoc(collection(db, "reelComments", reel.reelId, "comments"), {
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email || "User",
      text: commentText,
      createdAt: serverTimestamp(),
    });

    setCommentText("");
  };

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;

    const diffY = touchStartY.current - endY;
    const diffX = touchStartX.current - endX;

    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY)) {
      navigate(-1);
      return;
    }

    if (diffY > 80) {
      setActiveIndex((prev) => (prev + 1 >= reels.length ? 0 : prev + 1));
    }

    if (diffY < -80) {
      setActiveIndex((prev) => (prev - 1 < 0 ? reels.length - 1 : prev - 1));
    }
  };

  if (loading || !reel) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-[#FF6B00]" />
      </div>
    );
  }

  const caption = reel.about || "";
  const playableUrl = getPlayableVideoUrl(reel.videoUrl);

  const toggleMute = async (event) => {
    event?.stopPropagation();
    const video = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    userWantsSound.current = !nextMuted;
    if (!video) return;
    video.defaultMuted = nextMuted;
    video.muted = nextMuted;
    video.volume = nextMuted ? 0 : 1;
    try {
      if (video.paused) await video.play();
    } catch (err) {
      console.error("Sound play failed:", err);
    }
  };

  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      window.clearTimeout(lastTapRef.currentTimer);
      lastTapRef.current = 0;
      if (liked) {
        playLikeAnimation();
        return;
      }
      toggleLike();
      return;
    }
    lastTapRef.current = now;
    lastTapRef.currentTimer = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        video.play().catch(() => setPlayError(true));
        setPaused(false);
      } else {
        video.pause();
        setPaused(true);
      }
    }, 280);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden"
    >
      <div
        className="
      relative
      w-full
      h-[100dvh]
      max-w-lg
      mx-auto
      bg-black
      overflow-hidden
    "
      >
        {playableUrl ? (
          <video
            key={reel.reelId}
            ref={videoRef}
            src={playableUrl}
            muted={muted}
            loop
            playsInline
            preload="auto"
            webkit-playsinline="true"
            onClick={handleVideoTap}
            onError={() => setPlayError(true)}
            onPlaying={() => {
              setPaused(false);
              setPlayError(false);
            }}
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-sm px-6 text-center">
            This post is not a playable video.
          </div>
        )}

        {(paused || playError) && playableUrl ? (
          <button
            type="button"
            onClick={async () => {
              const video = videoRef.current;
              if (!video) return;
              try {
                video.volume = 1;
                video.muted = muted;
                await video.play();
                setPaused(false);
                setPlayError(false);
              } catch (err) {
                console.error("Play failed:", err);
                setPlayError(true);
              }
            }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25"
          >
            <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play size={28} fill="#111" className="text-[#111] ml-1" />
            </span>
          </button>
        ) : null}

        <AnimatePresence>
          {likeBurst && (
            <motion.div
              key="like-burst"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.15, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
            >
              <Heart size={92} fill="#FF2D55" className="text-[#FF2D55] drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dislikeBurst && (
            <motion.div
              key="dislike-burst"
              initial={{ scale: 0.4, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
            >
              <ThumbsDown size={78} className="text-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-0 left-0 right-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-20">
          <button
            onClick={() => navigate(-1)}
            className="text-white bg-black/40 p-2 rounded-full active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="min-h-[40px] px-3 rounded-full bg-black/45 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {muted ? "Unmute" : "Sound"}
            </button>
            <div className="text-white text-sm flex items-center gap-1 bg-black/35 px-2.5 py-1 rounded-full">
              <Eye size={16} />
              {views}
            </div>
          </div>
        </div>

        <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-5 items-center text-white">
          <button
            type="button"
            onClick={toggleMute}
            className="flex flex-col items-center active:scale-95"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <span className="w-11 h-11 rounded-full bg-black/45 flex items-center justify-center">
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </span>
            <p className="text-xs mt-1 font-semibold">
              {muted ? "Off" : "On"}
            </p>
          </button>
          <motion.button
            type="button"
            onClick={toggleLike}
            whileTap={{ scale: 0.82 }}
            animate={
              liked
                ? { scale: [1, 1.25, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.28 }}
            className="flex flex-col items-center"
          >
            <Heart
              size={30}
              fill={liked ? "#FF2D55" : "none"}
              className={liked ? "text-[#FF2D55]" : "text-white"}
            />
            <motion.p
              key={`likes-${likes}`}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xs mt-1 font-semibold"
            >
              {likes}
            </motion.p>
          </motion.button>

          <motion.button
            type="button"
            onClick={toggleDislike}
            whileTap={{ scale: 0.82 }}
            animate={
              disliked
                ? { rotate: [0, -12, 8, 0], scale: [1, 1.18, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={{ duration: 0.32 }}
            className="flex flex-col items-center"
          >
            <ThumbsDown
              size={26}
              fill={disliked ? "#FF6B00" : "none"}
              className={disliked ? "text-[#FF6B00]" : "text-white"}
            />
            <motion.p
              key={`dislikes-${dislikes}`}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xs mt-1 font-semibold"
            >
              {dislikes}
            </motion.p>
          </motion.button>

          <button
            type="button"
            onClick={() => {
              if (!requireLogin()) return;
              setShowComments(true);
            }}
            className="flex flex-col items-center active:scale-95"
          >
            <MessageCircle size={28} />
            <p className="text-xs mt-1 font-semibold">{comments.length}</p>
          </button>

          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="active:scale-95"
          >
            <Share2 size={26} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 to-transparent text-white z-20 pr-16">
          <div className="flex items-center gap-3 mb-3">
            {reel.ownerPhoto ? (
              <img
                src={reel.ownerPhoto}
                alt="owner"
                className="w-11 h-11 rounded-full object-cover border border-white"
              />
            ) : (
              <img
                src={reel.profileImage || "/default-user.png"}
                alt="profile"
                className="w-10 h-10 rounded-full object-cover border border-white"
              />
            )}

            <span className="text-sm font-semibold truncate">
              {reel.ownerName || reel.title}
            </span>

            {!isFollowing ? (
              <button
                onClick={followProfile}
                disabled={followLoading}
                className="bg-[#FF6B00] px-3 py-1 rounded-full text-sm flex items-center gap-1 active:scale-95 disabled:opacity-60"
              >
                <UserPlus size={14} />
                Follow
              </button>
            ) : (
              <button
                onClick={unfollowProfile}
                disabled={followLoading}
                className="bg-white text-black px-3 py-1 rounded-full text-sm flex items-center gap-1 active:scale-95 disabled:opacity-60"
              >
                <UserCheck size={14} />
                Following
              </button>
            )}
          </div>

          {caption ? (
            <p className="text-sm text-white/90 mb-3 leading-5">
              {captionOpen || caption.length <= 90
                ? caption
                : `${caption.slice(0, 90)}... `}
              {caption.length > 90 && (
                <button
                  type="button"
                  onClick={() => setCaptionOpen((v) => !v)}
                  className="font-semibold text-white"
                >
                  {captionOpen ? " less" : "more"}
                </button>
              )}
            </p>
          ) : null}

          <button
            onClick={() =>
              navigate(
                reel.type === "trainer"
                  ? `/trainers/${reel.ownerId}`
                  : `/institutes/${reel.ownerId}`,
              )
            }
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold active:scale-95"
          >
            View Profile
          </button>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-end z-50"
              onClick={() => setShowComments(false)}
            >
              <motion.div
                initial={{ y: 80 }}
                animate={{ y: 0 }}
                exit={{ y: 80 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full h-[70vh] rounded-t-3xl flex flex-col"
              >
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="font-semibold">Comments</h2>
                  <button
                    type="button"
                    onClick={() => setShowComments(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-xl bg-gray-50 px-3 py-2">
                      <p className="font-semibold text-sm">{c.userName}</p>
                      <p className="text-sm text-gray-700">{c.text}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No comments yet
                    </p>
                  )}
                </div>

                <div className="p-3 border-t flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add comment..."
                    className="flex-1 min-h-[44px] border rounded-full px-4 outline-none"
                  />

                  <button
                    onClick={sendComment}
                    className="bg-[#FF6B00] text-white px-4 rounded-full min-h-[44px] font-semibold"
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showLoginPopup && (
          <div className="fixed inset-0 z-[999999] bg-black/70 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:w-[380px] rounded-t-3xl sm:rounded-3xl p-6">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-1.5 rounded-full bg-gray-300 sm:hidden"></div>
              </div>

              <h2 className="text-xl font-bold text-center">Login Required</h2>

              <p className="text-gray-600 text-center mt-3">
                Please login to like, dislike, comment and follow creators.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-semibold"
                >
                  Login
                </button>

                <button
                  onClick={() => setShowLoginPopup(false)}
                  className="w-full border border-gray-300 py-3 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelViewer;
