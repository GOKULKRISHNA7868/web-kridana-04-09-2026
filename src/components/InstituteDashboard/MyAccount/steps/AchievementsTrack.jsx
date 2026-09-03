import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAccountScope } from "../AccountScopeContext";
import { Trophy, Trash2 } from "lucide-react";
import StepHeader from "../StepHeader";

const AchievementsTrack = ({ setStep, onSaved }) => {
  const { instituteId } = useAccountScope();

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
    achievementHighlights: [],
    yearsInOperation: "",
    totalStudentsTrained: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHighlight, setNewHighlight] = useState({
    title: "",
    summary: "",
    year: "",
  });

  // ================= LOAD DATA =================
  useEffect(() => {
    const fetchData = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }

      try {
        // 🔥 Dynamic institute
        
        const docRef = doc(db, "institutes", instituteId);
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
            achievementHighlights: data?.achievementHighlights ?? [],
            yearsInOperation:
              data?.yearsInOperation ||
              (data?.yearFounded
                ? String(
                    Math.max(
                      0,
                      new Date().getFullYear() - Number(data.yearFounded),
                    ),
                  )
                : ""),
            totalStudentsTrained: data?.totalStudentsTrained ?? "",
          });
        } else {
          // no doc → empty
          setFormData({
            achievements: {
              district: { gold: "", silver: "", bronze: "" },
              state: { gold: "", silver: "", bronze: "" },
              national: { gold: "", silver: "", bronze: "" },
            },
            awardsImages: [],
            mediaMentions: [],
            achievementHighlights: [],
            yearsInOperation: "",
            totalStudentsTrained: "",
          });
        }
      } catch (error) {
        console.error("Error loading institute achievements:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [instituteId]);
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
  // ================= CLOUDINARY UPLOAD (SAME AS MEDIA PAGE) =================
  const uploadToCloudinary = async (file, type) => {
    setUploading(true);
    setUploadMsg("");

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kirdana");

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

  // ================= FILE UPLOAD (MAX 3) =================
  const handleUpload = async (e, field) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData[field].length + files.length > 3) {
      alert("Maximum 3 images allowed.");
      return;
    }

    for (const file of files) {
      const url = await uploadToCloudinary(file, "image");

      if (url) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...prev[field], url],
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
    if (!instituteId) {
      alert("User not logged in");
      return;
    }

    try {
      setSaving(true);

      // 🔥 Dynamic institute
      
      const docRef = doc(db, "institutes", instituteId);

      await setDoc(
        docRef,
        {
          achievements: formData.achievements,
          awardsImages: formData.awardsImages,
          mediaMentions: formData.mediaMentions,
          achievementHighlights: formData.achievementHighlights,
          yearsInOperation: formData.yearsInOperation,
          totalStudentsTrained: formData.totalStudentsTrained,
          updatedAt: serverTimestamp(),
        },
        { merge: true }, // ✅ keeps existing fields safe
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
      achievementHighlights: [],
      yearsInOperation: "",
      totalStudentsTrained: "",
    });
  };

  const addHighlight = () => {
    if (!newHighlight.title.trim()) {
      alert("Please enter achievement title");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      achievementHighlights: [
        ...prev.achievementHighlights,
        { ...newHighlight, id: Date.now() },
      ],
    }));
    setNewHighlight({ title: "", summary: "", year: "" });
    setShowAddForm(false);
  };

  const removeHighlight = (index) => {
    setFormData((prev) => ({
      ...prev,
      achievementHighlights: prev.achievementHighlights.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const fieldClass =
    "w-full min-h-[48px] text-base rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

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

      <div className="space-y-3 mb-4">
        {formData.achievementHighlights.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
              {item.summary && (
                <p className="text-xs text-gray-500 mt-0.5">{item.summary}</p>
              )}
              {item.year && (
                <p className="text-xs text-gray-400 mt-1">{item.year}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeHighlight(index)}
              className="w-10 h-10 flex items-center justify-center text-red-500"
              aria-label="Delete achievement"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 mb-3">
          <input
            className={fieldClass}
            placeholder="Achievement title"
            value={newHighlight.title}
            onChange={(e) =>
              setNewHighlight((p) => ({ ...p, title: e.target.value }))
            }
          />
          <input
            className={fieldClass}
            placeholder="Summary (e.g. 5 Gold, 3 Silver)"
            value={newHighlight.summary}
            onChange={(e) =>
              setNewHighlight((p) => ({ ...p, summary: e.target.value }))
            }
          />
          <input
            className={fieldClass}
            placeholder="Year"
            inputMode="numeric"
            maxLength={4}
            value={newHighlight.year}
            onChange={(e) =>
              setNewHighlight((p) => ({
                ...p,
                year: e.target.value.replace(/\D/g, "").slice(0, 4),
              }))
            }
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addHighlight}
              className="flex-1 min-h-[44px] rounded-xl bg-orange-500 text-white font-semibold"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAddForm(true)}
        className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-orange-400 text-orange-500 font-semibold"
      >
        + Add Achievement
      </button>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Years in Operation
          </label>
          <select
            className={fieldClass}
            value={formData.yearsInOperation}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                yearsInOperation: e.target.value,
              }))
            }
          >
            <option value="">Select years</option>
            {Array.from({ length: 60 }, (_, i) => String(i + 1)).map((y) => (
              <option key={y} value={y}>
                {y} {y === "1" ? "Year" : "Years"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Total Students Trained
          </label>
          <input
            className={fieldClass}
            inputMode="numeric"
            placeholder="e.g. 500"
            value={formData.totalStudentsTrained}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                totalStudentsTrained: e.target.value.replace(/\D/g, ""),
              }))
            }
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
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
                  onChange={(e) => handleUpload(e, type)}
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
    </div>
  );
};

export default AchievementsTrack;
