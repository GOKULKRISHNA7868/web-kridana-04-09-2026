import React, { useState, useEffect } from "react";
import { Rocket, CheckCircle, Play } from "lucide-react";

export default function LaunchPage() {
  const [launching, setLaunching] = useState(false);
  const [count, setCount] = useState(10);
  const [launched, setLaunched] = useState(false);

  const PLAYSTORE_LINK =
    "https://play.google.com/store/apps/details?id=com.yourapp";

  useEffect(() => {
    let timer;

    if (launching && count > 0) {
      timer = setTimeout(() => {
        setCount((prev) => prev - 1);
      }, 1000);
    }

    if (launching && count === 0) {
      setTimeout(() => {
        setLaunched(true);
      }, 1000);

      setTimeout(() => {
        window.location.href = PLAYSTORE_LINK;
      }, 3500);
    }

    return () => clearTimeout(timer);
  }, [launching, count]);

  const handleLaunch = () => {
    setLaunching(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center p-5">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <span
            key={i}
            className="absolute bg-white/20 rounded-full animate-pulse"
            style={{
              width: `${Math.random() * 8 + 3}px`,
              height: `${Math.random() * 8 + 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 4 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative z-10 max-w-2xl w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 md:p-12 text-center">
        {!launching && !launched && (
          <>
            <div className="mx-auto mb-8 h-28 w-28 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center shadow-2xl">
              <Rocket size={60} className="text-white" />
            </div>

            <h1 className="text-5xl font-extrabold text-white mb-4">
              Product Launch
            </h1>

            <p className="text-gray-300 text-lg mb-10 leading-relaxed">
              Your amazing product is ready to go live.
              <br />
              Click the button below to begin the official launch.
            </p>

            <button
              onClick={handleLaunch}
              className="group bg-gradient-to-r from-pink-500 to-orange-500 hover:scale-105 duration-300 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl flex items-center gap-3 mx-auto"
            >
              <Rocket className="group-hover:-rotate-12 transition" />
              Launch Product
            </button>
          </>
        )}

        {launching && !launched && (
          <>
            <div className="mb-8 animate-bounce">
              <Rocket size={90} className="mx-auto text-orange-400" />
            </div>

            <h2 className="text-4xl font-bold text-white mb-3">
              Launch Sequence
            </h2>

            <p className="text-gray-300 mb-10">Preparing systems...</p>

            <div className="mx-auto h-48 w-48 rounded-full border-[10px] border-white/20 border-t-orange-500 flex items-center justify-center animate-spin">
              <div className="h-40 w-40 rounded-full bg-white/10 flex items-center justify-center animate-none">
                <span className="text-7xl font-black text-white">{count}</span>
              </div>
            </div>

            <div className="mt-10 w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-1000"
                style={{
                  width: `${((10 - count) / 10) * 100}%`,
                }}
              ></div>
            </div>
          </>
        )}

        {launched && (
          <>
            {/* Confetti */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(80)].map((_, i) => (
                <span
                  key={i}
                  className="absolute rounded-full animate-ping"
                  style={{
                    width: "8px",
                    height: "8px",
                    background: [
                      "#ff4d4d",
                      "#00e676",
                      "#ffd600",
                      "#00b0ff",
                      "#ff00ff",
                    ][i % 5],
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 2 + 1}s`,
                  }}
                />
              ))}
            </div>

            <CheckCircle
              size={120}
              className="mx-auto text-green-400 animate-bounce"
            />

            <h2 className="text-5xl font-extrabold text-white mt-6">
              Product Launched!
            </h2>

            <p className="text-xl text-green-300 mt-5">
              🎉 Product Launched Successfully 🎉
            </p>

            <p className="text-gray-300 mt-5">
              Redirecting to Google Play Store...
            </p>

            <div className="mt-10">
              <button
                onClick={() => (window.location.href = PLAYSTORE_LINK)}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 mx-auto"
              >
                <Play />
                Open Play Store
              </button>
            </div>
          </>
        )}
      </div>

      {/* Floating Glow */}
      <div className="absolute -top-32 -left-32 h-72 w-72 bg-pink-500 blur-[150px] opacity-40 rounded-full"></div>
      <div className="absolute -bottom-32 -right-32 h-72 w-72 bg-blue-500 blur-[150px] opacity-40 rounded-full"></div>
    </div>
  );
}
