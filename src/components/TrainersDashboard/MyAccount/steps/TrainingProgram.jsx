import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";
import { CalendarDays, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import StepHeader from "../StepHeader";
import CategoryFields from "../CategoryFields";
import { formatRupee } from "../../../InstituteDashboard/MyAccount/sportCategories";

const fieldClass = (hasError) =>
  `w-full min-h-[48px] text-base rounded-xl border ${
    hasError ? "border-red-500" : "border-gray-200"
  } bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`;

const emptyProgram = () => ({
  id: Date.now(),
  category: "",
  subCategory: "",
  programName: "",
  ageGroup: "",
  skillLevel: "",
  batchTimings: "",
  duration: "",
  fees: "",
  feeCycle: "Monthly",
  seatsAvailable: "",
  trialSessions: "",
});

const REQUIRED_FIELDS = [
  "category",
  "subCategory",
  "programName",
  "ageGroup",
  "skillLevel",
  "batchTimings",
  "duration",
  "fees",
  "feeCycle",
  "seatsAvailable",
  "trialSessions",
];

const toProgram = (item = {}) => ({
  ...emptyProgram(),
  ...item,
  id: item.id || Date.now(),
  fees: item.fees !== undefined && item.fees !== null ? String(item.fees) : "",
  seatsAvailable:
    item.seatsAvailable !== undefined && item.seatsAvailable !== null
      ? String(item.seatsAvailable)
      : "",
  feeCycle: item.feeCycle || "Monthly",
});

const TrainingProgram = ({ setStep }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState([emptyProgram()]);
  const [expandedId, setExpandedId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const [trainerSnap, activitySnap] = await Promise.all([
          getDoc(doc(db, "trainers", user.uid)),
          getDoc(doc(db, "myactivity", user.uid)),
        ]);

        const trainerData = trainerSnap.exists() ? trainerSnap.data() : {};
        const activity = activitySnap.exists() ? activitySnap.data() : {};

        if (
          Array.isArray(trainerData.trainingPrograms) &&
          trainerData.trainingPrograms.length
        ) {
          const loaded = trainerData.trainingPrograms.map(toProgram);
          setPrograms(loaded);
          setExpandedId(loaded[0]?.id || null);
        } else if (activity.programName) {
          const loaded = [toProgram(activity)];
          setPrograms(loaded);
          setExpandedId(loaded[0]?.id || null);
        }
      } catch (error) {
        console.error("Error loading training program:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleChange = (index, field, value) => {
    const updated = [...programs];
    updated[index][field] = value;
    if (field === "category") {
      updated[index].subCategory = "";
    }
    if (field === "subCategory" && !updated[index].programName) {
      updated[index].programName = value;
    }
    setPrograms(updated);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${index}-${field}`];
      if (field === "subCategory") delete next[`${index}-programName`];
      return next;
    });
  };

  const addProgram = () => {
    const next = emptyProgram();
    setPrograms((prev) => [...prev, next]);
    setExpandedId(next.id);
  };

  const removeProgram = (id) => {
    setPrograms((prev) => prev.filter((item) => item.id !== id));
  };

  const validate = () => {
    const newErrors = {};
    programs.forEach((program, index) => {
      REQUIRED_FIELDS.forEach((field) => {
        if (!program[field] || String(program[field]).trim() === "") {
          newErrors[`${index}-${field}`] = "Required";
        }
      });
      if (program.fees && isNaN(program.fees)) {
        newErrors[`${index}-fees`] = "Enter a valid amount";
      }
      if (program.seatsAvailable && isNaN(program.seatsAvailable)) {
        newErrors[`${index}-seatsAvailable`] = "Enter a valid number";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.uid) {
      alert("User not logged in");
      return;
    }
    if (!validate()) {
      alert("Please fill all required class details.");
      return;
    }

    try {
      setSaving(true);
      const normalized = programs.map((item) => ({
        ...item,
        fees: Number(item.fees),
        seatsAvailable: Number(item.seatsAvailable),
      }));
      const first = normalized[0] || {};
      const sportsOffered = [
        ...new Set(normalized.map((p) => p.subCategory).filter(Boolean)),
      ];

      await Promise.all([
        setDoc(
          doc(db, "trainers", user.uid),
          {
            trainingPrograms: normalized,
            sportsOffered,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
        setDoc(
          doc(db, "myactivity", user.uid),
          {
            programName: first.programName || "",
            category: first.category || "",
            subCategory: first.subCategory || "",
            ageGroup: first.ageGroup || "",
            skillLevel: first.skillLevel || "",
            batchTimings: first.batchTimings || "",
            duration: first.duration || "",
            fees: first.fees || 0,
            feeCycle: first.feeCycle || "Monthly",
            seatsAvailable: first.seatsAvailable || 0,
            trialSessions: first.trialSessions || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ]);

      alert("Programs saved. Students will see class and fee details clearly.");
    } catch (error) {
      console.error("Error saving training program:", error);
      alert("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Loading...</p>;
  }

  const err = (index, field) => errors[`${index}-${field}`];

  return (
    <div className="w-full pb-6">
      <StepHeader
        title="Programs & Classes"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <CalendarDays size={28} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-3">
          Programs & Classes
        </p>
        <p className="text-xs text-gray-500 mt-0.5 text-center px-2">
          Choose a category, then the sport. Students will see class, age and
          fee clearly.
        </p>
      </div>

      {programs.map((program, index) => {
        const open = expandedId === program.id;
        return (
          <div
            key={program.id}
            className="border border-gray-100 rounded-xl p-4 mb-3 bg-white shadow-sm"
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => setExpandedId(open ? null : program.id)}
              >
                <p className="font-semibold text-gray-900">
                  {program.programName ||
                    program.subCategory ||
                    `Class ${index + 1}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {program.category || "Select category"}
                  {program.subCategory ? ` · ${program.subCategory}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {program.ageGroup || "Age group not set"}
                  {program.duration ? ` · ${program.duration}` : ""}
                  {program.fees
                    ? ` · ${formatRupee(program.fees)} / ${program.feeCycle || "Monthly"}`
                    : ""}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : program.id)}
                className="w-10 h-10 flex items-center justify-center text-gray-500"
              >
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {programs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProgram(program.id)}
                  className="w-10 h-10 flex items-center justify-center text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {open && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                <CategoryFields
                  category={program.category || ""}
                  subCategory={program.subCategory || ""}
                  onCategoryChange={(value) =>
                    handleChange(index, "category", value)
                  }
                  onSubCategoryChange={(value) =>
                    handleChange(index, "subCategory", value)
                  }
                  categoryError={err(index, "category")}
                  subCategoryError={err(index, "subCategory")}
                />

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Class name shown to students
                  </label>
                  <input
                    placeholder="e.g. Kids Karate — Morning Batch"
                    value={program.programName}
                    onChange={(e) =>
                      handleChange(index, "programName", e.target.value)
                    }
                    className={fieldClass(err(index, "programName"))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Age group
                  </label>
                  <select
                    value={program.ageGroup}
                    onChange={(e) =>
                      handleChange(index, "ageGroup", e.target.value)
                    }
                    className={fieldClass(err(index, "ageGroup"))}
                  >
                    <option value="">Who can join?</option>
                    <option>01 – 10 years Kids</option>
                    <option>11 – 20 years Teenage</option>
                    <option>21 – 45 years Adults</option>
                    <option>45 – 60 years Middle Age</option>
                    <option>61 – 100 years Senior Citizens</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Skill level
                  </label>
                  <select
                    value={program.skillLevel}
                    onChange={(e) =>
                      handleChange(index, "skillLevel", e.target.value)
                    }
                    className={fieldClass(err(index, "skillLevel"))}
                  >
                    <option value="">Select skill level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Class days & time
                  </label>
                  <input
                    placeholder="Mon – Fri | 6:00 PM – 7:00 PM"
                    value={program.batchTimings}
                    onChange={(e) =>
                      handleChange(index, "batchTimings", e.target.value)
                    }
                    className={fieldClass(err(index, "batchTimings"))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Session duration
                  </label>
                  <input
                    placeholder="e.g. 45 minutes / session"
                    value={program.duration}
                    onChange={(e) =>
                      handleChange(index, "duration", e.target.value)
                    }
                    className={fieldClass(err(index, "duration"))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Class fee (₹)
                    </label>
                    <input
                      inputMode="numeric"
                      placeholder="e.g. 2500"
                      value={program.fees}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "fees",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      className={fieldClass(err(index, "fees"))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Fee period
                    </label>
                    <select
                      value={program.feeCycle || "Monthly"}
                      onChange={(e) =>
                        handleChange(index, "feeCycle", e.target.value)
                      }
                      className={fieldClass(err(index, "feeCycle"))}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Per Session">Per Session</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Seats available
                  </label>
                  <input
                    inputMode="numeric"
                    placeholder="e.g. 25"
                    value={program.seatsAvailable}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "seatsAvailable",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    className={fieldClass(err(index, "seatsAvailable"))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Free trial class?
                  </label>
                  <select
                    value={program.trialSessions}
                    onChange={(e) =>
                      handleChange(index, "trialSessions", e.target.value)
                    }
                    className={fieldClass(err(index, "trialSessions"))}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes — trial available</option>
                    <option value="No">No trial</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addProgram}
        className="w-full min-h-[48px] border-2 border-dashed border-orange-400 rounded-xl text-orange-500 font-semibold"
      >
        + Add another class
      </button>
    </div>
  );
};

export default TrainingProgram;
