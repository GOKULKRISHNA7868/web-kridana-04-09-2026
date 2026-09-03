import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-gray-800 mb-3 border-l-4 border-orange-500 pl-3">
      {title}
    </h2>
    <div className="text-gray-600 leading-relaxed space-y-2 text-[15px]">
      {children}
    </div>
  </div>
);

const PaymentPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-10">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-2xl p-6 md:p-10">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#FF6A00] font-semibold mb-6"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Effective for Kridana – by Kdastsho Fintech Solutions Pvt. Ltd.
          </p>
        </div>

        {/* 1 */}
        <Section title="1. Introduction">
          <p>
            This Payment Policy outlines the terms and conditions governing
            payments made through <span className="font-semibold">Kridana</span>
            , a product of Kdastsho Fintech Solutions Pvt. Ltd.
          </p>
          <p>
            Kridana provides software tools to sports institutions and
            independent trainers to manage operations such as attendance, fee
            tracking, performance reviews, and event management.
          </p>
        </Section>

        {/* 2 */}
        <Section title="2. Subscription Fees">
          <ul className="list-disc ml-5 space-y-1">
            <li>Kridana operates on a subscription-based model.</li>
            <li>
              Sports institutions and independent trainers are required to pay:
              <ul className="list-disc ml-5 mt-1">
                <li>Monthly Subscription Fees</li>
                <li>Yearly Subscription Fees</li>
              </ul>
            </li>
            <li>Subscription provides access to:</li>
            <ul className="list-disc ml-5 mt-1">
              <li>Attendance management</li>
              <li>Fee collection reports and alerts</li>
              <li>Performance tracking</li>
              <li>Event management</li>
              <li>Profile visibility to customers</li>
            </ul>
          </ul>
        </Section>

        {/* 3 */}
        <Section title="3. Payment Gateway Usage">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              All payments are processed through authorized third-party payment
              gateways.
            </li>
            <li>Kridana does not directly process or store payments.</li>
            <li>
              Users must comply with the respective payment gateway provider
              terms.
            </li>
          </ul>
        </Section>

        {/* 4 */}
        <Section title="4. Fee Collection Facilitation (Routing Feature)">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Kridana enables institutions/trainers to collect fees directly
              from customers.
            </li>
            <li>
              Payments are directly credited to the institution/trainer
              accounts.
            </li>
            <li>Kridana acts only as a facilitator.</li>
            <li>No commission or transaction fee is charged by Kridana.</li>
            <li>
              Any charges are imposed solely by the payment gateway provider.
            </li>
          </ul>
        </Section>

        {/* 5 */}
        <Section title="5. KYC and Onboarding">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              All institutions and trainers must complete KYC verification.
            </li>
            <li>Kridana reserves the right to approve or reject onboarding.</li>
          </ul>
        </Section>

        {/* 6 */}
        <Section title="6. Reporting and Analytics">
          <ul className="list-disc ml-5 space-y-1">
            <li>Monthly and yearly revenue reports</li>
            <li>Customer payment insights</li>
            <li>Business performance summaries</li>
            <li>
              Reports are for informational purposes to support business growth.
            </li>
          </ul>
        </Section>

        {/* 7 */}
        <Section title="7. Data Security and Privacy">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              No storage of card details or sensitive payment information on
              Kridana servers.
            </li>
            <li>
              All sensitive data is handled securely by certified payment
              gateways.
            </li>
            <li>Industry-standard security practices are followed.</li>
          </ul>
        </Section>

        {/* 8 */}
        <Section title="8. Refund Policy">
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Subscription fees paid to Kridana are non-refundable unless stated
              otherwise.
            </li>
            <li>
              Refunds for customer payments are the responsibility of the
              respective institution or trainer.
            </li>
            <li>
              Kridana is not liable for disputes between customers and
              institutions.
            </li>
          </ul>
        </Section>

        {/* 9 */}
        <Section title="9. Liability Disclaimer">
          <ul className="list-disc ml-5 space-y-1">
            <li>Payment failures due to gateway issues</li>
            <li>Delays in fund settlements</li>
            <li>Disputes between institutions and customers</li>
            <li>All transactions are subject to payment gateway policies.</li>
          </ul>
        </Section>

        {/* 10 */}
        <Section title="10. Policy Updates">
          <p>
            Kridana reserves the right to update this Payment Policy at any
            time. Users will be notified of significant updates through official
            communication channels.
          </p>
        </Section>

        {/* 11 */}
        <Section title="11. Contact Information">
          <p>For payment-related queries, contact:</p>
          <div className="mt-2 bg-gray-100 rounded-lg p-4 text-sm">
            <p className="font-medium text-gray-800">Kridana Support Team</p>
            <p className="text-gray-600">info@kdastshofintechsolutions.com</p>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-10">
          © {new Date().getFullYear()} Kridana. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PaymentPolicy;
