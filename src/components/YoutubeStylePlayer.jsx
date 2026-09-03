import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hasFullscreen() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement,
  );
}

export default function YoutubeStylePlayer({
  video,
  relatedVideos = [],
  onClose,
  onSelectRelated,
  onViewProfile,
}) {
  const videoRef = useRef(null);
  const boxRef = useRef(null);
  const hideTimer = useRef(null);
  const closedRef = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const src = video?.url || video?.coverUrl || "";
  const title = video?.title || video?.caption || "Training video";
  const owner = video?.ownerName || "Creator";
  const photo = video?.profileImage || "/images/default-avatar.png";
  const others = relatedVideos.filter((item) => item.id !== video?.id);

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose?.();
  }, [onClose]);

  const exitFullscreen = useCallback(() => {
    const vid = videoRef.current;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen?.();
    }
    if (vid?.webkitDisplayingFullscreen) vid.webkitExitFullscreen?.();
    setFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const box = boxRef.current;
    const vid = videoRef.current;
    try {
      if (box?.requestFullscreen) await box.requestFullscreen();
      else if (box?.webkitRequestFullscreen) box.webkitRequestFullscreen();
      else if (vid?.webkitEnterFullscreen) vid.webkitEnterFullscreen();
      setFullscreen(true);
    } catch {
      setFullscreen(true);
    }
  }, []);

  const toggleFullscreen = () => {
    if (hasFullscreen() || fullscreen) exitFullscreen();
    else enterFullscreen();
  };

  const revealUi = () => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowUi(false);
    }, 2800);
  };

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      el.pause();
      setPlaying(false);
    }
    revealUi();
  };

  const seekBy = (delta) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(
      0,
      Math.min(el.duration || 0, el.currentTime + delta),
    );
  };

  useEffect(() => {
    closedRef.current = false;
    window.history.pushState({ kridanaYtPlayer: true }, "");

    const onPop = () => {
      if (hasFullscreen() || videoRef.current?.webkitDisplayingFullscreen) {
        exitFullscreen();
        window.history.pushState({ kridanaYtPlayer: true }, "");
        return;
      }
      finishClose();
    };

    window.addEventListener("popstate", onPop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prevOverflow;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [exitFullscreen, finishClose]);

  useEffect(() => {
    const onChange = () => setFullscreen(hasFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;
    el.muted = muted;
    const play = async () => {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };
    play();
    revealUi();
    return () => {
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handleClose = () => {
    if (hasFullscreen() || fullscreen) {
      exitFullscreen();
      return;
    }
    if (window.history.state?.kridanaYtPlayer) {
      window.history.back();
      return;
    }
    finishClose();
  };

  const shareVideo = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      /* cancelled */
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[250000] bg-[#0F0F0F] text-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
    >
      <div
        ref={boxRef}
        className="relative bg-black w-full shrink-0 [:fullscreen]:h-full [:fullscreen]:w-full"
        style={{
          height: fullscreen ? "100%" : "min(56.25vw, 42vh, 280px)",
          minHeight: fullscreen ? "100%" : "200px",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-black"
          onClick={revealUi}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() => setCurrent(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
        />

        {showUi && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40 flex flex-col justify-between">
            <div className="flex items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center active:scale-95"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <p className="text-[11px] font-semibold text-white/80">Autoplay</p>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center active:scale-95"
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-10 pb-2">
              <button
                type="button"
                onClick={() => seekBy(-10)}
                className="active:scale-90"
                aria-label="Rewind 10 seconds"
              >
                <SkipBack size={28} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white/95 text-black flex items-center justify-center active:scale-95"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause size={26} fill="currentColor" />
                ) : (
                  <Play size={26} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => seekBy(10)}
                className="active:scale-90"
                aria-label="Forward 10 seconds"
              >
                <SkipForward size={28} />
              </button>
            </div>

            <div className="px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = next;
                  setCurrent(next);
                }}
                className="w-full accent-[#FF0000] h-1"
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-white/85">
                <span>
                  {formatTime(current)} / {formatTime(duration)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      if (videoRef.current) videoRef.current.muted = next;
                    }}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Fullscreen"
                  >
                    {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!fullscreen && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white text-gray-900">
          <div className="px-3.5 pt-3 pb-2">
            <h1 className="text-[16px] font-bold leading-snug">{title}</h1>
            <p className="text-[12px] text-gray-500 mt-1">
              {video?.category ? `${video.category} · ` : ""}
              Training video
            </p>
          </div>

          <div className="px-3.5 flex items-center gap-2.5 pb-3">
            <button
              type="button"
              onClick={() => onViewProfile?.(video)}
              className="flex items-center gap-2 min-w-0 flex-1 text-left"
            >
              <img
                src={photo}
                alt=""
                className="w-10 h-10 rounded-full object-cover bg-gray-100"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{owner}</p>
                <p className="text-[11px] text-gray-500 capitalize">
                  {video?.ownerType === "trainer" ? "Trainer" : "Academy"}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onViewProfile?.(video)}
              className="shrink-0 h-9 px-3.5 rounded-full bg-[#0F0F0F] text-white text-[12px] font-semibold active:scale-95"
            >
              View
            </button>
          </div>

          <div className="px-3.5 flex gap-2 overflow-x-auto scrollbar-hide pb-3">
            <button
              type="button"
              onClick={() => {
                setLiked((v) => !v);
                if (!liked) setDisliked(false);
              }}
              className={`h-9 px-3 rounded-full border text-[12px] font-semibold flex items-center gap-1.5 shrink-0 ${
                liked
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <ThumbsUp size={14} />
              Like
            </button>
            <button
              type="button"
              onClick={() => {
                setDisliked((v) => !v);
                if (!disliked) setLiked(false);
              }}
              className={`h-9 px-3 rounded-full border text-[12px] font-semibold flex items-center gap-1.5 shrink-0 ${
                disliked
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <ThumbsDown size={14} />
            </button>
            <button
              type="button"
              onClick={shareVideo}
              className="h-9 px-3 rounded-full bg-gray-100 border border-gray-200 text-[12px] font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          {video?.caption ? (
            <button
              type="button"
              onClick={() => setDescOpen((v) => !v)}
              className="mx-3.5 mb-3 w-[calc(100%-1.75rem)] text-left rounded-xl bg-gray-100 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-[13px] text-gray-700 ${
                    descOpen ? "" : "line-clamp-2"
                  }`}
                >
                  {video.caption}
                </p>
                <ChevronDown
                  size={16}
                  className={`shrink-0 mt-0.5 text-gray-500 transition ${
                    descOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
          ) : null}

          <div className="px-3.5 pb-6">
            <p className="text-[13px] font-bold mb-2">Up next</p>
            {others.length === 0 ? (
              <p className="text-[12px] text-gray-400 py-6 text-center">
                No more videos yet
              </p>
            ) : (
              <div className="space-y-3">
                {others.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectRelated?.(item)}
                    className="w-full flex gap-2.5 text-left active:opacity-80"
                  >
                    <div className="relative w-[42%] max-w-[168px] aspect-video rounded-xl overflow-hidden bg-gray-200 shrink-0">
                      <video
                        src={item.url}
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-7 h-7 rounded-full bg-black/55 flex items-center justify-center">
                          <Play size={12} fill="#fff" className="ml-[1px]" />
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] font-semibold leading-snug line-clamp-2">
                        {item.title || item.caption || "Training video"}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {item.ownerName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}
