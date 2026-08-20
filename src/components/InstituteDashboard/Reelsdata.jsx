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

  const [graphData, setGraphData] = useState([]);
  const [topReels, setTopReels] = useState([]);
  const [activeTab, setActiveTab] = useState("views");

  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [contentFilter, setContentFilter] = useState("all");
  const [contentSearch, setContentSearch] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [commentDrawer, setCommentDrawer] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");

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

  const monthsList = [
    { name: "Jan", value: "01" },
    { name: "Feb", value: "02" },
    { name: "Mar", value: "03" },
    { name: "Apr", value: "04" },
    { name: "May", value: "05" },
    { name: "Jun", value: "06" },
    { name: "Jul", value: "07" },
    { name: "Aug", value: "08" },
    { name: "Sep", value: "09" },
    { name: "Oct", value: "10" },
    { name: "Nov", value: "11" },
    { name: "Dec", value: "12" },
  ];

  const getMonthRange = () => {
    let start = startMonth ? parseInt(startMonth, 10) : 1;
    let end = endMonth ? parseInt(endMonth, 10) : 12;
    if (Number.isNaN(start)) start = 1;
    if (Number.isNaN(end)) end = 12;
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
    const month = date.getMonth() + 1;
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

        const { start, end } = getMonthRange();

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

          const year = joinDate.getFullYear();

          const month = joinDate.getMonth() + 1;

          const validYear = Number(year) === Number(selectedYear);

          const validMonth = month >= start && month <= end;

          if (validYear && validMonth) {
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

          const year = joinDate.getFullYear();

          const month = joinDate.getMonth() + 1;

          const validYear = Number(year) === Number(selectedYear);

          const validMonth = month >= start && month <= end;

          if (validYear && validMonth) {
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
  }, [user, selectedYear, startMonth, endMonth]);

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
    };
  }, [filteredReels, filteredPosts]);

  /* ================= FETCH GRAPH DATA ================= */

  useEffect(() => {
    if (!user) return;

    const fetchGraphData = async () => {
      setLoadingGraph(true);

      try {
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

          let month = "";

          let year = "";

          if (typeof d.month === "string" && d.month.includes("-")) {
            const parts = d.month.split("-");

            year = parts[0];

            month = parts[1];
          } else {
            month = d.month?.toString().padStart(2, "0");

            year = d.year?.toString();
          }

          if (selectedYear && year && Number(year) !== Number(selectedYear)) {
            return;
          }

          if (!month) return;

          revenueMap[month] =
            (revenueMap[month] || 0) + Number(d.paidAmount || 0);
        });

        /* ================= SALARY ================= */

        salarySnap.forEach((docSnap) => {
          const d = docSnap.data();

          let month = "";

          let year = "";

          if (typeof d.month === "string" && d.month.includes("-")) {
            const parts = d.month.split("-");

            year = parts[0];

            month = parts[1];
          } else {
            month = d.month?.toString().padStart(2, "0");

            year = d.year?.toString();
          }

          if (selectedYear && year && Number(year) !== Number(selectedYear)) {
            return;
          }

          if (!month) return;

          salaryMap[month] =
            (salaryMap[month] || 0) + Number(d.paidAmount || 0);
        });

        /* ================= EXPENSES ================= */

        expenseSnap.forEach((docSnap) => {
          const d = docSnap.data();

          let month = "";

          let year = "";

          if (typeof d.month === "string" && d.month.includes("-")) {
            const parts = d.month.split("-");

            year = parts[0];

            month = parts[1];
          } else {
            month = d.month?.toString().padStart(2, "0");

            year = d.year?.toString();
          }

          if (selectedYear && year && Number(year) !== Number(selectedYear)) {
            return;
          }

          if (!month) return;

          expenseMap[month] = (expenseMap[month] || 0) + Number(d.amount || 0);
        });

        /* ================= FINAL ================= */

        const data = [];

        for (let m = start; m <= end; m++) {
          const monthStr = m.toString().padStart(2, "0");

          const revenue = revenueMap[monthStr] || 0;

          const salary = salaryMap[monthStr] || 0;

          const expense = expenseMap[monthStr] || 0;

          const totalExpenses = salary + expense;

          data.push({
            month: months[m - 1],

            revenue,

            salary,

            expense,

            totalExpenses,

            profit: revenue - totalExpenses,
          });
        }

        setGraphData(data);
      } catch (err) {
        console.error("Graph error:", err);
      }

      setLoadingGraph(false);
    };

    fetchGraphData();
  }, [user, selectedYear, startMonth, endMonth]);

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
      Year: ${selectedYear}
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
      <p>Total Profit</p>
      <h2>₹ ${totalProfit.toLocaleString()}</h2>
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
      Profit
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
      ₹ ${r.profit.toLocaleString()}
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

      pdf.save(`Analytics_Report_${selectedYear}.pdf`);

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen pb-24 bg-gray-50 p-3 sm:p-4 md:p-6 overflow-x-hidden">
      {/* HEADER */}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Growth & Performance Overview
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Track revenue, salary, expenses, profit and workforce
          </p>
        </div>

        {/* FILTERS */}

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
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
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
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
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
          <p className="text-gray-500 text-sm">Profit</p>

          <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-2 break-words">
            ₹ {totalProfit.toLocaleString()}
          </p>
        </div>

        {/* VIDEO VIEWS */}

        <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Video Views</p>

          <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-2">
            {filteredReels.reduce((s, r) => s + Number(r.views || 0), 0)}
          </p>
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
            { id: "all", label: "All", count: filteredReels.length + filteredPosts.length },
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
        <ResponsiveContainer
          width="100%"
          height={window.innerWidth < 640 ? 260 : 340}
        >
          <BarChart data={graphData}>
            <XAxis dataKey="month" />

            <YAxis />

            <Tooltip />

            <Bar dataKey="revenue" fill="#22c55e" />

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
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={graphData}>
              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip />

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
        <h2 className="text-2xl font-bold mb-6">Workforce & Clients Metrics</h2>

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
