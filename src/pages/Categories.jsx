import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronRight, Search, Sparkles } from "lucide-react";

const CATEGORIES = [
  {
    name: "Martial Arts",
    desc: "Build discipline, strength, and confidence through structured combat training programs.",
    image: "/images/karate.jpeg",
    route: "/services/martial-arts",
  },
  {
    name: "Team Ball Sports",
    desc: "Enhance teamwork, coordination, and competitive skills in dynamic team environments.",
    image: "/images/team-ball-sports.jpg",
    route: "/services/teamball",
  },
  {
    name: "Racket Sports",
    desc: "Improve agility, reflexes, and precision with professional racket sport coaching.",
    image: "/images/racket-sports.jpg",
    route: "/services/racketsports",
  },
  {
    name: "Fitness",
    desc: "Transform your health and stamina with personalized fitness and conditioning programs.",
    image: "/images/fitness.jpg",
    route: "/services/fitness",
  },
  {
    name: "Target & Precision Sports",
    desc: "Master focus and accuracy with expert training in precision-based disciplines.",
    image: "/images/archery.jpeg",
    route: "/services/target-precision-sports",
  },
  {
    name: "Equestrian Sports",
    desc: "Experience elite horse riding disciplines combining balance, control, and harmony.",
    image: "/images/equestrian-sports.jpg",
    route: "/services/equestrian-sports",
  },
  {
    name: "Adventure & Outdoor Sports",
    desc: "Challenge yourself with thrilling outdoor activities designed for endurance and excitement.",
    image: "/images/bungee-jumping.jpeg",
    route: "/services/adventure-outdoor-sports",
  },
  {
    name: "Ice Sports",
    desc: "Train in specialized ice-based disciplines that demand balance, speed, and control.",
    image: "/images/ice-sports.jpg",
    route: "/services/ice-sports",
  },
  {
    name: "Aquatic Sports",
    desc: "Develop strength, endurance, and technique through professional swimming and water-based sports training.",
    image: "/images/swimming.jpeg",
    route: "/services/aquatic",
  },
  {
    name: "Wellness",
    desc: "Focus on mental and physical well-being through guided wellness and recovery programs.",
    image: "/images/traditional-therapies.jpeg",
    route: "/services/wellness",
  },
  {
    name: "Dance",
    desc: "Express creativity and rhythm through professional dance training across various styles.",
    image: "/images/dance.jpg",
    route: "/services/dance",
  },
];

const Categories = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q),
    );
  }, [query]);

  const openCategory = (route) => {
    navigate(route);
    window.scrollTo(0, 0);
  };

  const fadeUp = (i = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.22,
      delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.2),
      ease: "easeOut",
    },
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F7F8FC] text-gray-800">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#FFF1E6] via-[#F7F8FC] to-transparent" />
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-[#FF6A00]/10 blur-3xl" />
        <div className="absolute top-40 -left-20 w-64 h-64 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-16 sm:pb-20">
        <motion.button
          type="button"
          onClick={() => navigate("/")}
          {...fadeUp(0)}
          className="
            inline-flex items-center gap-2 mb-5
            text-[#FF6A00] font-semibold text-sm
            bg-white/80 border border-orange-100
            px-3.5 py-2 rounded-xl shadow-sm
            active:scale-[0.97] transition
          "
        >
          <ArrowLeft size={16} />
          Back to Home
        </motion.button>

        <motion.div {...fadeUp(0)} className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[#FF6A00] text-[11px] font-semibold tracking-wide mb-3">
            <Sparkles size={12} />
            {CATEGORIES.length} categories to explore
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A0F08] tracking-tight">
            Explore Categories
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
            Discover professional training, coaching, and institutions across
            sports and wellness — tap a category to get started.
          </p>
        </motion.div>

        <motion.div {...fadeUp(1)} className="mb-7 sm:mb-8">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="
                w-full pl-11 pr-4 py-3 rounded-2xl
                bg-white border border-gray-200 shadow-sm
                text-sm sm:text-base
                focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30
                focus:border-[#FF6A00] transition
              "
            />
          </div>
          {query.trim() && (
            <p className="text-xs text-gray-400 mt-2">
              {filtered.length} result{filtered.length === 1 ? "" : "s"} for “
              {query.trim()}”
            </p>
          )}
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div
            {...fadeUp(2)}
            className="rounded-3xl bg-white border border-orange-50 shadow-sm px-6 py-14 text-center"
          >
            <p className="text-base font-semibold text-gray-800">
              No categories found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Try a different search term.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 text-sm font-semibold text-[#FF6A00]"
            >
              Clear search
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((item, index) => (
              <motion.button
                key={item.name}
                type="button"
                onClick={() => openCategory(item.route)}
                {...fadeUp(index + 2)}
                whileHover={
                  reduceMotion
                    ? undefined
                    : { y: -4, transition: { duration: 0.15 } }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                className="
                  group text-left bg-white rounded-2xl overflow-hidden
                  border border-orange-100/80 shadow-sm
                  hover:shadow-[0_14px_36px_rgba(255,106,0,0.18)]
                  hover:border-orange-200
                  transition-shadow duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]
                "
              >
                <div className="relative h-44 sm:h-52 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="
                      w-full h-full object-cover
                      transition-transform duration-500 ease-out
                      group-hover:scale-105
                    "
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <h3 className="text-white font-bold text-base sm:text-lg drop-shadow-sm leading-snug">
                      {item.name}
                    </h3>
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/95 text-[#FF6A00] flex items-center justify-center shadow-md group-hover:bg-[#FF6A00] group-hover:text-white transition-colors duration-200">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[#FF6A00] text-sm font-semibold">
                    Explore
                    <ChevronRight
                      size={14}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Categories;
