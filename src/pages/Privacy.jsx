import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
const PrivacyPolicy = () => {
  const [showPolicy, setShowPolicy] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      {!showPolicy ? (
        /* ---------------- POLICY MENU ---------------- */
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-6"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-10">
            <h1 className="text-3xl font-bold mb-6 text-orange-500 text-center">
              Policies
            </h1>

            {/* LINKS */}
            <div className="space-y-4 text-lg mb-10">
              <button
                onClick={() => setShowPolicy(true)}
                className="block text-blue-600 underline hover:text-blue-800"
              >
                Privacy Policy
              </button>

              <Link
                to="/paymentpolicy"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                Payment Policy
              </Link>

              <Link
                to="/customer-policies"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                Customer-Centric Policies
              </Link>

              <Link
                to="/payment-refund-policy"
                className="block text-blue-600 underline hover:text-blue-800"
              >
                Payment & Refund Policy
              </Link>
            </div>

            {/* INTRO SECTION */}
            <div className="space-y-8 text-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Privacy Policy
                </h2>
                <p className="mt-2 leading-relaxed">
                  This policy explains how Kridhana collects, uses, and protects
                  user information on the platform. We prioritize responsible
                  data handling and transparency in managing personal details.
                  Our goal is to ensure user trust and maintain secure
                  information practices.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Payment Policy
                </h2>
                <p className="mt-2 leading-relaxed">
                  The payment policy outlines how transactions are processed on
                  the Kridhana platform. It explains responsibilities related to
                  product pricing, payment handling, and delivery coordination
                  between users and independent sellers.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Customer-Centric Policies
                </h2>
                <p className="mt-2 leading-relaxed">
                  These policies are designed to ensure fair and transparent
                  service for all users. They explain how customer concerns,
                  cancellations, and refund requests are handled to maintain a
                  positive and trustworthy experience on the platform.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Payment & Refund Policy
                </h2>
                <p className="mt-2 leading-relaxed">
                  This section describes the terms for subscription payments,
                  billing, refunds, and cancellations related to Kridhana
                  services. It also explains refund timelines and conditions
                  under which payments may be returned.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- ORIGINAL POLICY PAGE ---------------- */
        <div className="min-h-screen bg-gray-50 py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-10">
          <div className="w-full max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-5 sm:p-6 md:p-10">
            {/* Back Button */}
            <button
              onClick={() => setShowPolicy(false)}
              className="text-blue-600 underline mb-6"
            >
              ← Back to Policies
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-orange-500 font-bold leading-tight">
                Kridhana – Privacy & Platform Policies
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                KDASTSHO FINTECH SOLUTIONS
              </p>
            </div>

            {/* Privacy Policy */}
            <section className="mb-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                Privacy Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
                <li>
                  Kridhana collects necessary details such as name, sport,
                  achievements, and contact information.
                </li>
                <li>
                  This data is used to provide services, improve features, and
                  show relevant sports opportunities.
                </li>
                <li>We do not sell user data to unrelated third parties.</li>
                <li>
                  Some profile information may be visible to coaches, academies,
                  or sports partners.
                </li>
                <li>
                  Users must ensure the information they provide is accurate.
                </li>
                <li>We apply reasonable security measures to protect data.</li>
                <li>However, no system can guarantee 100% data security.</li>
                <li>By using Kridhana, you consent to our data practices.</li>
              </ul>
            </section>

            {/* Community Policy */}
            <section className="mb-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                Community & Behavior Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
                <li>
                  Kridhana is a professional sports platform requiring
                  respectful communication.
                </li>
                <li>
                  Harassment, abuse, discrimination, or hate speech is strictly
                  prohibited.
                </li>
                <li>
                  Political, religious, or offensive discussions are not
                  allowed.
                </li>
                <li>
                  Users must not bully, threaten, or exploit other members.
                </li>
                <li>
                  False achievements or fake certificates are serious
                  violations.
                </li>
                <li>
                  Misconduct may lead to warnings, suspension, or permanent
                  bans.
                </li>
                <li>
                  We aim to maintain a safe and positive sports environment.
                </li>
              </ul>
            </section>

            {/* Content Policy */}
            <section className="mb-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                Content Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
                <li>
                  Users may upload only sports-related and appropriate content.
                </li>
                <li>
                  Content must be original or used with proper permission.
                </li>
                <li>Copyright infringement and stolen media are prohibited.</li>
                <li>Adult, violent, or unrelated content is not allowed.</li>
                <li>Kridhana may review and remove content violating rules.</li>
                <li>
                  Users remain responsible for the legality of their uploads.
                </li>
                <li>
                  Content may be used for platform visibility and promotion.
                </li>
              </ul>
            </section>

            {/* Payment Policy */}
            <section className="mb-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                Payment & Refund Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
                <li>
                  Some features may require subscription fees or payments.
                </li>
                <li>
                  All payments are processed through secure payment methods.
                </li>
                <li>Payments made are final and typically non-refundable.</li>
                <li>Users must provide accurate payment details.</li>
                <li>
                  Fraudulent transactions or chargebacks may cause account
                  suspension.
                </li>
                <li>
                  Kridhana may update pricing, plans, or services at any time.
                </li>
                <li>Continued use after price changes means acceptance.</li>
              </ul>
            </section>

            {/* Safety Policy */}
            <section>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                Safety & Risk Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
                <li>
                  Kridhana connects users but does not manage physical sports
                  events.
                </li>
                <li>
                  Participation in trials, training, or matches is at the user’s
                  own risk.
                </li>
                <li>
                  Kridhana is not responsible for injuries, accidents, or
                  damages.
                </li>
                <li>
                  Users should verify event authenticity before participation.
                </li>
                <li>
                  We are not liable for disputes between users or third parties.
                </li>
                <li>
                  Safety precautions must be followed during sports activities.
                </li>
                <li>
                  Parents or guardians are responsible for minors on the
                  platform.
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
};

export default PrivacyPolicy;
