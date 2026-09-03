import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Save, Plus, Trash2, Award, IndianRupee, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/* ---------------- CATEGORY CONFIG ---------------- */
const CATEGORY_MAP = {
  "Martial Arts": [
    "Karate",
    "Taekwondo",
    "Boxing",
    "Wrestling",
    "Fencing",
    "Kendo",
  ],
  Fitness: [
    "Strength / Muscular Fitness",
    "Muscular Endurance",
    "Flexibility Fitness",
    "Balance & Stability",
    "Skill / Performance Fitness",
  ],
  "Equestrian Sports": [
    "Dressage",
    "Show Jumping",
    "Eventing",
    "Cross Country",
    "Endurance Riding",
    "Polo",
    "Horse Racing",
    "Para-Equestrian",
  ],
  "Adventure & Outdoor Sports": [
    "Rock Climbing",
    "Trekking",
    "Camping",
    "Kayaking",
    "Paragliding",
    "Surfing",
    "Mountain Biking",
    "Ziplining",
  ],
  "Team Ball Sports": [
    "Football",
    "Hockey",
    "Basketball",
    "Handball",
    "Rugby",
    "American Football",
    "Water Polo",
    "Lacrosse",
  ],
  "Racket Sports": [
    "Tennis",
    "Badminton",
    "Pickleball",
    "Soft Tennis",
    "Padel Tennis",
    "Speedminton",
  ],
  "Target Precision Sports": [
    "Archery",
    "Shooting",
    "Darts",
    "Bowling",
    "Golf",
    "Billiards",
    "Bocce",
    "Lawn Bowls",
  ],
  "Ice Sports": [
    "Ice Skating",
    "Figure Skating",
    "Ice Hockey",
    "Speed Skating",
    "Short Track Skating",
    "Ice Dancing",
    "Curling",
    "Synchronized Skating",
  ],
  Dance: [
    "Classical Dance",
    "Contemporary Dance",
    "Hip-Hop Dance",
    "Folk Dance",
    "Western Dance",
    "Latin Dance",
    "Fitness Dance",
    "Creative & Kids Dance",
  ],
  Wellness: [
    "Physical Wellness",
    "Mental Wellness",
    "Social Wellness",
    "Emotional Wellness",
    "Spiritual Wellness",
    "Lifestyle Wellness",
  ],
  "Play School": [
    "Pre-Nursery",
    "Nursery",
    "LKG",
    "UKG",
    "Day Care",
    "Activity Based Learning",
  ],
};

export default function TrainerEditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ✅ Cloudinary Upload Loading */
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    trainerName: "",
    profit: "",
    about: "",
    description: "",
    categories: [],
    facilities: "",
    achievements: [""],
    studentsCount: "",
    experience: "",
    timings: "",

    /* ✅ ALL TRAINER FIREBASE FIELDS */
    firstName: "",
    lastName: "",
    designation: "",
    trainerType: "",
    instituteName: "",
    role: "trainer",
    status: "pending",

    email: "",
    phoneNumber: "",
    websiteLink: "",

    address: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
    locationName: "",

    profileImageUrl: "",
    /* ✅ MEDIA */
    images: [],
    videos: [],
    reels: [],
  });

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const fetchTrainer = async () => {
      try {
        const snap = await getDoc(doc(db, "trainers", uid));
        if (snap.exists()) {
          setForm((prev) => ({
            ...prev,
            ...snap.data(),

            achievements: snap.data().achievements || [""],
            categories: snap.data().categories || [],
            subCategories: snap.data().subCategories || {},

            images: snap.data().images || [],
            videos: snap.data().videos || [],
            reels: snap.data().reels || [],
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrainer();
  }, []);
  /* ---------------- CATEGORY DROPDOWN HANDLER ---------------- */
  const handleCategorySelect = (e) => {
    const cat = e.target.value;

    if (!cat) return;

    setForm((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: [],
      },
    }));
  };

  /* ---------------- SUBCATEGORY DROPDOWN HANDLER ---------------- */
  const handleSubCategorySelect = (cat, sub) => {
    setForm((prev) => {
      const currentSubs = prev.categories[cat] || [];

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [cat]: currentSubs.includes(sub)
            ? currentSubs
            : [...currentSubs, sub],
        },
      };
    });
  };

  /* ---------------- REMOVE SUBCATEGORY ---------------- */
  const removeSubCategory = (cat, sub) => {
    setForm((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: prev.categories[cat].filter((s) => s !== sub),
      },
    }));
  };

  /* ---------------- HANDLERS ---------------- */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ---------------- CLOUDINARY UPLOAD FUNCTION ---------------- */
  const uploadToCloudinary = async (file, type) => {
    setUploading(true);

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kirdana");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dr0svrhu1/${type}/upload`,
      {
        method: "POST",
        body: data,
      },
    );

    const result = await res.json();
    setUploading(false);

    return result.secure_url;
  };

  /* ---------------- MEDIA UPLOAD ---------------- */
  const handleMediaUpload = async (e, field, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = await uploadToCloudinary(file, type);

    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], url],
    }));
  };

  const removeMedia = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };
  /* ---------------- DELETE MEDIA WITH CONFIRM ---------------- */
  const confirmAndRemoveMedia = async (field, index) => {
    const ok = window.confirm(
      "Are you sure you want to delete this file permanently?",
    );

    if (!ok) return;

    // Remove from UI + Firebase URL list
    removeMedia(field, index);

    // Save updated list immediately in Firestore
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await updateDoc(doc(db, "trainers", uid), {
      [field]: form[field].filter((_, i) => i !== index),
      updatedAt: serverTimestamp(),
    });

    alert("Deleted Successfully ✅");
  };

  /* ---------------- SAVE PROFILE ---------------- */
  const saveProfile = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);

    await updateDoc(doc(db, "trainers", uid), {
      ...form,
      updatedAt: serverTimestamp(),
    });

    setSaving(false);
    alert("Profile Updated Successfully");
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 text-[#5D3A09]"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold text-orange-500">
          Edit Trainer Profile & Profit
        </h1>
      </div>

      {/* ✅ BASIC INFO */}
      <section className="grid md:grid-cols-2 gap-6 bg-gray-100 rounded-2xl p-6 border border-gray-300">
        {[
          ["trainerName", "Trainer Name"],
          ["firstName", "First Name"],
          ["lastName", "Last Name"],
          ["designation", "Designation"],
          ["trainerType", "Trainer Type"],
          ["experience", "Years of Experience"],
          ["studentsCount", "Total Students"],
          ["phoneNumber", "Phone Number"],
          ["email", "Email"],
          ["websiteLink", "Website Link"],
          ["address", "Address"],
          ["city", "City"],
          ["state", "State"],
          ["zipCode", "Zip Code"],
          ["latitude", "Latitude"],
          ["longitude", "Longitude"],
        ].map(([name, placeholder]) => (
          <input
            key={name}
            name={name}
            value={form[name]}
            onChange={handleChange}
            placeholder={placeholder}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-400 outline-none"
          />
        ))}
      </section>

      {/* ✅ ABOUT / FACILITIES / ACHIEVEMENTS */}
      <section className="bg-gray-100 p-6 rounded-2xl border border-gray-300 space-y-6">
        {/* ABOUT */}
        <div>
          <p className="font-semibold mb-2">About Trainer</p>
          <textarea
            name="about"
            value={form.about}
            onChange={handleChange}
            placeholder="Write about the trainer..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>

        {/* FACILITIES */}
        <div>
          <p className="font-semibold mb-2">Facilities</p>
          <textarea
            name="facilities"
            value={form.facilities}
            onChange={handleChange}
            placeholder="Facilities provided..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>

        {/* ACHIEVEMENTS */}
        <div>
          <p className="font-semibold mb-2">Achievements</p>

          {form.achievements.map((ach, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={ach}
                onChange={(e) => {
                  const copy = [...form.achievements];
                  copy[i] = e.target.value;
                  setForm({ ...form, achievements: copy });
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Achievement"
              />

              <button
                onClick={() =>
                  setForm({
                    ...form,
                    achievements: form.achievements.filter(
                      (_, idx) => idx !== i,
                    ),
                  })
                }
                className="text-red-500 font-bold"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            onClick={() =>
              setForm({ ...form, achievements: [...form.achievements, ""] })
            }
            className="text-orange-500 font-semibold"
          >
            + Add Achievement
          </button>
        </div>
      </section>

      {/* ✅ CATEGORY DROPDOWN SECTION */}
      <section className="bg-gray-100 p-6 rounded-2xl border border-gray-300 space-y-6">
        <h2 className="font-bold text-orange-500 text-lg">
          Select Categories & Sub Categories
        </h2>

        {/* CATEGORY DROPDOWN */}
        <div>
          <p className="font-semibold mb-2">Choose Category</p>

          <select
            onChange={handleCategorySelect}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="">-- Select Category --</option>

            {Object.keys(CATEGORY_MAP).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* DISPLAY SELECTED CATEGORIES */}
        {Object.keys(form.categories).map((cat) => (
          <div key={cat} className="bg-white p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-orange-600">{cat}</h3>

            {/* SUBCATEGORY DROPDOWN */}
            <select
              onChange={(e) => handleSubCategorySelect(cat, e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">-- Select Sub Category --</option>

              {CATEGORY_MAP[cat].map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* SHOW SELECTED SUBCATEGORIES */}
            <div className="flex flex-wrap gap-2 mt-3">
              {form.categories[cat].map((sub) => (
                <span
                  key={sub}
                  className="px-3 py-1 bg-orange-200 rounded-full text-sm flex items-center gap-2"
                >
                  {sub}
                  <button
                    onClick={() => removeSubCategory(cat, sub)}
                    className="text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ✅ MEDIA UPLOAD SECTION */}
      <section className="bg-gray-100 p-6 rounded-2xl border border-gray-300 space-y-6">
        <h2 className="font-bold text-orange-500 text-lg">
          Upload Trainer Media (Images, Videos, Reels)
        </h2>

        {/* IMAGES */}
        <div>
          <p className="font-semibold mb-2">Trainer Images</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleMediaUpload(e, "images", "image")}
          />

          <div className="flex flex-wrap gap-3 mt-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img}
                  alt="upload"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeMedia("images", i)}
                  className="absolute top-1 right-1 bg-red-500 text-white px-2 rounded-full text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* VIDEOS */}
        {/* VIDEOS */}
        <div>
          <p className="font-semibold mb-2">Trainer Videos</p>

          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleMediaUpload(e, "videos", "video")}
          />

          {/* SHOW EXISTING VIDEOS */}
          <div className="flex flex-wrap gap-4 mt-4">
            {form.videos.map((vid, i) => (
              <div key={i} className="relative w-40">
                <video
                  src={vid}
                  controls
                  className="w-full h-28 rounded-lg border object-cover"
                />

                <button
                  onClick={() => confirmAndRemoveMedia("videos", i)}
                  className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs"
                >
                  ✕ Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* REELS */}
        {/* REELS */}
        <div>
          <p className="font-semibold mb-2">Trainer Reels</p>

          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleMediaUpload(e, "reels", "video")}
          />

          {/* SHOW EXISTING REELS */}
          <div className="flex flex-wrap gap-4 mt-4">
            {form.reels.map((reel, i) => (
              <div key={i} className="relative w-40">
                <video
                  src={reel}
                  controls
                  className="w-full h-28 rounded-lg border object-cover"
                />

                <button
                  onClick={() => confirmAndRemoveMedia("reels", i)}
                  className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs"
                >
                  ✕ Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {uploading && (
          <p className="text-orange-500 font-semibold">
            Uploading to Cloudinary...
          </p>
        )}
      </section>

      {/* SAVE */}
      <div className="flex justify-end">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl flex items-center gap-2 font-semibold"
        >
          <Save />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </motion.div>
  );
}
