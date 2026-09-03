import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";

import { Trophy } from "lucide-react";
import StepHeader from "../StepHeader";

const AchievementsTrack = ({ setStep, onSaved }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const [formData, setFormData] = useState({
    achievements: {
      district: { gold: "", silver: "", bronze: "" },
      state: { gold: "", silver: "", bronze: "" },
      national: { gold: "", silver: "", bronze: "" },
    },
    awardsImages: [],
    mediaMentions: [],
  });

  // ================= LOAD DATA =================
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "trainers", user.uid); // 🔥 dynamic
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setFormData({
            achievements: {
              district: {
                gold: data?.achievements?.district?.gold ?? "",
                silver: data?.achievements?.district?.silver ?? "",
                bronze: data?.achievements?.district?.bronze ?? "",
              },
              state: {
                gold: data?.achievements?.state?.gold ?? "",
                silver: data?.achievements?.state?.silver ?? "",
                bronze: data?.achievements?.state?.bronze ?? "",
              },
              national: {
                gold: data?.achievements?.national?.gold ?? "",
                silver: data?.achievements?.national?.silver ?? "",
                bronze: data?.achievements?.national?.bronze ?? "",
              },
            },
            awardsImages: data?.awardsImages ?? [],
            mediaMentions: data?.mediaMentions ?? [],
          });
        }
      } catch (error) {
        console.error("Error loading achievements:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // ================= HANDLE INPUT =================
  const handleChange = (category, medal, value) => {
    setFormData((prev) => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        [category]: {
          ...prev.achievements[category],
          [medal]: value,
        },
      },
    }));
  };

  // ================= CLOUDINARY UPLOAD =================
  const uploadToCloudinary = async (file, type) => {
    setUploading(true);
    setUploadMsg("");

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kirdana"); // same preset for all uploads

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/dr0svrhu1/${type}/upload`,
        {
          method: "POST",
          body: data,
        },
      );

      const result = await res.json();

      if (!result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary upload failed");
      }

      setUploadMsg("✅ Upload Successful!");
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      alert("Upload Failed: " + err.message);
      return "";
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 3000);
    }
  };

  // ================= FILE UPLOAD =================
  const handleFileUpload = async (e, field, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData[field].length + files.length > 3) {
      alert("Maximum 3 images allowed.");
      return;
    }

    for (const file of files) {
      const url = await uploadToCloudinary(file, type);

      if (url) {
        setFormData((p) => ({
          ...p,
          [field]: [...(p[field] || []), url],
        }));
      }
    }

    e.target.value = "";
  };

  // ================= REMOVE IMAGE =================
  const removeImage = (type, index) => {
    const updated = [...formData[type]];
    updated.splice(index, 1);

    setFormData((prev) => ({
      ...prev,
      [type]: updated,
    }));
  };

  // ================= SAVE =================
  const handleSave = async () => {
    if (!user?.uid) {
      alert("User not logged in");
      return;
    }

    try {
      setSaving(true);

      const docRef = doc(db, "trainers", user.uid);

      await setDoc(
        docRef,
        {
          achievements: formData.achievements,
          awardsImages: formData.awardsImages,
          mediaMentions: formData.mediaMentions,
          updatedAt: serverTimestamp(),
        },
        { merge: true }, // ✅ safe
      );

      onSaved?.("Achievements & Trust");
    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  // ================= CANCEL =================
  const handleCancel = () => {
    setFormData({
      achievements: {
        district: { gold: "", silver: "", bronze: "" },
        state: { gold: "", silver: "", bronze: "" },
        national: { gold: "", silver: "", bronze: "" },
      },
      awardsImages: [],
      mediaMentions: [],
    });
  };

  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Achievements & Trust"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <Trophy size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">
          Achievements & Trust
        </p>
        <p className="text-xs text-gray-500 mt-0.5 text-center">
          Add awards and results to build credibility.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full table-fixed min-w-[320px]">
          <thead>
            <tr className="bg-orange-50 text-orange-600 text-sm">
              <th className="p-3 w-1/4 text-left">Category</th>
              <th className="p-3 w-1/4">Gold</th>
              <th className="p-3 w-1/4">Silver</th>
              <th className="p-3 w-1/4">Bronze</th>
            </tr>
          </thead>
          <tbody>
            {["district", "state", "national"].map((level) => (
              <tr key={level} className="text-center border-t">
                <td className="p-2 capitalize font-medium text-xs text-left pl-3">
                  {level}
                </td>
                {["gold", "silver", "bronze"].map((medal) => (
                  <td key={medal} className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.achievements?.[level]?.[medal] ?? ""}
                      onChange={(e) =>
                        handleChange(level, medal, e.target.value)
                      }
                      className="w-full h-11 text-center text-base border border-gray-200 rounded-lg"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {["awardsImages", "mediaMentions"].map((type) => (
        <div key={type} className="mt-6">
          <label className="font-medium block mb-2 text-sm">
            {type === "awardsImages"
              ? "Awards Images Upload"
              : "Media Mentions Upload"}
          </label>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 min-h-14 bg-white">
            <div className="flex gap-2 flex-wrap flex-1">
              {formData[type].map((img, index) => (
                <div key={index} className="relative">
                  <img
                    src={img}
                    alt="upload"
                    className="h-12 w-12 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(type, index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {formData[type].length < 3 && (
              <label className="cursor-pointer w-11 h-11 flex items-center justify-center">
                <img src="/upload.png" alt="upload" className="w-6 h-6" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, type, "image")}
                />
              </label>
            )}
          </div>
          {uploading && (
            <p className="text-orange-500 text-xs mt-1">Uploading...</p>
          )}
          {formData[type].length > 0 && (
            <p className="text-green-600 text-sm mt-2">
              {formData[type].length} image
              {formData[type].length > 1 ? "s" : ""} uploaded
            </p>
          )}
        </div>
      ))}
      {uploadMsg && <p className="text-green-600 text-sm mt-4">{uploadMsg}</p>}
    </div>
  );
};

export default AchievementsTrack;
