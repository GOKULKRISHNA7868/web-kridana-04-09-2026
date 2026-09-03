import React, { useState } from "react";
import { auth, db } from "../firebase";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export default function ResetPassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleReset = async () => {
    if (oldPassword !== "123456") {
      alert("Old password is incorrect");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const user = auth.currentUser;

      await updatePassword(user, newPassword);

      await updateDoc(doc(db, "students", user.uid), {
        defaultPassword: false,
      });

      alert("Password updated successfully");

      window.location.href = "/";
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4 py-10">
      <div className="p-8 bg-white shadow-lg rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-500">
          Reset Your Password
        </h2>

        <input
          type="password"
          placeholder="Old Password"
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full border p-2 mb-3"
        />

        <input
          type="password"
          placeholder="New Password"
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border p-2 mb-3"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border p-2 mb-3"
        />

        <button
          onClick={handleReset}
          className="w-full bg-orange-500 text-white p-2 rounded"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
