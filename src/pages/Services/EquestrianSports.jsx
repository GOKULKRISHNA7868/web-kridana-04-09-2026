import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  ArrowLeft,
  Flag,
  Target,
  Shield,
  Zap,
  Circle,
  Activity,
} from "lucide-react";

const EquestrianSports = () => {
  const navigate = useNavigate();

  const [selectedSubCategory, setSelectedSubCategory] = React.useState(null);
  const [showChoice, setShowChoice] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const category = "Equestrian Sports";

  /* Swipe Back */
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;

    const diff = touchEndX.current - touchStartX.current;

    if (touchStartX.current < 60 && diff > 90) {
      navigate(-1);
    }
  };
  const categories = [
    { name: "Horse Racing", image: "/equestrian/horse racing F.png" },
    { name: "Polo", image: "/equestrian/Polo F.png" },
    //{ name: "Barrel Racing", image: "/equestrian/barrelracing.png" },
    // { name: "Rodeo", image: "/equestrian/rodeo.png" },
    //{ name: "Mounted Archery", image: "/equestrian/mountedarchery.png" },
    { name: "Tent Pegging", image: "/equestrian/Tent Pegging F.png" },
  ];
  const filteredCategories = categories.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      className="bg-[#FFF9F5] min-h-screen px-4 sm:px-6 lg:px-10 py-5 md:py-10 max-w-7xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* TOP BAR */}
      <div className="flex items-center gap-3 mb-5">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Search */}
        <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-full px-4 py-2">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search equestrian sports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-sm bg-transparent"
          />
        </div>

        {/* Profile */}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Explore Subcategories
      </h1>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-5">
        {filteredCategories.length} Subcategories
      </p>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 pb-8">
        {filteredCategories.map((item) => (
          <div
            key={item.name}
            onClick={() => {
              setSelectedSubCategory(item.name);
              setShowChoice(true);
            }}
            className="h-[120px] rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition active:scale-95"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-[90px] h-[90px] object-contain"
            />

            <p className="text-xs text-gray-700 text-center px-1 font-medium leading-tight">
              {item.name}
            </p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-2">{category}</h2>

            <p className="text-gray-500 mb-5 text-sm">
              What are you looking for?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  navigate(
                    `/viewtrainers?category=${category}&subCategory=${encodeURIComponent(
                      selectedSubCategory,
                    )}`,
                  );
                }}
                className="bg-[#FF6A00] text-white py-3 rounded-xl font-semibold"
              >
                Find Trainers
              </button>

              <button
                onClick={() => {
                  navigate(
                    `/viewinstitutes?category=${category}&subCategory=${encodeURIComponent(
                      selectedSubCategory,
                    )}`,
                  );
                }}
                className="border border-[#FF6A00] text-[#FF6A00] py-3 rounded-xl font-semibold"
              >
                Find Institutes
              </button>
            </div>

            <button
              onClick={() => setShowChoice(false)}
              className="mt-4 text-sm text-gray-500 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquestrianSports;
