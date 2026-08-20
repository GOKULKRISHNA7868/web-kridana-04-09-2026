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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import {
  Eye,
  Heart,
  MessageCircle,
  Play,
  ThumbsDown,
  Image as ImageIcon,
  X,
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

const AnalyticsPage = () => {
  const user = auth.currentUser;
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [graphData, setGraphData] = useState([]);
  const [topReels, setTopReels] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("views");
  const [contentFilter, setContentFilter] = useState("all");
  const [contentSearch, setContentSearch] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [commentDrawer, setCommentDrawer] = useState(null);
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [employeeStats, setEmployeeStats] = useState({
    joined: 0,
    left: 0,
  });

  const [customerStats, setCustomerStats] = useState({
    joined: 0,
    left: 0,
  });

  const getMonthRange = () => {
    let start = startMonth === "" ? 0 : Number(startMonth);
    let end = endMonth === "" ? 11 : Number(endMonth);
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end)) end = 11;
    if (start > end) {
      const swapped = start;
      start = end;
      end = swapped;
    }
    return { start, end };
  };

  const matchesDateFilter = (date) => {
    if (!date || Number.isNaN(date.getTime())) return true;
    if (Number(date.getFullYear()) !== Number(selectedYear)) return false;
    const month = date.getMonth();
    const { start, end } = getMonthRange();
    return month >= start && month <= end;
  };

  const resetFilters = () => {
    setSelectedYear(new Date().getFullYear());
    setStartMonth("");
    setEndMonth("");
    setContentFilter("all");
    setActiveTab("views");
    setContentSearch("");
  };
  const downloadPDFReport = async () => {
    const container = document.createElement("div");

    container.style.width = "794px";
    container.style.padding = "40px";
    container.style.margin = "0 auto";
    container.style.background = "white";
    container.style.fontFamily = "Arial";

    container.innerHTML = `
  
 <h1 style="text-align:center;margin-bottom:15px">
Trainer Revenue Report
</h1>

  <p>
  Year: ${selectedYear} <br/>
 Months: ${new Date(0, getMonthRange().start).toLocaleString("default", {
   month: "short",
 })}
-
${new Date(0, getMonthRange().end).toLocaleString("default", { month: "short" })}
  </p>

<h3 style="text-align:center;margin-bottom:25px">
Total Revenue: ₹${totalRevenue.toLocaleString()}
</h3>

 <table style="width:80%;margin:0 auto;border-collapse:collapse;font-size:14px">

  <thead>
  <tr>
<tr style="background:#f3f3f3">
<th style="border:1px solid #ddd;padding:10px;text-align:center">Month</th>
<th style="border:1px solid #ddd;padding:10px;text-align:center">Revenue</th>
  </tr>
  </thead>

  <tbody>

  ${graphData
    .map(
      (r) => `
      <tr>
<td style="border:1px solid #ddd;padding:10px;text-align:center">${r.month}</td>
<td style="border:1px solid #ddd;padding:10px;text-align:center">₹ ${r.revenue}</td>
      </tr>
      `,
    )
    .join("")}

  </tbody>
  </table>
  `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, { scale: 2 });

    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(img, "PNG", 10, 10, imgWidth, imgHeight);

    pdf.save(`Trainer_Revenue_${selectedYear}.pdf`);

    document.body.removeChild(container);
  };
  useEffect(() => {
    if (!user) return;

    const fetchExpenses = async () => {
      try {
        const snap = await getDocs(
          collection(db, "trainers", user.uid, "expenses"),
        );

        const { start, end } = getMonthRange();
        const expenseData = [];
        let expenseTotal = 0;

        snap.forEach((docSnap) => {
          const data = docSnap.data();

          const paidDate = data.paidDate || "";

          if (!paidDate) return;

          const [yearStr, monthStr] = paidDate.split("-");

          const year = Number(yearStr);
          const monthIndex = Number(monthStr) - 1;

          if (
            year === selectedYear &&
            monthIndex >= start &&
            monthIndex <= end
          ) {
            const amount = Number(data.amount || 0);

            expenseTotal += amount;

            expenseData.push({
              month: monthIndex,
              amount,
            });
          }
        });

        setExpenses(expenseData);
        setTotalExpenses(expenseTotal);
      } catch (error) {
        console.error("Expense fetch error:", error);
      }
    };

    fetchExpenses();
  }, [user, selectedYear, startMonth, endMonth]);

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

        const trainerDoc = await getDoc(doc(db, "trainers", user.uid));
        if (trainerDoc.exists()) {
          ownerType = "trainer";
          ownerDoc = trainerDoc;
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

        if (!ownerType) {
          const instituteDoc = await getDoc(doc(db, "institutes", user.uid));
          if (instituteDoc.exists()) {
            ownerType = "institute";
            ownerDoc = instituteDoc;
          }
        }

        if (!ownerType || !ownerDoc) {
          setTopReels([]);
          setTopPosts([]);
          return;
        }

        const data = ownerDoc.data() || {};
        const ownerId = ownerType === "institute" ? ownerDoc.id : user.uid;
        const ownerName =
          data.trainerName ||
          data.instituteName ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
          "Content";

        const reelItems = Array.isArray(data.reels) ? data.reels : [];
        const imageItems = [
          ...(Array.isArray(data.trainingImages) ? data.trainingImages : []),
          ...(Array.isArray(data.mediaGallery?.trainingImages)
            ? data.mediaGallery.trainingImages
            : []),
        ];

        const reelTasks = reelItems.map(async (item, idx) => {
          const videoUrl = getMediaUrl(item);
          if (!videoUrl) return null;
          const reelId = `${ownerType}_${ownerId}_${idx}`;
          const stats = await fetchReelStats(reelId);
          return {
            id: reelId,
            reelId,
            mediaType: "reel",
            title: getMediaCaption(item, `${ownerName} reel`),
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

        const [reelStats, postStats] = await Promise.all([
          Promise.all(reelTasks),
          Promise.all(postTasks),
        ]);

        setTopReels(reelStats.filter(Boolean));
        setTopPosts(postStats.filter(Boolean));
      } catch (err) {
        console.error("Dynamic reel analytics error:", err);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchTopReels();
  }, [user]);

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
    if (contentFilter !== "posts") items = [...items, ...topReels];
    if (contentFilter !== "reels") items = [...items, ...topPosts];

    return items
      .filter((item) => matchesDateFilter(item.createdAt))
      .filter((item) => {
        if (!keyword) return true;
        return `${item.title || ""} ${item.caption || ""}`
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => Number(b[activeTab] || 0) - Number(a[activeTab] || 0));
  }, [
    topReels,
    topPosts,
    contentFilter,
    activeTab,
    contentSearch,
    selectedYear,
    startMonth,
    endMonth,
  ]);

  const filteredReels = useMemo(
    () => topReels.filter((item) => matchesDateFilter(item.createdAt)),
    [topReels, selectedYear, startMonth, endMonth],
  );

  const filteredPosts = useMemo(
    () => topPosts.filter((item) => matchesDateFilter(item.createdAt)),
    [topPosts, selectedYear, startMonth, endMonth],
  );

  const contentTotals = useMemo(() => {
    const all = [...filteredReels, ...filteredPosts];
    return {
      items: all.length,
      views: all.reduce((sum, item) => sum + Number(item.views || 0), 0),
      likes: all.reduce((sum, item) => sum + Number(item.likes || 0), 0),
      comments: all.reduce((sum, item) => sum + Number(item.comments || 0), 0),
      dislikes: all.reduce(
        (sum, item) => sum + Number(item.dislikes || 0),
        0,
      ),
    };
  }, [filteredReels, filteredPosts]);

  /* ================= WORKFORCE ================= */
  useEffect(() => {
    if (!user) return;

    const fetchWorkforce = async () => {
      try {
        const studentsSnap = await getDocs(
          query(
            collection(db, "trainerstudents"),
            where("trainerId", "==", user.uid),
          ),
        );

        const { start, end } = getMonthRange();
        let joinedCustomers = 0;

        studentsSnap.forEach((docSnap) => {
          const d = docSnap.data();
          let joinDate = null;

          if (d.joiningDate) {
            joinDate = new Date(d.joiningDate);
          } else if (d.createdAt?.toDate) {
            joinDate = d.createdAt.toDate();
          } else if (d.createdAt?.seconds) {
            joinDate = new Date(d.createdAt.seconds * 1000);
          }

          if (!joinDate || Number.isNaN(joinDate.getTime())) return;

          const year = joinDate.getFullYear();
          const month = joinDate.getMonth();
          const validYear = Number(year) === Number(selectedYear);
          const validMonth = month >= start && month <= end;

          if (validYear && validMonth) {
            joinedCustomers++;
          }
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
  }, [user, selectedYear, startMonth, endMonth]);
  /* ================= GRAPH REVENUE FROM FIRESTORE ================= */
  /* ================= GRAPH REVENUE FROM FIRESTORE ================= */
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchGraphData = async () => {
      try {
        setLoadingRevenue(true);

        const months = [
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

        const { start, end } = getMonthRange();
        const revenueMap = {};

        for (let i = 0; i < 12; i++) {
          revenueMap[i] = 0;
        }

        const feesSnap = await getDocs(
          query(
            collection(db, "institutesFees"),
            where("trainerId", "==", user.uid),
          ),
        );

        feesSnap.forEach((docSnap) => {
          const data = docSnap.data();

          const paidDate = data.paidDate || "";

          if (!paidDate) return;

          const [yearStr, monthStr] = paidDate.split("-");

          const year = Number(yearStr);
          const monthIndex = Number(monthStr) - 1;

          if (year === selectedYear && monthIndex >= start && monthIndex <= end) {
            const amount = Number(data.paidAmount || 0);
            revenueMap[monthIndex] += amount;
          }
        });

        const graph = [];

        for (let month = start; month <= end; month++) {
          graph.push({
            month: months[month],
            revenue: revenueMap[month] || 0,
          });
        }

        setGraphData(graph);
      } catch (error) {
        console.error("Revenue fetch error:", error);
      } finally {
        setLoadingRevenue(false);
      }
    };

    fetchGraphData();
  }, [user, selectedYear, startMonth, endMonth]);
  /* ================= PAYROLL CALCULATIONS ================= */
  const highestMonth = graphData.reduce(
    (max, item) => (item.revenue > max.revenue ? item : max),
    graphData[0] || { revenue: 0 },
  );

  const lowestMonth = graphData.reduce(
    (min, item) => (item.revenue < min.revenue ? item : min),
    graphData[0] || { revenue: 0 },
  );

  const totalRevenue = graphData.reduce((sum, item) => sum + item.revenue, 0);
  const netProfit = totalRevenue - totalExpenses;

  const profitPercentage =
    totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  const isProfit = netProfit >= 0;
  const Card = ({ title, value }) => (
    <div className="border p-4 rounded-xl bg-orange-50">
      <p className="text-xs sm:text-sm text-gray-600">{title}</p>
      <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-1">
        {value}
      </p>
    </div>
  );

  const MiniCard = ({ title, value, sub, green, red }) => (
    <div className="bg-white border border-orange-200 shadow rounded-xl p-4">
      <p
        className={`text-sm font-semibold ${
          green ? "text-green-600" : red ? "text-red-500" : "text-gray-600"
        }`}
      >
        {title}
      </p>
      <h3 className="text-xl font-bold mt-1">{value}</h3>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
  );
  /* ================= FINANCE DATA ================= */

  // replace with Firestore expenses total later

  const profit = totalRevenue - totalExpenses;

  const financeChartData = [
    {
      name: "Revenue",
      amount: totalRevenue,
    },
    {
      name: "Expenses",
      amount: totalExpenses,
    },
    {
      name: netProfit >= 0 ? "Profit" : "Loss",
      amount: Math.abs(netProfit),
    },
  ];
  return (
    <div
      className="
      min-h-screen
      bg-gray-50
      p-3
      sm:p-4
      md:p-6
      pb-32
      md:pb-6
      overflow-x-hidden
    "
    >
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
            Growth & Performance Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track revenue, expenses, content and students
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
          <label className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-none">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">
              Year
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border bg-white px-4 py-3 rounded-xl shadow-sm text-sm w-full"
            >
              {[2023, 2024, 2025, 2026, new Date().getFullYear()]
                .filter((year, index, list) => list.indexOf(year) === index)
                .sort((a, b) => b - a)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-none">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">
              From
            </span>
            <select
              value={startMonth}
              onChange={(e) => {
                const value = e.target.value;
                setStartMonth(value);
                if (value && endMonth && Number(value) > Number(endMonth)) {
                  setEndMonth(value);
                }
              }}
              className="border bg-white px-4 py-3 rounded-xl shadow-sm text-sm w-full"
            >
              <option value="">Jan</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString("default", {
                    month: "short",
                  })}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-none">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">
              To
            </span>
            <select
              value={endMonth}
              onChange={(e) => {
                const value = e.target.value;
                setEndMonth(value);
                if (value && startMonth && Number(value) < Number(startMonth)) {
                  setStartMonth(value);
                }
              }}
              className="border bg-white px-4 py-3 rounded-xl shadow-sm text-sm w-full"
            >
              <option value="">Dec</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString("default", {
                    month: "short",
                  })}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 items-end w-full sm:w-auto">
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 sm:flex-none border border-gray-200 bg-white px-5 py-3 rounded-xl font-semibold text-sm text-gray-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={downloadPDFReport}
              className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 transition text-white px-5 py-3 rounded-xl font-semibold shadow-sm"
            >
              Download Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 xl:grid-cols-7 gap-3 mb-6">
        <Card title="Video Views" value={contentTotals.views} />
        <Card title="Likes" value={contentTotals.likes} />
        <Card title="Dislikes" value={contentTotals.dislikes} />
        <Card title="Comments" value={contentTotals.comments} />
        <Card title="Revenue" value={`₹${totalRevenue.toLocaleString()}`} />
        <Card title="Expenses" value={`₹${totalExpenses.toLocaleString()}`} />
        <Card
          title={netProfit >= 0 ? "Profit" : "Loss"}
          value={`₹${Math.abs(netProfit).toLocaleString()}`}
        />
      </div>

      {/* FINANCIAL OVERVIEW */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Financial Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-green-600 font-medium">Total Revenue</p>

            <h3 className="text-3xl font-bold mt-2">
              ₹{totalRevenue.toLocaleString()}
            </h3>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-600 font-medium">Total Expenses</p>

            <h3 className="text-3xl font-bold mt-2">
              ₹{totalExpenses.toLocaleString()}
            </h3>
          </div>

          <div
            className={`rounded-2xl p-5 border ${
              netProfit >= 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p
              className={`font-medium ${
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netProfit >= 0 ? "Net Profit" : "Net Loss"}
            </p>

            <h3 className="text-3xl font-bold mt-2">
              ₹{Math.abs(netProfit).toLocaleString()}
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Margin {profitPercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* TOP CONTENT */}
      <div className="bg-white border border-orange-100 rounded-3xl p-3 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Content insights
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Reels, posts, likes, comments and views for this login
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full font-semibold">
              {filteredReels.length} reels
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
          placeholder="Search reels and posts"
          className="w-full mb-4 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none"
        />

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
          {[
            {
              id: "all",
              label: "All",
              count: filteredReels.length + filteredPosts.length,
            },
            { id: "reels", label: "Reels", count: filteredReels.length },
            { id: "posts", label: "Posts", count: filteredPosts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContentFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
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
          {["views", "likes", "dislikes", "comments"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap capitalize transition ${
                activeTab === tab
                  ? "bg-black text-orange-400 font-semibold"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              Most {tab}
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
              {topReels.length + topPosts.length === 0
                ? "No content yet"
                : "No results for these filters"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {topReels.length + topPosts.length === 0
                ? "Upload reels or posts to see views, likes and comments here."
                : "Try another year, month range, type or search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedContent.map((item, index) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-gray-100 overflow-hidden bg-[#F8F8F8] hover:shadow-md transition-all duration-200"
                style={{
                  animation: `moreFadeUp 0.28s ease-out ${index * 40}ms both`,
                }}
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
                    {item.mediaType === "post" ? "Post" : "Reel"}
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
                type="button"
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

      {/* REVENUE CHART */}
      <h2 className="text-xl font-bold mt-8 mb-3">Revenue Report</h2>

      <div className="bg-white rounded-2xl shadow p-4">
        {loadingRevenue ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            <p className="mt-3 text-gray-500">Loading analytics...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graphData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* REVENUE VS EXPENSE */}
      <h2 className="text-xl font-bold mt-8 mb-3">Revenue vs Expenses</h2>

      <div className="bg-white rounded-2xl shadow p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={financeChartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            <Bar dataKey="amount" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PAYROLL */}
      <h2 className="text-xl font-bold mt-8 mb-3">Payroll Overview</h2>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graphData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4">
          <MiniCard
            title="Highest Revenue"
            value={`₹${highestMonth?.revenue || 0}`}
            sub={highestMonth?.month}
            green
          />

          <MiniCard
            title="Lowest Revenue"
            value={`₹${lowestMonth?.revenue || 0}`}
            sub={lowestMonth?.month}
            red
          />

          <MiniCard title="Total Revenue" value={`₹${totalRevenue || 0}`} />
        </div>
      </div>

      {/* CUSTOMER SECTION */}
      <div className="bg-white rounded-2xl shadow p-5 mt-8">
        <h2 className="text-xl font-bold mb-4">Workforce & Clients</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border rounded-xl p-5">
            <h3 className="font-semibold">Customers</h3>

            <p className="mt-2 text-gray-600">Joined: {customerStats.joined}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
