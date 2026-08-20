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
import {
  User,
  Users,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AccountPageShell from "./MyAccount/AccountPageShell";
import { CATEGORIES, SUB_CATEGORY_MAP } from "./MyAccount/sportCategories";

const MyAccountPage = ({ setActiveMenu }) => {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("management");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
    profileImage: "", // added
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
  const [sports, setSports] = useState([]);
  const [branches, setBranches] = useState([]);
  const categories = CATEGORIES;
  const subCategoryMap = SUB_CATEGORY_MAP;


  /* ================= FETCH PROFILE ================= */

  useEffect(() => {
    if (editingStudent) {
      setSports(editingStudent.sports || []);
    }
  }, [editingStudent]);
  /* ================= FETCH MEDIA ================= */
  useEffect(() => {
    const fetchMedia = async () => {
      if (!user?.uid) return;

      const snap = await getDocs(
        collection(db, "institutes", user.uid, "media"),
      );
      setMedia(snap.docs.map((d) => d.data().image));
    };

    fetchMedia();
  }, [user]);
  useEffect(() => {
    if (!user?.uid) return;

    const fetchBranches = async () => {
      console.log("Logged in institute:", user.uid);

      const q = query(
        collection(db, "students"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      console.log("Students Found:", snap.size);

      snap.docs.forEach((doc) => {
        console.log(doc.id, doc.data().branch, doc.data().instituteId);
      });

      const uniqueBranches = [
        ...new Set(snap.docs.map((doc) => doc.data().branch).filter(Boolean)),
      ];

      console.log("Branches:", uniqueBranches);

      setBranches(uniqueBranches);
    };

    fetchBranches();
  }, [user]);
  useEffect(() => {
    if (activeTab !== "management" || !user?.uid) return;

    const fetchTrainers = async () => {
      const q = query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", user.uid),
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
  const handleStudentImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingStudent) return;

    // Upload to Cloudinary
    const url = await uploadToCloudinary(file, "image");

    if (!url) return;

    try {
      // Update Firebase
      await updateDoc(doc(db, "students", editingStudent.id), {
        profileImageUrl: url,
      });

      // Update modal UI
      setEditingStudent((prev) => ({
        ...prev,
        profileImageUrl: url,
      }));

      // Update table UI instantly
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id ? { ...s, profileImageUrl: url } : s,
        ),
      );
    } catch (error) {
      console.error("Image update error:", error);
    }
  };

  // Capitalize each word (Ravi Kumar)
  const capitalizeWords = (value) => {
    return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Allow only letters + space
  const onlyAlphabets = (value) => {
    return value.replace(/[^A-Za-z\s]/g, "");
  };

  const handleTrainerImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingTrainer) return;

    const url = await uploadToCloudinary(file, "image");

    if (!url) return;

    setEditingTrainer((prev) => ({
      ...prev,
      profileImageUrl: url,
    }));

    // Save immediately to Firebase
    await updateDoc(doc(db, "InstituteTrainers", editingTrainer.id), {
      profileImageUrl: url,
    });
  };

  const removeTrainerImage = async () => {
    if (!editingTrainer) return;

    await updateDoc(doc(db, "InstituteTrainers", editingTrainer.id), {
      profileImageUrl: "",
    });

    setEditingTrainer((prev) => ({
      ...prev,
      profileImageUrl: "",
    }));
  };

  const removeStudentImage = async () => {
    if (!editingStudent) return;

    try {
      await updateDoc(doc(db, "students", editingStudent.id), {
        profileImageUrl: "",
      });

      // update modal UI
      setEditingStudent((prev) => ({
        ...prev,
        profileImageUrl: "",
      }));

      // update table instantly
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id ? { ...s, profileImageUrl: "" } : s,
        ),
      );
    } catch (error) {
      console.error("Remove image error:", error);
    }
  };

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (activeTab !== "customers" || !user?.uid) return;
    const fetchLeftTrainers = async () => {
      const q = query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", user.uid),
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
        collection(db, "students"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        status: d.data().status || "Active", // default Active
      }));

      setStudents(list);
      setFilteredStudents(list);
      setStudents(list);
      setFilteredStudents(list);
    };

    fetchStudents();
  }, [activeTab, user]);
  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    let updatedBranches = [...branches];

    const newBranch = editingStudent.branch.trim();

    if (
      newBranch &&
      !updatedBranches.some((b) => b.toLowerCase() === newBranch.toLowerCase())
    ) {
      updatedBranches.push(newBranch);

      await updateDoc(doc(db, "institutes", user.uid), {
        branches: updatedBranches,
      });

      setBranches(updatedBranches);
    }

    try {
      await updateDoc(doc(db, "students", editingStudent.id), {
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName,
        email: editingStudent.email,
        phone: editingStudent.phone,
        address: editingStudent.address,
        age: editingStudent.age,
        branch: editingStudent.branch,
        dateOfBirth: editingStudent.dateOfBirth,
        joiningDate: editingStudent.joiningDate,
        monthlyDate: editingStudent.monthlyDate,
        sports: sports,
      });
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? editingStudent : s)),
      );

      setShowEditStudentModal(false);
      setEditingStudent(null);
    } catch (error) {
      console.error("Update error:", error);
    }
  };
  const addSport = () => {
    setSports((prev) => [
      ...prev,
      {
        category: "",
        subCategory: "",
        belt: "",
        sessions: "",
        timings: "",
        fee: "",
      },
    ]);
  };
  const uploadToCloudinary = async (file, type) => {
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

      setUploadMsg("Upload Successful!");
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
    try {
      const ref = doc(db, "institutes", user.uid);

      await updateDoc(ref, {
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });

      alert("Profile Saved");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  /* ================= UPLOAD PROFILE IMAGE ================= */
  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.uid) return;

    const url = await uploadToCloudinary(file, "image");

    if (!url) return;

    try {
      // update UI
      setProfile((prev) => ({
        ...prev,
        profileImageUrl: url,
      }));

      // save to firestore
      await updateDoc(doc(db, "institutes", user.uid), {
        profileImageUrl: url,
      });
    } catch (error) {
      console.error("Profile upload error:", error);
    }
  };

  /* ================= UPLOAD MEDIA ================= */
  const handleUpload = async () => {
    if (!pendingFile || !selectedUploadType || !user?.uid) return;

    const cloudType = selectedUploadType === "image" ? "image" : "video";

    const url = await uploadToCloudinary(pendingFile, cloudType);
    if (!url) return;

    const instituteRef = doc(db, "institutes", user.uid);
    const snap = await getDoc(instituteRef);
    if (!snap.exists()) return;

    const data = snap.data();
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
      await updateDoc(doc(db, "InstituteTrainers", trainerToDelete.id), {
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
    if (!editingTrainer) return;

    await updateDoc(
      doc(db, "InstituteTrainers", editingTrainer.id),
      editingTrainer,
    );

    setTrainers((prev) =>
      prev.map((t) => (t.id === editingTrainer.id ? editingTrainer : t)),
    );

    setShowEditModal(false);
    setEditingTrainer(null);
  };
  const markStudentLeft = async () => {
    if (!selectedStudent) return;

    await updateDoc(doc(db, "students", selectedStudent.id), {
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

    await deleteDoc(doc(db, "students", student.id));

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Mark this customer as Left?")) return;

    await updateDoc(doc(db, "students", id), {
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

    await updateDoc(doc(db, "students", student.id), {
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
  const updateSport = (index, field, value) => {
    const updated = [...sports];
    updated[index][field] = value;
    setSports(updated);
  };
  const removeSport = (index) => {
    const updated = sports.filter((_, i) => i !== index);
    setSports(updated);
  };
  const removeProfileImage = async () => {
    try {
      setProfile((prev) => ({
        ...prev,
        profileImageUrl: "",
      }));

      await updateDoc(doc(db, "institutes", user.uid), {
        profileImageUrl: "",
      });
    } catch (error) {
      console.error("Error removing profile image:", error);
    }
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
                Manage your team and customers
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
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
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileUpload}
                  />
                </label>

                {(profile.profileImage || profile.profileImageUrl) && (
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

          <div className="mt-2.5 grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab("management")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === "management"
                  ? "bg-white text-[#FF6A00] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              <Users size={15} /> Management
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === "customers"
                  ? "bg-white text-[#FF6A00] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              <Users size={15} /> Customers
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-5 md:px-6 py-3 pb-5">

      {/* PROFILE CARD */}

      {/* MANAGEMENT TAB */}

      {activeTab === "management" && (
        <div className="animate-moreFadeUp">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-[#FF6A00]">
                Team Management
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Manage your instructors and staff members
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveMenu("Management Details")}
              className="shrink-0 inline-flex items-center gap-1 bg-[#FF6A00] text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition"
            >
              <Plus size={14} /> Add Employee
            </button>
          </div>

          {trainers.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                <Users size={22} className="text-orange-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800">No team members yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Add your first employee to start managing staff.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {trainers.map((trainer) => (
                <div
                  key={trainer.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm active:scale-[0.99] transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {trainer.firstName} {trainer.lastName}
                      </h3>

                      <p className="text-[#FF6A00] text-xs sm:text-sm mt-0.5 font-medium truncate">
                        {trainer.designation}
                      </p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditTrainer(trainer)}
                        className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 flex items-center justify-center active:scale-95 transition"
                      >
                        <img
                          src="/edit-icon.png"
                          alt="Edit"
                          className="w-4 h-4 object-contain"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrainerToDelete(trainer);
                          setShowTrainerDeleteModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center active:scale-95 transition"
                      >
                        <img
                          src="/delete-icon.png"
                          alt="Delete"
                          className="w-4 h-4 object-contain"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs sm:text-sm text-gray-700 space-y-1.5">
                    <p className="flex items-center gap-2 min-w-0">
                      <img
                        src="/email-icon.png"
                        alt="email"
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="truncate">{trainer.email || "—"}</span>
                    </p>

                    <p className="flex items-center gap-2">
                      <img src="/call-icon.png" alt="phone" className="w-4 h-4 shrink-0" />
                      {trainer.phone}
                    </p>
                  </div>

                  <p className="text-gray-500 text-xs sm:text-sm mt-3 leading-relaxed line-clamp-3">
                    {trainer.experience}
                  </p>

                  {trainer.achievements?.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-xs sm:text-sm text-gray-800">
                        Achievements ({trainer.achievements.length})
                      </p>

                      <ul className="ml-4 mt-1 list-disc text-xs sm:text-sm text-gray-600">
                        {trainer.achievements.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                    Joined Date :{" "}
                    {trainer.createdAt?.toDate?.().toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT TRAINER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:w-[95%] max-w-[700px] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col animate-slideUp sm:animate-moreFadeUp">
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* HEADER */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b sticky top-0 bg-white z-10">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                  Edit Management Details
                </h2>

                <button
                  onClick={() => setShowEditModal(false)} // FIXED
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition"
                  title="Close"
                >
                  <span className="text-black text-lg font-light">✕</span>
                </button>
              </div>

              {/* FORM */}
              <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  {editingTrainer?.profileImageUrl ? (
                    <img
                      src={editingTrainer.profileImageUrl}
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <User size={30} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer bg-orange-500 text-white px-3 py-1 rounded text-sm text-center">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTrainerImageChange}
                      />
                    </label>

                    {editingTrainer?.profileImageUrl && (
                      <button
                        onClick={removeTrainerImage}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {/* ================= PERSONAL INFORMATION ================= */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-500 mb-4">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        First Name
                      </label>
                      <input
                        value={editingTrainer?.firstName || ""}
                        onChange={(e) => {
                          let value = onlyAlphabets(e.target.value);
                          value = capitalizeWords(value);

                          setEditingTrainer({
                            ...editingTrainer,
                            firstName: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Last Name
                      </label>
                      <input
                        value={editingTrainer?.lastName || ""}
                        onChange={(e) => {
                          let value = onlyAlphabets(e.target.value);
                          value = capitalizeWords(value);

                          setEditingTrainer({
                            ...editingTrainer,
                            lastName: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={editingTrainer?.dateOfBirth || ""}
                        onChange={(e) =>
                          setEditingTrainer({
                            ...editingTrainer,
                            dateOfBirth: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editingTrainer?.phone || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEditingTrainer({
                            ...editingTrainer,
                            phone: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editingTrainer?.email || ""}
                        onChange={(e) =>
                          setEditingTrainer({
                            ...editingTrainer,
                            email: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ================= PROFESSIONAL DETAILS ================= */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-500 mb-4">
                    Professional Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Designation
                      </label>
                      <input
                        value={editingTrainer?.designation || ""}
                        onChange={(e) => {
                          let value = onlyAlphabets(e.target.value);
                          value = capitalizeWords(value);

                          setEditingTrainer({
                            ...editingTrainer,
                            designation: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Category
                      </label>
                      <select
                        value={editingTrainer?.category || ""}
                        onChange={(e) =>
                          setEditingTrainer({
                            ...editingTrainer,
                            category: e.target.value,
                          })
                        }
                        className="border rounded-lg px-3 py-2 w-full"
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
                      <label className="block text-sm font-medium mb-1">
                        Sub Category
                      </label>
                      <select
                        value={editingTrainer?.subCategory || ""}
                        onChange={(e) =>
                          setEditingTrainer({
                            ...editingTrainer,
                            subCategory: e.target.value,
                          })
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                        disabled={!editingTrainer?.category}
                      >
                        <option value="">Select Sub Category</option>

                        {editingTrainer?.category &&
                          subCategoryMap[editingTrainer.category]?.map(
                            (sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ),
                          )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        value={editingTrainer?.experience || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEditingTrainer({
                            ...editingTrainer,
                            experience: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Monthly Salary
                      </label>
                      <input
                        type="number"
                        value={editingTrainer?.monthlySalary || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEditingTrainer({
                            ...editingTrainer,
                            monthlySalary: value,
                          });
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        LPA
                      </label>
                      <input
                        value={editingTrainer?.lpa || ""}
                        onChange={(e) =>
                          setEditingTrainer({
                            ...editingTrainer,
                            lpa: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ================= BANK DETAILS ================= */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-500 mb-4">
                    Bank Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      placeholder="Account Name"
                      value={editingTrainer?.accountName || ""}
                      onChange={(e) => {
                        let value = onlyAlphabets(e.target.value);
                        value = capitalizeWords(value);

                        setEditingTrainer({
                          ...editingTrainer,
                          accountName: value,
                        });
                      }}
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />

                    <input
                      placeholder="Account Number"
                      value={editingTrainer?.accountNumber || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");

                        setEditingTrainer({
                          ...editingTrainer,
                          accountNumber: value,
                        });
                      }}
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />

                    <input
                      placeholder="Bank Name"
                      value={editingTrainer?.bankName || ""}
                      onChange={(e) => {
                        let value = onlyAlphabets(e.target.value);
                        value = capitalizeWords(value);

                        setEditingTrainer({
                          ...editingTrainer,
                          bankName: value,
                        });
                      }}
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />

                    <input
                      placeholder="IFSC Code"
                      value={editingTrainer?.ifscCode || ""}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^A-Za-z0-9]/g, "");
                        value = value.toUpperCase();

                        setEditingTrainer({
                          ...editingTrainer,
                          ifscCode: value,
                        });
                      }}
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />

                    <input
                      placeholder="UPI Details"
                      value={editingTrainer?.upiDetails || ""}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          upiDetails: e.target.value,
                        })
                      }
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />

                    <input
                      placeholder="PF Details"
                      value={editingTrainer?.pfDetails || ""}
                      onChange={(e) =>
                        setEditingTrainer({
                          ...editingTrainer,
                          pfDetails: e.target.value,
                        })
                      }
                      className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>

                {/* ================= DOCUMENT PREVIEW ================= */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-500 mb-4">
                    Uploaded Documents
                  </h3>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">
                      Aadhaar Documents
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {/* Existing Aadhaar Images */}
                      {editingTrainer?.aadharFiles?.map((url, i) => (
                        <div key={i} className="relative">
                          <img
                            src={url}
                            className="w-20 h-20 object-cover rounded border"
                          />

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedFiles =
                                editingTrainer.aadharFiles.filter(
                                  (_, index) => index !== i,
                                );

                              setEditingTrainer({
                                ...editingTrainer,
                                aadharFiles: updatedFiles,
                              });
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-md 
             hover:bg-gray-100 transition 
             focus:outline-none focus:ring-0 active:ring-0"
                            title="Remove"
                          >
                            <span className="text-gray-500 text-base font-light leading-none">
                              ✕
                            </span>
                          </button>
                        </div>
                      ))}

                      {/* Add New Aadhaar */}
                      <label className="w-20 h-20 border rounded flex items-center justify-center cursor-pointer bg-gray-100">
                        +
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            const url = await uploadToCloudinary(file, "image");

                            setEditingTrainer({
                              ...editingTrainer,
                              aadharFiles: [
                                ...(editingTrainer.aadharFiles || []),
                                url,
                              ],
                            });
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {editingTrainer?.certificates?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Certificates</p>
                      <div className="flex gap-3 flex-wrap">
                        {editingTrainer.certificates.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            className="w-20 h-20 object-cover rounded"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 px-4 sm:px-6 py-3.5 border-t bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdateTrainer}
                  className="bg-[#FF6A00] text-white px-5 py-2 rounded-xl text-sm font-medium active:scale-95 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTrainerDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:w-[90%] max-w-[400px] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 animate-slideUp sm:animate-moreFadeUp">
            <h2 className="text-center font-semibold text-base sm:text-lg mb-4">
              Please Provide the reason for deleting the details
            </h2>

            <label className="text-sm text-gray-600">Enter your Reason</label>

            <input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-2 mb-6 bg-gray-50 outline-none focus:border-orange-400"
            />

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTrainerDeleteModal(false);
                  setDeleteReason("");
                  setTrainerToDelete(null);
                }}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteTrainer}
                className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => setActiveMenu("Add Customers")}
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
                type="text"
                placeholder="Search Customer..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl
      focus:outline-none focus:border-orange-400 bg-white text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 sm:w-auto sm:flex">
              {["All", "Active", "Left"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatusFilter(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition
        ${
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

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block">
              {/* HEADER */}
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

                <div className="text-center">Added Date</div>
                <div className="text-center">Left Date</div>
                <div className="text-center">Action</div>
              </div>

              {/* BODY */}
              {filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className={`grid ${
                    statusFilter === "Left" ? "grid-cols-8" : "grid-cols-7"
                  } px-6 py-4 border-t text-sm items-center hover:bg-gray-50 transition`}
                >
                  <div className="font-medium text-gray-800 truncate">
                    {index + 1}. {student.firstName} {student.lastName}
                  </div>

                  <div className="text-center">{student.age} yrs</div>

                  <div className="text-center">
                    {student.sports?.[0]?.belt || "-"}
                  </div>

                  <div className="text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        student.status === "Left"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>

                  {statusFilter === "Left" && (
                    <div className="text-center text-gray-600 text-xs">
                      {student.leftReason || "-"}
                    </div>
                  )}

                  <div className="text-center">
                    {student.createdAt?.toDate?.().toLocaleDateString?.() ||
                      "-"}
                  </div>

                  <div className="text-center">
                    {student.leftDate?.toDate
                      ? student.leftDate.toDate().toLocaleDateString()
                      : "-"}
                  </div>

                  {/* ACTION */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setEditingStudent(student);
                        setShowEditStudentModal(true);
                      }}
                    >
                      <img
                        src="/edit-icon.png"
                        alt="edit"
                        className="w-5 h-5"
                      />
                    </button>

                    {statusFilter === "Left" ? (
                      <button onClick={() => permanentlyDeleteStudent(student)}>
                        <img
                          src="/delete-icon.png"
                          alt="delete"
                          className="w-5 h-5"
                        />
                      </button>
                    ) : (
                      <button onClick={() => markAsLeftConfirm(student)}>
                        <img
                          src="/delete-icon.png"
                          alt="left"
                          className="w-5 h-5"
                        />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ================= MOBILE CARD VIEW ================= */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredStudents.map((student, index) => (
                <div key={student.id} className="p-3.5 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {index + 1}. {student.firstName} {student.lastName}
                      </h3>

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
                        {student.createdAt?.toDate?.().toLocaleDateString?.() ||
                          "-"}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-500">Left Date</p>
                      <p className="font-medium text-xs">
                        {student.leftDate?.toDate
                          ? student.leftDate.toDate().toLocaleDateString()
                          : "-"}
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

                    {statusFilter === "Left" ? (
                      <button
                        type="button"
                        onClick={() => permanentlyDeleteStudent(student)}
                        className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium active:scale-95 transition"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsLeftConfirm(student)}
                        className="flex-1 bg-black text-white rounded-xl py-2 text-sm font-medium active:scale-95 transition"
                      >
                        Mark Left
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center">
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
      {/* ================= UPLOAD TYPE MODAL ================= */}
      {showUploadTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:w-[90%] max-w-[360px] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl animate-slideUp sm:animate-moreFadeUp">
            <h3 className="text-base sm:text-lg font-semibold text-center mb-4">
              Select Media Type
            </h3>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setSelectedUploadType("image")}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  selectedUploadType === "image"
                    ? "bg-[#FF6A00] text-white border-orange-500"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                Image
              </button>

              <button
                type="button"
                onClick={() => setSelectedUploadType("video")}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  selectedUploadType === "video"
                    ? "bg-[#FF6A00] text-white border-orange-500"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                Video
              </button>

              <button
                type="button"
                onClick={() => setSelectedUploadType("reel")}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  selectedUploadType === "reel"
                    ? "bg-[#FF6A00] text-white border-orange-500"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                Reel
              </button>
            </div>

            {uploading && (
              <p className="text-center text-sm text-orange-500 mb-3 animate-pulse">
                Please wait, media file is uploading...
              </p>
            )}

            {uploadMsg && (
              <p className="text-center text-sm text-green-600 mb-3">
                {uploadMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUploadTypeModal(false);
                  setPendingFile(null);
                  setSelectedUploadType("");
                }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedUploadType || uploading}
                onClick={handleUpload}
                className="flex-1 bg-[#FF6A00] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[10050] p-0 sm:p-4 animate-moreFadeUp">
          <div className="bg-white w-full sm:w-[95%] max-w-[800px] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col animate-slideUp sm:animate-moreFadeUp">
            {/* HEADER */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b shrink-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Edit Customer Details
              </h2>
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md 
             hover:bg-gray-100 transition 
             focus:outline-none focus:ring-0"
                title="Close"
              >
                <span className="text-gray-500 text-lg font-light leading-none">
                  ✕
                </span>
              </button>
            </div>

            {/* BODY */}
            <div className="p-4 sm:p-6 max-h-none flex-1 min-h-0 overflow-y-auto space-y-6 sm:space-y-8">
              {/* ================= PERSONAL INFORMATION ================= */}
              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-4">
                  Personal Information
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  {editingStudent?.profileImageUrl ? (
                    <img
                      src={editingStudent.profileImageUrl}
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <User size={30} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer bg-orange-500 text-white px-3 py-1 rounded text-sm text-center">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleStudentImageChange}
                      />
                    </label>

                    {editingStudent?.profileImageUrl && (
                      <button
                        onClick={removeStudentImage}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      value={editingStudent?.firstName || ""}
                      onChange={(e) => {
                        let value = onlyAlphabets(e.target.value);
                        value = capitalizeWords(value);

                        setEditingStudent({
                          ...editingStudent,
                          firstName: value,
                        });
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      value={editingStudent?.lastName || ""}
                      onChange={(e) => {
                        let value = onlyAlphabets(e.target.value);
                        value = capitalizeWords(value);

                        setEditingStudent({
                          ...editingStudent,
                          lastName: value,
                        });
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">
                      Branch
                    </label>

                    <input
                      type="text"
                      value={editingStudent?.branch || ""}
                      placeholder="Select or type branch"
                      className="w-full border rounded-lg px-3 py-2"
                      onFocus={() => setShowBranchDropdown(true)}
                      onBlur={() => {
                        // Delay so click event works
                        setTimeout(() => setShowBranchDropdown(false), 200);
                      }}
                      onChange={(e) =>
                        setEditingStudent((prev) => ({
                          ...prev,
                          branch: e.target.value,
                        }))
                      }
                    />

                    {showBranchDropdown && (
                      <div
                        className="fixed z-[99999] bg-white border rounded-lg shadow-xl max-h-52 overflow-y-auto"
                        style={{
                          width: "320px",
                          marginTop: "4px",
                        }}
                      >
                        {branches.length > 0 ? (
                          branches.map((branch, index) => (
                            <div
                              key={index}
                              onMouseDown={() => {
                                setEditingStudent((prev) => ({
                                  ...prev,
                                  branch,
                                }));
                                setShowBranchDropdown(false);
                              }}
                              className={`px-3 py-2 cursor-pointer hover:bg-orange-100 ${
                                editingStudent?.branch === branch
                                  ? "bg-orange-50 font-medium"
                                  : ""
                              }`}
                            >
                              {branch}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            No branches available
                          </div>
                        )}

                        {/* Add New Branch */}
                        {editingStudent?.branch &&
                          !branches.some(
                            (b) =>
                              b.toLowerCase() ===
                              editingStudent.branch.toLowerCase(),
                          ) && (
                            <div
                              onMouseDown={() => {
                                setShowBranchDropdown(false);
                              }}
                              className="px-3 py-2 text-green-600 cursor-pointer border-t hover:bg-green-50 font-medium"
                            >
                              + Add "{editingStudent.branch}"
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editingStudent?.dateOfBirth || ""}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          dateOfBirth: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Age Group
                    </label>
                    <input
                      value={editingStudent?.age || ""}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          age: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ================= CONTACT DETAILS ================= */}
              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-4">
                  Contact Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editingStudent?.email || ""}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          email: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={editingStudent?.phone || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setEditingStudent({
                          ...editingStudent,
                          phone: value,
                        });
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Residential Address
                  </label>
                  <input
                    value={editingStudent?.address || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        address: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* ================= SPORTS INFORMATION ================= */}
              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-4">
                  Sports Information
                </h3>
                {sports.map((sport, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 md:grid-cols-3 gap-3 border p-3 rounded-lg"
                  >
                    {/* Category */}
                    <select
                      value={sport.category}
                      onChange={(e) =>
                        updateSport(index, "category", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2"
                    >
                      <option value="">Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* SubCategory */}
                    <select
                      value={sport.subCategory}
                      onChange={(e) =>
                        updateSport(index, "subCategory", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2"
                      disabled={!sport.category}
                    >
                      <option value="">Sub Category</option>
                      {sport.category &&
                        subCategoryMap[sport.category]?.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                    </select>

                    {/* Session */}
                    <select
                      value={sport.sessions || ""}
                      onChange={(e) =>
                        updateSport(index, "sessions", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Session</option>

                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>

                    {/* Timing */}
                    <input
                      type="time"
                      value={sport.timings}
                      onChange={(e) =>
                        updateSport(index, "timings", e.target.value)
                      }
                      className="border rounded-lg px-3 py-2"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Fee"
                      value={sport.fee}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        updateSport(index, "fee", value);
                      }}
                      className="border rounded-lg px-3 py-2"
                    />
                    {/* Belt */}
                    {/* Belt / Skill Level */}
                    {sport.category === "Martial Arts" ? (
                      // Martial Arts - Show Belt
                      <select
                        value={sports[index]?.belt || ""}
                        onChange={(e) => {
                          const updatedSports = [...sports];
                          updatedSports[index].belt = e.target.value;
                          setSports(updatedSports);
                        }}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select Belt</option>
                        <option value="White">White</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Orange">Orange</option>
                        <option value="Green">Green</option>
                        <option value="Blue">Blue</option>
                        <option value="Brown">Brown</option>
                        <option value="Black">Black</option>
                      </select>
                    ) : (
                      // Other Categories - Show Skill Level
                      <select
                        value={sports[index]?.skillLevel || ""}
                        onChange={(e) => {
                          const updatedSports = [...sports];
                          updatedSports[index].skillLevel = e.target.value;
                          setSports(updatedSports);
                        }}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select Skill Level</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeSport(index)}
                      className="text-red-500 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  onClick={addSport}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg mt-3"
                >
                  + Add Sport
                </button>
              </div>

              {/* ================= TRAINING DETAILS ================= */}
              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-4">
                  Training Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={editingStudent?.joiningDate || ""}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          joiningDate: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Monthly Billing Date (1â€“31)
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter day (1-31)"
                      value={editingStudent?.monthlyDate || ""}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, ""); // only numbers

                        if (
                          value === "" ||
                          (Number(value) >= 1 && Number(value) <= 31)
                        ) {
                          setEditingStudent({
                            ...editingStudent,
                            monthlyDate: value,
                          });
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Session Time
                    </label>
                    <input
                      value={editingStudent?.timings || ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        // allow only numbers
                        if (/^[0-9]*$/.test(value)) {
                          setEditingStudent({
                            ...editingStudent,
                            timings: value,
                          });
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Session Type
                  </label>
                  <input
                    value={editingStudent?.sessions || ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      // allow only alphabets + spaces
                      if (/^[A-Za-z\s]*$/.test(value)) {
                        setEditingStudent({
                          ...editingStudent,
                          sessions: value,
                        });
                      }
                    }}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-3.5 border-t shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateStudent}
                className="bg-[#FF6A00] text-white px-5 py-2 rounded-xl text-sm font-medium active:scale-95 transition"
              >
                Save Changes
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
