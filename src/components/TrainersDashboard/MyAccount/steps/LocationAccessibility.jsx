import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { MapPin } from "lucide-react";
import StepHeader from "../StepHeader";

const LocationAccessibility = ({ setStep }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullAddress: "",
    landmark: "",
    distance: "",
    phoneNumber: "",
    email: "",
    website: "",
    latitude: "",
    longitude: "",
  });

  const [errors, setErrors] = useState({});

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "trainers", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setFormData({
            fullAddress:
              data?.locationAccessibility?.fullAddress ||
              data?.locationName ||
              "",
            landmark: data?.locationAccessibility?.landmark || "",
            distance: data?.locationAccessibility?.distance || "",
            phoneNumber: data?.phoneNumber || "",
            email: data?.email || "",
            website: data?.locationAccessibility?.website || "",
            latitude: data?.latitude || "",
            longitude: data?.longitude || "",
          });
        }
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  /* ================= INPUT CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  /* ================= LOCATION (WEB + APP) ================= */
  const fetchCurrentLocation = async () => {
    try {
      setGeoLoading(true);

      let lat, lng;

      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();

        if (permission.location !== "granted") {
          alert("Location permission denied");
          setGeoLoading(false);
          return;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });

        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } else {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
          });
        });

        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      const latStr = lat.toString();
      const lngStr = lng.toString();

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lngStr}`,
      );

      const data = await res.json();

      const address = data?.display_name || "";

      setFormData((prev) => ({
        ...prev,
        latitude: latStr,
        longitude: lngStr,
        fullAddress: address,
      }));
    } catch (error) {
      console.error(error);
      alert("Unable to fetch location");
    } finally {
      setGeoLoading(false);
    }
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    let newErrors = {};

    ["fullAddress", "landmark", "distance", "phoneNumber", "email"].forEach(
      (field) => {
        if (!formData[field]?.trim()) {
          newErrors[field] = "Required";
        }
      },
    );

    if (formData.phoneNumber && !/^[0-9]{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Enter valid 10 digit number";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!user?.uid) return;

    if (!validate()) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      await setDoc(
        doc(db, "trainers", user.uid),
        {
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          latitude: formData.latitude,
          longitude: formData.longitude,
          locationName: formData.fullAddress,

          locationAccessibility: {
            fullAddress: formData.fullAddress,
            landmark: formData.landmark,
            distance: formData.distance,
            website: formData.website,
          },

          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      alert("Saved Successfully!");
    } catch (error) {
      console.error(error);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500 py-8 text-center">Loading...</p>;

  const fieldClass = (field) =>
    `w-full min-h-[48px] text-base rounded-xl border ${
      errors[field] ? "border-red-500" : "border-gray-200"
    } bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`;

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Location & Accessibility"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <MapPin size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">
          Location & Accessibility
        </p>
        <p className="text-xs text-gray-500 mt-0.5 text-center">
          Help students find you easily.
        </p>
      </div>

      <button
        type="button"
        onClick={fetchCurrentLocation}
        disabled={geoLoading}
        className="mb-5 w-full min-h-[48px] text-sm bg-orange-50 text-orange-600 font-semibold rounded-xl"
      >
        {geoLoading ? "Fetching location..." : "Use Current Location"}
      </button>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Full Address <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            name="fullAddress"
            value={formData.fullAddress}
            onChange={handleChange}
            className={`${fieldClass("fullAddress")} min-h-[96px] resize-none`}
          />
          {errors.fullAddress && (
            <span className="text-red-500 text-xs mt-1">{errors.fullAddress}</span>
          )}
        </div>

        {[
          { label: "Landmark", name: "landmark" },
          { label: "Distance From User", name: "distance" },
          { label: "Phone Number", name: "phoneNumber" },
          { label: "Email", name: "email", type: "email" },
          { label: "Latitude", name: "latitude" },
          { label: "Longitude", name: "longitude" },
        ].map((field) => (
          <div key={field.name}>
            <label className="text-sm font-medium mb-1.5 block">
              {field.label}
              {["landmark", "distance", "phoneNumber", "email"].includes(
                field.name,
              ) ? (
                <span className="text-red-500"> *</span>
              ) : null}
            </label>
            <input
              name={field.name}
              type={field.type || "text"}
              value={formData[field.name]}
              onChange={handleChange}
              className={fieldClass(field.name)}
            />
            {errors[field.name] && (
              <span className="text-red-500 text-xs mt-1">
                {errors[field.name]}
              </span>
            )}
          </div>
        ))}

        <div>
          <label className="text-sm font-medium mb-1.5 block">Website</label>
          <input
            name="website"
            value={formData.website}
            onChange={handleChange}
            className={fieldClass("website")}
            placeholder="https://"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationAccessibility;
