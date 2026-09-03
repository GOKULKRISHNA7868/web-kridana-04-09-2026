import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAccountScope } from "../AccountScopeContext";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { MapPin } from "lucide-react";
import StepHeader from "../StepHeader";
const LocationAccessibility = ({ setStep, onSaved }) => {
  const { instituteId } = useAccountScope();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false); // 🔥 location loading

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  // 🔥 ADD THESE STATES (already exist in previous logic version)

  const [formData, setFormData] = useState({
    fullAddress: "",
    landmark: "",
    distance: "",
    contactNumber: "",
    email: "",
    website: "",
  });

  const [errors, setErrors] = useState({});

  // ✅ LOAD EXISTING DATA
  useEffect(() => {
    const fetchData = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }

      try {
        
        const docRef = doc(db, "institutes", instituteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          const addressParts = [
            data.street,
            data.building,
            data.city,
            data.district,
            data.state,
            data.zipCode,
            data.country,
          ].filter(Boolean);

          setFormData({
            fullAddress: data.street || addressParts.join(", "),
            landmark: data.landmark || "",
            distance: "",
            contactNumber: data.phoneNumber || "",
            email: data.email || "",
            website: data.websiteLink || "",
          });

          // 🔥 load location fields
          setLatitude(data.latitude || "");
          setLongitude(data.longitude || "");
          setLocationName(data.locationName || "");
        } else {
          setFormData({
            fullAddress: "",
            landmark: "",
            distance: "",
            contactNumber: "",
            email: "",
            website: "",
          });
        }
      } catch (error) {
        console.error("Error loading institute data:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [instituteId]);

  // 🔥 GET CURRENT LOCATION
  const handleGetLocation = async () => {
    try {
      setLocLoading(true);

      let lat;
      let lon;

      // ✅ MOBILE APP (Capacitor Android/iOS)
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();

        if (
          permission.location !== "granted" &&
          permission.coarseLocation !== "granted"
        ) {
          alert("Location permission denied");
          setLocLoading(false);
          return;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }

      // ✅ DESKTOP / WEB
      else {
        if (!navigator.geolocation) {
          alert("Geolocation not supported");
          setLocLoading(false);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });

        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }

      // ✅ SET LOCATION
      setLatitude(String(lat));
      setLongitude(String(lon));

      // 🌍 Reverse Geocoding
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );

      const data = await res.json();

      const address = data.display_name || "";

      setLocationName(address);

      setFormData((prev) => ({
        ...prev,
        fullAddress: address,
      }));

      setLocLoading(false);
    } catch (error) {
      console.error(error);
      alert("Unable to fetch location");
      setLocLoading(false);
    }
  };
  // ✅ HANDLE CHANGE
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

  // ✅ VALIDATION
  const validate = () => {
    let newErrors = {};

    const requiredFields = [
      "fullAddress",
      "landmark",
      "distance",
      "contactNumber",
      "email",
    ];

    requiredFields.forEach((field) => {
      const value = formData[field];

      if (!value || String(value).trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Enter valid email address";
      }
    }

    if (formData.contactNumber) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.contactNumber)) {
        newErrors.contactNumber = "Enter valid 10 digit number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ SAVE
  const handleSave = async () => {
    if (!instituteId) {
      alert("User not logged in");
      return;
    }

    const isValid = validate();
    if (!isValid) {
      alert("Please fill all required details correctly.");
      return;
    }

    try {
      setSaving(true);

      
      const docRef = doc(db, "institutes", instituteId);

      await setDoc(
        docRef,
        {
          street: formData.fullAddress, // full address
          landmark: formData.landmark,
          phoneNumber: formData.contactNumber,
          email: formData.email,
          websiteLink: formData.website,

          // 🔥 NEW LOCATION FIELDS
          latitude: latitude || "",
          longitude: longitude || "",
          locationName: locationName || formData.fullAddress,

          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      onSaved?.("Location & Accessibility");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  const handleCancel = () => {
    setFormData({
      fullAddress: "",
      landmark: "",
      distance: "",
      contactNumber: "",
      email: "",
      website: "",
    });
    setErrors({});
  };

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
          Help students find your academy easily.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGetLocation}
        disabled={locLoading}
        className="mb-5 w-full min-h-[48px] text-sm bg-orange-50 text-orange-600 font-semibold rounded-xl"
      >
        {locLoading ? "Fetching location..." : "Use Current Location"}
      </button>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Full Address <span className="text-red-500">*</span>
          </label>
          <textarea
            name="fullAddress"
            value={formData.fullAddress}
            onChange={handleChange}
            rows={4}
            className={`${fieldClass("fullAddress")} min-h-[96px] resize-none`}
          />
          {errors.fullAddress && (
            <span className="text-red-500 text-xs mt-1">{errors.fullAddress}</span>
          )}
        </div>

        {[
          { label: "Land Mark", name: "landmark" },
          { label: "Distance From User (Auto)", name: "distance" },
          { label: "E-mail Address", name: "email", type: "email" },
        ].map((field) => (
          <div key={field.name}>
            <label className="text-sm font-medium mb-1.5 block">
              {field.label} <span className="text-red-500">*</span>
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
          <label className="text-sm font-medium mb-1.5 block">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            <div className="h-12 w-[92px] shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center justify-center text-sm font-semibold text-gray-800">
              +91
            </div>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel-national"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData((prev) => ({ ...prev, contactNumber: value }));
                setErrors((prev) => ({ ...prev, contactNumber: "" }));
              }}
              className={`flex-1 min-w-0 min-h-[48px] text-base rounded-xl border ${
                errors.contactNumber ? "border-red-500" : "border-gray-200"
              } bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`}
              placeholder="9876543210"
            />
          </div>
          {errors.contactNumber && (
            <span className="text-red-500 text-xs mt-1">
              {errors.contactNumber}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Latitude</label>
            <input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className={fieldClass(false)}
              placeholder="e.g. 17.4893"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Longitude</label>
            <input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className={fieldClass(false)}
              placeholder="e.g. 78.3985"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Website / Social Media Links
          </label>
          <input
            name="website"
            value={formData.website}
            onChange={handleChange}
            className={fieldClass("website")}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCancel}
        className="mt-5 w-full min-h-[44px] text-gray-500 text-sm"
      >
        Clear form
      </button>
    </div>
  );
};

export default LocationAccessibility;
