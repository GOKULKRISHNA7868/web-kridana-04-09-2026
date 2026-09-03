import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../../firebase";

import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
} from "firebase/firestore";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Eye,
  Heart,
  MessageCircle,
  Play,
  ThumbsDown,
  Image as ImageIcon,
  X,
  CalendarDays,
  Download,
  RotateCcw,
} from "lucide-react";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const getMediaUrl = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.videoUrl || item.src || "";
};

const getMediaCaption = (item, fallback) => {
  if (item && typeof item === "object") {
    return (
      item.about ||
      item.caption ||
      item.title ||
      item.description ||
      fallback ||
      ""
    );
  }
  return fallback || "";
};

const getMediaDate = (item) => {
  if (!item || typeof item !== "object") return null;
  const value = item.createdAt || item.date || item.uploadedAt || item.createdOn;
  if (!value) return null;
  try {
    if (value?.toDate) return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const isVideoUrl = (url) => {
  const value = String(url || "").toLowerCase();
  return (
    value.includes("/video") ||
    value.includes(".mp4") ||
    value.includes(".webm") ||
    value.includes(".mov") ||
    value.includes("video/upload")
  );
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PERIOD_PRESETS = [
  { id: "thisMonth", label: "This month" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "1y", label: "1 year" },
  { id: "ytd", label: "This year" },
  { id: "custom", label: "Choose dates" },
];

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const computeAnalyticsRange = (preset, customFrom, customTo) => {
  const now = new Date();
  const to = endOfDay(now);

  if (preset === "custom") {
    const fallbackFrom = startOfDay(
      new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    );
    const fromDate = customFrom ? startOfDay(new Date(customFrom)) : fallbackFrom;
    let toDate = customTo ? endOfDay(new Date(customTo)) : to;
    if (Number.isNaN(fromDate.getTime())) {
      return { from: fallbackFrom, to };
    }
    if (Number.isNaN(toDate.getTime())) {
      toDate = to;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      return { from: startOfDay(toDate), to: endOfDay(fromDate) };
    }
    return { from: fromDate, to: toDate };
  }

  if (preset === "thisMonth") {
    return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }

  if (preset === "ytd") {
    return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to };
  }

  const monthsBack = preset === "6m" ? 6 : preset === "1y" ? 12 : 3;
  const from = new Date(now);
  from.setMonth(from.getMonth() - monthsBack);
  return { from: startOfDay(from), to };
};

const parseRecordYearMonth = (record) => {
  let month = "";
  let year = "";
  if (typeof record.month === "string" && record.month.includes("-")) {
    const parts = record.month.split("-");
    year = parts[0];
    month = parts[1];
  } else {
    month = record.month?.toString().padStart(2, "0");
    year = record.year?.toString();
  }
  if (!month || !year) return null;
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (
    Number.isNaN(parsedYear) ||
    Number.isNaN(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    return null;
  }
  return {
    year: parsedYear,
    month: parsedMonth,
    key: `${parsedYear}-${String(parsedMonth).padStart(2, "0")}`,
  };
};

const getMonthBuckets = (from, to) => {
  const buckets = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  const spanYears = from.getFullYear() !== to.getFullYear();
  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    buckets.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: spanYears
        ? `${MONTH_LABELS[month - 1]} '${String(year).slice(-2)}`
        : MONTH_LABELS[month - 1],
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
};

const AnalyticsPage = ({ setActiveMenu }) => {
  const user = auth.currentUser;

  const [graphData, setGraphData] = useState([]);
  const [dailyBillingTotal, setDailyBillingTotal] = useState(0);
  const [dailyBillCount, setDailyBillCount] = useState(0);
  const [topReels, setTopReels] = useState([]);
  const [activeTab, setActiveTab] = useState("views");

  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [contentFilter, setContentFilter] = useState("all");
  const [contentSearch, setContentSearch] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [commentDrawer, setCommentDrawer] = useState(null);

  const [periodPreset, setPeriodPreset] = useState("3m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loadingGraph, setLoadingGraph] = useState(false);

  const [employeeStats, setEmployeeStats] = useState({
    joined: 0,
    left: 0,
  });

  const [customerStats, setCustomerStats] = useState({
    joined: 0,
    left: 0,
  });

  const isMobile = window.innerWidth < 768;
  const todayISO = toISODate(new Date());

  const dateRange = useMemo(
    () => computeAnalyticsRange(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo],
  );

  const rangeDayCount =
    Math.round(
      (dateRange.to.getTime() - dateRange.from.getTime()) / 86400000,
    ) + 1;

  const matchesDateFilter = (date) => {
    if (!date || Number.isNaN(date.getTime())) return true;
    return (
      date.getTime() >= dateRange.from.getTime() &&
      date.getTime() <= dateRange.to.getTime()
    );
  };

  const handlePeriodChange = (presetId) => {
    setPeriodPreset(presetId);
    if (presetId === "custom") {
      const fallback = computeAnalyticsRange("3m");
      setCustomFrom((prev) => prev || toISODate(fallback.from));
      setCustomTo((prev) => prev || toISODate(fallback.to));
    }
  };

  const resetFilters = () => {
    setPeriodPreset("3m");
    setCustomFrom("");
    setCustomTo("");
    setContentFilter("all");
    setActiveTab("views");
    setContentSearch("");
  };

  /* ================= FETCH TOP REELS & POSTS ================= */

  useEffect(() => {
    if (!user) return;

    const fetchReelStats = async (reelId) => {
      const [viewsSnap, likesSnap, dislikeSnap, commentsSnap, reelDoc] =
        await Promise.all([
          getDocs(
            query(collection(db, "reelViews"), where("reelId", "==", reelId)),
          ),
          getDocs(
            query(collection(db, "reelLikes"), where("reelId", "==", reelId)),
          ),
          getDocs(
            query(
              collection(db, "reelDislikes"),
              where("reelId", "==", reelId),
            ),
          ),
          getDocs(collection(db, "reelComments", reelId, "comments")),
          getDoc(doc(db, "reels", reelId)),
        ]);

      const stored = reelDoc.exists() ? reelDoc.data() : {};

      return {
        views: viewsSnap.size || stored.views || 0,
        likes: likesSnap.size || stored.likes || 0,
        dislikes: dislikeSnap.size || stored.dislikes || 0,
        comments: commentsSnap.size || 0,
      };
    };

    const fetchPostStats = async (postId) => {
      const [viewsSnap, likesSnap, commentsSnap] = await Promise.all([
        getDocs(
          query(collection(db, "postviews"), where("postId", "==", postId)),
        ),
        getDocs(
          query(collection(db, "postlikes"), where("postId", "==", postId)),
        ),
        getDocs(
          query(
            collection(db, "postcomments"),
            where("postId", "==", postId),
          ),
        ),
      ]);

      return {
        views: viewsSnap.size || 0,
        likes: likesSnap.size || 0,
        dislikes: 0,
        comments: commentsSnap.size || 0,
      };
    };

    const fetchTopReels = async () => {
      setLoadingContent(true);

      try {
        let ownerType = null;
        let ownerDoc = null;

        const instituteDoc = await getDoc(doc(db, "institutes", user.uid));

        if (instituteDoc.exists()) {
          ownerType = "institute";
          ownerDoc = instituteDoc;
        }

        if (!ownerType) {
          const trainerDoc = await getDoc(doc(db, "trainers", user.uid));

          if (trainerDoc.exists()) {
            ownerType = "trainer";
            ownerDoc = trainerDoc;
          }
        }

        if (!ownerType) {
          const trainerLoginSnap = await getDocs(
            query(
              collection(db, "InstituteTrainers"),
              where("trainerUid", "==", user.uid),
            ),
          );

          if (!trainerLoginSnap.empty) {
            ownerType = "trainer";
            const trainerProfile = await getDoc(doc(db, "trainers", user.uid));
            ownerDoc = trainerProfile.exists()
              ? trainerProfile
              : trainerLoginSnap.docs[0];
          }
        }

        if (!ownerType || !ownerDoc) {
          setTopReels([]);
          setTopVideos([]);
          setTopPosts([]);
          return;
        }

        const data = ownerDoc.data() || {};
        const ownerId = ownerType === "institute" ? ownerDoc.id : user.uid;
        const ownerName =
          data.instituteName ||
          data.trainerName ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
          "Content";

        const reelItems = Array.isArray(data.reels) ? data.reels : [];
        const videoItems = Array.isArray(data.videos) ? data.videos : [];
        const imageItems = [
          ...(Array.isArray(data.trainingImages) ? data.trainingImages : []),
          ...(Array.isArray(data.mediaGallery?.trainingImages)
            ? data.mediaGallery.trainingImages
            : []),
        ];

        const reelTasks = reelItems.map(async (item, idx) => {
          const videoUrl = getMediaUrl(item);
          if (!videoUrl) return null;
          const itemType =
            typeof item === "object" && item.postType === "video"
              ? "video"
              : "reel";
          const reelId = `${ownerType}_${ownerId}_${idx}`;
          const stats = await fetchReelStats(reelId);
          return {
            id: reelId,
            reelId,
            mediaType: itemType,
            title: getMediaCaption(
              item,
              `${ownerName} ${itemType === "video" ? "video" : "reel"}`,
            ),
            caption: getMediaCaption(item, ""),
            videoUrl,
            thumbnail: videoUrl,
            createdAt: getMediaDate(item),
            ...stats,
          };
        });

        const extraVideoTasks = videoItems.map(async (item, idx) => {
          const videoUrl = getMediaUrl(item);
          if (!videoUrl) return null;
          const videoId = `${ownerType}_${ownerId}_video_${idx}`;
          const stats = await fetchReelStats(videoId);
          return {
            id: videoId,
            reelId: videoId,
            mediaType: "video",
            title: getMediaCaption(item, `${ownerName} video`),
            caption: getMediaCaption(item, ""),
            videoUrl,
            thumbnail: videoUrl,
            createdAt: getMediaDate(item),
            ...stats,
          };
        });

        const seenUrls = new Set();
        const postTasks = imageItems.map(async (item, idx) => {
          const imageUrl = getMediaUrl(item);
          if (!imageUrl || isVideoUrl(imageUrl)) return null;
          const urlKey = String(imageUrl).split("?")[0];
          if (seenUrls.has(urlKey)) return null;
          seenUrls.add(urlKey);
          const postId = `post_${ownerId}_img_${idx}`;
          const stats = await fetchPostStats(postId);
          return {
            id: postId,
            reelId: postId,
            mediaType: "post",
            title: getMediaCaption(item, `${ownerName} post`),
            caption: getMediaCaption(item, ""),
            videoUrl: imageUrl,
            thumbnail: imageUrl,
            ownerName,
            createdAt: getMediaDate(item),
            ...stats,
          };
        });

        const [reelStats, extraVideoStats, postStats] = await Promise.all([
          Promise.all(reelTasks),
          Promise.all(extraVideoTasks),
          Promise.all(postTasks),
        ]);

        const mappedReels = reelStats.filter(Boolean);
        const extraVideos = extraVideoStats.filter(Boolean);
        setTopReels(mappedReels.filter((item) => item.mediaType !== "video"));
        setTopVideos([
          ...mappedReels.filter((item) => item.mediaType === "video"),
          ...extraVideos,
        ]);
        setTopPosts(postStats.filter(Boolean));
      } catch (err) {
        console.error("Dynamic reel analytics error:", err);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchTopReels();
  }, [user]);

  /* ================= WORKFORCE ================= */

  useEffect(() => {
    if (!user) return;

    const fetchWorkforce = async () => {
      try {
        const trainersSnap = await getDocs(
          query(
            collection(db, "InstituteTrainers"),
            where("instituteId", "==", user.uid),
          ),
        );

        const studentsSnap = await getDocs(
          query(
            collection(db, "students"),
            where("instituteId", "==", user.uid),
          ),
        );

        let joinedEmployees = 0;

        trainersSnap.forEach((docSnap) => {
          const d = docSnap.data();

          let joinDate = null;

          if (d.joiningDate) {
            joinDate = new Date(d.joiningDate);
          } else if (d.createdAt?.toDate) {
            joinDate = d.createdAt.toDate();
          }

          if (!joinDate || isNaN(joinDate)) return;
          if (matchesDateFilter(joinDate)) {
            joinedEmployees++;
          }
        });

        let joinedCustomers = 0;

        studentsSnap.forEach((docSnap) => {
          const d = docSnap.data();

          let joinDate = null;

          if (d.joiningDate) {
            joinDate = new Date(d.joiningDate);
          } else if (d.createdAt?.toDate) {
            joinDate = d.createdAt.toDate();
          }

          if (!joinDate || isNaN(joinDate)) return;
          if (matchesDateFilter(joinDate)) {
            joinedCustomers++;
          }
        });

        setEmployeeStats({
          joined: joinedEmployees,
          left: 0,
        });

        setCustomerStats({
          joined: joinedCustomers,
          left: 0,
        });
      } catch (err) {
        console.error("Workforce filter error:", err);
      }
    };

    fetchWorkforce();
  }, [user, periodPreset, customFrom, customTo]);

  /* ================= PLAY VIDEO ================= */

  const handlePlayReel = (item) => {
    if (!item?.videoUrl) return;
    if (item.mediaType === "post") {
      setPreviewImage(item.videoUrl);
      setActiveVideoUrl(null);
      setShowVideoPopup(true);
      return;
    }

    setPreviewImage(null);
    setActiveVideoUrl(item.videoUrl);
    setShowVideoPopup(true);
  };

  const openComments = async (item) => {
    try {
      let comments = [];
      if (item.mediaType === "post") {
        const snap = await getDocs(
          query(
            collection(db, "postcomments"),
            where("postId", "==", item.id),
          ),
        );
        comments = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      } else {
        const snap = await getDocs(
          collection(db, "reelComments", item.id, "comments"),
        );
        comments = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      }
      setCommentDrawer({
        title: item.title,
        comments,
      });
    } catch (error) {
      console.error(error);
      setCommentDrawer({ title: item.title, comments: [] });
    }
  };

  const displayedContent = useMemo(() => {
    const keyword = contentSearch.trim().toLowerCase();
    let items = [];
    if (contentFilter === "all" || contentFilter === "reels") {
      items = [...items, ...topReels];
    }
    if (contentFilter === "all" || contentFilter === "videos") {
      items = [...items, ...topVideos];
    }
    if (contentFilter === "all" || contentFilter === "posts") {
      items = [...items, ...topPosts];
    }

    return items
      .filter((item) => matchesDateFilter(item.createdAt))
      .filter((item) => {
        if (!keyword) return true;
        return `${item.title || ""} ${item.caption || ""}`
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => {
        if (activeTab === "newest") {
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
        }
        return Number(b[activeTab] || 0) - Number(a[activeTab] || 0);
      });
  }, [
    topReels,
    topVideos,
    topPosts,
    contentFilter,
    activeTab,
    contentSearch,
    periodPreset,
    customFrom,
    customTo,
  ]);

  const filteredReels = useMemo(
    () => topReels.filter((item) => matchesDateFilter(item.createdAt)),
    [topReels, periodPreset, customFrom, customTo],
  );

  const filteredVideos = useMemo(
    () => topVideos.filter((item) => matchesDateFilter(item.createdAt)),
    [topVideos, periodPreset, customFrom, customTo],
  );

  const filteredPosts = useMemo(
    () => topPosts.filter((item) => matchesDateFilter(item.createdAt)),
    [topPosts, periodPreset, customFrom, customTo],
  );

  const contentTotals = useMemo(() => {
    const all = [...filteredReels, ...filteredVideos, ...filteredPosts];
    return {
      items: all.length,
      views: all.reduce((sum, item) => sum + Number(item.views || 0), 0),
      likes: all.reduce((sum, item) => sum + Number(item.likes || 0), 0),
      comments: all.reduce((sum, item) => sum + Number(item.comments || 0), 0),
    };
  }, [filteredReels, filteredVideos, filteredPosts]);

  /* ================= FETCH GRAPH DATA ================= */

  useEffect(() => {
    if (!user) return;

    const fetchGraphData = async () => {
      setLoadingGraph(true);

      try {
        const monthBuckets = getMonthBuckets(dateRange.from, dateRange.to);
        const bucketKeys = new Set(monthBuckets.map((bucket) => bucket.key));

        /* ===== FETCH ===== */

        const studentSnap = await getDocs(
          query(
            collection(db, "studentFees"),
            where("instituteId", "==", user.uid),
          ),
        );

        const salarySnap = await getDocs(
          query(
            collection(db, "instituteSalaries"),
            where("instituteId", "==", user.uid),
          ),
        );

        const expenseSnap = await getDocs(
          query(
            collection(db, "instituteExpenses"),
            where("instituteId", "==", user.uid),
          ),
        );

        const revenueMap = {};

        const salaryMap = {};

        const expenseMap = {};

        /* ================= REVENUE ================= */

        studentSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const yearMonth = parseRecordYearMonth(d);
          if (!yearMonth || !bucketKeys.has(yearMonth.key)) return;

          revenueMap[yearMonth.key] =
            (revenueMap[yearMonth.key] || 0) + Number(d.paidAmount || 0);
        });

        let dailyTotal = 0;
        let dailyCount = 0;
        try {
          const dailySnap = await getDocs(
            collection(db, "institutes", user.uid, "dailyBills"),
          );
          dailySnap.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.status && String(d.status).toLowerCase() !== "paid") return;
            const yearMonth =
              parseRecordYearMonth(d) ||
              parseRecordYearMonth({
                year: String(d.date || "").slice(0, 4),
                month: String(d.date || "").slice(5, 7),
              });
            if (!yearMonth || !bucketKeys.has(yearMonth.key)) return;
            const amount = Number(d.paidAmount || d.total || 0);
            revenueMap[yearMonth.key] =
              (revenueMap[yearMonth.key] || 0) + amount;
            dailyTotal += amount;
            dailyCount += 1;
          });
        } catch (dailyErr) {
          console.error("Daily billing analytics error:", dailyErr);
        }
        setDailyBillingTotal(dailyTotal);
        setDailyBillCount(dailyCount);

        /* ================= SALARY ================= */

        salarySnap.forEach((docSnap) => {
          const d = docSnap.data();
          const yearMonth = parseRecordYearMonth(d);
          if (!yearMonth || !bucketKeys.has(yearMonth.key)) return;

          salaryMap[yearMonth.key] =
            (salaryMap[yearMonth.key] || 0) + Number(d.paidAmount || 0);
        });

        /* ================= EXPENSES ================= */

        expenseSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const yearMonth = parseRecordYearMonth(d);
          if (!yearMonth || !bucketKeys.has(yearMonth.key)) return;

          expenseMap[yearMonth.key] =
            (expenseMap[yearMonth.key] || 0) + Number(d.amount || 0);
        });

        /* ================= FINAL ================= */

        const data = monthBuckets.map((bucket) => {
          const revenue = revenueMap[bucket.key] || 0;
          const salary = salaryMap[bucket.key] || 0;
          const expense = expenseMap[bucket.key] || 0;
          const totalExpenses = salary + expense;
          return {
            month: bucket.label,
            revenue,
            salary,
            expense,
            totalExpenses,
            profit: revenue - totalExpenses,
          };
        });

        setGraphData(data);
      } catch (err) {
        console.error("Graph error:", err);
      }

      setLoadingGraph(false);
    };

    fetchGraphData();
  }, [user, periodPreset, customFrom, customTo]);

  /* ================= CALCULATIONS ================= */

  const totalRevenue = useMemo(() => {
    return graphData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  }, [graphData]);

  const totalSalary = useMemo(() => {
    return graphData.reduce((sum, item) => sum + Number(item.salary || 0), 0);
  }, [graphData]);

  const totalExpense = useMemo(() => {
    return graphData.reduce((sum, item) => sum + Number(item.expense || 0), 0);
  }, [graphData]);

  const totalExpenses = useMemo(() => {
    return graphData.reduce(
      (sum, item) => sum + Number(item.totalExpenses || 0),
      0,
    );
  }, [graphData]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);
  const isLoss = totalProfit < 0;

  const highestMonth = graphData.reduce(
    (max, item) => (item.revenue > max.revenue ? item : max),

    graphData[0] || { revenue: 0 },
  );

  const lowestMonth = graphData.reduce(
    (min, item) => (item.revenue < min.revenue ? item : min),

    graphData[0] || { revenue: 0 },
  );

  /* ================= PDF ================= */

  const downloadPDFReport = async () => {
    try {
      const reportHTML = `
      <div style="width:794px;padding:30px;font-family:Arial">

      <div style="display:flex;justify-content:space-between;margin-bottom:20px">

      <div style="display:flex;align-items:center;gap:10px">

      <img src="/logo.png" style="width:50px;height:50px"/>

      <div>
      <h2>Institute Analytics Report</h2>

      <p>
      Period: ${formatDisplayDate(dateRange.from)} – ${formatDisplayDate(dateRange.to)}
      </p>

      </div>

      </div>

      <p>
      Generated: ${new Date().toLocaleDateString()}
      </p>

      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px">

      <div style="border:1px solid #ddd;padding:15px;border-radius:10px">
      <p>Total Revenue</p>
      <h2>₹ ${totalRevenue.toLocaleString()}</h2>
      </div>

      <div style="border:1px solid #ddd;padding:15px;border-radius:10px">
      <p>Total Salary</p>
      <h2>₹ ${totalSalary.toLocaleString()}</h2>
      </div>

      <div style="border:1px solid #ddd;padding:15px;border-radius:10px">
      <p>Total Expenses</p>
      <h2>₹ ${totalExpense.toLocaleString()}</h2>
      </div>

      <div style="border:1px solid #ddd;padding:15px;border-radius:10px">
      <p>${isLoss ? "Total Loss" : "Total Profit"}</p>
      <h2>₹ ${Math.abs(totalProfit).toLocaleString()}</h2>
      </div>

      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px">

      <thead>

      <tr style="background:#f2f2f2">

      <th style="border:1px solid #ccc;padding:8px">
      Month
      </th>

      <th style="border:1px solid #ccc;padding:8px">
      Revenue
      </th>

      <th style="border:1px solid #ccc;padding:8px">
      Salary
      </th>

      <th style="border:1px solid #ccc;padding:8px">
      Expenses
      </th>

      <th style="border:1px solid #ccc;padding:8px">
      Total
      </th>

      <th style="border:1px solid #ccc;padding:8px">
      ${isLoss ? "Result" : "Profit"}
      </th>

      </tr>

      </thead>

      <tbody>

      ${graphData
        .map(
          (r) => `
      <tr>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ${r.month}
      </td>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ₹ ${r.revenue.toLocaleString()}
      </td>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ₹ ${r.salary.toLocaleString()}
      </td>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ₹ ${r.expense.toLocaleString()}
      </td>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ₹ ${r.totalExpenses.toLocaleString()}
      </td>

      <td style="border:1px solid #ccc;padding:8px;text-align:center">
      ${r.profit < 0 ? "Loss" : "Profit"} ₹ ${Math.abs(Number(r.profit || 0)).toLocaleString()}
      </td>

      </tr>
      `,
        )
        .join("")}

      </tbody>

      </table>

      </div>
      `;

      const container = document.createElement("div");

      container.innerHTML = reportHTML;

      container.style.position = "fixed";

      container.style.left = "-9999px";

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 190;

      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

      pdf.save(
        `Analytics_Report_${toISODate(dateRange.from)}_${toISODate(dateRange.to)}.pdf`,
      );

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen pb-24 bg-gray-50 p-3 sm:p-4 md:p-6 overflow-x-hidden">
      {/* HEADER */}

      <div className="bg-white border border-orange-100 rounded-3xl p-4 sm:p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800">
              Growth & Performance Overview
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track revenue, salary, expenses and workforce
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] border border-gray-200 bg-gray-50 px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-700"
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <button
              type="button"
              onClick={downloadPDFReport}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] bg-orange-500 hover:bg-orange-600 transition text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm text-sm"
            >
              <Download size={15} />
              Report
            </button>
          </div>
        </div>

        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Statement period
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-0.5 px-0.5">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePeriodChange(preset.id)}
              className={`shrink-0 min-h-[40px] px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                periodPreset === preset.id
                  ? "bg-[#FF6B00] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {periodPreset === "custom" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">
                From date
              </span>
              <input
                type="date"
                value={customFrom}
                max={customTo || todayISO}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomFrom(value);
                  if (value && customTo && value > customTo) {
                    setCustomTo(value);
                  }
                }}
                className="w-full min-w-0 max-w-full min-h-[44px] border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-300"
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">
                To date
              </span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={todayISO}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomTo(value);
                  if (value && customFrom && value < customFrom) {
                    setCustomFrom(value);
                  }
                }}
                className="w-full min-w-0 max-w-full min-h-[44px] border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-300"
              />
            </label>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 font-semibold px-3 py-1.5 rounded-full">
            <CalendarDays size={13} />
            {formatDisplayDate(dateRange.from)} – {formatDisplayDate(dateRange.to)}
          </span>
          <span className="bg-gray-100 text-gray-600 font-semibold px-3 py-1.5 rounded-full">
            {rangeDayCount} {rangeDayCount === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-5 mb-8">
        {/* TOTAL REVENUE */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Revenue</p>

          <p className="text-lg sm:text-2xl font-bold text-green-600 mt-2 break-words">
            ₹ {totalRevenue.toLocaleString()}
          </p>
        </div>

        {/* SALARY */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Salary</p>

          <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-2 break-words">
            ₹ {totalSalary.toLocaleString()}
          </p>
        </div>

        {/* EXPENSES */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Expenses</p>

          <p className="text-lg sm:text-2xl font-bold text-red-500 mt-2 break-words">
            ₹ {totalExpense.toLocaleString()}
          </p>
        </div>

        {/* TOTAL EXPENSES */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Outflow</p>

          <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-2 break-words">
            ₹ {totalExpenses.toLocaleString()}
          </p>
        </div>

        {/* PROFIT */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">{isLoss ? "Loss" : "Profit"}</p>

          <p
            className={`text-lg sm:text-2xl font-bold mt-2 break-words ${
              isLoss ? "text-red-500" : "text-emerald-600"
            }`}
          >
            ₹ {Math.abs(totalProfit).toLocaleString()}
          </p>
        </div>

        {/* VIDEO VIEWS */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Video Views</p>

          <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-2">
            {filteredReels.reduce((s, r) => s + Number(r.views || 0), 0) +
              filteredVideos.reduce((s, r) => s + Number(r.views || 0), 0)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("openDailyBillHistory", "1");
          setActiveMenu?.("Daily Bill");
        }}
        className="w-full text-left bg-white border border-orange-100 rounded-2xl p-4 shadow-sm mb-8 active:scale-[0.99] transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-gray-500 text-sm">Walk-in daily billing</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-2">
              ₹ {dailyBillingTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dailyBillCount} paid walk-in bill{dailyBillCount === 1 ? "" : "s"}{" "}
              in this period. Tap to open full history.
            </p>
          </div>
          <span className="text-xs font-semibold text-orange-500 mt-1">
            View history
          </span>
        </div>
      </button>

      {/* TOP CONTENT */}

      <div className="bg-white border border-orange-100 rounded-3xl p-3 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Content insights
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Reels, videos and posts from {formatDisplayDate(dateRange.from)} to{" "}
              {formatDisplayDate(dateRange.to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full font-semibold">
              {filteredReels.length} reels
            </span>
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full font-semibold">
              {filteredVideos.length} videos
            </span>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-semibold">
              {filteredPosts.length} posts
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-semibold">
              {contentTotals.likes} likes
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-semibold">
              {contentTotals.views} views
            </span>
          </div>
        </div>

        <input
          value={contentSearch}
          onChange={(event) => setContentSearch(event.target.value)}
          placeholder="Search reels, videos and posts"
          className="w-full mb-4 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none"
        />

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
          {[
            { id: "all", label: "All", count: filteredReels.length + filteredVideos.length + filteredPosts.length },
            { id: "reels", label: "Reels", count: filteredReels.length },
            { id: "videos", label: "Videos", count: filteredVideos.length },
            { id: "posts", label: "Posts", count: filteredPosts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContentFilter(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                contentFilter === tab.id
                  ? "bg-[#FF6B00] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
          {["newest", "views", "likes", "dislikes", "comments"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-[40px] px-4 py-2 rounded-full text-sm whitespace-nowrap capitalize transition ${
                activeTab === tab
                  ? "bg-black text-orange-400 font-semibold"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {tab === "newest" ? "Newest" : `Most ${tab}`}
            </button>
          ))}
        </div>

        {loadingContent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-100 p-4 animate-pulse"
              >
                <div className="h-36 bg-gray-100 rounded-xl mb-3" />
                <div className="h-3 w-2/3 bg-gray-100 rounded-full mb-2" />
                <div className="h-3 w-1/2 bg-gray-50 rounded-full" />
              </div>
            ))}
          </div>
        ) : displayedContent.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="font-semibold text-gray-700">
              {topReels.length + topVideos.length + topPosts.length === 0
                ? "No content yet"
                : "No results for these filters"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {topReels.length + topVideos.length + topPosts.length === 0
                ? "Upload reels, videos or posts to see views, likes and comments here."
                : "Try another period, content type or search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedContent.map((item, index) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-gray-100 overflow-hidden bg-[#F8F8F8] hover:shadow-md transition-all duration-200"
                style={{ animation: `moreFadeUp 0.28s ease-out ${index * 40}ms both` }}
              >
                <button
                  type="button"
                  onClick={() => handlePlayReel(item)}
                  className="relative w-full h-40 bg-black overflow-hidden"
                >
                  {item.mediaType === "post" ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <video
                      src={item.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase bg-white/90 px-2 py-1 rounded-full">
                    {item.mediaType === "post"
                      ? "Post"
                      : item.mediaType === "video"
                        ? "Video"
                        : "Reel"}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition">
                    {item.mediaType === "post" ? (
                      <ImageIcon className="text-white" size={28} />
                    ) : (
                      <Play className="text-white" size={28} fill="white" />
                    )}
                  </span>
                </button>

                <div className="p-4">
                  <p className="font-semibold text-gray-800 line-clamp-2 min-h-[40px]">
                    {item.title || "Untitled"}
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div>
                      <Eye size={14} className="mx-auto text-gray-400" />
                      <p className="text-xs font-semibold mt-1">{item.views}</p>
                    </div>
                    <div>
                      <Heart size={14} className="mx-auto text-rose-400" />
                      <p className="text-xs font-semibold mt-1">{item.likes}</p>
                    </div>
                    <div>
                      <ThumbsDown size={14} className="mx-auto text-gray-400" />
                      <p className="text-xs font-semibold mt-1">
                        {item.dislikes}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openComments(item)}
                      className="active:scale-95"
                    >
                      <MessageCircle
                        size={14}
                        className="mx-auto text-orange-400"
                      />
                      <p className="text-xs font-semibold mt-1">
                        {item.comments}
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showVideoPopup && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-black rounded-3xl p-2 sm:p-3 w-full max-w-2xl relative">
              <button
                onClick={() => {
                  setShowVideoPopup(false);
                  setActiveVideoUrl(null);
                  setPreviewImage(null);
                }}
                className="absolute top-2 right-3 text-white text-xl z-10"
              >
                ✕
              </button>
              {previewImage ? (
                <img
                  src={previewImage}
                  alt=""
                  className="w-full max-h-[80vh] object-contain rounded-xl"
                />
              ) : (
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full rounded-xl"
                />
              )}
            </div>
          </div>
        )}

        {commentDrawer && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setCommentDrawer(null)}
          >
            <div
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Comments</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {commentDrawer.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentDrawer(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              {commentDrawer.comments.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-3">
                  {commentDrawer.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl bg-gray-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {comment.userName ||
                          comment.name ||
                          comment.senderName ||
                          "User"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {comment.text || comment.comment || ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LOADER */}

      {loadingGraph && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>

          <p className="mt-3 text-gray-500">Loading analytics...</p>
        </div>
      )}

      {/* BAR CHART */}

      <h2 className="text-xl font-semibold mt-8 mb-4">Revenue Reports</h2>

      <div className="bg-white shadow-sm border rounded-3xl p-3 sm:p-5 overflow-hidden">
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-gray-500 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Salary
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Expenses
          </span>
        </div>
        <ResponsiveContainer
          width="100%"
          height={window.innerWidth < 640 ? 280 : 340}
        >
          <BarChart data={graphData} margin={{ top: 4, right: 8, left: -12, bottom: graphData.length > 6 ? 18 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              interval={0}
              tick={{ fontSize: 11 }}
              angle={graphData.length > 6 ? -35 : 0}
              textAnchor={graphData.length > 6 ? "end" : "middle"}
              height={graphData.length > 6 ? 48 : 28}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [
                `₹ ${Number(value || 0).toLocaleString("en-IN")}`,
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
            />
            <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="salary" fill="#3b82f6" />
            <Bar dataKey="expense" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LINE CHART */}

      <h2 className="text-xl font-semibold mt-10 mb-4">Payroll Overview</h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT GRAPH */}

        <div className="xl:col-span-2 bg-white shadow-sm border rounded-3xl p-3 sm:p-5 overflow-hidden">
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
            <LineChart data={graphData} margin={{ top: 4, right: 8, left: -12, bottom: graphData.length > 6 ? 18 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                interval={0}
                tick={{ fontSize: 11 }}
                angle={graphData.length > 6 ? -35 : 0}
                textAnchor={graphData.length > 6 ? "end" : "middle"}
                height={graphData.length > 6 ? 48 : 28}
              />

              <YAxis tick={{ fontSize: 11 }} />

              <Tooltip
                formatter={(value, name) => [
                  `₹ ${Number(value || 0).toLocaleString("en-IN")}`,
                  String(name).charAt(0).toUpperCase() + String(name).slice(1),
                ]}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={isMobile ? 2 : 3}
              />

              <Line type="monotone" dataKey="salary" stroke="#3b82f6" />

              <Line type="monotone" dataKey="expense" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT CARDS */}

        <div className="flex flex-col gap-5">
          {/* HIGHEST */}

          <div className="bg-white border border-orange-100 shadow-sm rounded-3xl p-5">
            <p className="text-green-600 font-semibold text-sm">
              Highest Revenue
            </p>

            <h3 className="text-2xl font-bold break-words">
              ₹ {highestMonth?.revenue?.toLocaleString()}
            </h3>

            <p className="text-gray-600">{highestMonth?.month}</p>
          </div>

          {/* LOWEST */}

          <div className="bg-white border border-orange-100 shadow-sm rounded-3xl p-5">
            <p className="text-red-500 font-semibold text-sm">Lowest Revenue</p>

            <h3 className="text-2xl font-bold break-words">
              ₹ {lowestMonth?.revenue?.toLocaleString()}
            </h3>

            <p className="text-gray-600">{lowestMonth?.month}</p>
          </div>

          {/* TOTAL */}

          <div className="bg-white border border-orange-100 shadow-sm rounded-3xl p-5">
            <p className="text-gray-600 font-semibold text-sm">
              Total Collected Fees
            </p>

            <h3 className="text-2xl font-bold break-words">
              ₹ {totalRevenue.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* WORKFORCE */}

      <div className="bg-white border rounded-3xl p-4 sm:p-6 mt-5 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Workforce & Clients Metrics</h2>
        <p className="text-sm text-gray-500 mb-6">
          Joined between {formatDisplayDate(dateRange.from)} and {formatDisplayDate(dateRange.to)}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-orange-100 p-5 rounded-3xl bg-orange-50">
            <h3 className="text-xl font-semibold">Employees</h3>

            <p className="mt-2">Joined: {employeeStats.joined}</p>
          </div>

          <div className="border border-orange-100 p-5 rounded-2xl bg-orange-50">
            <h3 className="text-xl font-semibold">Customers</h3>

            <p className="mt-2">Joined: {customerStats.joined}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
