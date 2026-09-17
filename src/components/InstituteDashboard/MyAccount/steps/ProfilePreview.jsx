import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAccountScope } from "../AccountScopeContext";
import {
  MapPin,
  Star,
  Phone,
  MessageCircle,
  BadgeCheck,
} from "lucide-react";
import StepHeader from "../StepHeader";
import { formatRupee } from "../sportCategories";

const ProfilePreview = ({
  setStep,
  compact = false,
  dataOverride = null,
  instituteId: instituteIdProp,
}) => {
  const { instituteId: scopeId } = useAccountScope();
  const instituteId = instituteIdProp || scopeId;
  const [data, setData] = useState(dataOverride);
  const [loading, setLoading] = useState(!dataOverride);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  useEffect(() => {
    if (dataOverride) {
      setData(dataOverride);
      setLoading(false);
      return;
    }

    const load = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "institutes", instituteId));
        setData(snap.exists() ? snap.data() : {});
      } catch (err) {
        console.error(err);
        setData({});
      }
      setLoading(false);
    };
    load();
  }, [instituteId, dataOverride]);

  if (loading) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        Loading preview...
      </p>
    );
  }

  const photos = [
    ...(data?.mediaGallery?.trainingImages || []),
    ...(data?.mediaGallery?.facilityImages || []),
    ...(data?.mediaGallery?.equipmentImages || []),
    ...(data?.mediaGallery?.uniformImages || []),
    ...(data?.images || []),
    ...(data?.awardsImages || []),
  ]
    .map((item) => (typeof item === "string" ? item : item?.url))
    .filter(Boolean);

  const hero = photos[0] || data?.profileImageUrl || "";
  const programs = (data?.trainingPrograms || []).filter((p) => p.programName);
  const sports = data?.categories ? Object.values(data.categories).flat() : [];
  const sportCards = Object.entries(data?.sportDetails || {}).flatMap(
    ([category, sportsMap]) =>
      Object.entries(sportsMap || {}).map(([name, info]) => ({
        category,
        name,
        shortDescription: info?.shortDescription || "",
      })),
  );
  const highlightCount = (data?.achievementHighlights || []).filter(
    (a) => a?.title,
  ).length;
  const medalCount = data?.achievements
    ? Object.values(data.achievements).reduce((sum, level) => {
        return (
          sum +
          Number(level?.gold || 0) +
          Number(level?.silver || 0) +
          Number(level?.bronze || 0)
        );
      }, 0)
    : 0;
  const years =
    data?.yearsInOperation ||
    (data?.yearFounded
      ? Math.max(0, new Date().getFullYear() - Number(data.yearFounded))
      : 0);
  const students = data?.totalStudentsTrained || 0;
  const about = data?.description || data?.designation || "";
  const location =
    [data?.city, data?.state].filter(Boolean).join(", ") ||
    data?.locationName ||
    data?.street ||
    "Location not added";
  const visiblePhotos = showAllPhotos
    ? photos
    : photos.slice(0, compact ? 4 : 4);
  const rating = Number(data?.rating || 0);
  const reviewCount = Number(data?.reviewCount || 0);

  return (
    <div className={`w-full ${compact ? "pb-4" : "pb-6"}`}>
      {!compact && setStep && (
        <StepHeader title="Preview Public Profile" onBack={() => setStep(0)} hideSave />
      )}

      <div
        className={`relative overflow-hidden ${
          compact ? "rounded-none" : "rounded-2xl"
        }`}
      >
        {hero ? (
          <img
            src={hero}
            alt="Academy"
            className={`w-full object-cover ${compact ? "h-36" : "h-52"}`}
          />
        ) : (
          <div
            className={`w-full bg-gradient-to-br from-orange-200 to-orange-400 ${
              compact ? "h-36" : "h-52"
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div
        className={`relative bg-white shadow-md p-4 flex items-start gap-3 ${
          compact ? "-mt-8 mx-2 rounded-xl" : "-mt-12 mx-1 rounded-2xl"
        }`}
      >
        {data?.profileImageUrl ? (
          <img
            src={data.profileImageUrl}
            alt=""
            className={`rounded-full object-cover border-2 border-white shadow ${
              compact ? "w-12 h-12" : "w-16 h-16"
            }`}
          />
        ) : (
          <div
            className={`rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white shadow ${
              compact ? "w-12 h-12 text-base" : "w-16 h-16 text-xl"
            }`}
          >
            {(data?.instituteName || "A").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h2
              className={`font-bold text-gray-900 truncate ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {data?.instituteName || "Your Academy"}
            </h2>
            <BadgeCheck size={compact ? 14 : 16} className="text-blue-500 shrink-0" />
          </div>
          <p className={`text-gray-500 ${compact ? "text-xs" : "text-sm"}`}>
            {data?.organizationType || "Sports Academy"}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={12} className="text-[#FF6A00]" />
            <span className="truncate">{location}</span>
          </p>
          {(rating > 0 || reviewCount > 0) && (
            <p className="text-xs text-gray-700 flex items-center gap-1 mt-1">
              <Star size={12} className="text-[#FF6A00] fill-[#FF6A00]" />
              <span className="font-semibold">
                {rating ? rating.toFixed(1) : "New"}
              </span>
              {reviewCount > 0 && (
                <span className="text-gray-400">· {reviewCount} reviews</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-2 ${compact ? "mt-3 px-2" : "mt-4"}`}>
        {[
          { value: years ? `${years}+` : "0", label: "Years" },
          { value: students ? `${students}+` : "0", label: "Students" },
          {
            value: `${highlightCount || medalCount || 0}+`,
            label: "Awards",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-slate-50 rounded-xl px-2 py-2.5 text-center border border-slate-100"
          >
            <p className="text-sm font-bold text-gray-900">{item.value}</p>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className={`${compact ? "mt-3 px-3" : "mt-5"}`}>
        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">About Us</h3>
        <p
          className={`text-sm text-gray-600 leading-relaxed ${
            aboutOpen ? "" : "line-clamp-3"
          }`}
        >
          {about || "Add a short description in Basic Information."}
        </p>
        {!compact && about && about.length > 120 && (
          <button
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
            className="text-[#FF6A00] text-sm font-semibold mt-1"
          >
            {aboutOpen ? "Read Less" : "Read More"}
          </button>
        )}
      </div>

      {!compact && sportCards.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900 mb-2">Sports we teach</h3>
          <div className="space-y-2">
            {sportCards.map((sport) => (
              <div
                key={`${sport.category}-${sport.name}`}
                className="bg-gray-50 rounded-xl p-3"
              >
                <p className="font-semibold text-sm text-gray-900">
                  {sport.name}
                </p>
                <p className="text-[11px] text-gray-400">{sport.category}</p>
                {sport.shortDescription ? (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {sport.shortDescription}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {(programs.length > 0 || sports.length > 0) && (
        <div className={`${compact ? "mt-3 px-3" : "mt-5"}`}>
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">
            Programs Offered
          </h3>
          <div className="flex flex-wrap gap-2">
            {(programs.length
              ? programs.map(
                  (p) => p.programName || p.subCategory || p.category,
                )
              : sports)
              .filter(Boolean)
              .slice(0, compact ? 6 : 8)
              .map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 rounded-full bg-orange-50 text-[#FF6A00] text-xs font-medium"
                >
                  {name}
                </span>
              ))}
          </div>
        </div>
      )}

      {!compact &&
        Array.isArray(data?.pricing?.packages) &&
        data.pricing.packages.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold text-gray-900 mb-2">Fees & Packages</h3>
            <div className="space-y-2">
              {data.pricing.packages.map((pkg, i) => (
                <div key={pkg.id || i} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-sm text-gray-900">
                    {pkg.subCategory || pkg.name || "Class fees"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {pkg.category || ""}
                    {pkg.billingCycle ? ` · ${pkg.billingCycle}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pkg.monthlyFee ? (
                      <span className="text-[11px] bg-white border border-gray-100 px-2 py-1 rounded-full">
                        Monthly {formatRupee(pkg.monthlyFee)}
                      </span>
                    ) : null}
                    {pkg.yearlyFee ? (
                      <span className="text-[11px] bg-white border border-gray-100 px-2 py-1 rounded-full">
                        Yearly {formatRupee(pkg.yearlyFee)}
                      </span>
                    ) : null}
                    {pkg.registrationFee ? (
                      <span className="text-[11px] bg-white border border-gray-100 px-2 py-1 rounded-full">
                        Registration {formatRupee(pkg.registrationFee)}
                      </span>
                    ) : null}
                    {pkg.uniformFee ? (
                      <span className="text-[11px] bg-white border border-gray-100 px-2 py-1 rounded-full">
                        Kit {formatRupee(pkg.uniformFee)}
                      </span>
                    ) : null}
                    {pkg.otherFee ? (
                      <span className="text-[11px] bg-white border border-gray-100 px-2 py-1 rounded-full">
                        {pkg.otherFeeName || "Other"}{" "}
                        {formatRupee(pkg.otherFee)}
                      </span>
                    ) : null}
                  </div>
                  {pkg.notes ? (
                    <p className="text-xs text-gray-500 mt-2">{pkg.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
            {data.pricing.paymentMethods ? (
              <p className="text-xs text-gray-500 mt-2">
                Payments: {data.pricing.paymentMethods}
              </p>
            ) : null}
          </div>
        )}

      <div className={`${compact ? "mt-3 px-3" : "mt-5"}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm">Photos</h3>
          {!compact && photos.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllPhotos((v) => !v)}
              className="text-[#FF6A00] text-sm font-semibold"
            >
              {showAllPhotos ? "Show Less" : "See All"}
            </button>
          )}
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-400">No photos uploaded yet.</p>
        ) : (
          <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-4"}`}>
            {visiblePhotos.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt=""
                className="w-full aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            className="flex-1 min-h-[48px] rounded-xl border border-gray-300 font-semibold text-gray-900 flex items-center justify-center gap-2"
            onClick={() =>
              alert("Preview only — visitors will use this to message you.")
            }
          >
            <MessageCircle size={18} />
            Message
          </button>
          <a
            href={data?.phoneNumber ? `tel:${data.phoneNumber}` : undefined}
            onClick={(e) => {
              if (!data?.phoneNumber) {
                e.preventDefault();
                alert("Add a contact number in Location & Accessibility.");
              }
            }}
            className="flex-1 min-h-[48px] rounded-xl bg-[#FF6A00] text-white font-semibold flex items-center justify-center gap-2"
          >
            <Phone size={18} />
            Call Now
          </a>
        </div>
      )}
    </div>
  );
};

export default ProfilePreview;
