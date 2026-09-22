// src/pages/ViewInstitutes.jsx
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Filter, ArrowLeft, MapPin, Star, Users } from "lucide-react";
import SeoHead from "../components/SeoHead";

export default function ViewInstitutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchParams = new URLSearchParams(location.search);
  const defaultCategory = searchParams.get("category") || "";
  const defaultSubCategory = searchParams.get("subCategory") || "";
  const isSubCategoryFromURL = Boolean(defaultSubCategory);
  const [showFilters, setShowFilters] = useState(false);
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
  useEffect(() => {
    const fetchInstitutes = async () => {
      try {
        const snap = await getDocs(collection(db, "institutes"));
        setInstitutes(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            profileImageUrl: d.data().profileImageUrl || "",
            images: d.data().images || [],
            videos: d.data().videos || [],
            reels: d.data().reels || [],
          })),
        );
      } catch (error) {
        console.error("Error fetching institutes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutes();
  }, []);

  const filteredInstitutes = useMemo(() => {
    return (
      institutes
        .filter((i) => {
          if (category && !i.categories?.[category]) return false;
          if (subCategory && !i.categories?.[category]?.includes(subCategory))
            return false;
          if (
            city &&
            i.city?.trim().toLowerCase() !== city.trim().toLowerCase()
          )
            return false;
          if (minRating && (i.rating || 0) < Number(minRating)) return false;
          return true;
        })
        // ✅ ADD THIS SORT
        .sort((a, b) => {
          const nameA = (a.instituteName || "").toLowerCase();
          const nameB = (b.instituteName || "").toLowerCase();

          return nameA.localeCompare(nameB);
        })
    );
  }, [institutes, category, subCategory, city, minRating]);

  if (loading)
    return (
      <div className="min-h-[100dvh] bg-[#F4F6FB] flex items-center justify-center px-6">
        <div className="text-center animate-moreFadeUp">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-orange-200 border-t-[#FF6A00] animate-spin" />
          <p className="text-gray-500 text-sm">Loading Institutes...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-[100dvh] bg-[#F4F6FB] flex flex-col pb-[calc(var(--bottom-navbar-height,64px)+12px)]">
      <SeoHead
        title="Sports Academies & Institutes"
        description="Browse sports academies and institutes on Kridana. Open public profiles to see sports, location, fees, and book demos — like Instagram for sports training."
        path="/institutes"
      />
      <div
        className="sticky top-0 z-40 bg-[#F4F6FB]/95 backdrop-blur-md border-b border-orange-100"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top, 0px))" }}
      >
        <div className="px-3 sm:px-5 md:px-8 lg:px-12 py-2.5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[#FF6A00] active:scale-95 transition"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#FF6A00] truncate">
              {category || "Institutes"}
            </h1>
            <p className="text-[11px] text-gray-400 truncate">
              {filteredInstitutes.length}{" "}
              {filteredInstitutes.length === 1 ? "result" : "results"}
              {subCategory ? ` · ${subCategory}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 shadow-sm active:scale-95 transition md:hidden"
          >
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-3 sm:px-5 md:px-8 lg:px-12 pt-3 pb-4">
      {/* FILTERS */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 animate-moreFadeUp">
        {/* Category */}
        {/* CATEGORY CUSTOM DROPDOWN */}
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">
            Select Category*
          </label>

          <div
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`w-full flex items-center justify-between bg-white 
border ${showCategoryDropdown ? "border-orange-500" : "border-gray-200"} 
rounded-xl px-3 h-11 cursor-pointer shadow-sm`}
          >
            <span className={category ? "text-black" : "text-gray-400"}>
              {category || "Select Category"}
            </span>
            <ChevronDown size={18} />
          </div>

          {showCategoryDropdown && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-[200px] overflow-y-auto animate-moreFadeUp">
              {categories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setSubCategory("");
                    setShowCategoryDropdown(false);
                  }}
                  className="px-4 py-3 text-sm hover:bg-orange-50 hover:text-[#FF6A00] active:bg-orange-500 active:text-white cursor-pointer"
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* SubCategory */}
        {/* SUBCATEGORY CUSTOM DROPDOWN */}
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">
            Select Sub Category*
          </label>

          <div
            onClick={() =>
              category && setShowSubCategoryDropdown(!showSubCategoryDropdown)
            }
            className={`w-full flex items-center justify-between bg-white 
    border ${showSubCategoryDropdown ? "border-orange-500" : "border-gray-200"} rounded-xl px-3 h-11 shadow-sm
    ${!category && "cursor-not-allowed opacity-50"}`}
          >
            <span className={subCategory ? "text-black" : "text-gray-400"}>
              {subCategory || "Select Sub Category"}
            </span>
            <ChevronDown size={18} />
          </div>

          {showSubCategoryDropdown && category && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-[250px] overflow-y-auto animate-moreFadeUp">
              {(subCategoryMap[category] || []).map((sub) => (
                <div
                  key={sub}
                  onClick={() => {
                    setSubCategory(sub);
                    setShowSubCategoryDropdown(false);
                  }}
                  className="px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-[#FF6A00] cursor-pointer"
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* City */}
        <div>
          <label className="block text-sm font-semibold mb-1">City</label>
          <select
            className="w-full bg-white border border-gray-200 rounded-xl px-3 h-11 shadow-sm
            focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All Cities</option>
            {[
              ...new Map(
                institutes
                  .filter((i) => i.city)
                  .map((i) => {
                    const trimmed = i.city.trim();
                    return [trimmed.toLowerCase(), trimmed];
                  }),
              ).values(),
            ]
              .sort((a, b) => a.localeCompare(b))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>

        {/* Min Rating */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            Minimum Rating
          </label>
          <select
            className="w-full bg-white border border-gray-200 rounded-xl px-3 h-11 shadow-sm
            focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
          >
            <option value="">Any Rating</option>
            <option value="3">3★+</option>
            <option value="4">4★+</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      {filteredInstitutes.length === 0 ? (
        <div className="text-center mt-10 px-4 animate-moreFadeUp">
          <img
            src="/institue.png"
            alt="No institutes"
            className="mx-auto w-28 sm:w-32 mb-4 opacity-80"
          />
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">
            We're curating the best institutes for you
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto">
            Our team is reviewing and adding top-notch institutes to ensure you
            get the best options. Please check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredInstitutes.map((inst, index) => (
            <div
              key={inst.id}
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              onClick={() => navigate(`/institutes/${inst.id}`)}
              className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-100 animate-moreFadeUp active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex sm:flex-col gap-3 sm:gap-3 items-center sm:items-stretch">
                <div className="w-16 h-16 sm:w-full sm:h-36 rounded-2xl sm:rounded-xl overflow-hidden bg-orange-50 border border-orange-50 shrink-0">
                  {inst.profileImageUrl ? (
                    <img
                      src={inst.profileImageUrl}
                      alt={inst.instituteName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[#FF6A00] font-bold text-lg">
                      {(inst.instituteName || "I").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 sm:text-center">
                  <h2 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                    {inst.instituteName}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                    {Object.keys(inst.categories || {})[0] || "Institute"}
                  </p>

                  <p className="text-[11px] sm:text-xs text-gray-400 mt-1 flex items-center gap-1 sm:justify-center">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">
                      {inst.city}
                      {inst.state ? `, ${inst.state}` : ""}
                    </span>
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 sm:justify-center text-[11px] sm:text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {inst.students || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      {inst.rating ? (
                        <>
                          <Star
                            size={12}
                            className="text-yellow-500 fill-yellow-500"
                          />
                          {inst.rating.toFixed(1)}
                        </>
                      ) : (
                        <span className="text-gray-400">No ratings</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/institutes/${inst.id}`)}
                className="mt-3 w-full border-2 border-[#FF6A00] text-[#FF6A00] rounded-xl py-2 px-4 text-sm font-bold bg-white active:scale-95 transition"
              >
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-moreFadeUp">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />

          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-[calc(var(--bottom-navbar-height,64px)+16px)] sm:pb-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-slideUp sm:animate-moreFadeUp">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-[#FF6A00]">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="text-gray-500 text-sm font-medium px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold">Category</label>
                <select
                  className="w-full border border-gray-200 rounded-xl p-2.5 mt-1 bg-gray-50 outline-none focus:border-orange-400"
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

              <div>
                <label className="text-sm font-semibold">Sub Category</label>
                <select
                  className="w-full border border-gray-200 rounded-xl p-2.5 mt-1 bg-gray-50 outline-none focus:border-orange-400"
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

              <div>
                <label className="text-sm font-semibold">City</label>
                <select
                  className="w-full border border-gray-200 rounded-xl p-2.5 mt-1 bg-gray-50 outline-none focus:border-orange-400"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">All Cities</option>
                  {[
                    ...new Set(institutes.map((i) => i.city).filter(Boolean)),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Minimum Rating</label>
                <select
                  className="w-full border border-gray-200 rounded-xl p-2.5 mt-1 bg-gray-50 outline-none focus:border-orange-400"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">Any Rating</option>
                  <option value="3">3★+</option>
                  <option value="4">4★+</option>
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setSubCategory("");
                    setCity("");
                    setMinRating("");
                  }}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 font-medium"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-[#FF6A00] text-white py-2.5 rounded-xl font-bold active:scale-95 transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
