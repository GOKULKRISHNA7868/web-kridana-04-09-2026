import React, { useState, useEffect } from "react";
import { db } from "../../../../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAccountScope } from "../AccountScopeContext";
import { Building2 } from "lucide-react";
import StepHeader from "../StepHeader";

const COMMON_FACILITIES = [
  "Parking",
  "Changing Rooms",
  "Washrooms",
  "Drinking Water",
  "First Aid",
  "Indoor Hall",
  "Outdoor Ground",
  "AC / Cooling",
  "CCTV",
  "Equipment Provided",
];

const FacilitiesInfrastructure = ({ setStep, onSaved }) => {
  const { instituteId } = useAccountScope();
  const [facility, setFacility] = useState("");
  const [facilityTags, setFacilityTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "institutes", instituteId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setFacility(snap.data()?.facilitiesInfrastructure ?? "");
          setFacilityTags(snap.data()?.facilityTags ?? []);
        }
      } catch (error) {
        console.error("Load Error:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [instituteId]);

  const toggleTag = (tag) => {
    setFacilityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!instituteId) return;

    try {
      setSaving(true);
      const docRef = doc(db, "institutes", instituteId);

      await setDoc(
        docRef,
        {
          facilitiesInfrastructure: facility,
          facilityTags,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      onSaved?.("Facilities");
    } catch (error) {
      console.error("Save Error:", error);
      alert("Save Failed ❌");
    }

    setSaving(false);
  };

  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading...</p>;
  }

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Facilities"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <Building2 size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">Facilities</p>
        <p className="text-xs text-gray-500 mt-0.5 text-center">
          Highlight amenities available at your academy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {COMMON_FACILITIES.map((tag) => {
          const active = facilityTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`min-h-[40px] px-3 rounded-full text-sm border ${
                active
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <label className="text-sm font-medium mb-1.5 block">
        Additional Facilities & Infrastructure
      </label>
      <textarea
        placeholder="Add extra details about your facilities"
        value={facility}
        onChange={(e) => setFacility(e.target.value)}
        className="w-full min-h-[140px] p-4 text-base border border-gray-200 rounded-xl
                   focus:outline-none focus:ring-2 focus:ring-orange-100
                   focus:border-orange-500 resize-none"
      />
    </div>
  );
};

export default FacilitiesInfrastructure;
