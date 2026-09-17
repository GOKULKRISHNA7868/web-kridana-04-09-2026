import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAccountScope } from "../AccountScopeContext";
import { IndianRupee, Trash2, Pencil } from "lucide-react";
import StepHeader from "../StepHeader";
import CategoryFields from "../CategoryFields";
import { formatRupee } from "../sportCategories";

const emptyPackage = () => ({
  id: Date.now(),
  category: "",
  subCategory: "",
  billingCycle: "Monthly",
  monthlyFee: "",
  yearlyFee: "",
  registrationFee: "",
  uniformFee: "",
  otherFeeName: "",
  otherFee: "",
  notes: "",
});

const BILLING_OPTIONS = [
  "Monthly",
  "Quarterly",
  "Half-Yearly",
  "Yearly",
  "Per Session",
];

const fieldClass = (hasError) =>
  `w-full min-h-[48px] text-base rounded-xl border ${
    hasError ? "border-red-500" : "border-gray-200"
  } bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`;

const digitsOnly = (value) => value.replace(/\D/g, "");

const PricingTransparency = ({ setStep, onSaved }) => {
  const { instituteId } = useAccountScope();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    paymentMethods: "",
    refundPolicy: "",
  });
  const [packages, setPackages] = useState([]);
  const [draft, setDraft] = useState(emptyPackage());
  const [editingIndex, setEditingIndex] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [yearlyEdited, setYearlyEdited] = useState(false);

  const yearlyFromMonthly = (monthly) => {
    const amount = Number(digitsOnly(String(monthly || "")));
    if (!amount) return "";
    return String(amount * 12);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }

      try {
        const instituteSnap = await getDoc(doc(db, "institutes", instituteId));
        if (instituteSnap.exists()) {
          const data = instituteSnap.data();
          const pricing = data?.pricing || {};

          setFormData({
            paymentMethods: pricing.paymentMethods ?? "",
            refundPolicy: pricing.refundPolicy ?? "",
          });

          if (Array.isArray(pricing.packages) && pricing.packages.length) {
            setPackages(pricing.packages);
          } else if (pricing.monthlyFees || pricing.registrationFees) {
            setPackages([
              {
                ...emptyPackage(),
                monthlyFee: String(pricing.monthlyFees || ""),
                registrationFee: String(pricing.registrationFees || ""),
                uniformFee: String(pricing.uniformCost || ""),
                billingCycle: "Monthly",
                notes: "General academy fees — add category & sport",
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Error loading pricing:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [instituteId]);

  const openAdd = () => {
    setDraft(emptyPackage());
    setEditingIndex(null);
    setFormErrors({});
    setYearlyEdited(false);
    setShowForm(true);
  };

  const openEdit = (index) => {
    const item = { ...emptyPackage(), ...packages[index] };
    setDraft(item);
    setEditingIndex(index);
    setFormErrors({});
    const monthly = Number(item.monthlyFee || 0);
    setYearlyEdited(
      Boolean(
        item.yearlyFee &&
          monthly &&
          Number(item.yearlyFee) !== monthly * 12,
      ),
    );
    setShowForm(true);
  };

  const validateDraft = () => {
    const next = {};
    if (!draft.category) next.category = "Select a category";
    if (!draft.subCategory) next.subCategory = "Select the sport";
    if (!draft.monthlyFee && !draft.yearlyFee && !draft.otherFee) {
      next.monthlyFee = "Add monthly, yearly, or other fee";
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDraft = () => {
    if (!validateDraft()) return;

    const item = {
      ...draft,
      id: draft.id || Date.now(),
      monthlyFee: digitsOnly(String(draft.monthlyFee || "")),
      yearlyFee: digitsOnly(String(draft.yearlyFee || "")),
      registrationFee: digitsOnly(String(draft.registrationFee || "")),
      uniformFee: digitsOnly(String(draft.uniformFee || "")),
      otherFee: digitsOnly(String(draft.otherFee || "")),
    };

    setPackages((prev) => {
      if (editingIndex !== null) {
        const copy = [...prev];
        copy[editingIndex] = item;
        return copy;
      }
      return [...prev, item];
    });

    setShowForm(false);
    setDraft(emptyPackage());
    setEditingIndex(null);
  };

  const validate = () => {
    const next = {};
    if (!packages.length) {
      next.packages = "Add at least one sport fee so students can see pricing.";
    }
    if (!formData.paymentMethods?.trim()) {
      next.paymentMethods = "Tell students how they can pay";
    }
    if (!formData.refundPolicy?.trim()) {
      next.refundPolicy = "Add a short refund policy";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!instituteId) return;
    if (showForm) {
      alert("Save or cancel the fee form first.");
      return;
    }
    if (!validate()) {
      alert("Please complete the highlighted fields.");
      return;
    }

    try {
      setSaving(true);
      const first = packages[0] || {};
      await setDoc(
        doc(db, "institutes", instituteId),
        {
          pricing: {
            packages,
            paymentMethods: formData.paymentMethods,
            refundPolicy: formData.refundPolicy,
            monthlyFees: Number(first.monthlyFee || 0),
            registrationFees: Number(first.registrationFee || 0),
            uniformCost: Number(first.uniformFee || 0),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      onSaved?.("Fees & Packages");
    } catch (error) {
      console.error("Error saving pricing:", error);
      alert("Error saving data");
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="text-gray-500 p-6 text-center">Loading...</p>;
  }

  return (
    <div className="w-full pb-6 max-w-2xl mx-auto">
      <StepHeader
        title="Fees & Packages"
        subtitle="Section 5 of 8"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col items-center mb-5 pb-5 border-b border-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
          <IndianRupee size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">
          Fees & Packages
        </p>
        <p className="text-xs text-gray-500 mt-0.5 text-center px-2">
          Add fees by category and sport. Students will see monthly, yearly and
          other charges clearly.
        </p>
      </div>

      <div className="space-y-3 mb-3">
        {packages.map((pkg, index) => (
          <div
            key={pkg.id || index}
            className="bg-white border border-gray-100 rounded-xl p-3.5"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {pkg.subCategory || "Sport not selected"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pkg.category || "Category missing"}
                  {pkg.billingCycle ? ` · Billed ${pkg.billingCycle}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pkg.monthlyFee ? (
                    <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      Monthly {formatRupee(pkg.monthlyFee)}
                    </span>
                  ) : null}
                  {pkg.yearlyFee ? (
                    <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      Yearly {formatRupee(pkg.yearlyFee)}
                    </span>
                  ) : null}
                  {pkg.registrationFee ? (
                    <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      Registration {formatRupee(pkg.registrationFee)}
                    </span>
                  ) : null}
                  {pkg.uniformFee ? (
                    <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      Kit / Uniform {formatRupee(pkg.uniformFee)}
                    </span>
                  ) : null}
                  {pkg.otherFee ? (
                    <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {pkg.otherFeeName || "Other"} {formatRupee(pkg.otherFee)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEdit(index)}
                className="w-10 h-10 flex items-center justify-center text-orange-500"
                aria-label="Edit fee"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPackages((prev) => prev.filter((_, i) => i !== index))
                }
                className="w-10 h-10 flex items-center justify-center text-red-500"
                aria-label="Delete fee"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {errors.packages && (
        <p className="text-red-500 text-xs mb-3">{errors.packages}</p>
      )}

      {showForm && (
        <div className="bg-white border border-orange-100 rounded-2xl p-4 space-y-4 mb-4">
          <p className="font-semibold text-gray-900 text-sm">
            {editingIndex !== null ? "Edit sport fees" : "Add sport fees"}
          </p>

          <CategoryFields
            category={draft.category}
            subCategory={draft.subCategory}
            onCategoryChange={(value) =>
              setDraft((p) => ({ ...p, category: value, subCategory: "" }))
            }
            onSubCategoryChange={(value) =>
              setDraft((p) => ({ ...p, subCategory: value }))
            }
            categoryError={formErrors.category}
            subCategoryError={formErrors.subCategory}
          />

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              How students pay
            </label>
            <select
              className={fieldClass(false)}
              value={draft.billingCycle}
              onChange={(e) =>
                setDraft((p) => ({ ...p, billingCycle: e.target.value }))
              }
            >
              {BILLING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Monthly fee (₹)
              </label>
              <input
                inputMode="numeric"
                placeholder="e.g. 2500"
                value={draft.monthlyFee}
                onChange={(e) => {
                  const monthlyFee = digitsOnly(e.target.value);
                  setDraft((p) => ({
                    ...p,
                    monthlyFee,
                    yearlyFee: yearlyEdited
                      ? p.yearlyFee
                      : yearlyFromMonthly(monthlyFee),
                  }));
                }}
                className={fieldClass(formErrors.monthlyFee)}
              />
              {formErrors.monthlyFee && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.monthlyFee}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Yearly fee (₹)
              </label>
              <input
                inputMode="numeric"
                placeholder="e.g. 25000"
                value={draft.yearlyFee}
                onChange={(e) => {
                  setYearlyEdited(true);
                  setDraft((p) => ({
                    ...p,
                    yearlyFee: digitsOnly(e.target.value),
                  }));
                }}
                className={fieldClass(false)}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {yearlyEdited
                  ? "Custom yearly fee. You can still edit this."
                  : "Filled as monthly × 12. You can edit it."}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Registration / admission (₹)
              </label>
              <input
                inputMode="numeric"
                placeholder="One-time fee"
                value={draft.registrationFee}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    registrationFee: digitsOnly(e.target.value),
                  }))
                }
                className={fieldClass(false)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Uniform / kit (₹)
              </label>
              <input
                inputMode="numeric"
                placeholder="Optional"
                value={draft.uniformFee}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    uniformFee: digitsOnly(e.target.value),
                  }))
                }
                className={fieldClass(false)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Other fee (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Name (e.g. Exam fee)"
                value={draft.otherFeeName}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, otherFeeName: e.target.value }))
                }
                className={fieldClass(false)}
              />
              <input
                inputMode="numeric"
                placeholder="Amount"
                value={draft.otherFee}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    otherFee: digitsOnly(e.target.value),
                  }))
                }
                className={fieldClass(false)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              What students should know
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Includes 12 sessions / month. Uniform extra."
              value={draft.notes}
              onChange={(e) =>
                setDraft((p) => ({ ...p, notes: e.target.value }))
              }
              className={`${fieldClass(false)} min-h-[72px] resize-none`}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingIndex(null);
              }}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="flex-1 min-h-[44px] rounded-xl bg-orange-500 text-white font-semibold"
            >
              {editingIndex !== null ? "Update fees" : "Add fees"}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={openAdd}
          className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-orange-400 text-orange-500 font-semibold mb-5"
        >
          + Add fees for a sport
        </button>
      )}

      <div className="space-y-4 mt-2">
        <p className="text-sm font-semibold text-gray-900">Academy policies</p>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Payment methods students can use{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            name="paymentMethods"
            placeholder="UPI / Cash / Card / Bank transfer"
            value={formData.paymentMethods}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^[A-Za-z/, ]*$/.test(value)) return;
              setFormData((p) => ({
                ...p,
                paymentMethods: value.replace(/\b\w/g, (c) => c.toUpperCase()),
              }));
              setErrors((p) => ({ ...p, paymentMethods: "" }));
            }}
            className={fieldClass(errors.paymentMethods)}
          />
          {errors.paymentMethods && (
            <p className="text-red-500 text-xs mt-1">{errors.paymentMethods}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Refund policy <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Registration fee is non-refundable. Monthly fee can be paused with 7 days notice."
            value={formData.refundPolicy}
            onChange={(e) => {
              setFormData((p) => ({ ...p, refundPolicy: e.target.value }));
              setErrors((p) => ({ ...p, refundPolicy: "" }));
            }}
            className={`${fieldClass(errors.refundPolicy)} min-h-[88px] resize-none`}
          />
          {errors.refundPolicy && (
            <p className="text-red-500 text-xs mt-1">{errors.refundPolicy}</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PricingTransparency;
