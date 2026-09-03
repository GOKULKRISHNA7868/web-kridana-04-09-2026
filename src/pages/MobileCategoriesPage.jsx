import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Swords,
  Music,
  Mountain,
  Flower2,
  Trophy,
  Bike,
  Snowflake,
  Dribbble,
  Target,
  Dumbbell,
  Activity,
} from "lucide-react";
import {
  FaFistRaised,
  FaFootballBall,
  FaTableTennis,
  FaDumbbell,
  FaBullseye,
  FaHorse,
  FaMountain,
  FaSnowflake,
  FaSwimmer,
  FaSpa,
  FaMusic,
} from "react-icons/fa";
const categories = [
  { name: "Martial Arts", icon: FaFistRaised, path: "martial-arts" },
  { name: "Dance", icon: FaMusic, path: "dance" },
  {
    name: "Adventure & Outdoor",
    icon: FaMountain,
    path: "adventure-outdoor-sports",
  },
  { name: "Equestrian Sports", icon: FaHorse, path: "equestrian-sports" },
  { name: "Wellness", icon: FaSpa, path: "wellness" },
  { name: "Team Ball Sports", icon: FaFootballBall, path: "teamball" },

  { name: "Ice Sports", icon: FaSnowflake, path: "ice-sports" },
  { name: "Racket Sports", icon: FaTableTennis, path: "racketsports" },
  {
    name: "Target & Precision",
    icon: FaBullseye,
    path: "target-precision-sports",
  },
  { name: "Fitness", icon: FaDumbbell, path: "fitness" },
  { name: "AquaticSports", icon: FaSwimmer, path: "aquatic" },
];

const CategoriesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-orange-500 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center mb-6">
        <ArrowLeft
          className="text-black cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="ml-3 text-lg sm:text-2xl font-bold text-black">
          Choose Your Area of Interest
        </h1>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 overflow-y-auto">
        {categories.map((cat, index) => {
          const Icon = cat.icon;

          return (
            <div
              key={index}
              onClick={() => navigate(`/services/${cat.path}`)}
              className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition"
            >
              <Icon className="text-gray-700 mb-2" size={28} />
              <p className="text-xs text-center font-medium text-gray-800">
                {cat.name}
              </p>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
