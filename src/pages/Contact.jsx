import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Contact() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !phone || !message) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "contact_details"), {
        firstName,
        lastName,
        email,
        phone,
        message,
        createdAt: serverTimestamp(),
      });

      alert("Message submitted successfully!");

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error("Firestore Error:", error);
      alert("Failed to submit message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1EC] px-4 sm:px-6 py-12 md:py-20">
      <h1 className="text-4xl font-bold text-center mb-12 text-[#ea580c]">
        Contact Us
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl md:max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="First Name"
            className="w-full border rounded-lg px-4 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last Name"
            className="w-full border rounded-lg px-4 py-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg px-4 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Phone Number"
          className="w-full border rounded-lg px-4 py-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <textarea
          placeholder="Message"
          className="w-full border rounded-lg px-4 py-2 h-32 resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-full text-white font-semibold transition-all
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#fb923c] hover:bg-[#ea580c]"
            }`}
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
