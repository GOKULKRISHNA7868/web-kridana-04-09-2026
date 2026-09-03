// src/components/AboutUsSection.js
import React from "react";
import { motion } from "framer-motion";
import useTheme from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
const AboutUsSection = () => {
  const [darkMode] = useTheme();
  const navigate = useNavigate();
  const sectionBg = darkMode ? "bg-gray-900" : "bg-[#F7F1EC]";

  return (
    <section
      className={`pt-12 md:pt-16 pb-16 transition-colors duration-500 ${sectionBg} min-h-screen px-4 sm:px-6`}
    >
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </button>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* ---------------- ABOUT US HEADING ---------------- */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: -40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#ea580c]">
            About Us
          </h2>
        </motion.div>

        {/* ---------------- MAIN ABOUT CARD (ALL CONTENT) ---------------- */}
        <motion.div
          className={`p-8 md:p-12 rounded-3xl shadow-2xl backdrop-blur-md border ${
            darkMode
              ? "bg-gray-900/60 border-gray-700 text-gray-100"
              : "bg-white/70 border-gray-300 text-gray-800"
          }`}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        >
          {/* About Kridana */}
          <h3 className="text-2xl md:text-3xl font-bold mb-5 text-[#f97316]">
            About KRIDANA
          </h3>

          <p className="mb-4 leading-relaxed text-justify">
            Kridana is a digital business platform developed by Kdastsho Fintech
            Solutions Private Limited, created to empower small businesses and
            individual entrepreneurs with simple yet powerful software tools.
          </p>

          <p className="mb-4 leading-relaxed text-justify">
            Kridana brings businesses and their clients onto a single unified
            platform—making it easier to manage daily operations, improve
            visibility, and unlock new growth opportunities.
          </p>

          <p className="mb-8 leading-relaxed text-justify">
            From managing attendance and salaries to connecting with clients and
            showcasing services, Kridana enables businesses to operate smarter
            and grow faster in a digital-first world.
          </p>

          {/* One Platform Many Opportunities */}
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-[#f97316]">
            One Platform. Many Opportunities.
          </h3>

          <ul className="space-y-1 pl-4 mb-6 text-base md:text-lg leading-snug">
            <li>• Helping small businesses go digital</li>
            <li>• Connecting individuals with new clients</li>
            <li>• Making local businesses more visible and accessible</li>
            <li>
              • Supporting collaboration across B2B, B2C, and C2C ecosystems
            </li>
          </ul>

          <p className="mb-8 font-medium">
            Our platform enables businesses not only to manage their daily
            operations, but also to grow, connect, and prosper.
          </p>

          {/* Backed By */}
          <h3 className="text-xl font-bold mb-3 text-[#f97316]">
            Backed by Kdastsho Fintech Solutions
          </h3>

          <p className="mb-2 text-justify">
            Kridana is a product of Kdastsho Fintech Solutions Private Limited,
            a fintech company dedicated to building impactful products and
            services that empower individuals and businesses through technology.
          </p>

          <p className="text-justify">
            Aligned with Kdastsho’s long-term vision, Kridana contributes to
            creating wealth, prosperity, and sustainable economic growth for
            businesses of all sizes.
          </p>
        </motion.div>

        {/* ---------------- VISION (SINGLE CARD) ---------------- */}
        <motion.div
          className={`mt-16 text-center p-8 md:p-10 rounded-full shadow-xl border ${
            darkMode
              ? "bg-gray-800 border-gray-700 text-gray-100"
              : "bg-stone-200 border-stone-300 text-stone-900"
          }`}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <h3 className="text-xl md:text-2xl font-bold mb-3 text-[#ea580c]">
            Our Vision
          </h3>
          <p className="text-base md:text-lg font-medium">
            To build a unified digital platform that helps small businesses and
            individuals manage their work, connect with clients, and create
            long-term success through technology.
          </p>
        </motion.div>
      </div>

      {/* ---------------- TEAM SECTION (UNCHANGED) ---------------- */}
      <div className="max-w-7xl mx-auto px-4 mt-16">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-center text-[#ea580c]"
          initial={{ opacity: 0, y: -40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          Meet Our Team
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-10 mt-16">
          {[
            {
              img: "/images/ceo.jpg",
              name: "Sudha Shashank Reddy",
              role: "Chief Executive Officer (CEO)",
              desc: "A strategic leader driving innovation, growth and sustainable digital transformation.",
            },
            {
              img: "/images/hr.jpg",
              name: "Kaipa Sai Ram Reddy",
              role: "Human Resources of KDASTSHO FINTECH SOLUTIONS",
              desc: "A data-driven leader unlocking full business potential with secure and scalable data solutions.",
            },
            {
              img: "/images/harini.jpg",
              name: "Bujaranpally Harini",
              role: "UX/UI Designer",
              desc: "A future-focused tech creator crafting smart and scalable products that redefine challenges as opportunities.",
            },
            {
              img: "/images/gokul.jpg",
              name: "TUPAKULA GOKUL KRISHNA",
              role: "Full Stack Developer",
              desc: "A passionate tech builder developing intelligent, scalable products that turn every challenge into an opportunity.",
            },
            {
              img: "/images/sharanya.jpg",
              name: "Gajula Sharanya",
              role: "Senior Developer",
              desc: "An operations expert transforming data into strategic decisions that accelerate growth.",
            },
            {
              img: "/images/swathi.jpg",
              name: "Sudha Swathi",
              role: "Software Developer",
              desc: "A tech visionary building intelligent, scalable products that convert challenges into opportunities.",
            },
          ].map((member, i) => (
            <motion.div
              key={i}
              className={`rounded-2xl shadow-2xl px-6 py-10 text-center ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              <img
                src={member.img}
                alt={member.name}
                className="w-36 h-36 mx-auto object-cover rounded-full border-4 border-[#D1FAE5] shadow-lg mb-6"
              />
              <h3 className="text-xl font-bold text-[#F9A825]">
                {member.name}
              </h3>
              <p className="text-sm text-sky-400 mb-4">{member.role}</p>
              <p className="text-sm opacity-90 leading-relaxed">
                {member.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;
