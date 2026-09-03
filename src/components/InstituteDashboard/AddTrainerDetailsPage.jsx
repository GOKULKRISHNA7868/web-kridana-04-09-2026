import React, { useState, useRef, useEffect } from "react";

import {
  setDoc,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, secondaryAuth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { User, ChevronDown } from "lucide-react";
import { DEFAULT_TRAINER_ACCESS } from "../../utils/trainerAccess";

/* -------------------- STYLES -------------------- */

const inputClass =
  "h-12 w-full min-h-[48px] px-3.5 border border-orange-300 rounded-xl bg-white text-[16px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

const DEFAULT_PASSWORD = "123456";

/* -------------------- COMPONENT -------------------- */
export default function AddTrainerDetailsPage() {
  const [saving, setSaving] = useState(false);
  const { user, institute } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const categoryRef = useRef(null);
  const subCategoryRef = useRef(null);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  /* -------------------- REFS -------------------- */
  const profileInputRef = useRef(null);
  const certificateInputRef = useRef(null);
  const aadharInputRef = useRef(null);
  const [nextLoading, setNextLoading] = useState(false);

  const categories = [
    "Martial Arts",
    "Team Ball Sports",
    "Racket Sports",
    "Fitness",
    "Target & Precision Sports",
    "Equestrian Sports",
    "Adventure & Outdoor Sports",
    "Ice Sports",
    "Aquatic Sports",
    "Wellness",
    "Dance",
  ];

  const subCategoryMap = {
    "Martial Arts": [
      "Karate",
      "Kung Fu",
      "Krav Maga",
      "Muay Thai",
      "Taekwondo",
      "Judo",
      "Brazilian Jiu-Jitsu",
      "Aikido",
      "Jeet Kune Do",
      "Capoeira",
      "Sambo",
      "Silat",
      "Kalaripayattu",
      "Hapkido",
      "Wing Chun",
      "Shaolin",
      "Ninjutsu",
      "Kickboxing",
      "Boxing",
      "Wrestling",
      "Shorinji Kempo",
      "Kyokushin",
      "Goju-ryu",
      "Shotokan",
      "Wushu",
      "Savate",
      "Lethwei",
      "Bajiquan",
      "Hung Gar",
      "Praying Mantis Kung Fu",
    ],
    "Team Ball Sports": [
      "Football / Soccer",
      "Basketball",
      "Handball",
      "Rugby",
      "Futsal",
      "Field Hockey",
      "Lacrosse",
      "Gaelic Football",
      "Volleyball",
      "Beach Volleyball",
      "Sepak Takraw",
      "Roundnet (Spikeball)",
      "Netball",
      "Cricket",
      "Baseball",
      "Softball",
      "Wheelchair Rugby",
      "Dodgeball",
      "Korfball",
    ],
    "Racket Sports": [
      "Tennis",
      "Table Tennis",
      "Badminton",
      "Squash",
      "Racquetball",
      "Padel",
      "Pickleball",
      "Platform Tennis",
      "Real Tennis",
      "Soft Tennis",
      "Frontenis",
      "Speedminton (Crossminton)",
      "Paddle Tennis (POP Tennis)",
      "Speed-ball",
      "Chaza",
      "Totem Tennis (Swingball)",
      "Matkot",
      "Jombola",
    ],
    Fitness: [
      "Gym Workout",
      "Weight Training",
      "Bodybuilding",
      "Powerlifting",
      "CrossFit",
      "Calisthenics",
      "Circuit Training",
      "HIIT",
      "Functional Training",
      "Core Training",
      "Mobility Training",
      "Stretching",
      "Resistance Band Training",
      "Kettlebell Training",
      "Boot Camp Training",
      "Spinning",
      "Step Fitness",
      "Pilates",
      "Yoga",
    ],
    "Target & Precision Sports": [
      "Archery",
      "Golf",
      "Bowling",
      "Darts",
      "Snooker",
      "Pool",
      "Billiards",
      "Target Shooting",
      "Clay Pigeon Shooting",
      "Air Rifle Shooting",
      "Air Pistol Shooting",
      "Croquet",
      "Petanque",
      "Bocce",
      "Lawn Bowls",
      "Carom Billiards",
      "Nine-Pin Bowling",
      "Disc Golf",
      "Kubb",
      "Pitch and Putt",
      "Shove Ha’penny",
      "Toad in the Hole",
      "Bat and Trap",
      "Boccia",
      "Gateball",
    ],
    "Equestrian Sports": [
      "Horse Racing",
      "Barrel Racing",
      "Rodeo",
      "Mounted Archery",
      "Tent Pegging",
    ],
    "Adventure & Outdoor Sports": [
      "Rock Climbing",
      "Mountaineering",
      "Trekking",
      "Hiking",
      "Mountain Biking",
      "Sandboarding",
      "Orienteering",
      "Obstacle Course Racing",
      "Skydiving",
      "Paragliding",
      "Hang Gliding",
      "Parachuting",
      "Hot-air Ballooning",
      "Skiing",
      "Snowboarding",
      "Ice Climbing",
      "Heli-skiing",
      "Bungee Jumping",
      "BASE Jumping",
      "Canyoning",
      "Kite Buggy",
      "Zorbing",
      "Zip Lining",
    ],
    "Aquatic Sports": [
      "Swimming",
      "Water Polo",
      "Surfing",
      "Scuba Diving",
      "Snorkeling",
      "Freediving",
      "Kayaking",
      "Canoeing",
      "Rowing",
      "Sailing",
      "Windsurfing",
      "Kite Surfing",
      "Jet Skiing",
      "Wakeboarding",
      "Water Skiing",
      "Stand-up Paddleboarding",
      "Whitewater Rafting",
      "Dragon Boat Racing",
      "Artistic Swimming",
      "Open Water Swimming",
    ],
    "Ice Sports": [
      "Ice Skating",
      "Figure Skating",
      "Ice Hockey",
      "Speed Skating",
      "Ice Dance",
      "Synchronized Skating",
      "Curling",
      "Broomball",
      "Bobsleigh",
      "Skiboarding",
      "Ice Dragon Boat Racing",
      "Ice Cross Downhill",
    ],
    Wellness: [
      "Yoga & Meditation",
      "Spa & Relaxation",
      "Mental Wellness",
      "Fitness",
      "Nutrition",
      "Traditional & Alternative Therapies",
      "Rehabilitation",
      "Lifestyle Coaching",
    ],
    Dance: [
      "Bharatanatyam",
      "Kathak",
      "Kathakali",
      "Kuchipudi",
      "Odissi",
      "Mohiniyattam",
      "Manipuri",
      "Sattriya",
      "Chhau",
      "Yakshagana",
      "Lavani",
      "Ghoomar",
      "Kalbelia",
      "Garba",
      "Dandiya Raas",
      "Bhangra",
      "Bihu",
      "Dollu Kunitha",
      "Theyyam",
      "Ballet",
      "Contemporary",
      "Hip Hop",
      "Breakdance",
      "Jazz Dance",
      "Tap Dance",
      "Modern Dance",
      "Street Dance",
      "House Dance",
      "Locking",
      "Popping",
      "Krumping",
      "Waacking",
      "Voguing",
      "Salsa",
      "Bachata",
      "Merengue",
      "Cha-Cha",
      "Rumba",
      "Samba",
      "Paso Doble",
      "Jive",
      "Tango",
      "Waltz",
      "Foxtrot",
      "Quickstep",
      "Flamenco",
      "Irish Stepdance",
      "Scottish Highland Dance",
      "Morris Dance",
      "Hula",
      "Maori Haka",
      "African Tribal Dance",
      "Zumba",
      "K-Pop Dance",
      "Shuffle Dance",
      "Electro Dance",
      "Pole Dance",
      "Ballroom Dance",
      "Line Dance",
      "Square Dance",
      "Folk Dance",
      "Contra Dance",
    ],
  };
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [profilePreview, setProfilePreview] = useState(null);
  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  /* -------------------- FORM DATA -------------------- */
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    designation: "",
    dateOfBirth: "",
    category: "",
    subCategory: "",
    experience: "",

    phone: "",
    email: "",
    monthlySalary: "",
    lpa: "",

    bankName: "",
    accountName: "",
    ifscCode: "",
    accountNumber: "",
    pfDetails: "",
    upiDetails: "",

    certificates: [],
    aadharFiles: [],
  });

  /* -------------------- CLOUDINARY UPLOAD -------------------- */
  /* -------------------- CLOUDINARY UPLOAD -------------------- */

  const uploadProfileToCloudinary = async (file) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "kirdana");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (!data.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      alert("Image upload failed!");
      return "";
    }
  };

  const uploadCertificatesToCloudinary = async (files) => {
    const urls = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "kirdana");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        {
          method: "POST",
          body: fd,
        },
      );

      const data = await res.json();
      urls.push(data.secure_url);
    }

    return urls;
  };

  const uploadAadharToCloudinary = async (files) => {
    const urls = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "kirdana");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        {
          method: "POST",
          body: fd,
        },
      );

      const data = await res.json();
      urls.push(data.secure_url);
    }

    return urls;
  };

  /* -------------------- UPLOAD HANDLERS -------------------- */

  const handleCertificateChange = (e) => {
    const newFiles = Array.from(e.target.files);

    setFormData((prev) => {
      const combined = [...prev.certificates, ...newFiles];

      if (combined.length > 3) {
        alert("Maximum 3 certifications allowed");
        return prev;
      }

      return {
        ...prev,
        certificates: combined,
      };
    });

    e.target.value = null; // allow reselect
  };

  const handleAadharUpload = (e) => {
    const newFiles = Array.from(e.target.files);

    setFormData((prev) => {
      const combined = [...prev.aadharFiles, ...newFiles];

      if (combined.length > 2) {
        alert("You can upload only up to 2 Aadhaar images");
        return prev;
      }

      return {
        ...prev,
        aadharFiles: combined,
      };
    });

    e.target.value = null;
  };
  const removeCertificate = (index) => {
    setFormData((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index),
    }));

    if (certificateInputRef.current) {
      certificateInputRef.current.value = "";
    }
  };
  const formatName = (value) => {
    return value
      .toLowerCase()
      .replace(/[^a-z.\s]/g, "") // allow letters + dot + space
      .split(" ")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
      .join(" ");
  };

  /* -------------------- VALIDATION -------------------- */
  const validateStep = () => {
    let newErrors = {};
    const cleanPhone = formData.phone.replace(/\D/g, "");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[A-Za-z]+$/;
    const designationRegex = /^[A-Za-z\s]+$/;

    if (step === 1) {
      // Required fields
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";

      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";

      if (!formData.designation.trim())
        newErrors.designation = "Designation is required";

      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of birth is required";

      if (!formData.category) newErrors.category = "Category is required";

      if (!formData.subCategory)
        newErrors.subCategory = "Sub category is required";

      if (!formData.experience.trim())
        newErrors.experience = "Experience is required";

      if (!formData.email.trim()) newErrors.email = "Email is required";

      if (!formData.phone) newErrors.phone = "Phone number is required";

      // Format validations
      if (formData.firstName && !nameRegex.test(formData.firstName))
        newErrors.firstName = "Only letters allowed";
      if (formData.middleName && !nameRegex.test(formData.middleName))
        newErrors.middleName = "Only letters allowed";

      if (formData.lastName && !nameRegex.test(formData.lastName))
        newErrors.lastName = "Only letters allowed";

      if (formData.designation && !designationRegex.test(formData.designation))
        newErrors.designation = "Only letters allowed";

      if (formData.experience && !/^[0-9]+$/.test(formData.experience))
        newErrors.experience = "Only numbers allowed";

      if (cleanPhone && cleanPhone.length !== 10)
        newErrors.phone = "Phone must be 10 digits";

      if (formData.email && !emailRegex.test(formData.email))
        newErrors.email = "Invalid email format";

      const dobYear = formData.dateOfBirth?.split("-")[0];
      if (dobYear && dobYear.length !== 4)
        newErrors.dateOfBirth = "Year must be 4 digits";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (step === 2) {
      return true;
    }
  };

  /* -------------------- NAV -------------------- */
  const handleNext = async () => {
    setNextLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!validateStep()) {
      setNextLoading(false);
      return;
    }

    setStep(2);

    setTimeout(() => {
      setNextLoading(false);
    }, 100);
  };

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep(step - 1);
  };

  /* -------------------- SUBMIT -------------------- */

  // 🔐 Auto-generate trainer email (hidden from user)
  const autoEmail = `trainer_${Date.now()}@kridana.com`;
  const resetForm = () => {
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "",
      designation: "",
      dateOfBirth: "",
      category: "",
      subCategory: "",
      experience: "",
      phone: "",
      email: "", // ✅ ADD THIS
      monthlySalary: "",
      lpa: "",
      bankName: "",
      accountName: "",
      ifscCode: "",
      accountNumber: "",
      pfDetails: "",
      upiDetails: "",
      certificates: [],
      aadharFiles: [],
    });

    setProfilePreview(null);
    setAvailableSubCategories([]);
    setStep(1);
  };
  const handleSubmit = async () => {
    console.log("Submitting form", formData);
    if (!validateStep()) return;

    if (!profilePreview) {
      alert("Please upload profile image");
      return;
    }

    try {
      setSaving(true); // 🔥 START LOADING

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        DEFAULT_PASSWORD,
      );

      const trainerUid = cred.user.uid;

      const profileUrl = await uploadProfileToCloudinary(
        profileInputRef.current.files[0],
      );

      const certificateUrls = await uploadCertificatesToCloudinary(
        formData.certificates,
      );

      let aadharUrls = [];
      if (formData.aadharFiles?.length) {
        aadharUrls = await uploadAadharToCloudinary(formData.aadharFiles);
      }

      const cleanedData = Object.fromEntries(
        Object.entries({
          ...formData,
          certificates: certificateUrls,
          aadharFiles: aadharUrls,
          profileImageUrl: profileUrl || "",
          trainerUid,
          instituteId: user?.uid || "",
          role: "trainer",
          access: { ...DEFAULT_TRAINER_ACCESS },
          createdAt: serverTimestamp(),
        }).filter(([_, value]) => value !== undefined),
      );

      await setDoc(doc(db, "InstituteTrainers", trainerUid), cleanedData);

      await updateDoc(doc(db, "institutes", user.uid), {
        trainers: arrayUnion(trainerUid),
      });

      alert("Trainer created successfully");
      resetForm();
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert(err.message);
    } finally {
      setSaving(false); // 🔥 STOP LOADING (IMPORTANT)
    }
  };
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }

      if (
        subCategoryRef.current &&
        !subCategoryRef.current.contains(e.target)
      ) {
        setShowSubCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen flex justify-center bg-[#F7F8FB] pt-2 pb-[calc(var(--bottom-navbar-height,64px)+88px)] px-3 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="w-full max-w-6xl">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 mb-8 text-center lg:text-left">
          {/* PROFILE */}
          {/* LEFT : Upload Profile */}
          <div className="flex flex-col items-center mt-6 w-full lg:w-auto">
            <div
              onClick={() => profileInputRef.current.click()}
              className="w-24 h-24 rounded-full bg-orange-200 flex items-center justify-center cursor-pointer overflow-hidden"
            >
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-orange-600" />
              )}
            </div>

            {/* TEXT BELOW CIRCLE */}
            <span className="text-sm text-orange-500 font-medium mt-2">
              Upload Profile
            </span>

            <input
              type="file"
              ref={profileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleProfileUpload}
            />
          </div>

          {/* TITLE */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-500">
              Employee Registration
            </h2>
            <p className="mt-2 text-sm text-gray-500">Step {step} of 2</p>

            <div className="flex gap-4 mt-4 w-full max-w-xl">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-3 flex-1 rounded-full ${
                    step >= s ? "bg-orange-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <div />
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
            {/* Full Name */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                First Name<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstName: formatName(e.target.value),
                  })
                }
              />
              {errors.firstName && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.firstName}
                </span>
              )}
            </div>
            {/* Middle Name */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Middle Name</label>
              <input
                className={inputClass}
                value={formData.middleName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    middleName: formatName(e.target.value),
                  })
                }
              />
            </div>

            {/* Last Name */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Last Name<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastName: formatName(e.target.value),
                  })
                }
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Gender<span className="text-red-500">*</span>
              </label>

              <select
                className={inputClass}
                value={formData.gender}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gender: e.target.value,
                  }))
                }
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Others</option>
              </select>

              {errors.gender && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.gender}
                </span>
              )}
            </div>

            {/* Designation */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Designation<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.designation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    designation: formatName(e.target.value),
                  })
                }
              />
              {errors.designation && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.designation}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Date Of Birth<span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                className={inputClass}
                min="1900-01-01"
                max={new Date().toISOString().split("T")[0]}
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dateOfBirth: e.target.value,
                  }))
                }
              />

              {errors.dateOfBirth && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.dateOfBirth}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={inputClass}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            {/* Phone Number */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Phone Number<span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className={inputClass}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    setFormData({ ...formData, phone: value });
                  }
                }}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Select Category */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Category<span className="text-red-500">*</span>
              </label>
              <div ref={categoryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`${inputClass} w-full flex items-center justify-between text-left`}
                >
                  <span>
                    {formData.category ? formData.category : "Select Category"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`ml-2 flex-shrink-0 transition-transform ${
                      showCategoryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute z-50 mt-1 w-full left-0 bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            category: cat,
                            subCategory: "",
                          }));

                          setAvailableSubCategories(
                            subCategoryMap[cat] ? [...subCategoryMap[cat]] : [],
                          );

                          setShowSubCategoryDropdown(false);
                          setShowCategoryDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Select Sub Category */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Sub – Category<span className="text-red-500">*</span>
              </label>
              <div ref={subCategoryRef} className="relative">
                <button
                  type="button"
                  disabled={!formData.category}
                  onClick={() =>
                    formData.category &&
                    setShowSubCategoryDropdown(!showSubCategoryDropdown)
                  }
                  className={`${inputClass} w-full flex items-center justify-between text-left ${
                    !formData.category && "bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <span>
                    {formData.subCategory
                      ? formData.subCategory
                      : formData.category
                      ? "Select Sub Category"
                      : "Select Category First"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`ml-2 flex-shrink-0 transition-transform ${
                      showSubCategoryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showSubCategoryDropdown && (
                  <div className="absolute z-50 mt-1 w-full left-0 bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {availableSubCategories.length > 0 &&
                      availableSubCategories.map((sub) => (
                        <div
                          key={sub}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              subCategory: sub,
                            }));
                            setShowSubCategoryDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        >
                          {sub}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {errors.subCategory && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.subCategory}
                </p>
              )}
            </div>

            {/* Experience */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Experience<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.experience}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, experience: value });
                }}
              />
              {errors.experience && (
                <p className="text-red-500 text-xs mt-1">{errors.experience}</p>
              )}
            </div>

            {/* Upload Certification (optional) */}
            <div className="flex flex-col md:col-span-2">
              <label className="text-sm font-semibold mb-2">
                Upload Certification{" "}
                <span className="text-gray-400 font-medium">(Optional)</span>
              </label>

              <div className="relative w-full">
                <input
                  readOnly
                  value={
                    formData.certificates.length
                      ? `${formData.certificates.length}/3 file(s) selected`
                      : ""
                  }
                  placeholder="Add certificate or license images (optional)"
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => certificateInputRef.current.click()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"
                >
                  <img src="/upload.png" alt="upload" className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can skip this and add certificates later. Max 3 images.
              </p>

              <input
                type="file"
                multiple
                ref={certificateInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCertificateChange}
              />

              {/* Selected Images */}
              {formData.certificates.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.certificates.map((file, index) => (
                    <div
                      key={index}
                      className="relative border rounded-lg overflow-hidden"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`certificate-${index}`}
                        className="w-full h-28 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                      >
                        ✕
                      </button>

                      <p className="text-xs p-2 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-2 bg-white rounded-2xl border border-orange-100 shadow-sm p-4 sm:p-6">
            {/* AADHAR */}
            {/* Aadhaar Upload */}
            <div className="col-span-2 flex flex-col">
              <label className="text-sm font-semibold mb-4">
                Aadhaar Front & Back Photos (Optional)
              </label>

              <div className="relative w-full">
                <input
                  readOnly
                  value={
                    formData.aadharFiles.length
                      ? `${formData.aadharFiles.length}/2 image(s) selected`
                      : ""
                  }
                  placeholder="Upload Aadhaar images"
                  className={`${inputClass} w-full pr-12`}
                />

                <button
                  type="button"
                  onClick={() => aadharInputRef.current.click()}
                  className="absolute right-3 top-1/2 -translate-y-1/2
  w-8 h-8 flex items-center justify-center bg-white"
                >
                  <img
                    src="/upload.png"
                    alt="upload"
                    className="w-6 h-6 object-contain"
                  />
                </button>

                <input
                  type="file"
                  ref={aadharInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleAadharUpload}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                You can upload 1 or 2 images (maximum 2)
              </p>
            </div>

          </div>
        )}
      </div>

      <div
        className="fixed left-0 right-0 z-[40] bg-white/95 backdrop-blur-md border-t border-orange-100"
        style={{
          bottom: "var(--bottom-navbar-height, 64px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[48px] px-4 text-orange-500 font-semibold"
            >
              Back
            </button>
          ) : (
            <div className="hidden sm:block flex-1" />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={nextLoading}
              className={`ml-auto w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-semibold text-white ${
                nextLoading
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-500"
              }`}
            >
              {nextLoading ? "Loading..." : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`ml-auto w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-semibold text-white ${
                saving
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-500"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
