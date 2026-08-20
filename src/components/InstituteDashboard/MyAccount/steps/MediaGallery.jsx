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
  // Add this above the return statement (inside MediaGallery component)

  // ================= REELS UPLOAD =================
  const [reelsUploading, setReelsUploading] = useState(false);
  const [reelsUploadMsg, setReelsUploadMsg] = useState("");

  const handleReelsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setReelsUploading(true);
    setReelsUploadMsg("");

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const url = await uploadToCloudinary(file, "video", "reels"); // 👈 video type
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        // Save to Firestore in "reels" array (outside mediaGallery)
        const docRef = doc(db, "institutes", user.uid);
        const docSnap = await getDoc(docRef);

        const existingReels =
          docSnap.exists() && Array.isArray(docSnap.data().reels)
            ? docSnap.data().reels
            : [];

        await setDoc(
          docRef,
          {
            reels: [...existingReels, ...uploadedUrls],
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        setReelsUploadMsg(
          `✅ Uploaded ${uploadedUrls.length} reel(s) successfully!`,
        );
      }
    } catch (err) {
      console.error("Reels Upload Error:", err);
      alert("Failed to upload reels: " + err.message);
    } finally {
      setReelsUploading(false);
      setTimeout(() => setReelsUploadMsg(""), 4000);
      e.target.value = ""; // reset input
    }
  };
  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "institutes", user.uid); // 🔥 dynamic institute
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data()?.mediaGallery) {
          const mg = docSnap.data().mediaGallery;

          setFormData({
            trainingImages: mg.trainingImages || [],
            facilityImages: mg.facilityImages || [],
            equipmentImages: mg.equipmentImages || [],
            uniformImages: mg.uniformImages || [],
          });
        }
      } catch (error) {
        console.error("Error loading:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  /* ================= CLOUDINARY UPLOAD ================= */
  const uploadToCloudinary = async (file, type, fieldName) => {
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

  /* ================= FILE CHANGE ================= */
  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (!files.length) return;

    const selectedFiles = Array.from(files);

    for (const file of selectedFiles) {
      const url = await uploadToCloudinary(file, "image", name); // 👈 image type

      if (url) {
        setFormData((prev) => ({
          ...prev,
          [name]: [...(prev[name] || []), url],
        }));
      }
    }
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setSaving(true);

      await setDoc(
        doc(db, "institutes", user.uid), // 🔥 dynamic institute
        {
          mediaGallery: {
            trainingImages: formData.trainingImages,
            facilityImages: formData.facilityImages,
            equipmentImages: formData.equipmentImages,
            uniformImages: formData.uniformImages,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      alert("Saved Successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving data");
    }

    setSaving(false);
  };

  /* ================= CANCEL ================= */
  const handleCancel = () => {
    setFormData({
      trainingImages: [],
      facilityImages: [],
      equipmentImages: [],
      uniformImages: [],
    });
  };

  const removeImage = (name, index) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index),
    }));
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
              {formData[field.name]?.map((img, index) => (
                <div key={`${img}-${index}`} className="relative">
                  <img
                    src={img}
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
              ))}
            </div>
            <label className="cursor-pointer block">
              <input
                type="file"
                name={field.name}
                accept="image/*"
                multiple
                onChange={handleFileChange}
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
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleReelsUpload}
            className="hidden"
          />
          <div className="min-h-[48px] border border-dashed border-gray-300 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-gray-500 text-sm">
              {reelsUploading ? "Uploading reels..." : "Upload Reels"}
            </span>
            <img src="/upload.png" alt="upload" className="w-5 h-5" />
          </div>
        </label>
        {reelsUploadMsg && (
          <p className="text-green-600 text-sm mt-1">{reelsUploadMsg}</p>
        )}
      </div>
    </div>
  );
};

export default MediaGallery;
