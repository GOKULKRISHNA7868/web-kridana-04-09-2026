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
import { runTransaction } from "firebase/firestore";
import { db, secondaryAuth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { User, ChevronDown } from "lucide-react";
import { getDoc } from "firebase/firestore";
/* -------------------- STYLES -------------------- */
const inputClass =
  "h-12 min-h-[48px] px-3.5 w-full border border-orange-300 rounded-xl bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-[16px] appearance-none";

const DEFAULT_PASSWORD = "123456";

/* -------------------- COMPONENT -------------------- */
export default function AddTrainerDetailsPage() {
  const { user, institute } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const timeRef = useRef(null);
  const [createLogin, setCreateLogin] = useState(true);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const categoryRef = useRef(null);
  const subCategoryRef = useRef(null);
  const [registerNumber, setRegisterNumber] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  /* -------------------- REFS -------------------- */
  const profileInputRef = useRef(null);

  const aadharInputRef = useRef(null);
  const [showRelationPopup, setShowRelationPopup] = useState(false);
  const [relationType, setRelationType] = useState("");
  const [existingUid, setExistingUid] = useState("");

  const [usedInOtherInstitute, setUsedInOtherInstitute] = useState(null); // null → not answered yet
  const [instituteName, setInstituteName] = useState("");
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
  const belts = [
    "White",
    "Yellow",
    "Orange",
    "Blue",
    "Brown",
    "Black",
    "Green",
  ];
  const skillLevels = ["Beginner", "Intermediate", "Advance"];
  const [availableSubCategories, setAvailableSubCategories] = useState([]);
  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;

    setFormData((prev) => ({
      ...prev,
      category: selectedCategory,
      subCategory: "",
    }));

    setAvailableSubCategories(subCategoryMap[selectedCategory] || []);
  };

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
    lastName: "",
    gender: "",
    dateOfBirth: "",
    age: "",
    joiningDate: "",
    belt: "",
    skillLevel: "",
    category: "",
    subCategory: "",
    sessions: "",
    timings: "",
    phone: "",
    email: "",
    monthlyFee: "",
    monthlyDate: "",
    address: "",
    aadharFiles: [],
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  /* -------------------- UPLOAD HANDLERS -------------------- */

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

  /* -------------------- VALIDATION -------------------- */
  const validateStep = () => {
    let newErrors = {};
    const today = new Date();

    /* ================= STEP 1 VALIDATION ================= */
    if (step === 1) {
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";

      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";

      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of Birth is required";

      if (!formData.joiningDate)
        newErrors.joiningDate = "Joining date is required";

      if (formData.category === "Martial Arts" && !formData.belt)
        newErrors.belt = "Belt is required";

      if (formData.category !== "Martial Arts" && !formData.skillLevel)
        newErrors.skillLevel = "Skill level is required";

      if (!formData.category) newErrors.category = "Category is required";

      if (!formData.subCategory)
        newErrors.subCategory = "Sub Category is required";
      if (!registerNumber.trim()) {
        newErrors.registerNumber = "Register Number is required";
      }
      if (!formData.sessions) newErrors.sessions = "Session is required";

      if (!formData.timings) newErrors.timings = "Timings are required";

      if (!formData.phone) newErrors.phone = "Phone number is required";

      if (createLogin) {
        if (!formData.email) {
          newErrors.email = "Email is required";
        }

        if (
          formData.email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
          newErrors.email = "Invalid email format";
        }
      }

      /* FORMAT CHECKS */

      if (!/^[A-Za-z.\s]+$/.test(formData.firstName))
        newErrors.firstName =
          "First name can only contain letters, spaces, and dots";

      if (!/^[A-Za-z.\s]+$/.test(formData.lastName))
        newErrors.lastName =
          "Last name can only contain letters, spaces, and dots";

      if (formData.phone && !/^[0-9]{10}$/.test(formData.phone))
        newErrors.phone = "Phone must be 10 digits";

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = "Invalid email format";

      if (formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth);
        if (dob > today)
          newErrors.dateOfBirth = "Date of birth cannot be future";
      }

      if (formData.joiningDate) {
        const joining = formData.joiningDate;
        const dob = formData.dateOfBirth;

        if (new Date(joining) > today) {
          newErrors.joiningDate = "Joining date cannot be future";
        }

        // ✅ STRICT STRING COMPARISON (YYYY-MM-DD)
        if (dob && joining <= dob) {
          newErrors.joiningDate = "Joining date must be after DOB";
        }
      }
    }

    /* ================= STEP 2 VALIDATION ================= */
    if (step === 2) {
      if (!formData.monthlyFee)
        newErrors.monthlyFee = "Monthly Fee is required";
      if (!formData.monthlyDate)
        newErrors.monthlyDate = "Monthly payment date is required";

      if (!formData.address.trim()) newErrors.address = "Address is required";

      if (formData.monthlyDate) {
        const todayStr = new Date().toISOString().split("T")[0];

        if (formData.monthlyDate < todayStr) {
          newErrors.monthlyDate = "Monthly payment date cannot be past";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  /* -------------------- NAV -------------------- */
  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep(step - 1);
  };

  /* -------------------- SUBMIT -------------------- */

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      age: "",
      joiningDate: "",
      belt: "",
      category: "",
      subCategory: "",
      sessions: "",
      timings: "",
      phone: "",
      email: "",
      monthlyDate: "",
      address: "",
      aadharFiles: [],
    });
    setRegisterNumber("");
    setProfilePreview(null);
    setAvailableSubCategories([]);
    setStep(1);
  };

  const timeSlots = [
    { value: "09:00", label: "09:00 AM" },
    { value: "10:00", label: "10:00 AM" },
    { value: "11:00", label: "11:00 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "13:00", label: "01:00 PM" },
    { value: "14:00", label: "02:00 PM" },
    { value: "15:00", label: "03:00 PM" },
    { value: "16:00", label: "04:00 PM" },
    { value: "17:00", label: "05:00 PM" },
    { value: "18:00", label: "06:00 PM" },
    { value: "19:00", label: "07:00 PM" },
    { value: "20:00", label: "08:00 PM" },
    { value: "21:00", label: "09:00 PM" },
    { value: "22:00", label: "10:00 PM" },
  ];
  /* -------------------- CLOUDINARY UPLOADERS -------------------- */

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "kirdana"); // same preset
    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (!data.secure_url) throw new Error("Cloudinary upload failed");

      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Error:", err);
      return "";
    }
  };

  const uploadMultipleToCloudinary = async (files) => {
    const urls = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "kirdana"); // same preset

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dr0svrhu1/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (data.secure_url) {
        urls.push(data.secure_url);
      }
    }

    return urls;
  };

  // -------------------- HANDLE SUBMIT --------------------
  const handleSubmit = async () => {
    if (isSaving) return;

    if (!validateStep()) {
      alert("Please fill all required fields");
      return;
    }

    if (!profilePreview) {
      alert("Please upload profile image");
      return;
    }

    try {
      setIsSaving(true); // ✅ START LOADING

      let studentUid = "";
      let baseUid = "";
      const emailDocId = formData.email.replace(/\./g, "_");

      if (createLogin) {
        try {
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            formData.email,
            DEFAULT_PASSWORD,
          );

          studentUid = cred.user.uid;
          baseUid = studentUid;

          await setDoc(doc(db, "memory", emailDocId), {
            email: formData.email,
            uid: studentUid,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          if (err.code === "auth/email-already-in-use") {
            const snap = await getDoc(doc(db, "memory", emailDocId));

            if (!snap.exists()) {
              alert("Email exists but not found in memory");
              setIsSaving(false);
              return;
            }

            const existingBaseUid = snap.data().uid;

            setExistingUid(existingBaseUid);
            setShowRelationPopup(true);
            setIsSaving(false);
            return;
          } else {
            throw err;
          }
        }
      } else {
        // 🔥 NO LOGIN FLOW
        const randomId = Date.now(); // simple unique
        studentUid = `manual_${randomId}`;
        baseUid = studentUid;
      }

      /* ==============================
       🔹 CLOUDINARY UPLOADS
    ============================== */
      const { aadharFiles, ...rest } = formData;

      const profileFile = profileInputRef.current?.files?.[0];
      let profileImageUrl = "";
      if (profileFile) {
        profileImageUrl = await uploadImageToCloudinary(profileFile);
      }

      let aadharUrls = [];
      if (aadharFiles?.length) {
        aadharUrls = await uploadMultipleToCloudinary(aadharFiles);
      }

      /* ==============================
       🔹 SPORTS DATA
    ============================== */
      const sportData = {
        category: formData.category,
        subCategory: formData.subCategory,
        belt: formData.category === "Martial Arts" ? formData.belt : "",
        skillLevel:
          formData.category !== "Martial Arts" ? formData.skillLevel : "",
        sessions: formData.sessions,
        timings: formData.timings,
        fee: formData.monthlyFee,
      };

      /* ==============================
       🔹 FIRESTORE SAVE
    ============================== */
      await setDoc(doc(db, "trainerstudents", studentUid), {
        ...rest,
        registerNumber: registerNumber,
        sports: [sportData],
        aadharFilesCount: aadharFiles.length,
        profileImageUrl,
        aadharUrls,
        studentUid,
        trainerId: user.uid,
        role: "student",
        baseUid: baseUid,
        relation: "self",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "trainers", user.uid), {
        students: arrayUnion(studentUid),
      });

      if (createLogin) {
        alert(
          `Student created successfully!\n\nLogin Details:\nEmail: ${formData.email}\nPassword: ${DEFAULT_PASSWORD}`,
        );
      } else {
        alert("Student created successfully!");
      }

      /* ==============================
 🔹 GET REGISTER NUMBER (MOVE HERE)
============================== */

      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false); // ✅ STOP LOADING ALWAYS
    }
  };

  // -------------------- HANDLE RELATION CONTINUE --------------------
  const handleRelationContinue = async () => {
    if (!relationType) {
      alert("Please select relation");
      return;
    }

    const newUid = `${existingUid}_${relationType.toLowerCase()}`;

    try {
      setIsSaving(true);

      const { aadharFiles, ...rest } = formData;

      const profileFile = profileInputRef.current?.files?.[0];
      let profileImageUrl = "";
      if (profileFile) {
        profileImageUrl = await uploadImageToCloudinary(profileFile);
      }

      let aadharUrls = [];
      if (aadharFiles?.length) {
        aadharUrls = await uploadMultipleToCloudinary(aadharFiles);
      }

      const sportData = {
        category: formData.category,
        subCategory: formData.subCategory,
        belt: formData.category === "Martial Arts" ? formData.belt : "",
        skillLevel:
          formData.category !== "Martial Arts" ? formData.skillLevel : "",
        sessions: formData.sessions,
        timings: formData.timings,
      };

      await setDoc(doc(db, "trainerstudents", newUid), {
        ...rest,

        sports: [sportData],
        aadharFilesCount: aadharFiles.length,
        profileImageUrl,
        aadharUrls,
        studentUid: newUid,
        trainerId: user.uid,
        role: "student",
        baseUid: existingUid,
        relation: relationType,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "trainers", user.uid), {
        students: arrayUnion(newUid),
      });

      alert("Student added with shared email successfully!");

      setShowRelationPopup(false);
      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const saveStudentWithUid = async (uidToUse, baseUid) => {
    const { aadharFiles, ...rest } = formData;

    const profileFile = profileInputRef.current?.files?.[0];
    let profileImageUrl = "";
    if (profileFile)
      profileImageUrl = await uploadImageToCloudinary(profileFile);

    let aadharUrls = [];
    if (aadharFiles?.length)
      aadharUrls = await uploadMultipleToCloudinary(aadharFiles);

    const sportData = {
      category: formData.category,
      subCategory: formData.subCategory,
      belt: formData.category === "Martial Arts" ? formData.belt : "",
      skillLevel:
        formData.category !== "Martial Arts" ? formData.skillLevel : "",
      sessions: formData.sessions,
      timings: formData.timings,
    };

    await setDoc(doc(db, "trainerstudents", uidToUse), {
      ...rest,
      sports: [sportData],
      aadharFilesCount: aadharFiles.length,
      profileImageUrl,
      aadharUrls,
      studentUid: uidToUse,
      trainerId: user.uid,
      role: "student",
      baseUid,
      relation: uidToUse === baseUid ? "self" : "other",
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "trainers", user.uid), {
      students: arrayUnion(uidToUse),
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeRef.current && !timeRef.current.contains(e.target)) {
        setShowTimeDropdown(false);
      }

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
      <div className="w-full max-w-5xl p-2">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 text-center lg:text-left">
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
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Register No:{" "}
              <input
                type="text"
                className="border px-3 py-1 rounded-md text-center text-orange-500 font-semibold"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="Enter Register Number"
              />
            </h3>
          </div>
          {/* TITLE */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-500">
              Customer Details
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {/* Row 1 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                First Name<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.firstName}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^A-Za-z.\s]/g, "");

                  // Capitalize first letter automatically
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }

                  setFormData((prev) => ({ ...prev, firstName: value }));
                }}
              />
              {errors.firstName && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Last Name<span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                value={formData.lastName}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^A-Za-z.\s]/g, "");

                  // SAME LOGIC AS FIRST NAME
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }

                  setFormData((prev) => ({ ...prev, lastName: value }));
                }}
              />
              {errors.lastName && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.lastName}
                </span>
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

            {/* Row 2 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Date Of Birth*
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className={`${inputClass} mobile-date`}
                min="1900-01-01"
                max={new Date().toISOString().split("T")[0]}
                value={formData.dateOfBirth}
                onChange={(e) => {
                  const dob = e.target.value;

                  const birthDate = new Date(dob);
                  const today = new Date();

                  let age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();

                  if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < birthDate.getDate())
                  ) {
                    age--;
                  }

                  setFormData((prev) => ({
                    ...prev,
                    dateOfBirth: dob,
                    age: age,
                  }));
                }}
              />
              {errors.dateOfBirth && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.dateOfBirth}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">Age</label>

              <input
                type="text"
                className={inputClass}
                value={formData.age}
                readOnly
                placeholder="Auto calculated from DOB"
              />
              {errors.age && (
                <span className="text-red-500 text-xs">{errors.age}</span>
              )}
            </div>

            {/* Row 3 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Joining Date*
              </label>

              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className={`${inputClass} mobile-date ${
                  errors.joiningDate
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                min={
                  formData.dateOfBirth
                    ? new Date(
                        new Date(formData.dateOfBirth).setDate(
                          new Date(formData.dateOfBirth).getDate() + 1,
                        ),
                      )
                        .toISOString()
                        .split("T")[0]
                    : "1900-01-01"
                }
                max={new Date().toISOString().split("T")[0]}
                value={formData.joiningDate}
                onChange={(e) => {
                  const value = e.target.value;

                  if (formData.dateOfBirth && value <= formData.dateOfBirth) {
                    setErrors((prev) => ({
                      ...prev,
                      joiningDate: "Joining date must be after DOB",
                    }));
                  } else {
                    setErrors((prev) => ({
                      ...prev,
                      joiningDate: "",
                    }));
                  }

                  setFormData((prev) => ({
                    ...prev,
                    joiningDate: value,
                  }));
                }}
              />

              {errors.joiningDate && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.joiningDate}
                </span>
              )}
            </div>

            {/* Row 4 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Category*
              </label>
              <div ref={categoryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`${inputClass} w-full flex items-center justify-between`}
                >
                  <span>
                    {formData.category ? formData.category : "Select Category"}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      showCategoryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-40 overflow-y-auto">
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
                <span className="text-red-500 text-xs mt-1">
                  {errors.category}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Sub-Category*
              </label>
              <div ref={subCategoryRef} className="relative">
                <button
                  type="button"
                  disabled={!formData.category}
                  onClick={() =>
                    formData.category &&
                    setShowSubCategoryDropdown(!showSubCategoryDropdown)
                  }
                  className={`${inputClass} w-full flex items-center justify-between ${
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
                    size={16}
                    className={`transition-transform ${
                      showSubCategoryDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showSubCategoryDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-40 overflow-y-auto">
                    {availableSubCategories.map((sub) => (
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
                <span className="text-red-500 text-xs mt-1">
                  {errors.subCategory}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                {formData.category === "Martial Arts"
                  ? "Belt*"
                  : "Skill Level*"}
              </label>

              <select
                className={inputClass}
                value={
                  formData.category === "Martial Arts"
                    ? formData.belt
                    : formData.skillLevel
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    [formData.category === "Martial Arts"
                      ? "belt"
                      : "skillLevel"]: e.target.value,
                  }))
                }
              >
                <option value="" disabled hidden>
                  {formData.category === "Martial Arts"
                    ? "Select Belt"
                    : "Select Skill Level"}
                </option>

                {formData.category === "Martial Arts"
                  ? belts.map((b) => <option key={b}>{b}</option>)
                  : skillLevels.map((s) => <option key={s}>{s}</option>)}
              </select>

              {errors.belt && formData.category === "Martial Arts" && (
                <span className="text-red-500 text-xs mt-1">{errors.belt}</span>
              )}
            </div>

            {/* Row 5 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Sessions*
              </label>
              <select
                className={inputClass}
                value={formData.sessions}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sessions: e.target.value }))
                }
              >
                <option value="">Sessions</option>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
              </select>
              {errors.sessions && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.sessions}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Select Timings*
              </label>
              <div ref={timeRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  className={`${inputClass} w-full flex items-center justify-between`}
                >
                  <span>
                    {formData.timings
                      ? timeSlots.find((t) => t.value === formData.timings)
                          ?.label
                      : "Select Time"}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      showTimeDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showTimeDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-md max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.value}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            timings: slot.value,
                          }));
                          setShowTimeDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.timings && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.timings}
                </span>
              )}
            </div>

            {/* Row 6 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Contact Number*
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                className={inputClass}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    setFormData((prev) => ({ ...prev, phone: value }));
                  }
                }}
              />
              {errors.phone && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => {
                  setCreateLogin(e.target.checked);

                  if (!e.target.checked) {
                    setFormData((prev) => ({
                      ...prev,
                      email: "",
                    }));
                  }
                }}
              />
              <label className="text-sm">Create login for this customer</label>
            </div>
            <div className="flex flex-col">
              {createLogin && (
                <div className="flex flex-col">
                  <label className="text-sm font-semibold mb-2">
                    E-mail Id<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                  {errors.email && (
                    <span className="text-red-500 text-xs mt-1">
                      {errors.email}
                    </span>
                  )}
                </div>
              )}
              {errors.email && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.email}
                </span>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Monthly Fee */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Monthly Fee (₹)*
              </label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={formData.monthlyFee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    monthlyFee: e.target.value,
                  }))
                }
              />
              {errors.monthlyFee && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.monthlyFee}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Monthly Payment Date* (1 - 31)
              </label>

              <input
                type="number"
                min={1}
                max={31}
                className={inputClass}
                value={formData.monthlyDate}
                placeholder="Enter day (e.g., 5)"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  if (
                    value === "" ||
                    (Number(value) >= 1 && Number(value) <= 31)
                  ) {
                    setFormData((prev) => ({
                      ...prev,
                      monthlyDate: value,
                    }));
                  }
                }}
              />

              {errors.monthlyDate && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.monthlyDate}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
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
    flex items-center justify-center"
                >
                  <img src="/upload.png" alt="upload" className="w-6 h-6" />
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

            <div className="md:col-span-2 flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Enter Address*
              </label>
              <textarea
                rows={4}
                className={`${inputClass} h-auto`}
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
              {errors.address && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.address}
                </span>
              )}
            </div>

            <p className="md:col-span-2 text-red-500 text-sm mt-2">
              <span className="font-semibold">NOTE :</span> Customers will
              receive a reminder notification five days prior to the payment due
              date.
            </p>
          </div>
        )}
      </div>

      <div
        className="fixed left-0 right-0 z-[40] bg-white/95 backdrop-blur-md border-t border-orange-100"
        style={{ bottom: "var(--bottom-navbar-height, 64px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
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
              className="ml-auto w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-semibold text-white bg-orange-500"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className={`ml-auto w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-semibold text-white ${
                isSaving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500"
              }`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
      {showRelationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-80">
            <h3 className="text-lg font-bold mb-4">Email already exists</h3>

            {/* STEP 1: Ask if used in other institute */}
            {usedInOtherInstitute === null && (
              <div className="flex flex-col gap-3">
                <p>Is this email used in another institute/trainer?</p>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setUsedInOtherInstitute(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setUsedInOtherInstitute(false)}
                    className="bg-gray-300 px-4 py-2 rounded"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2A: Enter institute/trainer name if Yes */}
            {usedInOtherInstitute === true && (
              <div className="flex flex-col gap-3">
                <label className="text-sm mb-1">
                  Enter Institute/Trainer Name
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
                <div className="flex justify-end gap-4 mt-4">
                  <button onClick={() => setShowRelationPopup(false)}>
                    Cancel
                  </button>
                  <button
                    className="bg-orange-500 text-white px-4 py-2 rounded"
                    onClick={async () => {
                      if (!instituteName.trim()) {
                        alert("Please enter institute/trainer name");
                        return;
                      }
                      const newUid = `${existingUid}_${instituteName
                        .trim()
                        .replace(/\s+/g, "_")}`;

                      await saveStudentWithUid(newUid, existingUid); // reuse your save function
                      alert(
                        "Student added under another institute/trainer successfully!",
                      );
                      setShowRelationPopup(false);
                      resetForm();
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2B: Select relation if No */}
            {usedInOtherInstitute === false && (
              <div className="flex flex-col gap-3">
                <label className="text-sm mb-1">Select Relation</label>
                <select
                  className={inputClass}
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                >
                  <option value="">Select Relation</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                </select>

                <div className="flex justify-end gap-4 mt-4">
                  <button onClick={() => setShowRelationPopup(false)}>
                    Cancel
                  </button>
                  <button
                    className="bg-orange-500 text-white px-4 py-2 rounded"
                    onClick={handleRelationContinue}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
