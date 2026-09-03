import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { logStaffAction, trainerDisplayName } from "../../utils/trainerAccess";

const InstituteStaffAddStudent = ({ staffProfile }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    category: staffProfile?.category || "",
    subCategory: staffProfile?.subCategory || "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const update = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async () => {
    if (!staffProfile?.instituteId || !form.firstName.trim() || !form.phone.trim()) {
      setNotice("First name and phone are required.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await addDoc(collection(db, "students"), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.replace(/\D/g, "").slice(0, 10),
        email: form.email.trim(),
        instituteId: staffProfile.instituteId,
        category: form.category,
        subCategory: form.subCategory,
        addedBy: staffProfile.trainerUid,
        createdAt: serverTimestamp(),
      });
      await logStaffAction({
        instituteId: staffProfile.instituteId,
        trainerUid: staffProfile.trainerUid,
        trainerName: trainerDisplayName(staffProfile),
        action: "add_student",
        page: "Add students",
        details: `Added ${form.firstName} ${form.lastName}`.trim(),
      });
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        category: staffProfile?.category || "",
        subCategory: staffProfile?.subCategory || "",
      });
      setNotice("Student added to the academy.");
    } catch (error) {
      console.error(error);
      setNotice("Could not add student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-8">
      <h2 className="text-xl font-bold text-gray-900">Add student</h2>
      <p className="text-sm text-gray-500 mt-1">
        New students are saved to your academy
      </p>
      <div className="mt-4 space-y-3">
        {[
          ["firstName", "First name"],
          ["lastName", "Last name"],
          ["phone", "Phone"],
          ["email", "Email (optional)"],
          ["category", "Category"],
          ["subCategory", "Sport"],
        ].map(([name, label]) => (
          <label key={name} className="block">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <input
              value={form[name]}
              onChange={(event) =>
                update(
                  name,
                  name === "phone"
                    ? event.target.value.replace(/\D/g, "").slice(0, 10)
                    : event.target.value,
                )
              }
              className="mt-1 w-full min-h-[44px] border border-gray-200 rounded-xl px-3 text-sm"
            />
          </label>
        ))}
      </div>
      {notice && <p className="text-sm mt-3 text-emerald-700">{notice}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 w-full min-h-[48px] rounded-2xl bg-orange-500 text-white font-semibold"
      >
        {saving ? "Saving..." : "Save student"}
      </button>
    </div>
  );
};

export default InstituteStaffAddStudent;
