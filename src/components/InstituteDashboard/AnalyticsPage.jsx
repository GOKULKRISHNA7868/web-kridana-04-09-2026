import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
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

const AnalyticsPage = () => {
  const user = auth.currentUser;

  const [reels, setReels] = useState([]);
  const [filterMonths, setFilterMonths] = useState(1);
  const [graphData, setGraphData] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [topReels, setTopReels] = useState([]);
  const [activeTab, setActiveTab] = useState("views");

  const [employeeStats, setEmployeeStats] = useState({
    joined: 0,
    left: 0,
  });

  const [customerStats, setCustomerStats] = useState({
    joined: 0,
    left: 0,
  });

  /* ================= MONTH FILTER ================= */
  const getDateLimit = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - filterMonths);
    return Timestamp.fromDate(now);
  };

  /* ================= FETCH TOP REELS ================= */
  /* ================= FETCH TOP REELS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchTopReels = async () => {
      const instituteSnap = await getDocs(
        query(collection(db, "trainers"), where("trainerId", "==", user.uid)),
      );

      let reelStats = [];

      for (const docu of instituteSnap.docs) {
        const data = docu.data();

        if (Array.isArray(data.reels)) {
          for (let idx = 0; idx < data.reels.length; idx++) {
            const reelId = `trainer_${docu.id}_${idx}`;

            const viewsSnap = await getDocs(
              query(collection(db, "reelViews"), where("reelId", "==", reelId)),
            );

            const likesSnap = await getDocs(
              query(collection(db, "reelLikes"), where("reelId", "==", reelId)),
            );

            const dislikeSnap = await getDocs(
              query(
                collection(db, "reelDislikes"),
                where("reelId", "==", reelId),
              ),
            );

            const commentsSnap = await getDocs(
              collection(db, "reelComments", reelId, "comments"),
            );

            reelStats.push({
              title: data.instituteName,
              views: viewsSnap.size,
              likes: likesSnap.size,
              dislikes: dislikeSnap.size,
              comments: commentsSnap.size,
            });
          }
        }
      }

      let sorted = [...reelStats];

      if (activeTab === "views") {
        sorted = sorted.sort((a, b) => b.views - a.views);
      }

      if (activeTab === "likes") {
        sorted = sorted.sort((a, b) => b.likes - a.likes);
      }

      if (activeTab === "dislikes") {
        sorted = sorted.sort((a, b) => b.dislikes - a.dislikes);
      }

      if (activeTab === "comments") {
        sorted = sorted.sort((a, b) => b.comments - a.comments);
      }

      setTopReels(sorted);
    };

    fetchTopReels();
  }, [user, activeTab]);

  /* ================= WORKFORCE ================= */
  useEffect(() => {
    if (!user) return;

    const fetchWorkforce = async () => {
      const studentsSnap = await getDocs(
        query(collection(db, "students"), where("trainerId", "==", user.uid)),
      );

      setCustomerStats({
        joined: studentsSnap.size,
        left: 0,
      });
    };

    fetchWorkforce();
  }, [user]);

  /* ================= GRAPH ================= */
  useEffect(() => {
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

    const generated = months.map((month) => ({
      month,
      revenue: Math.floor(Math.random() * 50000) + 10000,
    }));

    setGraphData(generated);
  }, []);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto dash-page-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative rounded-2xl bg-gradient-to-br from-[#FF6A00] via-[#FF7A1A] to-[#FF9A4A] p-4 sm:p-5 shadow-[0_8px_24px_rgba(255,106,0,0.2)] overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/15 pointer-events-none" />
        <h1 className="relative text-2xl sm:text-3xl font-bold text-white">
          Performance Overview
        </h1>

        <div className="relative inline-block z-10">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="bg-white/95 hover:bg-white text-[#FF6A00] px-5 py-2 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 dash-press"
          >
            <span>Select Month</span>
            <span>▼</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-40 sm:w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div
                onClick={() => {
                  setFilterMonths(1);
                  setShowDropdown(false);
                }}
                className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-orange-600 font-medium"
              >
                01 Month
              </div>

              <div
                onClick={() => {
                  setFilterMonths(3);
                  setShowDropdown(false);
                }}
                className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-orange-600 font-medium"
              >
                03 Months
              </div>

              <div
                onClick={() => {
                  setFilterMonths(6);
                  setShowDropdown(false);
                }}
                className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-orange-600 font-medium"
              >
                06 Months
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="dash-card p-4 bg-orange-50/80">
          <p className="text-sm text-gray-600">Profile Views</p>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {topReels.reduce((s, r) => s + r.views, 0)}
          </p>
        </div>
        <div className="dash-card p-4 bg-orange-50/80">
          <p className="text-sm text-gray-600">Video Views</p>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {topReels.reduce((s, r) => s + r.likes, 0)}
          </p>
        </div>
        <div className="dash-card p-4 bg-orange-50/80">
          <p className="text-sm text-gray-600">likes</p>
          <p className="text-xl font-bold text-red-500 mt-1">
            {topReels.reduce((s, r) => s + r.dislikes, 0)}
          </p>
        </div>
        <div className="dash-card p-4 bg-orange-50/80">
          <p className="text-sm text-gray-600">Dislikes</p>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {topReels.reduce((s, r) => s + r.comments, 0)}
          </p>
        </div>
      </div>

      {/* TOP CONTENT INSIGHTS */}
      <div className="dash-card p-5 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-5">Top Content Insights</h2>

        {/* TABS */}
        <div className="flex gap-6 border-b mb-6 overflow-x-auto whitespace-nowrap">
          {["views", "likes", "dislikes", "comments"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 capitalize ${
                activeTab === tab
                  ? "text-orange-600 border-b-2 border-orange-600 font-semibold"
                  : "text-gray-600"
              }`}
            >
              {`Most ${tab}`}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="hidden md:grid grid-cols-6 font-semibold text-orange-600 mb-4">
          <div>Videos</div>
          <div>Title</div>
          <div>Views</div>
          <div>Likes</div>
          <div>Dislikes</div>
          <div>Comments</div>
        </div>

        {topReels.slice(0, 5).map((reel, i) => (
          <div
            key={i}
            className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-0 items-center py-4 border-t"
          >
            <div className="w-20 h-14 bg-gray-300 rounded-md"></div>
            <div>{reel.title}</div>
            <div>{reel.views}</div>
            <div>{reel.likes}</div>
            <div>{reel.dislikes}</div>
            <div>{reel.comments}</div>
          </div>
        ))}
      </div>

      {/* GRAPHS */}
      <h2 className="text-xl font-semibold mt-5 mb-4">Revenue Reports</h2>
      <div className="bg-white shadow rounded-lg p-5 mt-10">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={graphData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h2 className="text-xl font-semibold mt-10 mb-4">Payroll Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT SIDE GRAPH */}
        <div className="md:col-span-2 bg-white shadow rounded-lg p-5">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={graphData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT SIDE CARDS */}
        <div className="flex flex-col gap-5">
          {/* Highest Paying */}
          <div className="bg-white border border-orange-200 shadow rounded-lg p-5">
            <p className="text-green-600 font-semibold text-sm">
              Highest Paying
            </p>
            <h3 className="text-2xl font-bold">
              ₹ {highestMonth?.revenue?.toLocaleString()}
            </h3>
            <p className="text-gray-600">{highestMonth?.month}</p>
          </div>

          {/* Lowest Paying */}
          <div className="bg-white border border-orange-200 shadow rounded-lg p-5">
            <p className="text-red-500 font-semibold text-sm">Lowest Paying</p>
            <h3 className="text-2xl font-bold">
              ₹ {lowestMonth?.revenue?.toLocaleString()}
            </h3>
            <p className="text-gray-600">{lowestMonth?.month}</p>
          </div>

          {/* Total Paying */}
          <div className="bg-white border border-orange-200 shadow rounded-lg p-5">
            <p className="text-gray-600 font-semibold text-sm">Total Paying</p>
            <h3 className="text-2xl font-bold">
              ₹ {totalRevenue.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* WORKFORCE */}
      <div className="bg-gray-50 border rounded-xl p-6 mt-10 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Workforce & Clients Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border p-6 rounded-xl bg-white">
            <h3 className="text-xl font-semibold">Customers</h3>
            <p>Joined: {customerStats.joined}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
