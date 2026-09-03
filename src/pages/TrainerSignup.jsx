import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  User,
  ChevronDown,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  MapPin,
  Shield,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentUserLocation } from "../utils/location";
export default function TrainerSignup() {
  const navigate = useNavigate();
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

  // ✅ ADD THIS (Storage instance)
  const storage = getStorage();

  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);

  const profileInputRef = useRef(null);
  const certificateInputRef = useRef(null);

  // ✅ Loading state (if not already there)
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [profileFile, setProfileFile] = useState(null);
  const categoryRef = useRef(null);
  const [showCategory, setShowCategory] = useState(false);
  const subCategoryRef = useRef(null);
  const [showSubCategory, setShowSubCategory] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    designation: "",
    dob: "",
    category: "",
    subCategory: "",
    experience: "",
    city: "",
    state: "",
    trainerName: "",
    trainerType: "",
    locationName: "",
    latitude: "",
    longitude: "",
    yearsExperience: "",
    phoneNumber: "",
    email: "",
    instituteName: "",
    password: "",
    confirmPassword: "",
  });
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;

    // Alphabets only
    if (name === "firstName" || name === "lastName" || name === "accountName") {
      updatedValue = value.replace(/[^A-Za-z ]/g, "");

      // ✅ Capitalize
      updatedValue = updatedValue.replace(/\b[a-z]/g, (char) =>
        char.toUpperCase(),
      );
    }

    // Organization & designation (allow letters + space + dot)

    if (name === "organization" || name === "designation") {
      updatedValue = value.replace(/[^A-Za-z ]/g, "");

      // ✅ Capitalize
      updatedValue = updatedValue.replace(/\b[a-z]/g, (char) =>
        char.toUpperCase(),
      );
    }
    if (name === "city" || name === "state") {
      updatedValue = value.replace(/[^A-Za-z ]/g, "");

      // ✅ Capitalize
      updatedValue = updatedValue.replace(/\b[a-z]/g, (char) =>
        char.toUpperCase(),
      );
    }

    // Experience → numbers only
    if (name === "experience" || name === "yearsExperience") {
      updatedValue = value.replace(/\D/g, "");
    }

    // Phone → Indian 10-digit mobile (strip +91 / 0)
    if (name === "phoneNumber") {
      let digits = String(value).replace(/\D/g, "");
      if (digits.startsWith("91") && digits.length >= 12) {
        digits = digits.slice(2);
      } else if (digits.startsWith("0") && digits.length === 11) {
        digits = digits.slice(1);
      }
      updatedValue = digits.slice(0, 10);
    }

    // Account Number → only numbers
    if (name === "accountNumber") {
      updatedValue = value.replace(/\D/g, "");
    }

    // IFSC → uppercase, max 11
    if (name === "ifscCode") {
      updatedValue = value.toUpperCase().slice(0, 11);
    }

    // Bank name → alphabets only
    if (name === "bankName") {
      updatedValue = value.replace(/[^A-Za-z ]/g, "");
    }

    // PF Details → numbers only
    if (name === "pfDetails") {
      updatedValue = value.replace(/\D/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };
  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;

    setFormData((prev) => ({
      ...prev,
      category: selectedCategory,
      subCategory: "",
    }));

    setAvailableSubCategories(subCategoryMap[selectedCategory] || []);
  };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file); // store file
      setProfilePreview(URL.createObjectURL(file)); // preview
    }
  };

  const uploadProfileToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    // ✅ Your Unsigned Preset
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
      setErrors((prev) => ({
        ...prev,
        profileImage: "Image upload failed. Try again.",
      }));
      return "";
    }
  };
  // Remove selected profile image
  const removeProfileImage = () => {
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview);
    }

    setProfileFile(null);
    setProfilePreview(null);

    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  // Remove one certificate
  const removeCertificate = (index) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));

    setErrors((prev) => ({
      ...prev,
      certifications: "",
    }));

    if (certificateInputRef.current) {
      certificateInputRef.current.value = "";
    }
  };
  const handleCertificateUpload = (e) => {
    const newFiles = Array.from(e.target.files);

    setCertifications((prev) => {
      const combined = [...prev, ...newFiles];

      if (combined.length > 3) {
        setErrors((prevErr) => ({
          ...prevErr,
          certifications: "Maximum 3 certifications allowed",
        }));
        return prev;
      }

      setErrors((prevErr) => ({
        ...prevErr,
        certifications: "",
      }));

      return combined;
    });

    e.target.value = "";
  };

  const validateStep = () => {
    let newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";

      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";

      if (!formData.organization.trim())
        newErrors.organization = "Organization is required";

      if (!formData.designation.trim())
        newErrors.designation = "Designation is required";

      if (!formData.dob) {
        newErrors.dob = "Date of birth is required";
      } else {
        const selectedDate = new Date(formData.dob);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          newErrors.dob = "Future date not allowed";
        }
      }

      if (!formData.category) newErrors.category = "Please select category";

      if (!formData.subCategory)
        newErrors.subCategory = "Please select sub category";

      if (!formData.experience.trim())
        newErrors.experience = "Experience is required";

      if (!profileFile) newErrors.profileImage = "Profile image is required";

      if (certifications.length === 0)
        newErrors.certifications = "Upload at least one certification";
    }

    if (step === 2) {
      if (!formData.phoneNumber)
        newErrors.phoneNumber = "Phone number is required";
      else if (formData.phoneNumber.length !== 10)
        newErrors.phoneNumber = "Enter a 10-digit mobile number";
      else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber))
        newErrors.phoneNumber = "Enter a valid Indian mobile number";

      if (!formData.email) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Enter valid email address";

      if (!formData.password) newErrors.password = "Password is required";
      else if (
        !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(formData.password)
      ) {
        newErrors.password =
          "Password must be 8+ characters, include 1 uppercase, 1 lowercase, and 1 number";
      }
      if (!formData.city.trim()) newErrors.city = "City is required";

      if (!formData.state.trim()) newErrors.state = "State is required";

      if (!formData.confirmPassword)
        newErrors.confirmPassword = "Confirm your password";
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (step === 1 && !agreed) {
      setErrors((prev) => ({
        ...prev,
        submit: "Please agree to Terms & Policies",
      }));
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) navigate("/");
    else setStep(step - 1);
  };
  const handleSubmit = async () => {
    if (loading) return;
    if (!validateStep()) return;

    if (!agreed) {
      setErrors((prev) => ({
        ...prev,
        submit: "Please agree to Terms & Policies",
      }));
      return;
    }

    if (!profileFile) {
      setErrors((prev) => ({
        ...prev,
        profileImage: "Profile image is required",
      }));
      return;
    }

    setLoading(true); // ✅ START LOADING

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      // ✅ Upload profile image
      const profileImageUrl = await uploadProfileToCloudinary(profileFile);

      if (!profileImageUrl) {
        throw new Error("Profile image upload failed");
      }

      // ✅ Upload certifications
      const certificationUrls = [];
      for (let file of certifications) {
        const url = await uploadProfileToCloudinary(file);
        if (url) certificationUrls.push(url);
      }

      const { instituteName, ...safeFormData } = formData;

      await setDoc(doc(db, "trainers", userCred.user.uid), {
        role: "trainer",
        status: "pending",

        profileImageUrl,
        certifications: certificationUrls,

        ...safeFormData,

        instituteName: formData.organization,

        agreements: {
          termsAndConditions: true,
          privacyPolicy: true,
          paymentPolicy: true,
          agreedAt: serverTimestamp(),
        },

        createdAt: serverTimestamp(),
      });

      alert("Trainer registered successfully!");
      navigate("/login?role=trainer");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        alert("This email is already registered. Please login.");
        navigate("/login?role=trainer");
      } else if (err.code === "auth/invalid-email") {
        alert("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
        alert("Password should be stronger.");
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: err.message || "Something went wrong",
        }));
      }
    } finally {
      setLoading(false); // ✅ STOP LOADING
    }
  };

  const inputClass =
    "h-12 px-4 border border-orange-300 rounded-xl bg-white outline-none focus:border-2 focus:border-orange-500 transition-all";

  const LOCATION_WAIT_MESSAGES = [
    "Please wait, fetching your location…",
    "Asking for GPS permission…",
    "Finding you on the map…",
    "Filling city and state…",
  ];

  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationWaitText, setLocationWaitText] = useState(
    LOCATION_WAIT_MESSAGES[0],
  );
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!fetchingLocation) return;
    setLocationWaitText(LOCATION_WAIT_MESSAGES[0]);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOCATION_WAIT_MESSAGES.length;
      setLocationWaitText(LOCATION_WAIT_MESSAGES[i]);
    }, 1600);
    return () => clearInterval(interval);
  }, [fetchingLocation]);

  const handleFetchLocation = async () => {
    setLocationError("");
    setFetchingLocation(true);
    try {
      const coords = await getCurrentUserLocation();
      if (!coords?.lat || !coords?.lng) {
        setLocationError(
          "We couldn’t access your location. Allow location access, or type city and state.",
        );
        return;
      }
      const { lat, lng } = coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await response.json();
      const address = data.address || {};
      setFormData((prev) => ({
        ...prev,
        city:
          address.city ||
          address.town ||
          address.village ||
          address.county ||
          prev.city,
        state: address.state || prev.state,
        locationName: data.display_name || prev.locationName,
        latitude: String(lat),
        longitude: String(lng),
      }));
    } catch (error) {
      console.error(error);
      setLocationError(
        "Could not fetch location. Please enter city and state manually.",
      );
    } finally {
      setFetchingLocation(false);
    }
  };

  // ⬇️ return ( … UI continues here )

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategory(false);
      }
      if (
        subCategoryRef.current &&
        !subCategoryRef.current.contains(e.target)
      ) {
        setShowSubCategory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-sm px-6">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-7 flex flex-col items-center animate-[fadeIn_.25s_ease]">
            {/* Animated Circle */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-orange-100"></div>

              <Loader2
                size={42}
                className="absolute inset-0 m-auto animate-spin text-orange-500"
              />
            </div>

            <h2 className="mt-6 text-xl font-bold text-gray-800">
              Creating Trainer Account
            </h2>

            <p className="text-sm text-gray-500 text-center mt-2 leading-6">
              Please wait while we securely create your account and upload your
              documents.
            </p>

            {/* Progress */}
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full animate-pulse w-3/4"></div>
            </div>

            <div className="flex items-center gap-2 mt-5 text-green-600 text-sm font-medium">
              <CheckCircle2 size={18} />
              Secure Registration
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              This usually takes 5–15 seconds.
              <br />
              Please don't close this page.
            </p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex justify-center bg-[#FAFAFA] py-4 sm:py-6 md:py-10 overflow-x-hidden">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 rounded-md mt-1 sm:mt-4 mb-8 sm:mb-10">
          {/* HEADER */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-4 sm:mb-6 text-sm sm:text-base"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {/* HEADER SECTION */}
          <div className="bg-white border border-orange-100 rounded-3xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* LEFT : Upload Profile */}
            <div className="flex flex-col items-center mt-2 sm:mt-6">
              <div className="flex flex-col items-center mt-2 sm:mt-6">
                <div className="relative">
                  <div
                    onClick={() => profileInputRef.current.click()}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-200 flex items-center justify-center cursor-pointer overflow-hidden ring-4 ring-orange-50"
                  >
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
                    )}
                  </div>

                  {profilePreview && (
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <span className="text-xs sm:text-sm text-orange-500 font-medium mt-2">
                  Upload Profile
                </span>

                <input
                  type="file"
                  accept="image/*"
                  ref={profileInputRef}
                  className="hidden"
                  onChange={handleProfileUpload}
                />

                {errors.profileImage && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.profileImage}
                  </p>
                )}
              </div>

              <input
                type="file"
                ref={profileInputRef}
                className="hidden"
                onChange={handleProfileUpload}
              />

              {errors.profileImage && (
                <p className="text-red-500 text-xs mt-2 text-center break-words max-w-[200px]">
                  {errors.profileImage}
                </p>
              )}
            </div>

            {/* CENTER */}
            <div className="flex-1 flex flex-col items-center w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-500 text-center break-words px-2">
                Trainer Registration
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                {step === 1
                  ? "Tell us about you and your coaching"
                  : "Contact details and login"}
              </p>

              <p className="text-sm sm:text-md text-center mt-3 sm:mt-4 font-medium text-gray-700">
                Step {step} of 2
              </p>

              {/* PROGRESS BARS */}
              <div className="flex gap-2 sm:gap-4 mt-4 w-full max-w-[580px] px-2 sm:px-0">
                {[1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-2 sm:h-3 flex-1 rounded-full ${
                      step >= s ? "bg-orange-500" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT SPACER */}
            <div className="hidden md:block w-24" />
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="bg-white border border-orange-100 rounded-3xl p-4 sm:p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-2"
            >
              {[
                ["First Name*", "firstName"],
                ["Last Name*", "lastName"],
              ].map(([label, name]) => (
                <div key={name} className="flex flex-col gap-2 mb-1">
                  <label className="text-sm font-semibold break-words">
                    {label}
                  </label>

                  <input
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                      errors[name] ? "border-red-500" : ""
                    }`}
                  />

                  {errors[name] && (
                    <p className="text-red-500 text-xs mt-1 break-words">
                      {errors[name]}
                    </p>
                  )}
                </div>
              ))}

              {/* ORGANIZATION */}
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Add Association / Organization Name*
                </label>

                <input
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                    errors.organization ? "border-red-500" : ""
                  }`}
                />

                {errors.organization && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.organization}
                  </p>
                )}
              </div>

              {[
                ["Designation*", "designation"],
                ["Date Of Birth*", "dob", "date"],
              ].map(([label, name, type = "text"]) => (
                <div key={name} className="flex flex-col">
                  <label className="text-sm font-semibold mb-2 break-words">
                    {label}
                  </label>

                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    max={
                      name === "dob"
                        ? new Date().toISOString().split("T")[0]
                        : undefined
                    }
                    className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                      errors[name] ? "border-red-500" : ""
                    }`}
                  />

                  {errors[name] && (
                    <p className="text-red-500 text-xs mt-1 break-words">
                      {errors[name]}
                    </p>
                  )}
                </div>
              ))}

              {/* CATEGORY */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Select Category*
                </label>

                <div ref={categoryRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategory(!showCategory)}
                    className={`${inputClass} w-full flex justify-between items-center gap-2 overflow-hidden text-sm sm:text-base`}
                  >
                    <span className="truncate text-left flex-1">
                      {formData.category || "Select Category"}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`flex-shrink-0 transition-transform ${
                        showCategory ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showCategory && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
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
                              subCategoryMap[cat] || [],
                            );

                            setShowCategory(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm break-words"
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {errors.category && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.category}
                  </p>
                )}
              </div>

              {/* SUB CATEGORY */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Select Sub – Category*
                </label>

                <div ref={subCategoryRef} className="relative">
                  <button
                    type="button"
                    disabled={!formData.category}
                    onClick={() => setShowSubCategory(!showSubCategory)}
                    className={`${inputClass} w-full flex justify-between items-center gap-2 overflow-hidden text-sm sm:text-base ${
                      !formData.category ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="truncate text-left flex-1">
                      {formData.subCategory ||
                        (formData.category
                          ? "Select Sub Category"
                          : "Select Category First")}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`flex-shrink-0 transition-transform ${
                        showSubCategory ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showSubCategory && formData.category && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {availableSubCategories.map((sub) => (
                        <div
                          key={sub}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              subCategory: sub,
                            }));

                            setShowSubCategory(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-sm break-words"
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {errors.subCategory && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.subCategory}
                  </p>
                )}
              </div>

              {/* EXPERIENCE */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Experience*
                </label>

                <input
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  inputMode="numeric"
                  placeholder="Years of experience"
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                    errors.experience ? "border-red-500" : ""
                  }`}
                />

                {errors.experience && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.experience}
                  </p>
                )}
              </div>

              {/* CERTIFICATIONS */}
              <div className="flex flex-col relative">
                <label className="text-sm font-semibold mb-2 break-words">
                  Upload Certification* / License Number
                </label>

                <input
                  readOnly
                  value={
                    certifications.length
                      ? `${certifications.length} file(s) selected`
                      : ""
                  }
                  placeholder="Upload certification or licence images"
                  className={`${inputClass} w-full min-w-0 pr-12 truncate text-xs sm:text-sm`}
                />

                <button
                  type="button"
                  onClick={() => certificateInputRef.current.click()}
                  className="absolute right-3 top-[38px] sm:top-[36px] w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"
                  aria-label="Upload certification"
                >
                  <Upload size={16} />
                </button>

                <input
                  type="file"
                  ref={certificateInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleCertificateUpload}
                />

                <p className="text-xs text-gray-500 mt-1 break-words">
                  Upload certification or licence images (1–3 only)
                </p>
                {certifications.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {certifications.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-24 object-cover rounded-lg border"
                        />

                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.certifications && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.certifications}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="bg-white border border-orange-100 rounded-3xl p-4 sm:p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2"
            >
              {/* PHONE */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Phone Number*
                </label>
                <div
                  className={`flex items-center h-12 rounded-xl border bg-white overflow-hidden ${
                    errors.phoneNumber
                      ? "border-red-500"
                      : "border-orange-300 focus-within:border-2 focus-within:border-orange-500"
                  }`}
                >
                  <span className="shrink-0 pl-3 pr-2 text-sm font-semibold text-gray-600 border-r border-orange-200">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    onChange={handleChange}
                    className="flex-1 min-w-0 h-full px-3 outline-none bg-transparent text-base"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formData.phoneNumber.length}/10 digits
                </p>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFetchLocation}
                  disabled={fetchingLocation}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-70 w-full sm:w-auto sm:self-start"
                >
                  <MapPin size={16} />
                  {fetchingLocation
                    ? "Fetching location…"
                    : "Use current location"}
                </button>
                {locationError && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {locationError}
                  </p>
                )}
                {formData.latitude && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    Location saved · {formData.city || "City"}
                    {formData.state ? `, ${formData.state}` : ""}
                  </p>
                )}
              </div>

              {/* CITY */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  City*
                </label>

                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                    errors.city ? "border-red-500" : ""
                  }`}
                />

                {errors.city && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.city}
                  </p>
                )}
              </div>

              {/* STATE */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  State*
                </label>

                <input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base ${
                    errors.state ? "border-red-500" : ""
                  }`}
                />

                {errors.state && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.state}
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Add E – Mail Id*
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  autoComplete="email"
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base`}
                />

                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Create Password*
                </label>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  autoComplete="new-password"
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base`}
                />

                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2 break-words">
                  Re – Enter Password*
                </label>

                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  autoComplete="new-password"
                  onChange={handleChange}
                  className={`${inputClass} w-full min-w-0 text-sm sm:text-base`}
                />

                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 break-words">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* LOGIN */}
              <div className="col-span-1 md:col-span-2 text-sm mt-2 break-words">
                Already have an account?{" "}
                <span
                  className="text-orange-500 cursor-pointer font-medium"
                  onClick={() => navigate("/login")}
                >
                  Login
                </span>
              </div>
            </motion.div>
          )}

          {/* AGREEMENT */}
          <div className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 mt-5 leading-relaxed bg-white border border-orange-100 rounded-2xl p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 flex-shrink-0 w-4 h-4 accent-orange-500"
            />

            <p className="break-words">
              I agree to the{" "}
              <span
                onClick={() => navigate("/terms")}
                className="text-blue-600 underline cursor-pointer"
              >
                Terms & Conditions
              </span>
              ,{" "}
              <span
                onClick={() => navigate("/privacy")}
                className="text-blue-600 underline cursor-pointer"
              >
                Privacy Policy
              </span>
              ,{" "}
              <span
                onClick={() => navigate("/paymentpolicy")}
                className="text-blue-600 underline cursor-pointer"
              >
                Payment & Merchant Policy
              </span>
              .
            </p>
          </div>

          {/* SUBMIT ERROR */}
          {errors.submit && (
            <p className="text-red-500 text-sm text-right mb-3 mt-3 break-words">
              {errors.submit}
            </p>
          )}

          {/* BUTTONS */}
          <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 mt-6 bg-white/95 backdrop-blur border-t border-orange-100 px-4 py-3 sm:static sm:bg-transparent sm:border-0 sm:p-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-0">
            <button
              onClick={handleBack}
              className="min-h-[44px] text-orange-500 font-semibold text-sm sm:text-base"
            >
              Back
            </button>

            {step < 2 && (
              <button
                onClick={handleNext}
                className="min-h-[44px] bg-orange-500 text-white px-8 py-2.5 rounded-xl font-semibold text-sm sm:text-base hover:bg-orange-600"
              >
                Next
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!agreed || loading}
                className={`min-h-[44px] bg-orange-500 text-white px-8 py-2.5 rounded-xl font-semibold text-sm sm:text-base
              ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-orange-600"
              }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {fetchingLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-[#1a1208]/55 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center text-center"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="text-orange-500" size={28} />
                </div>
              </div>
              <h2 className="mt-6 text-xl font-bold text-gray-800">
                Please wait
              </h2>
              <p className="text-sm text-gray-500 mt-2 min-h-[40px]">
                {locationWaitText}
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-5 overflow-hidden">
                <motion.div
                  className="h-full bg-orange-500 rounded-full"
                  initial={{ width: "18%" }}
                  animate={{ width: ["18%", "78%", "42%", "88%"] }}
                  transition={{ duration: 4.5, repeat: Infinity }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
                <Shield size={12} />
                Used only to fill your city and state
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
