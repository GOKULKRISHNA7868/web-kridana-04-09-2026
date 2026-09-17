import React, { useEffect, useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useAccountScope } from "../AccountScopeContext";
import { CalendarDays, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import StepHeader from "../StepHeader";
import CategoryFields from "../CategoryFields";
import { formatRupee } from "../sportCategories";
import ClassSchedulePicker, {
  parseSchedule,
} from "../../../shared/ClassSchedulePicker";

const fieldClass = (hasError) =>
  `w-full min-h-[48px] text-base rounded-xl border ${
    hasError ? "border-red-500" : "border-gray-200"
  } bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100`;

const AGE_OPTIONS = [
  "01 – 10 years Kids",
  "11 – 20 years Teenage",
  "21 – 45 years Adults",
  "45 – 60 years Middle Age",
  "61 – 100 years Senior Citizens",
];

const normalizeAgeGroups = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const emptyProgram = () => ({
  id: Date.now(),
  category: "",
  subCategory: "",
  programName: "",
  ageGroup: "",
  ageGroups: [],
  skillLevel: "",
  batchTimings: "",
  classDays: [],
  startTime: "",
  endTime: "",
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

const TrainingProgram = ({ setStep, onSaved }) => {
  const { instituteId } = useAccountScope();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState([emptyProgram()]);
  const [expandedId, setExpandedId] = useState(null);
  const [errors, setErrors] = useState({});
  const [agePickerIndex, setAgePickerIndex] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!instituteId) {
        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, "institutes", instituteId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (
            Array.isArray(data.trainingPrograms) &&
            data.trainingPrograms.length
          ) {
            setPrograms(
              data.trainingPrograms.map((item) => {
                const ageGroups = normalizeAgeGroups(
                  item.ageGroups || item.ageGroup,
                );
                const schedule = parseSchedule(item);
                return {
                  ...item,
                  ageGroups,
                  ageGroup: ageGroups.join(", "),
                  classDays: schedule.days,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  batchTimings:
                    item.batchTimings ||
                    [schedule.days.join(", "), [schedule.startTime, schedule.endTime].filter(Boolean).join(" – ")]
                      .filter(Boolean)
                      .join(" | "),
                };
              }),
            );
            setExpandedId(data.trainingPrograms[0]?.id || null);
          }
        }
      } catch (error) {
        console.error("Error loading training program:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [instituteId]);

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
        if (field === "ageGroup") {
          const groups = normalizeAgeGroups(
            program.ageGroups || program.ageGroup,
          );
          if (!groups.length) {
            newErrors[`${index}-ageGroup`] = "Required";
          }
          return;
        }
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
    if (!instituteId) {
      alert("User not logged in");
      return;
    }
    if (!validate()) {
      alert("Please fill all required class details.");
      return;
    }

    try {
      setSaving(true);
      const sportsOffered = [
        ...new Set(programs.map((p) => p.subCategory).filter(Boolean)),
      ];
      await setDoc(
        doc(db, "institutes", instituteId),
        {
          trainingPrograms: programs.map((item) => {
            const ageGroups = normalizeAgeGroups(
              item.ageGroups || item.ageGroup,
            );
            return {
              ...item,
              ageGroups,
              ageGroup: ageGroups.join(", "),
              fees: Number(item.fees),
              seatsAvailable: Number(item.seatsAvailable),
            };
          }),
          sportsOffered,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      onSaved?.("Programs & Classes");
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

  const toggleAgeGroup = (index, option) => {
    const current = normalizeAgeGroups(
      programs[index].ageGroups || programs[index].ageGroup,
    );
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    const updated = [...programs];
    updated[index].ageGroups = next;
    updated[index].ageGroup = next.join(", ");
    setPrograms(updated);
    setErrors((prev) => {
      const copy = { ...prev };
      if (next.length) delete copy[`${index}-ageGroup`];
      return copy;
    });
  };

  const selectedAges = (program) =>
    normalizeAgeGroups(program.ageGroups || program.ageGroup);

  return (
    <div className="w-full pb-6 max-w-2xl mx-auto">
      <StepHeader
        title="Programs & Classes"
        subtitle="Section 4 of 8"
        onBack={() => setStep?.(0)}
        onSave={handleSave}
        saving={saving}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col items-center mb-5 pb-5 border-b border-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
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
                  {selectedAges(program).join(" · ") || "Age group not set"}
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
                    Who can join?
                  </label>
                  <button
                    type="button"
                    onClick={() => setAgePickerIndex(index)}
                    className={`${fieldClass(err(index, "ageGroup"))} text-left flex items-center justify-between gap-2`}
                  >
                    <span
                      className={`min-w-0 truncate ${
                        selectedAges(program).length
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {selectedAges(program).length
                        ? selectedAges(program).join(", ")
                        : "Select 1 or more age groups"}
                    </span>
                    <ChevronDown size={18} className="shrink-0 text-gray-400" />
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    You can select 2 or 3 groups at a time.
                  </p>
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
                  <ClassSchedulePicker
                    days={parseSchedule(program).days}
                    startTime={parseSchedule(program).startTime}
                    endTime={parseSchedule(program).endTime}
                    error={!!err(index, "batchTimings")}
                    onChange={({ classDays, startTime, endTime, batchTimings }) => {
                      const updated = [...programs];
                      updated[index].classDays = classDays;
                      updated[index].startTime = startTime;
                      updated[index].endTime = endTime;
                      updated[index].batchTimings = batchTimings;
                      setPrograms(updated);
                      setErrors((prev) => {
                        const next = { ...prev };
                        if (batchTimings) delete next[`${index}-batchTimings`];
                        return next;
                      });
                    }}
                  />
                  {err(index, "batchTimings") && (
                    <p className="text-red-500 text-xs mt-1">
                      Select class days and start time
                    </p>
                  )}
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
                    {program.feeCycle === "Monthly" && program.fees ? (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Yearly ≈ ₹{(Number(program.fees) * 12).toLocaleString("en-IN")}
                      </p>
                    ) : null}
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

                {Object.keys(errors).some((k) => k.startsWith(`${index}-`)) && (
                  <p className="text-red-500 text-xs">
                    Please complete the highlighted class details.
                  </p>
                )}
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

      {agePickerIndex !== null && programs[agePickerIndex] && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAgePickerIndex(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Who can join?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select all age groups this class is for
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAgePickerIndex(null)}
                className="text-orange-500 font-semibold text-sm min-h-[40px] px-2"
              >
                Done
              </button>
            </div>
            <div className="divide-y border-t border-gray-100">
              {AGE_OPTIONS.map((option) => {
                const selected = selectedAges(programs[agePickerIndex]).includes(
                  option,
                );
                return (
                  <button
                    type="button"
                    key={option}
                    onClick={() => toggleAgeGroup(agePickerIndex, option)}
                    className="w-full min-h-[52px] flex items-center justify-between gap-3 py-3 text-left"
                  >
                    <span className="text-[15px] text-gray-800">{option}</span>
                    <span
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        selected
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selected ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TrainingProgram;
