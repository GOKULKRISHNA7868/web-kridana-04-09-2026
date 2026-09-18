import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useSelectedStudent } from "../../context/SelectedStudentContext";
import { useNavigate } from "react-router-dom";

const sumExtras = (extras = []) =>
  (Array.isArray(extras) ? extras : []).reduce(
    (sum, row) => sum + Number(row?.amount || 0),
    0,
  );

const resolveCharge = (sport, record) => {
  if (record?.feeWaived) {
    return {
      baseFee: 0,
      extras: [],
      extraTotal: 0,
      total: 0,
      paid: 0,
      due: 0,
      isPaid: true,
      waived: true,
      reason: record.waiveReason || "Fee waived",
    };
  }

  const extras = Array.isArray(record?.extras) ? record.extras : [];
  const extraTotal = sumExtras(extras);

  if (!record) {
    const baseFee = Number(sport?.fee || 0);
    return {
      baseFee,
      extras: [],
      extraTotal: 0,
      total: baseFee,
      paid: 0,
      due: baseFee,
      isPaid: false,
      waived: false,
      reason: "",
    };
  }

  const baseFee = Number(
    record.baseFee ??
      (record.totalAmount != null
        ? Number(record.totalAmount) - extraTotal
        : sport?.fee ?? 0),
  );
  const total = Number(record.totalAmount ?? baseFee + extraTotal);
  const paid = Number(record.paidAmount || 0);
  const due = Math.max(0, total - paid);

  return {
    baseFee,
    extras,
    extraTotal,
    total,
    paid,
    due,
    isPaid: due <= 0,
    waived: false,
    reason: "",
  };
};

const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PaymentOverview = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [generatedMonths, setGeneratedMonths] = useState([]);
  const { selectedStudentUid } = useSelectedStudent();
  const [user, setUser] = useState(null);
  const activeStudentId =
    selectedStudentUid && selectedStudentUid !== ""
      ? selectedStudentUid
      : user?.uid;
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [feeHistory, setFeeHistory] = useState([]);
  const navigate = useNavigate();

  const sports = useMemo(() => {
    const list = Array.isArray(student?.sports) ? student.sports : [];
    return list.filter(
      (s) =>
        (!selectedCategory || s.category === selectedCategory) &&
        (!selectedSubCategory || s.subCategory === selectedSubCategory),
    );
  }, [student, selectedCategory, selectedSubCategory]);

  const findRecord = (monthKey, sport) =>
    feeHistory.find(
      (f) =>
        f.month === monthKey &&
        f.category === sport.category &&
        f.subCategory === sport.subCategory,
    );

  const sortedMonths = useMemo(() => {
    if (!student?.sports?.length) return [...generatedMonths].reverse();
    return [...generatedMonths].sort((a, b) => {
      const aDue = student.sports.some((sport) => {
        const c = resolveCharge(sport, findRecord(a.key, sport));
        return !c.isPaid && c.due > 0;
      });
      const bDue = student.sports.some((sport) => {
        const c = resolveCharge(sport, findRecord(b.key, sport));
        return !c.isPaid && c.due > 0;
      });
      if (aDue === bDue) return b.key.localeCompare(a.key);
      return aDue ? -1 : 1;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedMonths, student, feeHistory]);

  const pendingMonths = sortedMonths.filter((month) =>
    sports.some((sport) => {
      const c = resolveCharge(sport, findRecord(month.key, sport));
      return !c.isPaid && c.due > 0;
    }),
  ).length;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeStudentId || activeStudentId === "") return;

    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "trainerstudents", activeStudentId));
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const studentData = snap.data();
        setStudent(studentData);

        const feesSnap = await getDocs(
          query(
            collection(db, "institutesFees"),
            where("studentId", "==", activeStudentId),
          ),
        );
        const history = feesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFeeHistory(history);

        if (studentData?.createdAt?.toDate) {
          const startDate = studentData.createdAt.toDate();
          const today = new Date();
          const monthsArray = [];
          const tempDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            1,
          );

          while (
            tempDate.getFullYear() < today.getFullYear() ||
            (tempDate.getFullYear() === today.getFullYear() &&
              tempDate.getMonth() <= today.getMonth())
          ) {
            const monthName = tempDate.toLocaleString("default", {
              month: "long",
            });
            const year = tempDate.getFullYear();
            const monthKey = `${year}-${String(tempDate.getMonth() + 1).padStart(2, "0")}`;
            monthsArray.push({
              month: monthName,
              year,
              key: monthKey,
              current:
                tempDate.getFullYear() === today.getFullYear() &&
                tempDate.getMonth() === today.getMonth(),
            });
            tempDate.setMonth(tempDate.getMonth() + 1);
          }
          setGeneratedMonths(monthsArray);
        }

        if (studentData.monthlyDate) {
          const today = new Date().getDate();
          const dueDay = Number(studentData.monthlyDate);
          setShowReminder(today >= dueDay - 5 && today < dueDay);
        }
      } catch (err) {
        console.error("Error fetching trainer student fees:", err);
      }
      setLoading(false);
    };

    fetchStudentData();
  }, [activeStudentId]);

  const buildPayItem = (sport, charge) => ({
    category: sport.category,
    subCategory: sport.subCategory,
    amount: charge.due,
    baseFee: charge.baseFee,
    extras: charge.extras,
    extraTotal: charge.extraTotal,
    totalAmount: charge.total,
  });

  const goToPayment = (monthKey, items) => {
    const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    if (totalAmount <= 0) return;
    navigate("/trainerpaymentselection", {
      state: {
        totalAmount,
        studentId: activeStudentId,
        studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        month: monthKey,
        items,
        student,
        instituteId: student.trainerId || student.instituteId || "",
      },
    });
  };

  if (loading) {
    return (
      <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-slate-500">
        Loading fees...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-full min-h-[240px] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-slate-700">No fee data found</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#FF6A00] text-white text-sm font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  let expectedTotalFee = 0;
  let pendingFee = 0;
  let totalPaid = 0;

  sortedMonths.forEach((m) => {
    sports.forEach((sport) => {
      const c = resolveCharge(sport, findRecord(m.key, sport));
      if (c.waived) return;
      expectedTotalFee += c.total;
      pendingFee += c.due;
      totalPaid += c.paid;
    });
  });

  const categories = [
    ...new Set((student.sports || []).map((s) => s.category).filter(Boolean)),
  ];
  const subCategories = [
    ...new Set(
      (student.sports || [])
        .filter((s) => !selectedCategory || s.category === selectedCategory)
        .map((s) => s.subCategory)
        .filter(Boolean),
    ),
  ];

  return (
    <div className="h-full min-h-0 bg-[#F5F6F8] flex flex-col overflow-hidden rounded-2xl">
      <div
        className="shrink-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-5"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 py-2.5 max-w-4xl mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              Fees & payments
            </h1>
            <p className="text-xs text-slate-500">
              Coach fees, extras and pay now
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4">
        <div className="max-w-4xl mx-auto w-full space-y-4 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory("");
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 min-h-[44px] text-sm outline-none focus:border-[#FF6A00]"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 min-h-[44px] text-sm outline-none focus:border-[#FF6A00]"
            >
              <option value="">All sports</option>
              {subCategories.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF6A00] flex items-center justify-center text-xl font-bold shrink-0">
                {(student.firstName || "S").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-300">Student</p>
                <h2 className="text-lg font-bold truncate">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Due day: {student.monthlyDate || "—"}th of each month
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-300 inline-flex items-center gap-1">
                  <IndianRupee size={12} /> Pending overall
                </p>
                <p className="text-3xl font-bold text-[#FFB347] mt-0.5">
                  {formatINR(pendingFee)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
              <p className="text-[11px] text-slate-500">Expected</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {formatINR(expectedTotalFee)}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3 text-center">
              <p className="text-[11px] text-emerald-600">Paid</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">
                {formatINR(totalPaid)}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-orange-100 p-3 text-center">
              <p className="text-[11px] text-[#FF6A00]">Open months</p>
              <p className="text-sm font-bold text-[#FF6A00] mt-1">
                {pendingMonths}
              </p>
            </div>
          </div>

          {showReminder ? (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="text-[#FF6A00] shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Payment reminder
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Fee is due on the {student.monthlyDate}th
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 px-0.5">
              Month-wise details
            </h3>

            {sortedMonths.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
                No fee months yet
              </div>
            ) : (
              sortedMonths.map((item) => {
                const rows = sports.map((sport) => {
                  const charge = resolveCharge(
                    sport,
                    findRecord(item.key, sport),
                  );
                  return { sport, charge };
                });
                const monthDue = rows.reduce(
                  (s, r) => s + (r.charge.due || 0),
                  0,
                );
                const unpaidRows = rows.filter(
                  (r) => !r.charge.isPaid && r.charge.due > 0,
                );

                return (
                  <div
                    key={item.key}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                  >
                    <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">
                            {item.month} {item.year}
                          </h4>
                          {item.current ? (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <CalendarDays size={12} />
                          Due {item.month} {student.monthlyDate || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {monthDue > 0 ? (
                          <>
                            <span className="text-sm font-bold text-red-600">
                              Due {formatINR(monthDue)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                goToPayment(
                                  item.key,
                                  unpaidRows.map(({ sport, charge }) =>
                                    buildPayItem(sport, charge),
                                  ),
                                )
                              }
                              className="min-h-[40px] px-3.5 rounded-xl bg-[#FF6A00] text-white text-xs font-semibold"
                            >
                              Pay month
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={14} />
                            Settled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {rows.map(({ sport, charge }, i) => (
                        <div
                          key={`${sport.subCategory}-${i}`}
                          className="p-4 sm:p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {sport.category} · {sport.subCategory}
                              </p>

                              {charge.waived ? (
                                <p className="text-xs text-amber-700 mt-1">
                                  {charge.reason}
                                </p>
                              ) : (
                                <div className="mt-2 space-y-1 text-sm">
                                  <div className="flex justify-between gap-4 text-slate-600 max-w-sm">
                                    <span>Monthly fee</span>
                                    <span className="font-medium text-slate-800">
                                      {formatINR(charge.baseFee)}
                                    </span>
                                  </div>
                                  {charge.extras.map((ex, xi) => (
                                    <div
                                      key={ex.id || xi}
                                      className="flex justify-between gap-4 text-slate-600 max-w-sm"
                                    >
                                      <span className="truncate">
                                        Extra
                                        {ex.note || ex.label
                                          ? ` · ${ex.note || ex.label}`
                                          : ""}
                                      </span>
                                      <span className="font-medium text-[#E85D04] shrink-0">
                                        {formatINR(ex.amount)}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between gap-4 max-w-sm pt-1 border-t border-slate-100 font-semibold text-slate-900">
                                    <span>Total</span>
                                    <span>{formatINR(charge.total)}</span>
                                  </div>
                                  {charge.paid > 0 ? (
                                    <div className="flex justify-between gap-4 max-w-sm text-emerald-700 text-xs font-medium">
                                      <span>Already paid</span>
                                      <span>{formatINR(charge.paid)}</span>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <div className="sm:text-right shrink-0">
                              {charge.isPaid ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 size={14} />
                                  Paid {formatINR(charge.paid || charge.total)}
                                </span>
                              ) : (
                                <>
                                  <p className="text-sm font-bold text-red-600 mb-2">
                                    Pay {formatINR(charge.due)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      goToPayment(item.key, [
                                        buildPayItem(sport, charge),
                                      ])
                                    }
                                    className="min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                                  >
                                    Pay now
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOverview;
