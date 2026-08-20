import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";
import { Image as ImageIcon } from "lucide-react";
import StepHeader from "../StepHeader";

const MediaGallery = ({ setStep }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({});

  const [formData, setFormData] = useState({
    trainingImages: [],
    facilityImages: [],
    equipmentImages: [],
    uniformImages: [],
  });

  const [reels, setReels] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        const docRef = doc(db, "trainers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setFormData({
            trainingImages: data.mediaGallery?.trainingImages || [],
            facilityImages: data.mediaGallery?.facilityImages || [],
            equipmentImages: data.mediaGallery?.equipmentImages || [],
            uniformImages: data.mediaGallery?.uniformImages || [],
          });

          setReels(data.reels || []);
        }
      } catch (error) {
        console.error("Error loading media gallery:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const uploadToCloudinary = async (file, type, fieldName) => {
    setUploading(true);
    setUploadMsg((prev) => ({
      ...prev,
      [fieldName]: "",
    }));

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

      setUploadMsg((prev) => ({
        ...prev,
        [fieldName]: "✅ Upload Successful!",
      }));
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      alert("Upload Failed: " + err.message);
      return "";
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadMsg((prev) => ({
          ...prev,
          [fieldName]: "",
        }));
      }, 3000);
    }
  };

  const handleFileUpload = async (e, field, type = "image") => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const url = await uploadToCloudinary(file, type, field);

      if (url) {
        if (type === "video") {
          setReels((prev) => [...prev, url]);
        } else {
          setFormData((prev) => ({
            ...prev,
            [field]: [...(prev[field] || []), url],
          }));
        }
      }
    }

    e.target.value = "";
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setSaving(true);

      await setDoc(
        doc(db, "trainers", user.uid),
        {
          mediaGallery: formData,
          reels: reels,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      alert("Saved Successfully!");
    } catch (error) {
      console.error("Error saving media gallery:", error);
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (name, index) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index),
    }));
  };

  const removeReel = (index) => {
    setReels((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading...</p>;
  }

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Photos & Videos"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving || uploading}
      />

      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <ImageIcon size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">Photos & Videos</p>
        <p className="text-xs text-gray-500 mt-0.5 text-center">
          Upload training photos, facilities and reels.
        </p>
      </div>

      <div className="space-y-5">
        {[
          { label: "Training Images", name: "trainingImages" },
          { label: "Facility Images", name: "facilityImages" },
          { label: "Equipment Images", name: "equipmentImages" },
          { label: "Uniform Images", name: "uniformImages" },
        ].map((field) => (
          <div key={field.name}>
            <label className="text-sm font-medium mb-2 block">{field.label}</label>
            {uploadMsg[field.name] && (
              <p className="text-green-600 text-sm mb-1">{uploadMsg[field.name]}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-2">
              {formData[field.name]?.map((img, index) => {
                const src = typeof img === "string" ? img : img?.url;
                if (!src) return null;
                return (
                  <div key={`${src}-${index}`} className="relative">
                    <img
                      src={src}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(field.name, index)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <label className="cursor-pointer block">
              <input
                type="file"
                name={field.name}
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, field.name, "image")}
                className="hidden"
              />
              <div className="min-h-[48px] border border-dashed border-gray-300 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-gray-500 text-sm">
                  {formData[field.name]?.length > 0
                    ? `${formData[field.name].length} image(s) uploaded`
                    : "Upload Images"}
                </span>
                <img src="/upload.png" alt="upload" className="w-5 h-5" />
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium mb-2 block">
          Upload Reels (Videos)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {reels.map((item, index) => {
            const src = typeof item === "string" ? item : item?.url;
            if (!src) return null;
            return (
              <div key={`${src}-${index}`} className="relative">
                <video src={src} className="w-16 h-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removeReel(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => handleFileUpload(e, "reels", "video")}
            className="hidden"
          />
          <div className="min-h-[48px] border border-dashed border-gray-300 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-gray-500 text-sm">
              {reels?.length > 0
                ? `${reels.length} video(s) uploaded`
                : "Upload Reels"}
            </span>
            <img src="/upload.png" alt="upload" className="w-5 h-5" />
          </div>
        </label>
        {uploadMsg.reels && (
          <p className="text-green-600 text-sm mt-1">{uploadMsg.reels}</p>
        )}
      </div>
    </div>
  );
};

export default MediaGallery;
