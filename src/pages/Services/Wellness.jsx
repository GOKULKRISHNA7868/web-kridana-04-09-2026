import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";

const Wellness = () => {
  const navigate = useNavigate();
  const category = "Wellness";

  const [selectedSubCategory, setSelectedSubCategory] = React.useState(null);
  const [showChoice, setShowChoice] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const categories = [
    {
      name: "Yoga & Meditation",
      image: "/wellness/Yoga - Meditation F.png",
    },

    {
      name: "Spa & Relaxation",
      image: "/wellness/massage.png",
    },

    {
      name: "Mental Wellness",
      image: "/wellness/Mental Wellness F.png",
    },

    {
      name: "Nutrition",
      image: "/wellness/Nutrition F.png",
    },

    {
      name: "Lifestyle Coaching",
      image: "/wellness/lifestyle coaching.png ",
    },
  ];

  const filteredCategories = categories.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /* Swipe Back */
  useEffect(() => {
    let startX = 0;
    let endX = 0;

    const handleTouchStart = (e) => {
      startX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      endX = e.changedTouches[0].screenX;

      if (endX - startX > 100) {
        navigate(-1);
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FFF9F5] px-4 sm:px-6 lg:px-10 py-6 md:py-10 max-w-7xl mx-auto overflow-x-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold truncate">
          Explore Subcategories
        </h1>
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center flex-grow bg-white border border-gray-200 rounded-full px-4 py-2 min-w-0">
          <Search size={18} className="text-gray-400 mr-2 flex-shrink-0" />

          <input
            type="text"
            placeholder="Search disciplines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none bg-transparent text-sm min-w-0"
          />
        </div>
      </div>

      {/* COUNT */}
      <p className="text-sm text-gray-600 mb-4">
        {filteredCategories.length} Disciplines Available
      </p>

      {/* GRID */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 pb-6">
        {filteredCategories.map((item) => (
          <div
            key={item.name}
            onClick={() => {
              setSelectedSubCategory(item.name);
              setShowChoice(true);
            }}
            className="
              min-h-[165px]
              rounded-2xl
              bg-white
              shadow-md
              flex
              flex-col
              items-center
              justify-start
              pt-3
              px-2
              pb-3
              cursor-pointer
              hover:shadow-lg
              transition
              active:scale-95
              overflow-hidden
            "
          >
            <img
              src={item.image}
              alt={item.name}
              className="
                w-[70px]
                h-[70px]
                sm:w-[80px]
                sm:h-[80px]
                object-contain
                flex-shrink-0
              "
            />

            <div className="flex-1 flex items-center justify-center w-full mt-2">
              <p
                className="
                  text-[11px]
                  sm:text-xs
                  text-gray-700
                  text-center
                  font-medium
                  leading-tight
                  break-words
                  whitespace-normal
                  w-full
                "
              >
                {item.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* POPUP */}
      {showChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-2">{category}</h2>

            <p className="text-gray-600 mb-6">What are you looking for?</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  navigate(
                    `/viewtrainers?category=${category}&subCategory=${encodeURIComponent(
                      selectedSubCategory,
                    )}`,
                  );
                  setShowChoice(false);
                }}
                className="bg-[#FF6A00] text-white py-3 rounded-xl font-semibold active:scale-95 transition"
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
                  setShowChoice(false);
                }}
                className="border border-[#FF6A00] text-[#FF6A00] py-3 rounded-xl font-semibold active:scale-95 transition"
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

export default Wellness;
