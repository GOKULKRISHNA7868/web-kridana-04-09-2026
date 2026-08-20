import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children, role }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      let hasRole = false;

      if (role === "trainer") {
        const snap = await getDoc(doc(db, "trainers", user.uid));
        hasRole = snap.exists();
      }

      if (role === "institute") {
        const snap = await getDoc(doc(db, "institutes", user.uid));
        hasRole = snap.exists();
      }

      setAllowed(hasRole);
      setLoading(false);
    });

    return () => unsub();
  }, [role]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 px-6"
        style={{
          background:
            "linear-gradient(180deg, #2A1608 0%, #1A0F08 100%)",
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-[#FF6A00] animate-pulse" />
        <p className="text-white/70 text-sm">Checking access…</p>
      </div>
    );
  }

  return allowed ? children : <Navigate to="/" replace />;
}
