// src/pages/ViewTrainers.jsx
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Filter } from "lucide-react";
import { ArrowLeft } from "lucide-react";

/* 🌍 Distance Formula */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function ViewTrainers() {
  const navigate = useNavigate();
  const location = useLocation();

  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* 📍 User location */
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  /* 🔹 Filters */
  const searchParams = new URLSearchParams(location.search);
  const defaultCategory = searchParams.get("category") || "";

  const defaultSubCategory = searchParams.get("subCategory") || "";
  const isSubCategoryFromURL = Boolean(defaultSubCategory);

  const [category, setCategory] = useState(defaultCategory);
  const [subCategory, setSubCategory] = useState(defaultSubCategory);

  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const categories = [
    "Martial Arts",
    "Team Ball Sports",
    "Racket Sports",
    "Fitness",
    "Target & Precision Sports",
    "Equestrian Sports",
    "Adventure & Outdoor Sports",
    "Ice Sports",
    "Aquatic Sports",
    "Wellness",
    "Dance",
  ];

  const subCategoryMap = {
    "Martial Arts": [
      "Karate",
      "Kung Fu",
      "Krav Maga",
      "Muay Thai",
      "Taekwondo",
      "Judo",
      "Brazilian Jiu-Jitsu",
      "Aikido",
      "Jeet Kune Do",
      "Capoeira",
      "Sambo",
      "Silat",
      "Kalaripayattu",
      "Hapkido",
      "Wing Chun",
      "Shaolin",
      "Ninjutsu",
      "Kickboxing",
      "Boxing",
      "Wrestling",
      "Shorinji Kempo",
      "Kyokushin",
      "Goju-ryu",
      "Shotokan",
      "Wushu",
      "Savate",
      "Lethwei",
      "Bajiquan",
      "Hung Gar",
      "Praying Mantis Kung Fu",
    ],
    "Team Ball Sports": [
      "Football / Soccer",
      "Basketball",
      "Handball",
      "Rugby",
      "Futsal",
      "Field Hockey",
      "Lacrosse",
      "Gaelic Football",
      "Volleyball",
      "Beach Volleyball",
      "Sepak Takraw",
      "Roundnet (Spikeball)",
      "Netball",
      "Cricket",
      "Baseball",
      "Softball",
      "Wheelchair Rugby",
      "Dodgeball",
      "Korfball",
    ],
    "Racket Sports": [
      "Tennis",
      "Table Tennis",
      "Badminton",
      "Squash",
      "Racquetball",
      "Padel",
      "Pickleball",
      "Platform Tennis",
      "Real Tennis",
      "Soft Tennis",
      "Frontenis",
      "Speedminton (Crossminton)",
      "Paddle Tennis (POP Tennis)",
      "Speed-ball",
      "Chaza",
      "Totem Tennis (Swingball)",
      "Matkot",
      "Jombola",
    ],
    Fitness: [
      "Gym Workout",
      "Weight Training",
      "Bodybuilding",
      "Powerlifting",
      "CrossFit",
      "Calisthenics",
      "Circuit Training",
      "HIIT",
      "Functional Training",
      "Core Training",
      "Mobility Training",
      "Stretching",
      "Resistance Band Training",
      "Kettlebell Training",
      "Boot Camp Training",
      "Spinning",
      "Step Fitness",
      "Pilates",
      "Yoga",
    ],
    "Target & Precision Sports": [
      "Archery",
      "Golf",
      "Bowling",
      "Darts",
      "Snooker",
      "Pool",
      "Billiards",
      "Target Shooting",
      "Clay Pigeon Shooting",
      "Air Rifle Shooting",
      "Air Pistol Shooting",
      "Croquet",
      "Petanque",
      "Bocce",
      "Lawn Bowls",
      "Carom Billiards",
      "Nine-Pin Bowling",
      "Disc Golf",
      "Kubb",
      "Pitch and Putt",
      "Shove Ha’penny",
      "Toad in the Hole",
      "Bat and Trap",
      "Boccia",
      "Gateball",
    ],
    "Equestrian Sports": [
      "Horse Racing",
      "Barrel Racing",
      "Rodeo",
      "Mounted Archery",
      "Tent Pegging",
    ],
    "Adventure & Outdoor Sports": [
      "Rock Climbing",
      "Mountaineering",
      "Trekking",
      "Hiking",
      "Mountain Biking",
      "Sandboarding",
      "Orienteering",
      "Obstacle Course Racing",
      "Skydiving",
      "Paragliding",
      "Hang Gliding",
      "Parachuting",
      "Hot-air Ballooning",
      "Skiing",
      "Snowboarding",
      "Ice Climbing",
      "Heli-skiing",
      "Bungee Jumping",
      "BASE Jumping",
      "Canyoning",
      "Kite Buggy",
      "Zorbing",
      "Zip Lining",
    ],
    "Aquatic Sports": [
      "Swimming",
      "Water Polo",
      "Surfing",
      "Scuba Diving",
      "Snorkeling",
      "Freediving",
      "Kayaking",
      "Canoeing",
      "Rowing",
      "Sailing",
      "Windsurfing",
      "Kite Surfing",
      "Jet Skiing",
      "Wakeboarding",
      "Water Skiing",
      "Stand-up Paddleboarding",
      "Whitewater Rafting",
      "Dragon Boat Racing",
      "Artistic Swimming",
      "Open Water Swimming",
    ],
    "Ice Sports": [
      "Ice Skating",
      "Figure Skating",
      "Ice Hockey",
      "Speed Skating",
      "Ice Dance",
      "Synchronized Skating",
      "Curling",
      "Broomball",
      "Bobsleigh",
      "Skiboarding",
      "Ice Dragon Boat Racing",
      "Ice Cross Downhill",
    ],
    Wellness: [
      "Yoga & Meditation",
      "Spa & Relaxation",
      "Mental Wellness",
      "Fitness",
      "Nutrition",
      "Traditional & Alternative Therapies",
      "Rehabilitation",
      "Lifestyle Coaching",
    ],
    Dance: [
      "Bharatanatyam",
      "Kathak",
      "Kathakali",
      "Kuchipudi",
      "Odissi",
      "Mohiniyattam",
      "Manipuri",
      "Sattriya",
      "Chhau",
      "Yakshagana",
      "Lavani",
      "Ghoomar",
      "Kalbelia",
      "Garba",
      "Dandiya Raas",
      "Bhangra",
      "Bihu",
      "Dollu Kunitha",
      "Theyyam",
      "Ballet",
      "Contemporary",
      "Hip Hop",
      "Breakdance",
      "Jazz Dance",
      "Tap Dance",
      "Modern Dance",
      "Street Dance",
      "House Dance",
      "Locking",
      "Popping",
      "Krumping",
      "Waacking",
      "Voguing",
      "Salsa",
      "Bachata",
      "Merengue",
      "Cha-Cha",
      "Rumba",
      "Samba",
      "Paso Doble",
      "Jive",
      "Tango",
      "Waltz",
      "Foxtrot",
      "Quickstep",
      "Flamenco",
      "Irish Stepdance",
      "Scottish Highland Dance",
      "Morris Dance",
      "Hula",
      "Maori Haka",
      "African Tribal Dance",
      "Zumba",
      "K-Pop Dance",
      "Shuffle Dance",
      "Electro Dance",
      "Pole Dance",
      "Ballroom Dance",
      "Line Dance",
      "Square Dance",
      "Folk Dance",
      "Contra Dance",
    ],
  };
  /* 🔐 Fetch trainers */
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const snap = await getDocs(collection(db, "trainers"));
        setTrainers(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            profileImageUrl: d.data().profileImageUrl || "",
          })),
        );
      } catch (err) {
        console.error("Error fetching trainers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainers();
  }, []);

  /* 📍 Get Current Location */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => alert("Location access denied"),
    );
  };

  /* 🔹 Filtered & Sorted Trainers */
  const filteredTrainers = useMemo(() => {
    return trainers
      .filter((t) => {
        if (category && !t.categories?.[category?.trim()]) return false;

        if (
          subCategory &&
          !t.categories?.[category?.trim()]?.includes(subCategory?.trim())
        )
          return false;

        if (city && t.city?.trim() !== city.trim()) return false;

        if (minRating && (t.rating || 0) < Number(minRating)) return false;

        return true;
      })
      .map((t) => {
        const lat = userLat ?? Number(manualLat);
        const lng = userLng ?? Number(manualLng);
        if (!lat || !lng || !t.latitude || !t.longitude) return t;
        return {
          ...t,
          distance: getDistanceKm(
            lat,
            lng,
            Number(t.latitude),
            Number(t.longitude),
          ),
        };
      })
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
  }, [
    trainers,
    category,
    subCategory,
    city,
    minRating,
    userLat,
    userLng,
    manualLat,
    manualLng,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Loading Trainers...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 md:px-16 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </button>
      <h1 className="text-4xl font-bold text-[#ff7a00] mb-8 hidden md:block">
        Trainers
      </h1>

      {/* ================= MOBILE HEADER ================= */}
      <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-white sticky top-0 z-40">
        <h1 className="text-lg font-bold text-[#ff7a00]">
          {category || "Trainers"}
        </h1>

        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm"
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* ================= DESKTOP FILTERS ================= */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-[repeat(5,minmax(180px,1fr))] gap-3 mb-8">
        {/* CATEGORY */}
        <div className="relative">
          <div
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full flex items-center justify-between bg-white border rounded-md px-3 h-[45px]"
          >
            <span>{category || "Select Category"}</span>
            <ChevronDown size={18} />
          </div>

          {showCategoryDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow max-h-[180px] overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setSubCategory("");
                    setShowCategoryDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer"
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SUBCATEGORY */}
        <div className="relative">
          <div
            onClick={() =>
              category && setShowSubCategoryDropdown(!showSubCategoryDropdown)
            }
            className="w-full flex items-center justify-between bg-white border rounded-md px-3 h-[45px]"
          >
            <span>{subCategory || "Select Sub Category"}</span>
            <ChevronDown size={18} />
          </div>

          {showSubCategoryDropdown && category && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow max-h-[180px] overflow-y-auto">
              {(subCategoryMap[category] || []).map((sub) => (
                <div
                  key={sub}
                  onClick={() => {
                    setSubCategory(sub);
                    setShowSubCategoryDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer"
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CITY */}
        <select
          className="border h-[42px] px-3 rounded-md text-sm bg-white"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {[...new Set(trainers.map((t) => t.city?.trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .map((c) => (
              <option key={c}>{c}</option>
            ))}
        </select>

        {/* RATING */}
        <select
          className="border h-[42px] px-3 rounded-md text-sm bg-white"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
        >
          <option value="">Any Rating</option>
          <option value="3">3★+</option>
          <option value="4">4★+</option>
        </select>

        {/* LOCATION */}
        <div className="flex gap-2">
          <button onClick={getCurrentLocation}>📍</button>
          <input
            type="number"
            placeholder="Lat"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            className="border px-2 rounded-md w-[70px]"
          />
          <input
            type="number"
            placeholder="Lng"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            className="border px-2 rounded-md w-[70px]"
          />
        </div>
      </div>

      {/* ================= MOBILE FILTER SHEET (FIXED) ================= */}
      {/* ================= MOBILE FILTER POPUP ================= */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilters(false)}
          />

          <div className="relative bg-white w-full rounded-t-2xl p-5 pb-28 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#ff7a00]">
                Filter Trainers
              </h2>
              <button onClick={() => setShowFilters(false)}>Close</button>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col gap-4">
              {/* CATEGORY */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Category
                </label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubCategory("");
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* SUBCATEGORY */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Sub Category
                </label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  disabled={!category}
                >
                  <option value="">All Subcategories</option>
                  {(subCategoryMap[category] || []).map((sub) => (
                    <option key={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* CITY */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  City
                </label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">All Cities</option>
                  {[
                    ...new Set(trainers.map((t) => t.city).filter(Boolean)),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* RATING */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Minimum Rating
                </label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">Any Rating</option>
                  <option value="3">3★ & above</option>
                  <option value="4">4★ & above</option>
                </select>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setCategory("");
                    setSubCategory("");
                    setCity("");
                    setMinRating("");
                  }}
                  className="flex-1 border rounded-md py-2 font-medium"
                >
                  Reset
                </button>

                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-[#FF6A00] text-white py-2 rounded-md font-bold active:scale-95"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIST ================= */}
      {filteredTrainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <img
            src="/institue.png"
            alt="No Trainers"
            className="w-28 h-28 opacity-70 mb-5"
          />

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Trainers Available
          </h2>

          <p className="text-gray-500 max-w-sm">
            We couldn't find any trainers matching your selected filters. Try
            changing or clearing the filters and search again.
          </p>

          <button
            onClick={() => {
              setCategory("");
              setSubCategory("");
              setCity("");
              setMinRating("");
            }}
            className="mt-6 bg-[#FF6A00] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#e55f00] transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="md:hidden flex flex-col gap-4 mt-6">
          {filteredTrainers.map((t) => (
            <div
              key={t.id}
              className="bg-[#FFF7F2] rounded-xl p-4 shadow-sm border"
            >
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white border">
                  {t.profileImageUrl ? (
                    <img
                      src={t.profileImageUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="font-bold text-base">
                    {t.trainerName || `${t.firstName} ${t.lastName}`}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {Object.keys(t.categories || {})[0] || "Trainer"}
                  </p>

                  <p className="text-xs text-gray-400">
                    {t.city}, {t.state}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate(`/trainers/${t.id}`)}
                  className="border-2 border-[#FF6A00] text-[#FF6A00] rounded-md py-2 px-4 font-bold flex-1 bg-white active:scale-95 transition"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
