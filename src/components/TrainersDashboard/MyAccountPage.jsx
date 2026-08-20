import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { User, Users, Search, Plus, ArrowUpRight, ArrowDownRight, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AccountPageShell from "./MyAccount/AccountPageShell";

const MyAccountPage = ({ setActiveMenu }) => {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [activeTab] = useState("customers");

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    profileImage: "", // ✅ added
  });

  const [media, setMedia] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrainerDeleteModal, setShowTrainerDeleteModal] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [activeCount, setActiveCount] = useState(0);
  const [leftCount, setLeftCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  /* ================= CUSTOMERS STATE ================= */
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [showUploadTypeModal, setShowUploadTypeModal] = useState(false);
  const [selectedUploadType, setSelectedUploadType] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  /* ================= FETCH PROFILE ================= */
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
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      const ref = doc(db, "trainers", user.uid);

      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setProfile({
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          phone: data.phoneNumber || "",
          bio: data.experience || "",
          profileImage: data.profileImageUrl || "",
        });
      }
    };

    fetchProfile();
  }, [user]);

  /* ================= FETCH MEDIA ================= */
  useEffect(() => {
    const fetchMedia = async () => {
      if (!user?.uid) return;

      const snap = await getDocs(collection(db, "trainers", user.uid, "media"));
      setMedia(snap.docs.map((d) => d.data().image));
    };

    fetchMedia();
  }, [user]);
  useEffect(() => {
    if (activeTab !== "management" || !user?.uid) return;

    const fetchTrainers = async () => {
      const q = query(
        collection(db, "trainers"),
        where("role", "==", "trainer"),
      );

      const snap = await getDocs(q);

      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter((t) => t.status !== "Left");

      setTrainers(list);
    };

    fetchTrainers();
  }, [activeTab, user]);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (activeTab !== "customers" || !user?.uid) return;
    const fetchLeftTrainers = async () => {
      const q = query(
        collection(db, "trainerstudents"),
        where("trainerId", "==", user.uid),
        where("status", "==", "Left"),
      );

      const snap = await getDocs(q);

      const leftList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log("Left Trainers:", leftList); // check in console
    };

    const fetchStudents = async () => {
      const q = query(
        collection(db, "trainerstudents"),
        where("trainerId", "==", user.uid),
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        status: d.data().status || "Active", // default Active
      }));
      list.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
      setStudents(list);
      setFilteredStudents(list);
    };

    fetchStudents();
  }, [activeTab, user]);

  const uploadToCloudinary = async (file, type) => {
    setUploading(true);
    setUploadMsg("");

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "kirdana"); // 👈 your unsigned preset name

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

      setUploadMsg("✅ Upload Successful!");
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      alert("Upload Failed: " + err.message);
      return "";
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 3000);
    }
  };

  /* ================= FILTER STUDENTS ================= */
  useEffect(() => {
    let data = [...students];

    if (statusFilter !== "All") {
      data = data.filter((s) => s.status === statusFilter);
    }

    if (searchText) {
      data = data.filter((s) =>
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(searchText.toLowerCase()),
      );
    }

    data.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

    setFilteredStudents(data);
  }, [searchText, statusFilter, students]);
  /* ================= UPDATE COUNTS INSTANTLY ================= */
  useEffect(() => {
    const active = students.filter((s) => s.status === "Active").length;
    const left = students.filter((s) => s.status === "Left").length;

    const now = new Date();
    const last30Days = students.filter((s) => {
      if (!s.createdAt) return false;
      const created = s.createdAt.toDate();
      const diff = (now - created) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    }).length;

    setActiveCount(active);
    setLeftCount(left);
    setNewCount(last30Days);
  }, [students]);

  /* ================= HANDLE INPUT ================= */
  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    await setDoc(doc(db, "trainers", user.uid), profile, { merge: true });

    alert("Profile Saved ✅");
  };
  const handleStudentProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingStudent) return;

    // Upload to Cloudinary using your existing API
    const url = await uploadToCloudinary(file, "image");

    if (!url) return;

    try {
      // Update Firebase
      await updateDoc(doc(db, "trainerstudents", editingStudent.id), {
        profileImageUrl: url,
      });

      // Update modal state
      setEditingStudent((prev) => ({
        ...prev,
        profileImageUrl: url,
      }));

      // Update table state instantly
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id ? { ...s, profileImageUrl: url } : s,
        ),
      );
    } catch (error) {
      console.error("Profile image update error:", error);
    }
  };
  /* ================= UPLOAD PROFILE IMAGE ================= */
  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.uid) return;

    const url = await uploadToCloudinary(file, "image");

    if (!url) return;

    try {
      // update UI instantly
      setProfile((prev) => ({
        ...prev,
        profileImage: url,
      }));

      // save to firestore
      await updateDoc(doc(db, "trainers", user.uid), {
        profileImageUrl: url,
      });
    } catch (error) {
      console.error("Profile upload error:", error);
    }
  };

  const removeProfileImage = async () => {
    try {
      setProfile((prev) => ({
        ...prev,
        profileImage: "",
      }));

      await updateDoc(doc(db, "trainers", user.uid), {
        profileImageUrl: "",
      });
    } catch (error) {
      console.error("Error removing profile image:", error);
    }
  };

  const removeCustomerImage = async () => {
    if (!editingStudent?.id) return;

    try {
      // update UI
      setEditingStudent((prev) => ({
        ...prev,
        profileImageUrl: "",
      }));

      // update firestore
      await updateDoc(doc(db, "trainerstudents", editingStudent.id), {
        profileImageUrl: "",
      });

      // update table instantly
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id ? { ...s, profileImageUrl: "" } : s,
        ),
      );
    } catch (error) {
      console.error("Error removing image:", error);
    }
  };

  /* ================= UPLOAD MEDIA ================= */
  const handleUpload = async () => {
    if (!pendingFile || !selectedUploadType || !user?.uid) return;

    const cloudType = selectedUploadType === "image" ? "image" : "video";

    const url = await uploadToCloudinary(pendingFile, cloudType);
    if (!url) return;

    const instituteRef = doc(db, "trainers", user.uid);

    const snap = await getDoc(instituteRef);
    if (!snap.exists()) return;

    const data = snap.data() || {};

    let updateData = {};

    if (selectedUploadType === "image") {
      updateData = {
        images: [...(data.images || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    if (selectedUploadType === "video") {
      updateData = {
        videos: [...(data.videos || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    if (selectedUploadType === "reel") {
      updateData = {
        reels: [...(data.reels || []), url],
        updatedAt: serverTimestamp(),
      };
    }

    await updateDoc(instituteRef, updateData);

    setMedia((prev) => [...prev, url]); // preview
    setPendingFile(null);
    setSelectedUploadType("");
    setShowUploadTypeModal(false);
  };

  const confirmDeleteTrainer = async () => {
    if (!trainerToDelete || !deleteReason.trim()) {
      alert("Please enter reason");
      return;
    }

    try {
      await updateDoc(doc(db, "trainerstudents", trainerToDelete.id), {
        status: "Left",
        leftReason: deleteReason,
        leftDate: serverTimestamp(),
      });

      // Remove from UI immediately
      setTrainers((prev) => prev.filter((t) => t.id !== trainerToDelete.id));

      setDeleteReason("");
      setTrainerToDelete(null);
      setShowTrainerDeleteModal(false);
    } catch (error) {
      console.error("Error updating trainer:", error);
    }
  };

  const handleEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setShowEditModal(true);
  };

  const handleUpdateTrainer = async () => {
    await updateDoc(
      doc(db, "trainerstudents", editingTrainer.id),
      editingTrainer,
    );

    setTrainers((prev) =>
      prev.map((t) => (t.id === editingTrainer.id ? editingTrainer : t)),
    );

    setShowEditModal(false);
  };
  const markStudentLeft = async () => {
    if (!selectedStudent) return;

    await updateDoc(doc(db, "trainerstudents", selectedStudent.id), {
      status: "Left",
      leftReason: leaveReason,
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id
          ? {
              ...s,
              status: "Left",
              leftReason: leaveReason,
              leftDate: serverTimestamp(),
            }
          : s,
      ),
    );

    setLeaveReason("");
    setShowDeleteModal(false);
    setSelectedStudent(null);
  };
  const permanentlyDeleteStudent = async (student) => {
    if (!window.confirm("Permanently delete this customer?")) return;

    await deleteDoc(doc(db, "trainerstudents", student.id));

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Mark this customer as Left?")) return;

    await updateDoc(doc(db, "trainerstudents", id), {
      status: "Left",
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Left", leftDate: serverTimestamp() } : s,
      ),
    );
  };
  const markAsLeftConfirm = async (student) => {
    const reason = prompt("Enter reason for marking as Left:");
    if (!reason) return;

    await updateDoc(doc(db, "trainerstudents", student.id), {
      status: "Left",
      leftReason: reason,
      leftDate: serverTimestamp(),
    });

    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? {
              ...s,
              status: "Left",
              leftReason: reason,
              leftDate: serverTimestamp(),
            }
          : s,
      ),
    );
  };
  const generateTimes = () => {
    const times = [];

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const minute = m.toString().padStart(2, "0");
        const ampm = h < 12 ? "AM" : "PM";

        times.push(`${hour12}:${minute} ${ampm}`);
      }
    }

    return times;
  };

  const TIME_OPTIONS = generateTimes();
  const handleAadharUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !editingStudent) return;

    const urls = [];

    for (const file of files) {
      const url = await uploadToCloudinary(file, "image");
      if (url) urls.push(url);
    }

    const updatedUrls = [...(editingStudent.aadharUrls || []), ...urls];

    setEditingStudent({
      ...editingStudent,
      aadharUrls: updatedUrls,
      aadharFilesCount: updatedUrls.length,
    });
  };

  const removeAadharImage = (index) => {
    const updated = editingStudent.aadharUrls.filter((_, i) => i !== index);

    setEditingStudent({
      ...editingStudent,
      aadharUrls: updated,
      aadharFilesCount: updated.length,
    });
  };

  return (
    <AccountPageShell wide fill>
    <div className="h-full min-h-0 flex flex-col bg-[#F4F6FB] rounded-2xl overflow-hidden">
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-sm z-20">
        <div className="px-3 py-2.5 sm:px-5 sm:py-3 md:px-6">
          <div className="flex items-center justify-between gap-3 animate-moreFadeUp">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#FF6A00] truncate">
                My Account
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                Manage your customers
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-orange-100 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                  <User size={18} className="text-orange-400" />
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <label className="cursor-pointer bg-[#FF6A00] text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium text-center active:scale-95 transition">
                  Change
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleProfileUpload}
                  />
                </label>

                {profile.profileImage && (
                  <button
                    type="button"
                    onClick={removeProfileImage}
                    className="text-red-500 text-[10px] sm:text-xs font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-5 md:px-6 py-3 pb-5">
      {activeTab === "customers" && (
        <div className="animate-moreFadeUp">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white border border-orange-100 rounded-xl p-2.5 sm:p-3 shadow-sm">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                Active
              </p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[#FF6A00] text-base sm:text-lg font-bold">
                  {activeCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <ArrowUpRight size={12} className="text-orange-500" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-orange-100 rounded-xl p-2.5 sm:p-3 shadow-sm">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                Left
              </p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[#FF6A00] text-base sm:text-lg font-bold">
                  {leftCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <ArrowDownRight size={12} className="text-orange-500" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-orange-100 rounded-xl p-2.5 sm:p-3 shadow-sm">
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                New 30d
              </p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[#FF6A00] text-base sm:text-lg font-bold">
                  {newCount}
                </span>
                <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                  <Circle size={10} className="text-orange-500 fill-orange-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[#FF6A00]">
                Customer Management
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Track and manage your customers
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveMenu("Customer Details")}
              className="shrink-0 inline-flex items-center gap-1 bg-[#FF6A00] text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search Customer..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-white text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 sm:w-auto sm:flex">
              {["All", "Active", "Left"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatusFilter(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                    statusFilter === item
                      ? "bg-[#FF6A00] text-white shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="hidden md:block">
              <div
                className={`grid ${
                  statusFilter === "Left" ? "grid-cols-8" : "grid-cols-7"
                } bg-black text-orange-500 px-4 lg:px-6 py-3 font-semibold text-xs sm:text-sm sticky top-0 z-10`}
              >
                <div>Name</div>
                <div className="text-center">Age</div>
                <div className="text-center">Belt</div>
                <div className="text-center">Status</div>
                {statusFilter === "Left" && (
                  <div className="text-center">Reason</div>
                )}
                <div className="text-center">Added</div>
                <div className="text-center">Left</div>
                <div className="text-center">Action</div>
              </div>

              {filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className={`grid ${
                    statusFilter === "Left" ? "grid-cols-8" : "grid-cols-7"
                  } px-4 lg:px-6 py-3.5 border-t text-sm items-center hover:bg-gray-50 transition`}
                >
                  <p className="font-medium text-gray-800 truncate">
                    {index + 1}. {student.firstName} {student.lastName}
                  </p>
                  <p className="text-center">{student.age}</p>
                  <p className="text-center">
                    {student.sports?.[0]?.belt || "-"}
                  </p>

                  <div className="text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        student.status === "Left"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>

                  {statusFilter === "Left" && (
                    <p className="text-center text-gray-600 text-xs">
                      {student.leftReason || "-"}
                    </p>
                  )}

                  <p className="text-center">
                    {student.createdAt?.toDate?.().toLocaleDateString() || "-"}
                  </p>

                  <p className="text-center">
                    {student.leftDate?.toDate?.().toLocaleDateString() || "-"}
                  </p>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(student);
                        setShowEditStudentModal(true);
                      }}
                      className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center active:scale-95 transition"
                    >
                      <img src="/edit-icon.png" alt="edit" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        statusFilter === "Left"
                          ? permanentlyDeleteStudent(student)
                          : markAsLeftConfirm(student)
                      }
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:scale-95 transition"
                    >
                      <img
                        src="/delete-icon.png"
                        alt="delete"
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {filteredStudents.map((student, index) => (
                <div key={student.id} className="p-3.5 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {index + 1}. {student.firstName} {student.lastName}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Belt: {student.sports?.[0]?.belt || "-"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 h-fit py-1 rounded-full text-[10px] font-semibold ${
                        student.status === "Left"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-500">Age</p>
                      <p className="font-medium text-xs">{student.age} yrs</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-500">Added</p>
                      <p className="font-medium text-xs">
                        {student.createdAt?.toDate?.().toLocaleDateString() ||
                          "-"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-500">Left Date</p>
                      <p className="font-medium text-xs">
                        {student.leftDate?.toDate?.().toLocaleDateString() ||
                          "-"}
                      </p>
                    </div>
                    {statusFilter === "Left" && (
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-[10px] text-gray-500">Reason</p>
                        <p className="font-medium text-xs truncate">
                          {student.leftReason || "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(student);
                        setShowEditStudentModal(true);
                      }}
                      className="flex-1 border border-orange-200 text-[#FF6A00] rounded-xl py-2 text-sm font-medium active:scale-95 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        statusFilter === "Left"
                          ? permanentlyDeleteStudent(student)
                          : markAsLeftConfirm(student)
                      }
                      className={`flex-1 rounded-xl py-2 text-sm font-medium text-white active:scale-95 transition ${
                        statusFilter === "Left" ? "bg-red-500" : "bg-black"
                      }`}
                    >
                      {statusFilter === "Left" ? "Delete" : "Mark Left"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                  <Users size={22} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  No customers found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try a different search or filter.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:w-[95%] max-w-[800px] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col animate-slideUp sm:animate-moreFadeUp">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/edit-icon.png"
                  alt="edit"
                  className="w-4 h-4 opacity-70"
                />
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                  Edit Customer Details
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition"
                title="Close"
              >
                <span className="text-gray-500 text-lg font-light">✕</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-6 sm:space-y-8">
              {/* ================= PROFILE SECTION ================= */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-orange-500 mb-4">
                  Profile Information
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-medium mb-2">Profile Image</p>

                    {editingStudent.profileImageUrl ? (
                      <img
                        src={editingStudent.profileImageUrl}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border shadow"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-500">
                        No Image
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-2 mt-3">
                      <label className="cursor-pointer bg-[#FF6A00] text-white px-3 py-1.5 rounded-lg text-sm">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleStudentProfileUpload}
                        />
                      </label>

                      {editingStudent.profileImageUrl && (
                        <button
                          type="button"
                          onClick={removeCustomerImage}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        First Name
                      </label>
                      <input
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                        value={editingStudent.firstName || ""}
                        onChange={(e) => {
                          let value = e.target.value.replace(
                            /[^A-Za-z ]/g,
                            "",
                          );

                          if (value.length > 0) {
                            value =
                              value.charAt(0).toUpperCase() + value.slice(1);
                          }

                          setEditingStudent({
                            ...editingStudent,
                            firstName: value,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Last Name
                      </label>
                      <input
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                        value={editingStudent.lastName || ""}
                        onChange={(e) => {
                          let value = e.target.value.replace(
                            /[^A-Za-z ]/g,
                            "",
                          );

                          if (value.length > 0) {
                            value =
                              value.charAt(0).toUpperCase() + value.slice(1);
                          }

                          setEditingStudent({
                            ...editingStudent,
                            lastName: value,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={editingStudent.dateOfBirth || ""}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            dateOfBirth: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone Number
                      </label>
                      <input
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                        value={editingStudent.phone || ""}
                        maxLength={10}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEditingStudent({
                            ...editingStudent,
                            phone: value,
                          });
                        }}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Email Address
                      </label>
                      <input
                        value={editingStudent.email || ""}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            email: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Address
                      </label>
                      <input
                        value={editingStudent.address || ""}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            address: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-orange-500 mb-4">
                Training Details
              </h3>

              {(editingStudent.sports || []).map((sport, index) => (
                <div
                  key={index}
                  className="border border-gray-100 rounded-xl p-4 mb-4 bg-gray-50"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={sport.category || ""}
                        onChange={(e) => {
                          const updated = [...editingStudent.sports];

                          updated[index].category = e.target.value;

                          updated[index].subCategory = "";

                          setEditingStudent({
                            ...editingStudent,
                            sports: updated,
                          });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                      >
                        <option value="">Select Category</option>

                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Sub Category
                      </label>
                      <select
                        value={sport.subCategory || ""}
                        onChange={(e) => {
                          const updated = [...editingStudent.sports];
                          updated[index].subCategory = e.target.value;

                          setEditingStudent({
                            ...editingStudent,
                            sports: updated,
                          });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                      >
                        <option value="">Select Sub Category</option>

                        {(subCategoryMap[sport.category] || []).map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        {sport.category === "Martial Arts"
                          ? "Belt"
                          : "Skill Level"}
                      </label>
                      <div>
                        {sport.category === "Martial Arts" ? (
                          <select
                            value={sport.belt || ""}
                            onChange={(e) => {
                              const updated = [...editingStudent.sports];
                              updated[index].belt = e.target.value;

                              setEditingStudent({
                                ...editingStudent,
                                sports: updated,
                              });
                            }}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                          >
                            <option value="">Select Belt</option>
                            <option value="White">White</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Orange">Orange</option>
                            <option value="Blue">Blue</option>
                            <option value="Brown">Brown</option>
                            <option value="Black">Black</option>
                            <option value="Green">Green</option>
                          </select>
                        ) : (
                          <select
                            value={sport.skillLevel || ""}
                            onChange={(e) => {
                              const updated = [...editingStudent.sports];
                              updated[index].skillLevel = e.target.value;

                              setEditingStudent({
                                ...editingStudent,
                                sports: updated,
                              });
                            }}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                          >
                            <option value="">Select Skill Level</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Sessions</label>

                      <select
                        value={sport.sessions || ""}
                        onChange={(e) => {
                          const updated = [...editingStudent.sports];
                          updated[index].sessions = e.target.value;

                          setEditingStudent({
                            ...editingStudent,
                            sports: updated,
                          });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                      >
                        <option value="">Select Session</option>
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Timings</label>

                      <input
                        type="time"
                        value={sport.timings || ""}
                        onChange={(e) => {
                          const updated = [...editingStudent.sports];
                          updated[index].timings = e.target.value;

                          setEditingStudent({
                            ...editingStudent,
                            sports: updated,
                          });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fee</label>
                      <input
                        value={sport.fee || ""}
                        onChange={(e) => {
                          const updated = [...editingStudent.sports];

                          const value = e.target.value.replace(/\D/g, "");

                          updated[index].fee = value;

                          setEditingStudent({
                            ...editingStudent,
                            sports: updated,
                          });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = editingStudent.sports.filter(
                        (_, i) => i !== index,
                      );

                      setEditingStudent({
                        ...editingStudent,
                        sports: updated,
                      });
                    }}
                    className="mt-3 text-red-500 text-sm"
                  >
                    Remove Sport
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingStudent({
                    ...editingStudent,
                    sports: [
                      ...(editingStudent.sports || []),
                      {
                        category: "",
                        subCategory: "",
                        belt: "",
                        sessions: "",
                        timings: "",
                        fee: "",
                      },
                    ],
                  });
                }}
                className="bg-[#FF6A00] text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                + Add Sport
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-orange-500 mb-4">
                  Aadhaar Documents
                </h3>

                <div className="flex flex-wrap gap-4 mb-3">
                  {(editingStudent.aadharUrls || []).map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border shadow"
                      />

                      <button
                        type="button"
                        onClick={() => removeAadharImage(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <label className="cursor-pointer inline-flex bg-[#FF6A00] text-white px-4 py-2 rounded-xl text-sm font-medium">
                  + Add Aadhaar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAadharUpload}
                  />
                </label>

                <p className="text-sm text-gray-500 mt-2">
                  Total Files: {editingStudent.aadharFilesCount || 0}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 border-t flex justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await updateDoc(
                    doc(db, "trainerstudents", editingStudent.id),
                    editingStudent,
                  );

                  setStudents((prev) =>
                    prev.map((s) =>
                      s.id === editingStudent.id ? editingStudent : s,
                    ),
                  );

                  setShowEditStudentModal(false);
                }}
                className="bg-[#FF6A00] text-white px-5 py-2 rounded-xl text-sm font-medium active:scale-95 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AccountPageShell>
  );
};


export default MyAccountPage;
