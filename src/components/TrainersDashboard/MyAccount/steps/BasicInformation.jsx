import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";
import { User, Camera } from "lucide-react";
import StepHeader from "../StepHeader";
import {
  CATEGORIES,
  SUB_CATEGORY_MAP,
} from "../../../InstituteDashboard/MyAccount/sportCategories";

const TRAINER_TYPES = [
  "Independent Trainer",
  "Institution",
  "Sports Academy",
  "Fitness Center",
  "Dance Academy",
  "Wellness Center",
  "Martial Arts Academy",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 80 }, (_, i) => String(currentYear - i));

const fieldClass = (hasError) =>
  `w-full min-h-[48px] text-base rounded-xl border ${
    hasError ? "border-red-500" : "border-gray-200"
  } bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`;

const SHORT_MAX = 200;
const SPORT_DESC_MAX = 2000;

const normalizePhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
};

const emptyCategoryBlock = () => ({
  category: "",
  sports: [],
});

const normalizeCategoryBlocks = (categories = {}, sportDetails = {}) => {
  const entries = Object.entries(categories || {});
  if (!entries.length) return [emptyCategoryBlock()];

  return entries.map(([cat, subs]) => {
    const names = Array.isArray(subs)
      ? subs
      : subs && typeof subs === "object"
        ? Object.keys(subs)
        : [];

    return {
      category: cat,
      sports: names.map((name) => ({
        name,
        shortDescription: String(
          sportDetails?.[cat]?.[name]?.shortDescription || "",
        ).slice(0, SPORT_DESC_MAX),
      })),
    };
  });
};

const BasicInformation = ({ setStep, onSaved }) => {
  const { user } = useAuth();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    trainerName: "",
    institutionName: "",
    establishedYear: "",
    type: "",
    logo: "",
    headCoach: "",
    tagline: "",
    about: "",
    phone: "",
    countryCode: "+91",
    email: "",
  });

  const [errors, setErrors] = useState({});
  const [categoryData, setCategoryData] = useState([emptyCategoryBlock()]);

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
            trainerName:
              data.trainerName && data.trainerName.trim() !== ""
                ? data.trainerName
                : data.firstName || "",
            institutionName:
              data.institutionName && data.institutionName.trim() !== ""
                ? data.institutionName
                : data.instituteName || data.organization || "",
            establishedYear: data.yearFounded
              ? String(data.yearFounded)
              : data.establishedYear
                ? String(data.establishedYear)
                : "",
            type:
              data.type && data.type.trim() !== ""
                ? data.type
                : data.organizationType || "",
            logo:
              data.logo && data.logo.trim() !== ""
                ? data.logo
                : data.profileImageUrl || "",
            headCoach:
              data.headCoach && data.headCoach.trim() !== ""
                ? data.headCoach
                : data.founderName || "",
            tagline: data.tagline || data.designation || "",
            about: data.about || data.description || "",
            phone: normalizePhone(data.phoneNumber),
            countryCode: data.countryCode || "+91",
            email: data.email || "",
          });

          setCategoryData(
            normalizeCategoryBlocks(data.categories, data.sportDetails),
          );
        } else {
          setCategoryData([emptyCategoryBlock()]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "establishedYear") {
      newValue = newValue.replace(/[^0-9]/g, "").slice(0, 4);
    }

    if (name === "phone") {
      newValue = normalizePhone(newValue);
    }

    if (name === "countryCode") {
      setFormData((prev) => ({ ...prev, countryCode: value }));
      return;
    }

    if (name === "tagline") {
      newValue = newValue.slice(0, SHORT_MAX);
    }

    const capitalizeFields = [
      "trainerName",
      "institutionName",
      "headCoach",
      "type",
    ];

    if (capitalizeFields.includes(name)) {
      if (["trainerName", "institutionName", "headCoach", "type"].includes(name)) {
        newValue = newValue.replace(/[^A-Za-z ]/g, "");
      }
      newValue = newValue.replace(/\b[a-z]/g, (char) => char.toUpperCase());
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validate = () => {
    let newErrors = {};
    const requiredFields = [
      "trainerName",
      "type",
      "logo",
      "headCoach",
      "tagline",
      "about",
    ];

    requiredFields.forEach((field) => {
      const value = formData[field];
      if (!value || String(value).trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    const hasValidCategory = categoryData.some(
      (block) => block.category && (block.sports || []).length > 0,
    );

    if (!hasValidCategory) {
      newErrors.sports = "Select at least one category and one subcategory";
    }

    const year = String(formData.establishedYear || "").trim();
    if (year) {
      if (!/^\d{4}$/.test(year)) {
        newErrors.establishedYear = "Enter valid 4 digit year";
      } else if (parseInt(year) > currentYear) {
        newErrors.establishedYear = "Year cannot be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategoryChange = (index, value) => {
    const updated = [...categoryData];
    updated[index] = { category: value, sports: [] };
    setCategoryData(updated);
  };

  const handleSubCategoryToggle = (index, sub) => {
    const updated = [...categoryData];
    const sports = updated[index].sports || [];
    const exists = sports.some((item) => item.name === sub);

    updated[index].sports = exists
      ? sports.filter((item) => item.name !== sub)
      : [...sports, { name: sub, shortDescription: "" }];

    setCategoryData(updated);
    setErrors((prev) => ({ ...prev, sports: "" }));
  };

  const handleSportDescription = (index, sportName, value) => {
    const updated = [...categoryData];
    updated[index].sports = (updated[index].sports || []).map((item) =>
      item.name === sportName
        ? { ...item, shortDescription: value.slice(0, SPORT_DESC_MAX) }
        : item,
    );
    setCategoryData(updated);
  };

  const addCategoryBlock = () => {
    setCategoryData((prev) => [...prev, emptyCategoryBlock()]);
  };

  const removeCategoryBlock = (index) => {
    const updated = categoryData.filter((_, i) => i !== index);
    setCategoryData(updated.length ? updated : [emptyCategoryBlock()]);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      alert("User not logged in");
      return;
    }

    if (!validate()) {
      alert("Please fill all required details correctly.");
      return;
    }

    try {
      setSaving(true);

      const formattedCategories = {};
      const sportDetails = {};

      categoryData.forEach((block) => {
        if (!block.category || !(block.sports || []).length) return;
        formattedCategories[block.category] = block.sports.map((item) => item.name);
        sportDetails[block.category] = {};
        block.sports.forEach((item) => {
          sportDetails[block.category][item.name] = {
            shortDescription: String(item.shortDescription || "")
              .trim()
              .slice(0, SPORT_DESC_MAX),
          };
        });
      });

      await setDoc(
        doc(db, "trainers", user.uid),
        {
          trainerName: formData.trainerName,
          instituteName: formData.institutionName,
          yearFounded: formData.establishedYear,
          organizationType: formData.type,
          profileImageUrl: formData.logo,
          categories: formattedCategories,
          sportDetails,
          founderName: formData.headCoach,
          designation: formData.tagline,
          description: formData.about,
          phoneNumber: formData.phone,
          countryCode: formData.countryCode || "+91",
          email: formData.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      onSaved?.("Basic Information");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      trainerName: "",
      institutionName: "",
      establishedYear: "",
      type: "",
      logo: "",
      headCoach: "",
      tagline: "",
      about: "",
      phone: "",
      countryCode: "+91",
      email: "",
    });
    setErrors({});
    setCategoryData([emptyCategoryBlock()]);
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kirdana");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        { method: "POST", body: data },
      );
      const result = await res.json();
      if (!result.secure_url) {
        throw new Error(result.error?.message || "Upload failed");
      }
      setFormData((prev) => ({ ...prev, logo: result.secure_url }));
      setErrors((prev) => ({ ...prev, logo: "" }));
    } catch (err) {
      alert("Logo upload failed: " + err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading...</p>;
  }

  const typeOptions = TRAINER_TYPES.includes(formData.type)
    ? TRAINER_TYPES
    : formData.type
      ? [formData.type, ...TRAINER_TYPES]
      : TRAINER_TYPES;

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Basic Information"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex flex-col items-center mb-5">
        <label className="relative cursor-pointer">
          {formData.logo ? (
            <img
              src={formData.logo}
              alt="Logo"
              className="w-20 h-20 rounded-full object-cover border-2 border-orange-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
              <User size={32} />
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center border-2 border-white">
            <Camera size={13} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={uploadLogo}
          />
        </label>
        <p className="text-sm font-semibold text-gray-900 mt-3">
          Basic Information
        </p>
        <p className="text-xs text-gray-500 mt-0.5 text-center">
          Add accurate details about your training profile.
        </p>
        {uploadingLogo && (
          <p className="text-xs text-orange-500 mt-1">Uploading logo...</p>
        )}
        {errors.logo && (
          <span className="text-red-500 text-xs mt-1">{errors.logo}</span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Trainer Name <span className="text-red-500">*</span>
          </label>
          <input
            name="trainerName"
            value={formData.trainerName}
            onChange={handleChange}
            className={fieldClass(errors.trainerName)}
            placeholder="Enter your name"
          />
          {errors.trainerName && (
            <span className="text-red-500 text-xs mt-1">{errors.trainerName}</span>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={fieldClass(errors.type)}
          >
            <option value="">Select type</option>
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.type && (
            <span className="text-red-500 text-xs mt-1">{errors.type}</span>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Institution / Academy Name
          </label>
          <input
            name="institutionName"
            value={formData.institutionName}
            onChange={handleChange}
            className={fieldClass(false)}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Established Year
          </label>
          <select
            name="establishedYear"
            value={formData.establishedYear}
            onChange={handleChange}
            className={fieldClass(errors.establishedYear)}
          >
            <option value="">Select year</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {errors.establishedYear && (
            <span className="text-red-500 text-xs mt-1">
              {errors.establishedYear}
            </span>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Head Coach Name <span className="text-red-500">*</span>
          </label>
          <input
            name="headCoach"
            value={formData.headCoach}
            onChange={handleChange}
            className={fieldClass(errors.headCoach)}
            placeholder="Enter name"
          />
          {errors.headCoach && (
            <span className="text-red-500 text-xs mt-1">{errors.headCoach}</span>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Mobile number
          </label>
          <div className="flex items-stretch gap-2">
            <select
              name="countryCode"
              value={formData.countryCode || "+91"}
              onChange={handleChange}
              className="h-12 w-[92px] shrink-0 rounded-xl border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+971">+971</option>
            </select>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              className="flex-1 min-w-0 min-h-[48px] text-base rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              placeholder="9876543210"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {formData.phone.length}/10 digits
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={fieldClass(false)}
            placeholder="trainer@email.com"
          />
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="font-semibold text-gray-900">About you</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Students see this on your public profile.
          </p>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-800 mb-1.5 block">
              Short description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="tagline"
              value={formData.tagline}
              onChange={handleChange}
              rows={3}
              maxLength={SHORT_MAX}
              className={`${fieldClass(errors.tagline)} min-h-[88px] resize-none`}
              placeholder="One or two lines about your training"
            />
            <div className="flex justify-between mt-1">
              {errors.tagline ? (
                <span className="text-red-500 text-xs">{errors.tagline}</span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  Shown on trainer cards
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formData.tagline.length}/{SHORT_MAX}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800 mb-1.5 block">
              About the trainer <span className="text-red-500">*</span>
            </label>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows={5}
              className={`${fieldClass(errors.about)} min-h-[120px] resize-none`}
              placeholder="Tell students about your experience and coaching style"
            />
            {errors.about && (
              <span className="text-red-500 text-xs mt-1">{errors.about}</span>
            )}
          </div>
        </section>

        <section>
          <p className="font-semibold text-gray-900">Sports you offer</p>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            Choose a category, tap sports, then add a short line for each sport.
          </p>

          {categoryData.map((block, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-2xl p-3.5 mb-3 bg-white"
            >
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={block.category}
                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                  className={fieldClass(false)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {categoryData.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCategoryBlock(index)}
                    className="w-11 h-11 shrink-0 text-red-500 font-bold"
                    aria-label="Remove category"
                  >
                    ✕
                  </button>
                )}
              </div>

              {block.category && (
                <>
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Select sports
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SUB_CATEGORY_MAP[block.category]?.map((sub) => {
                      const selected = (block.sports || []).some(
                        (item) => item.name === sub,
                      );
                      return (
                        <button
                          type="button"
                          key={sub}
                          onClick={() => handleSubCategoryToggle(index, sub)}
                          className={`min-h-[36px] px-3 rounded-full text-sm border ${
                            selected
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {(block.sports || []).length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-600">
                    Short description for each sport
                  </p>
                  {block.sports.map((sport) => (
                    <div
                      key={sport.name}
                      className="rounded-xl bg-gray-50 border border-gray-100 p-3"
                    >
                      <p className="text-sm font-semibold text-gray-900 mb-1.5">
                        {sport.name}
                      </p>
                      <textarea
                        rows={2}
                        maxLength={SPORT_DESC_MAX}
                        value={sport.shortDescription || ""}
                        onChange={(e) =>
                          handleSportDescription(
                            index,
                            sport.name,
                            e.target.value,
                          )
                        }
                        placeholder={`What students learn in ${sport.name}`}
                        className={`${fieldClass(false)} min-h-[140px] resize-y bg-white`}
                      />
                      <p className="text-[11px] text-gray-400 text-right mt-1">
                        {(sport.shortDescription || "").length}/{SPORT_DESC_MAX}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCategoryBlock}
            className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-orange-300 text-orange-500 text-sm font-semibold"
          >
            + Add another category
          </button>
          {errors.sports && (
            <span className="text-red-500 text-xs mt-2 block">
              {errors.sports}
            </span>
          )}
        </section>
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

export default BasicInformation;
