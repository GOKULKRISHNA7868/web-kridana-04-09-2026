import React from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Mail,
  Users,
  MessageCircle,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Send Request",
    icon: UserPlus,
    description:
      "You enter your friend's email or phone number and send a connection request.",
    preview: (
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <h4 className="font-semibold text-sm mb-3">
          Enter Email or Phone Number
        </h4>

        <input
          type="text"
          disabled
          value="friend@example.com"
          className="w-full border rounded-lg px-3 py-2 text-xs mb-3 bg-gray-50"
        />

        <button className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium">
          Send Request
        </button>
      </div>
    ),
  },

  {
    id: 2,
    title: "Friend Receives Request",
    icon: Mail,
    description:
      "Your friend logs in and sees the connection request on their dashboard.",
    preview: (
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <h4 className="font-semibold text-sm mb-3">Connection Request</h4>

        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
          SR
        </div>

        <p className="text-xs text-center mb-4">
          Shashank wants to connect with you
        </p>

        <div className="flex gap-2">
          <button className="flex-1 bg-green-500 text-white rounded-lg py-2 text-xs">
            Accept
          </button>

          <button className="flex-1 border border-red-500 text-red-500 rounded-lg py-2 text-xs">
            Decline
          </button>
        </div>
      </div>
    ),
  },

  {
    id: 3,
    title: "Friend Accepts",
    icon: Users,
    description: "Once your friend accepts the request, you are now connected.",
    preview: (
      <div className="bg-white rounded-2xl border p-6 shadow-sm flex flex-col items-center">
        <CheckCircle className="text-green-500" size={48} />
        <h4 className="font-semibold mt-3">Request Accepted</h4>
        <p className="text-sm text-gray-500 mt-2 text-center">
          You are now connected!
        </p>
      </div>
    ),
  },

  {
    id: 4,
    title: "Start Chatting",
    icon: MessageCircle,
    description: "You can now message each other in the chat section.",
    preview: (
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="space-y-2 text-xs">
          <div className="bg-gray-100 rounded-lg p-2 w-fit">Hello!</div>

          <div className="bg-orange-500 text-white rounded-lg p-2 ml-auto w-fit">
            Hi Shashank!
          </div>

          <div className="bg-orange-500 text-white rounded-lg p-2 ml-auto w-fit">
            How are you?
          </div>

          <div className="bg-gray-100 rounded-lg p-2 w-fit">I'm good 😊</div>
        </div>

        <div className="border rounded-full px-3 py-2 mt-4 text-xs text-gray-400">
          Type a message...
        </div>
      </div>
    ),
  },

  {
    id: 5,
    title: "Privacy Safe",
    icon: ShieldCheck,
    description: "Users can only connect if both parties accept the request.",
    preview: (
      <div className="bg-white rounded-2xl border p-6 shadow-sm flex flex-col items-center">
        <ShieldCheck size={56} className="text-blue-500" />

        <p className="text-center text-sm font-medium mt-4">
          Your connections are private and secure.
        </p>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const navigate = useNavigate();
  return (
    <section className="bg-white py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-700 font-medium"
          >
            <ArrowLeft size={22} />
            Back
          </button>
        </div>
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900">
            How it works
          </h2>

          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            Connect with friends securely and start chatting in just a few
            simple steps.
          </p>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-start justify-between gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <div className="flex-1 bg-[#FFFDFB] border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center border-4 border-orange-100">
                      <Icon size={28} />
                    </div>
                  </div>

                  <h3 className="text-center font-bold text-lg mt-4">
                    {step.id}. {step.title}
                  </h3>

                  <div className="mt-4">{step.preview}</div>

                  <p className="text-center text-gray-600 mt-5 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className="pt-40">
                    <ArrowRight className="text-gray-400" size={28} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.id}>
                <div className="bg-[#FFFDFB] border border-orange-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center border-4 border-orange-100">
                      <Icon size={28} />
                    </div>

                    <h3 className="font-bold text-xl mt-4 text-center">
                      {step.id}. {step.title}
                    </h3>

                    <div className="w-full mt-4">{step.preview}</div>

                    <p className="text-center text-gray-600 mt-5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex justify-center py-3">
                    <ArrowDown className="text-gray-400" size={28} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
