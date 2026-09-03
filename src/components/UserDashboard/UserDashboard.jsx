import React from "react";
import {
  School,
  Dumbbell,
  BarChart3,
  CalendarDays,
  Users,
  Award,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function JoinAcademyScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-6 md:py-12 flex flex-col items-center">
      {/* Top Illustration */}
      <div className="relative mb-6">
        <img src="/image_land.png" alt="Sports" className="w-52 mx-auto" />
      </div>

      {/* Heading */}
      <div className="text-center max-w-sm md:max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900">
          You're almost there!
        </h1>

        <p className="mt-3 text-gray-700 text-lg leading-relaxed">
          Join an academy or a sport to unlock the full power of
          <span className="text-orange-500 font-semibold"> Kridana</span>.
        </p>
      </div>

      {/* Cards */}
      <div className="w-full max-w-md md:max-w-xl mt-8 space-y-4">
        {/* Academy Card */}
        <div className="bg-[#FFF4EC] rounded-3xl p-6 shadow-sm border border-orange-100">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm border border-orange-100">
              <School size={38} className="text-orange-500" strokeWidth={2} />
            </div>
          </div>

          <h2 className="text-center font-bold text-2xl mt-5 text-gray-900">
            Join an Academy
          </h2>

          <p className="text-center text-gray-600 mt-3 leading-relaxed">
            Join your academy to manage training, schedules, attendance, players
            and more.
          </p>

          <button
            onClick={() => navigate("/MobileCategoriesPage")}
            className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg shadow-md active:scale-95 transition"
          >
            Find Academies
          </button>
        </div>

        {/* Sports Card */}
        <div className="bg-[#EEF3FF] rounded-3xl p-6 shadow-sm border border-blue-100">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm border border-blue-100">
              <Dumbbell size={38} className="text-blue-600" />
            </div>
          </div>

          <h2 className="text-center font-bold text-2xl mt-5 text-gray-900">
            Explore Sports
          </h2>

          <p className="text-center text-gray-600 mt-3 leading-relaxed">
            Select your sport to get personalized experience, training and
            updates.
          </p>

          <button
            onClick={() => navigate("/MobileCategoriesPage")}
            className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-lg shadow-md active:scale-95 transition"
          >
            Explore Sports
          </button>
        </div>
      </div>

      {/* Why Join */}
      <div className="w-full max-w-md md:max-w-xl mt-10">
        <h3 className="text-center font-bold text-2xl text-gray-900 mb-6">
          Why join?
        </h3>

        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
          <div className="text-center">
            <BarChart3 className="mx-auto text-orange-500 mb-3" size={32} />
            <h4 className="font-semibold text-gray-900">Track Progress</h4>
            <p className="text-sm text-gray-600 mt-1">Monitor your growth</p>
          </div>

          <div className="text-center">
            <CalendarDays className="mx-auto text-orange-500 mb-3" size={32} />
            <h4 className="font-semibold text-gray-900">Stay Updated</h4>
            <p className="text-sm text-gray-600 mt-1">
              Get training & event updates
            </p>
          </div>

          <div className="text-center">
            <Users className="mx-auto text-orange-500 mb-3" size={32} />
            <h4 className="font-semibold text-gray-900">Connect</h4>
            <p className="text-sm text-gray-600 mt-1">
              Connect with coaches & players
            </p>
          </div>

          <div className="text-center">
            <Award className="mx-auto text-orange-500 mb-3" size={32} />
            <h4 className="font-semibold text-gray-900">Achieve More</h4>
            <p className="text-sm text-gray-600 mt-1">
              Unlock your full potential
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Notice */}
      <div className="w-full max-w-md md:max-w-xl mt-10">
        <div className="bg-[#FFF8F4] border border-orange-100 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0">
            <ShieldCheck size={26} className="text-orange-500" />
          </div>

          <p className="text-gray-700 leading-relaxed">
            Join an academy or select your sport to access all dashboard
            features and manage your sports journey effectively.
          </p>
        </div>
      </div>
    </div>
  );
}
