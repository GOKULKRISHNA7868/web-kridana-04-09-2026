import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function AvailableDemoClasses() {
  const { instituteId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [demoClasses, setDemoClasses] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  /* 🔐 Login Required */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) navigate("/login");
      else setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  /* 📥 Fetch ONLY this institute's demo classes */
  useEffect(() => {
    const fetchDemos = async () => {
      const snap = await getDocs(
        collection(db, "demo", instituteId, "all_details"),
      );
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setDemoClasses(data);
    };
    fetchDemos();
  }, [instituteId]);

  /* 📌 Book Demo */
  const handleBook = async () => {
    if (!form.name || !form.email || !form.phone || !form.address) {
      alert("Fill all fields");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "BOOKEDDEMOCLASSES"), {
        bookedByUID: user.uid,
        instituteId,
        demoClassId: selectedDemo.id,
        demoDetails: {
          day: selectedDemo.day,
          date: selectedDemo.date,
          timing: selectedDemo.timing,
          category: selectedDemo.category,
        },
        ...form,
        bookedAt: serverTimestamp(),
      });

      alert("Demo class booked successfully!");
      setSelectedDemo(null);
      setForm({ name: "", email: "", phone: "", address: "" });
    } catch (err) {
      console.error(err);
      alert("Booking failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-orange-400 font-semibold"
      >
        ← Back to Institute
      </button>

      <h1 className="text-3xl font-bold text-center mb-8">
        Available Demo Classes
      </h1>

      {/* 🧾 Demo Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoClasses.length === 0 && (
          <p className="text-center col-span-full text-gray-300">
            No demo classes available
          </p>
        )}

        {demoClasses.map((demo) => (
          <div
            key={demo.id}
            className="bg-white text-gray-900 rounded-2xl p-5 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-2">{demo.category}</h2>
            <p>
              <strong>Day:</strong> {demo.day}
            </p>
            <p>
              <strong>Date:</strong> {demo.date}
            </p>
            <p>
              <strong>Time:</strong> {demo.timing}
            </p>

            <p className="mt-2 text-sm text-gray-700">{demo.description}</p>

            <button
              onClick={() => setSelectedDemo(demo)}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
            >
              Book This Demo
            </button>
          </div>
        ))}
      </div>

      {/* 🪟 Booking Modal */}
      {selectedDemo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              Book Demo – {selectedDemo.category}
            </h2>

            <div className="space-y-3">
              <input
                placeholder="Name"
                className="w-full border rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder="Email"
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                placeholder="Phone"
                className="w-full border rounded-lg px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <textarea
                placeholder="Address"
                rows="3"
                className="w-full border rounded-lg px-3 py-2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setSelectedDemo(null)}
                className="w-1/2 border py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={loading}
                className="w-1/2 bg-green-600 text-white py-2 rounded-lg font-semibold"
              >
                {loading ? "Booking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
