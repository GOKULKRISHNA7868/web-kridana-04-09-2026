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
import { User, ChevronDown, Check } from "lucide-react";
import { getDoc } from "firebase/firestore";
/* -------------------- STYLES -------------------- */
const inputClass =
  "h-11 px-3 w-full border border-orange-400 rounded-md bg-white outline-none focus:border-2 focus:border-orange-500 text-sm appearance-none";
const DEFAULT_PASSWORD = "123456";

/* -------------------- COMPONENT -------------------- */
export default function AddTrainerDetailsPage() {
  const { user, institute } = useAuth();
  const navigate = useNavigate();
  const [availableBranches, setAvailableBranches] = useState([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [newBranchDraft, setNewBranchDraft] = useState("");
  const branchRef = useRef(null);
  const [step, setStep] = useState(1);
  const [createLogin, setCreateLogin] = useState(true);
  const timeRef = useRef(null);
  const [registerNumber, setRegisterNumber] = useState("");
  const [registerCounter, setRegisterCounter] = useState(0);
  const [registerPrefix, setRegisterPrefix] = useState("");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const categoryRef = useRef(null);
  const subCategoryRef = useRef(null);
  const [branchDropdownUp, setBranchDropdownUp] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /* -------------------- REFS -------------------- */
  const profileInputRef = useRef(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const aadharInputRef = useRef(null);
  const [showRelationPopup, setShowRelationPopup] = useState(false);
  const [relationType, setRelationType] = useState("");
  const [existingUid, setExistingUid] = useState("");
  const [relationMode, setRelationMode] = useState("");
  // "family" | "institute"

  const [newInstituteName, setNewInstituteName] = useState("");
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

  const [availableSubCategories, setAvailableSubCategories] = useState([]);

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
    category: "",
    subCategory: "",
    sessions: "",
    skillLevel: "",
    timings: "",
    phone: "",
    email: "",

    branch: "",
    monthlyFee: "",
    monthlyDate: "",
    address: "",
    aadharFiles: [],
  });
  const [errors, setErrors] = useState({
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
    branch: "",
    monthlyFee: "",
    monthlyDate: "",
    address: "",
    aadharFiles: [],
  });

  /* -------------------- UPLOAD HANDLERS -------------------- */
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (!user?.uid) return;

        setBranchesLoading(true);

        const instituteSnap = await getDoc(doc(db, "institutes", user.uid));

        if (!instituteSnap.exists()) {
          setBranchesLoading(false);
          return;
        }

        const customerIds = instituteSnap.data()?.customers || [];

        // ✅ FETCH ALL STUDENTS IN PARALLEL
        const studentPromises = customerIds.map((id) =>
          getDoc(doc(db, "students", id)),
        );

        const studentSnaps = await Promise.all(studentPromises);

        const branchesSet = new Set();

        studentSnaps.forEach((snap) => {
          if (snap.exists()) {
            const data = snap.data();

            if (data.branch?.trim()) {
              branchesSet.add(data.branch.trim());
            }
          }
        });

        setAvailableBranches([...branchesSet]);
      } catch (err) {
        console.log(err);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, [user]);
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
  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) > today;
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  };
  /* -------------------- VALIDATION -------------------- */
  const validateStep = () => {
    let newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim())
        newErrors.firstName = "First name is required";

      if (!formData.lastName.trim())
        newErrors.lastName = "Last name is required";
      if (!formData.gender) newErrors.gender = "Gender is required";

      if (!formData.dateOfBirth)
        newErrors.dateOfBirth = "Date of Birth is required";

      if (!formData.joiningDate)
        newErrors.joiningDate = "Joining date is required";

      if (formData.category === "Martial Arts" && !formData.belt)
        newErrors.belt = "Belt is required";

      if (
        formData.category &&
        formData.category !== "Martial Arts" &&
        !formData.skillLevel
      )
        newErrors.skillLevel = "Skill Level is required";

      if (!formData.category) newErrors.category = "Category is required";

      if (!formData.subCategory)
        newErrors.subCategory = "Sub Category is required";

      if (!formData.sessions) newErrors.sessions = "Session is required";

      if (!formData.timings) newErrors.timings = "Timings are required";

      if (!formData.phone) newErrors.phone = "Phone number is required";

      if (createLogin && !formData.email) {
        newErrors.email = "Email is required";
      }

      if (!formData.branch) newErrors.branch = "Branch number is required";
    }
    /* DOB FUTURE CHECK */
    if (formData.dateOfBirth && isFutureDate(formData.dateOfBirth)) {
      newErrors.dateOfBirth = "DOB cannot be future date";
    }

    /* JOINING DATE FUTURE CHECK */
    if (formData.joiningDate && isFutureDate(formData.joiningDate)) {
      newErrors.joiningDate = "Joining date cannot be future date";
    }
    // ✅ ADD THIS (DOB vs Joining validation)
    if (formData.dateOfBirth && formData.joiningDate) {
      if (formData.joiningDate <= formData.dateOfBirth) {
        newErrors.joiningDate = "Joining date must be AFTER Date of Birth";
      }
    }
    if (step === 2) {
      if (!formData.monthlyFee.trim())
        newErrors.monthlyFee = "Monthly Fee is required";
      else if (isNaN(formData.monthlyFee) || Number(formData.monthlyFee) <= 0)
        newErrors.monthlyFee = "Monthly Fee must be a valid number";

      if (!formData.monthlyDate) {
        newErrors.monthlyDate = "Monthly payment date required";
      } else if (
        isNaN(formData.monthlyDate) ||
        Number(formData.monthlyDate) < 1 ||
        Number(formData.monthlyDate) > 31
      ) {
        newErrors.monthlyDate = "Enter valid day between 1 and 31";
      }

      if (!formData.address.trim()) newErrors.address = "Address required";
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
      branch: "",
      monthlyDate: "",
      address: "",
      aadharFiles: [],
    });

    setProfilePreview(null);
    setAvailableSubCategories([]);
    setStep(1);
    setRegisterNumber("");
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
      formData.append("upload_preset", "kirdana");

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
  const sportObject = {
    category: formData.category,
    subCategory: formData.subCategory,
    belt: formData.category === "Martial Arts" ? formData.belt : "",
    skillLevel: formData.category !== "Martial Arts" ? formData.skillLevel : "",
    sessions: formData.sessions,
    timings: formData.timings,
    fee: formData.monthlyFee,
  };
  const saveStudent = async (customerUid) => {
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

    await runTransaction(db, async (transaction) => {
      const instituteRef = doc(db, "institutes", user.uid);

      const instituteSnap = await transaction.get(instituteRef);

      if (!instituteSnap.exists()) {
        throw new Error("Institute not found");
      }

      const instituteData = instituteSnap.data();
      const config = instituteData.registerConfig || {};

      const studentRef = doc(db, "students", customerUid);

      const studentSnap = await transaction.get(studentRef);
      if (studentSnap.exists()) {
        throw new Error("Student already exists");
      }

      // ✅ SAVE STUDENT
      transaction.set(studentRef, {
        ...rest,
        sports: [sportObject],
        profileImageUrl,
        aadharUrls,
        aadharFilesCount: aadharFiles.length,
        customerUid,
        instituteId: user.uid,
        role: "customer",
        monthlyFee: Number(formData.monthlyFee),
        defaultPassword: true,
        registernumber: registerNumber,
        createdAt: serverTimestamp(),
      });

      // ✅ UPDATE CUSTOMERS
      transaction.update(instituteRef, {
        customers: arrayUnion(customerUid),
        lastRegisterNumber: registerNumber,
      });

      // ✅ UPDATE COUNTER INSIDE registerConfig

      // ✅ UI UPDATE
    });

    alert("Student added successfully!");
    resetForm();
  };
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
      setIsSaving(true);

      let customerUid = "";

      if (createLogin) {
        // ✅ LOGIN FLOW (same as your current)
        const emailDocId = formData.email.replace(/\./g, "_");

        try {
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            formData.email,
            DEFAULT_PASSWORD,
          );

          customerUid = cred.user.uid;

          await setDoc(doc(db, "memory", emailDocId), {
            email: formData.email,
            uid: customerUid,
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

            const baseUid = snap.data().uid;

            setExistingUid(baseUid);
            setRelationMode("");
            setNewInstituteName("");
            setRelationType("");
            setShowRelationPopup(true);
            setIsSaving(false);
            return;
          } else {
            throw err;
          }
        }
      } else {
        // ✅ NO LOGIN FLOW
        customerUid = `STU_${Date.now()}`; // simple unique ID
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
       🔥 REGISTER NUMBER + SAVE (TRANSACTION)
    ============================== */

      await runTransaction(db, async (transaction) => {
        const instituteRef = doc(db, "institutes", user.uid);

        const instituteSnap = await transaction.get(instituteRef);

        if (!instituteSnap.exists()) {
          throw new Error("Institute not found");
        }

        const instituteData = instituteSnap.data();
        const config = instituteData.registerConfig || {};

        const studentRef = doc(db, "students", customerUid);

        const studentSnap = await transaction.get(studentRef);
        if (studentSnap.exists()) {
          throw new Error("Student already exists");
        }

        // ✅ SAVE STUDENT
        transaction.set(studentRef, {
          ...rest,
          sports: [sportObject],
          profileImageUrl,
          aadharUrls,
          customerUid,
          instituteId: user.uid,
          role: "customer",

          loginEnabled: createLogin, // ✅ ADD THIS
          email: createLogin ? formData.email : "",

          monthlyFee: Number(formData.monthlyFee),
          defaultPassword: createLogin ? true : false,

          registernumber: registerNumber,
          createdAt: serverTimestamp(),
        });

        // ✅ UPDATE CUSTOMERS
        transaction.update(instituteRef, {
          customers: arrayUnion(customerUid),
          lastRegisterNumber: registerNumber,
        });
        // ✅ UPDATE COUNTER

        // ✅ UPDATE UI
      });

      if (createLogin) {
        alert(`Customer account created!

Email: ${formData.email}
Password: ${DEFAULT_PASSWORD}`);
      } else {
        alert("Student added successfully (No login created)");
      }

      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleRelationContinue = async () => {
    let newUid = "";

    if (relationMode === "family") {
      if (!relationType) {
        alert("Please select relation");
        return;
      }

      newUid = `${existingUid}_${relationType.toLowerCase()}`;
    }

    if (relationMode === "institute") {
      if (!newInstituteName.trim()) {
        alert("Please enter institute name");
        return;
      }

      const cleanName = newInstituteName.toLowerCase().replace(/\s+/g, "");
      newUid = `${existingUid}_${cleanName}`;
    }

    await saveStudent(newUid);

    setShowRelationPopup(false);
  };
  useEffect(() => {
    const fetchLastRegisterNumber = async () => {
      try {
        const instituteSnap = await getDoc(doc(db, "institutes", user.uid));

        if (!instituteSnap.exists()) return;

        const instituteData = instituteSnap.data();

        const lastReg = instituteData?.lastRegisterNumber || "";

        setRegisterPrefix(lastReg);

        // AUTO INCREMENT
        const match = lastReg.match(/(\d+)$/);

        if (match) {
          const numberPart = match[1];
          const prefix = lastReg.slice(0, -numberPart.length);

          const nextNumber = parseInt(numberPart, 10) + 1;

          const newRegister = prefix + nextNumber;

          setRegisterNumber(newRegister);
        } else {
          setRegisterNumber(lastReg + "1");
        }
      } catch (err) {
        console.log(err);
      }
    };

    if (user?.uid) {
      fetchLastRegisterNumber();
    }
  }, [user]);
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

      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setShowBranchDropdown(false);
        setNewBranchDraft("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sanitizeBranchName = (value = "") =>
    value.replace(/[^A-Za-z0-9\s-]/g, "").trim();

  const confirmNewBranch = () => {
    const branch = sanitizeBranchName(newBranchDraft);
    if (!branch) {
      setErrors((prev) => ({
        ...prev,
        branch: "Enter a branch name and tap OK",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, branch }));
    setAvailableBranches((prev) =>
      prev.includes(branch) ? prev : [...prev, branch].sort(),
    );
    setErrors((prev) => ({ ...prev, branch: "" }));
    setNewBranchDraft("");
    setShowBranchDropdown(false);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen flex justify-center bg-white pt-2 pb-24 sm:pb-10 px-3 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="w-full max-w-6xl">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 text-center lg:text-left">
          {/* PROFILE */}
          {/* LEFT : Upload Profile */}
          <div className="flex flex-col items-center w-full lg:w-auto">
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
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-2">
              Registration Number
            </label>

            <input
              type="text"
              className={inputClass}
              value={registerNumber}
              placeholder="Auto generated register number"
              onChange={(e) => {
                setRegisterNumber(e.target.value);
              }}
            />

            {registerPrefix && (
              <span className="text-xs text-gray-500 mt-1">
                Previous Register Number: {registerPrefix}
              </span>
            )}
          </div>
          {/* TITLE */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-orange-500">
              Customer's Data
            </h2>
            <p className="mt-4">Step {step} to 2</p>

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

                  // ✅ Capitalize every word after space
                  value = value
                    .split(" ")
                    .map((word) =>
                      word
                        ? word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                        : "",
                    )
                    .join(" ");

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

                  // ✅ Capitalize every word
                  value = value
                    .split(" ")
                    .map((word) =>
                      word
                        ? word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                        : "",
                    )
                    .join(" ");

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
            </div>

            {/* Row 3 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2">
                Joining Date*
              </label>
              <input
                type="date"
                placeholder="dd-mm-yyyy"
                className={`${inputClass} mobile-date`}
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
                      joiningDate: "Joining date must be AFTER DOB",
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
                            belt: "",
                            skillLevel: "",
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
                <span className="text-red-500 text-xs mt-1">
                  {errors.subCategory}
                </span>
              )}
            </div>
            {formData.category === "Martial Arts" && (
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2">
                  Belt<span className="text-red-500">*</span>
                </label>
                <select
                  className={inputClass}
                  value={formData.belt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, belt: e.target.value }))
                  }
                >
                  <option value="">Select Belt</option>
                  {belts.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
                {errors.belt && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.belt}
                  </span>
                )}
              </div>
            )}
            {formData.category && formData.category !== "Martial Arts" && (
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2">
                  Skill Level<span className="text-red-500">*</span>
                </label>
                <select
                  className={inputClass}
                  value={formData.skillLevel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      skillLevel: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Skill Level</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            )}

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
                <option value="">Select Session</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
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
                  className={`${inputClass} w-full flex items-center justify-between text-left`}
                >
                  <span>
                    {formData.timings
                      ? timeSlots.find((t) => t.value === formData.timings)
                          ?.label
                      : "Select Time"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`ml-2 flex-shrink-0 transition-transform ${
                      showTimeDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showTimeDropdown && (
                  <div className="absolute z-50 mt-1 w-full left-0 bg-white border rounded-lg shadow-md max-h-48 overflow-y-auto">
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCreateLogin(checked);

                  if (!checked) {
                    setFormData((prev) => ({
                      ...prev,
                      email: "",
                    }));
                  }
                }}
              />
              <label>Create Login for this student</label>
            </div>
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
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
                {errors.email && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.email}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col w-full">
              <label className="text-sm font-semibold mb-2">
                Branch Number or Name<span className="text-red-500">*</span>
              </label>

              <div ref={branchRef} className="relative w-full">
                {/* SELECT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    if (!showBranchDropdown && branchRef.current) {
                      const rect = branchRef.current.getBoundingClientRect();

                      const spaceBelow = window.innerHeight - rect.bottom;
                      const dropdownHeight = 320;

                      setBranchDropdownUp(spaceBelow < dropdownHeight);
                      setNewBranchDraft("");
                    }

                    setShowBranchDropdown(!showBranchDropdown);
                  }}
                  className={`${inputClass} w-full min-h-[44px] flex items-center justify-between text-left text-sm sm:text-base ${
                    formData.branch ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  <span className="truncate">
                    {formData.branch || "Select or enter branch"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 transition-transform ${
                      showBranchDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* DROPDOWN */}
                {showBranchDropdown && (
                  <div
                    className={`absolute z-50 w-full bg-white border border-orange-200 rounded-xl shadow-lg overflow-hidden max-w-[100vw] ${
                      branchDropdownUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
                    }`}
                  >
                    {/* EXISTING BRANCHES */}
                    <div className="max-h-48 sm:max-h-52 overflow-y-auto overscroll-contain">
                      {branchesLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : availableBranches.length > 0 ? (
                        availableBranches.map((branch) => (
                          <button
                            type="button"
                            key={branch}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                branch,
                              }));
                              setErrors((prev) => ({ ...prev, branch: "" }));
                              setNewBranchDraft("");
                              setShowBranchDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm sm:text-base transition ${
                              formData.branch === branch
                                ? "bg-orange-50 text-orange-700 font-semibold"
                                : "hover:bg-orange-50 text-gray-800"
                            }`}
                          >
                            {branch}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 px-4 py-3">
                          No saved branches yet
                        </p>
                      )}
                    </div>

                    {/* ADD NEW BRANCH */}
                    <div className="border-t border-orange-100 p-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Add new branch
                      </p>

                      <input
                        type="text"
                        placeholder="Type branch name"
                        value={newBranchDraft}
                        onChange={(e) => {
                          setNewBranchDraft(
                            e.target.value.replace(/[^A-Za-z0-9\s-]/g, ""),
                          );
                          if (errors.branch) {
                            setErrors((prev) => ({ ...prev, branch: "" }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmNewBranch();
                          }
                        }}
                        className="h-11 px-3 w-full border border-orange-300 rounded-xl bg-white outline-none focus:border-2 focus:border-orange-500 text-sm sm:text-base"
                      />

                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewBranchDraft("");
                            setShowBranchDropdown(false);
                          }}
                          className="flex-1 min-h-[44px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmNewBranch}
                          disabled={!sanitizeBranchName(newBranchDraft)}
                          className="flex-1 min-h-[44px] rounded-xl bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                          <Check size={16} />
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {errors.branch && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.branch}
                </span>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Monthly Fee */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2">
                  Monthly Fee Amount* (INR)
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={formData.monthlyFee}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      monthlyFee: e.target.value,
                    }))
                  }
                  placeholder="Enter monthly fee amount"
                />
                {errors.monthlyFee && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.monthlyFee}
                  </span>
                )}
              </div>

              {/* Monthly Payment Date (Only Day) */}

              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-2">
                  Monthly Payment Date* (1 - 31)
                </label>

                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Enter day (1 - 31)"
                  value={formData.monthlyDate}
                  onChange={(e) => {
                    let value = e.target.value;

                    // allow only 1–31
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
                  className="h-11 px-3 w-full border border-orange-400 rounded-md bg-white outline-none focus:border-2 focus:border-orange-500"
                />

                {errors.monthlyDate && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.monthlyDate}
                  </span>
                )}
              </div>

              {errors.monthlyDate && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.monthlyDate}
                </span>
              )}

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

              <div className="col-span-1 md:col-span-2 flex flex-col">
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
              <p className="text-xs text-red-500 mt-2">
                <span className="font-semibold">NOTE :</span> Customers will
                receive a reminder notification five days prior to the payment
                due date.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 sm:gap-6 mt-8 sm:mt-12 w-full">
              <button
                type="button"
                onClick={handleBack}
                className="text-orange-500 font-medium"
              >
                Back
              </button>

              <div className="flex gap-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`w-full sm:w-auto px-6 sm:px-10 py-3 rounded-md font-semibold text-white
    ${isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500"}`}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BUTTONS */}
        {step === 1 && (
          <div className="flex flex-col sm:flex-row justify-end gap-1 mt-10 pb-24 sm:pb-10">
            <button
              type="button"
              onClick={handleNext}
              className="bg-orange-500 px-8 py-2 rounded-md font-semibold text-white"
            >
              Next
            </button>
          </div>
        )}
      </div>
      {showRelationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-[90%] sm:w-80">
            <h3 className="text-lg font-bold mb-4">Email already exists</h3>

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
                onClick={handleRelationContinue}
                className="bg-orange-500 text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {showRelationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-80">
            <h3 className="text-lg font-bold mb-4">Email already exists</h3>

            {/* STEP 1 */}
            {!relationMode && (
              <>
                <p className="mb-3 text-sm">
                  Is this email used in another institute/trainer?
                </p>

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => setRelationMode("institute")}
                    className="bg-blue-500 text-white px-3 py-2 rounded w-full"
                  >
                    Yes
                  </button>

                  <button
                    onClick={() => setRelationMode("family")}
                    className="bg-green-500 text-white px-3 py-2 rounded w-full"
                  >
                    No
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 → INSTITUTE */}
            {relationMode === "institute" && (
              <>
                <label className="text-sm font-semibold mb-2 block">
                  Enter Institute Name
                </label>

                <input
                  className={inputClass}
                  value={newInstituteName}
                  onChange={(e) =>
                    setNewInstituteName(
                      e.target.value.replace(/[^A-Za-z0-9]/g, ""),
                    )
                  }
                  placeholder="Institute name"
                />
              </>
            )}

            {/* STEP 2 → FAMILY */}
            {relationMode === "family" && (
              <>
                <label className="text-sm font-semibold mb-2 block">
                  Select Relation
                </label>

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
              </>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-4 mt-4">
              <button onClick={() => setShowRelationPopup(false)}>
                Cancel
              </button>

              <button
                onClick={handleRelationContinue}
                className="bg-orange-500 text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
