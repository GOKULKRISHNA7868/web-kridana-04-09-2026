import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import {
  User,
  MapPin,
  Trophy,
  CalendarDays,
  IndianRupee,
  Building2,
  Image as ImageIcon,
  Eye,
  ChevronRight,
  BadgeCheck,
  CheckCircle2,
} from "lucide-react";

import BasicInformation from "./steps/BasicInformation";
import LocationAccessibility from "./steps/LocationAccessibility";
import AchievementsTrack from "./steps/AchievementsTrack";
import TrainingProgram from "./steps/TrainingProgram";
import PricingTransparency from "./steps/PricingTransparency";
import MediaGallery from "./steps/MediaGallery";
import FacilitiesInfrastructure from "./steps/FacilitiesInfrastructure";
import ProfilePreview from "./steps/ProfilePreview";
import AccountPageShell from "./AccountPageShell";

const hasText = (value) => Boolean(value && String(value).trim());

const countPhotos = (data = {}) => {
  const gallery = data.mediaGallery || {};
  return [
    ...(gallery.trainingImages || []),
    ...(gallery.facilityImages || []),
    ...(gallery.equipmentImages || []),
    ...(gallery.uniformImages || []),
    ...(data.images || []),
    ...(data.awardsImages || []),
  ].length;
};

const countAchievements = (data = {}) => {
  const highlights = (data.achievementHighlights || []).filter((item) =>
    hasText(item?.title),
  ).length;

  const medals = data.achievements
    ? Object.values(data.achievements).reduce((sum, level) => {
        return (
          sum +
          Number(level?.gold || 0) +
          Number(level?.silver || 0) +
          Number(level?.bronze || 0)
        );
      }, 0)
    : 0;

  return highlights || medals;
};

const getSectionMeta = (data = {}) => {
  const categoriesOk =
    data.categories &&
    typeof data.categories === "object" &&
    Object.values(data.categories).some(
      (subs) => Array.isArray(subs) && subs.length > 0,
    );

  const basicComplete = [
    data.instituteName,
    data.organizationType,
    data.yearFounded,
    data.profileImageUrl,
    data.founderName,
    data.designation,
    data.description,
  ].every(hasText) && categoriesOk;

  const locationComplete = [
    data.street,
    data.landmark,
    data.phoneNumber,
    data.email,
  ].every(hasText);

  const achievementCount = countAchievements(data);
  const programCount = (data.trainingPrograms || []).filter((p) =>
    hasText(p?.programName),
  ).length;
  const packageCount =
    data.pricing?.packages?.filter(
      (p) => hasText(p?.subCategory) || hasText(p?.name) || hasText(p?.monthlyFee),
    )?.length || (hasText(data.pricing?.monthlyFees) ? 1 : 0);
  const facilitiesComplete =
    hasText(data.facilitiesInfrastructure) ||
    (data.facilityTags || []).length > 0;
  const photoCount = countPhotos(data);

  const completedCount = [
    basicComplete,
    locationComplete,
    achievementCount > 0,
    programCount > 0,
    packageCount > 0,
    facilitiesComplete,
    photoCount > 0,
  ].filter(Boolean).length;

  return {
    percent: Math.round((completedCount / 7) * 100),
    items: [
      {
        id: 1,
        title: "Basic Information",
        desc: "Name, type, contact & description.",
        icon: User,
        statusType: basicComplete ? "complete" : "pending",
        status: basicComplete ? "Complete" : "Add details",
      },
      {
        id: 2,
        title: "Location & Accessibility",
        desc: "Address, map pin & contact details.",
        icon: MapPin,
        statusType: locationComplete ? "complete" : "pending",
        status: locationComplete ? "Complete" : "Add details",
      },
      {
        id: 3,
        title: "Achievements & Trust",
        desc: "Awards, medals and years of operation.",
        icon: Trophy,
        statusType: achievementCount > 0 ? "count" : "pending",
        status:
          achievementCount > 0 ? `${achievementCount} Added` : "Add details",
      },
      {
        id: 4,
        title: "Programs & Classes",
        desc: "Sports, age groups and class timings.",
        icon: CalendarDays,
        statusType: programCount > 0 ? "complete" : "pending",
        status: programCount > 0 ? "Complete" : "Add details",
      },
      {
        id: 5,
        title: "Fees & Packages",
        desc: "Monthly fees, packages and policies.",
        icon: IndianRupee,
        statusType: packageCount > 0 ? "count" : "pending",
        status: packageCount > 0 ? `${packageCount} Packages` : "Add details",
      },
      {
        id: 6,
        title: "Facilities",
        desc: "Infrastructure and amenities.",
        icon: Building2,
        statusType: facilitiesComplete ? "complete" : "pending",
        status: facilitiesComplete ? "Complete" : "Add details",
      },
      {
        id: 7,
        title: "Photos & Videos",
        desc: "Gallery, training photos and reels.",
        icon: ImageIcon,
        statusType: photoCount > 0 ? "count" : "pending",
        status: photoCount > 0 ? `${photoCount} Photos` : "Add details",
      },
      {
        id: 8,
        title: "Preview Public Profile",
        desc: "See how visitors view your academy.",
        icon: Eye,
        statusType: "none",
        status: "",
      },
    ],
  };
};

const MyAccountLayout = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [institute, setInstitute] = useState(null);
  const [kycDone, setKycDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitute = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const [instSnap, kycSnap] = await Promise.all([
          getDoc(doc(db, "institutes", user.uid)),
          getDoc(doc(db, "institutes", user.uid, "Kyc", "details")),
        ]);

        setInstitute(instSnap.exists() ? instSnap.data() : {});
        setKycDone(kycSnap.exists());
      } catch (error) {
        console.error("Error loading account hub:", error);
        setInstitute({});
      }

      setLoading(false);
    };

    if (step === 0) fetchInstitute();
  }, [user, step]);

  const meta = useMemo(() => getSectionMeta(institute || {}), [institute]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicInformation setStep={setStep} />;
      case 2:
        return <LocationAccessibility setStep={setStep} />;
      case 3:
        return <AchievementsTrack setStep={setStep} />;
      case 4:
        return <TrainingProgram setStep={setStep} />;
      case 5:
        return <PricingTransparency setStep={setStep} />;
      case 6:
        return <FacilitiesInfrastructure setStep={setStep} />;
      case 7:
        return <MediaGallery setStep={setStep} />;
      case 8:
        return <ProfilePreview setStep={setStep} />;
      default:
        return null;
    }
  };

  if (step !== 0) {
    return (
      <AccountPageShell fill>
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {renderStep()}
        </div>
      </AccountPageShell>
    );
  }

  const locationLabel =
    [institute?.city, institute?.state].filter(Boolean).join(", ") ||
    institute?.locationName ||
    institute?.street ||
    "Add your location";

  return (
    <AccountPageShell fill>
      {loading ? (
        <p className="text-gray-500 text-sm py-10 text-center">Loading account...</p>
      ) : (
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-2">
          <div className="bg-orange-500 rounded-2xl p-4 sm:p-5 text-white shadow-sm">
            <div className="flex items-start gap-3">
              {institute?.profileImageUrl ? (
                <img
                  src={institute.profileImageUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/40 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
                  {(institute?.instituteName || "A").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[17px] sm:text-xl font-bold truncate">
                    {institute?.instituteName || "Your Academy"}
                  </h2>
                  {kycDone && (
                    <BadgeCheck size={18} className="text-blue-100 shrink-0" />
                  )}
                </div>
                <p className="text-white/90 text-sm mt-0.5">
                  {institute?.organizationType || "Sports Academy"}
                </p>
                <p className="text-white/85 text-xs sm:text-sm flex items-center gap-1 mt-1">
                  <MapPin size={13} />
                  <span className="truncate">{locationLabel}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(8)}
              className="mt-4 w-full min-h-[44px] rounded-xl border border-white/80 text-white font-semibold text-sm active:bg-white/10"
            >
              View Public Profile
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900">Profile Completion</p>
              <p className="font-bold text-orange-500">{meta.percent}%</p>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${meta.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Complete your profile to get more visibility & trust.
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {meta.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-3.5 py-3.5 flex items-center gap-3 text-left shadow-sm active:scale-[0.99] transition"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-[15px] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.statusType === "complete" ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <CheckCircle2 size={14} />
                        Complete
                      </span>
                    ) : item.statusType === "count" ||
                      item.statusType === "pending" ? (
                      <span className="text-orange-500 text-xs font-semibold">
                        {item.status}
                      </span>
                    ) : null}
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AccountPageShell>
  );
};

export default MyAccountLayout;
