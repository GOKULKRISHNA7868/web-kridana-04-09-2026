/* =========================================================
   SALARY & EXPENSES PAGE
   FULL UPDATED CODE
   - Salary Firebase Save
   - Expense Firebase Save
   - Expense Fetch
   - Responsive UI
   - Modern Design
   - ALL CONDITIONS + LOGICS PRESERVED
========================================================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../../firebase";

import { useAuth } from "../../context/AuthContext";

import {
  Search,
  CalendarDays,
  ChevronDown,
  Users,
  Wallet,
  Clock3,
  Phone,
  Pencil,
  Trash2,
  X,
  Plus,
  Receipt,
  Home,
  Zap,
  Droplets,
  Wrench,
  Wifi,
  Megaphone,
  Package,
  Building2,
  Check,
} from "lucide-react";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];
const EXPENSE_CATEGORIES = [
  {
    label: "Rent",
    icon: Home,
  },
  {
    label: "Electricity",
    icon: Zap,
  },
  {
    label: "Water",
    icon: Droplets,
  },
  {
    label: "Equipment",
    icon: Package,
  },
  {
    label: "Internet",
    icon: Wifi,
  },
  {
    label: "Maintenance",
    icon: Wrench,
  },
  {
    label: "Marketing",
    icon: Megaphone,
  },
  {
    label: "Miscellaneous",
    icon: Building2,
  },
];
const formatCurrency = (num) => {
  if (!num) return "₹0";

  return `₹${Number(num).toLocaleString("en-IN")}`;
};

/** Prevent page scroll while a modal/popup is open */
const useLockBodyScroll = (locked) => {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    };

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      style.overflow = previous.overflow;
      style.position = previous.position;
      style.top = previous.top;
      style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
};

const SalaryDetailsPage = () => {
  const { user } = useAuth();

  const [trainers, setTrainers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");

  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const monthRef = useRef(null);

  const [editData, setEditData] = useState({
    monthlySalary: "",
    bonus: "",
    deductions: "",
    paidAmount: "",
    paymentMethod: "",
    transactionId: "",
    paidDate: "",
  });

  const [expenseData, setExpenseData] = useState({
    category: "",
    amount: "",
    paidThrough: "",
    paidDate: "",
  });

  useLockBodyScroll(showEditModal || showExpenseModal);

  /* CLICK OUTSIDE */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* FETCH TRAINERS */
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const q = query(
        collection(db, "InstituteTrainers"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      setTrainers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchData();
  }, [user]);

  /* FETCH SALARIES */
  useEffect(() => {
    if (!user) return;

    const fetchSalary = async () => {
      const q = query(
        collection(db, "instituteSalaries"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      setSalaries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchSalary();
  }, [user]);

  /* FETCH EXPENSES */
  useEffect(() => {
    if (!user) return;

    const fetchExpenses = async () => {
      const q = query(
        collection(db, "instituteExpenses"),
        where("instituteId", "==", user.uid),
      );

      const snap = await getDocs(q);

      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    fetchExpenses();
  }, [user]);

  /* FILTERED */
  const filteredTrainers = useMemo(() => {
    return trainers
      .filter((t) =>
        `${t.firstName} ${t.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
  }, [trainers, search]);

  /* GET SALARY */
  const getTrainerSalaryData = (trainer) => {
    const currentYear = new Date().getFullYear();

    const selectedMonthKey = `${currentYear}-${selectedMonth}`;

    const record = salaries.find(
      (s) =>
        s &&
        s.trainerId === trainer.id &&
        (s.month === selectedMonth || s.month === selectedMonthKey),
    );
    return {
      paid: Number(record?.paidAmount || 0),
      bonus: Number(record?.bonus || 0),
      deductions: Number(record?.deductions || 0),
      paymentMethod: record?.paymentMethod || "",
      transactionId: record?.transactionId || "",
      date: record?.paidDate || "",
    };
  };

  /* OPEN EDIT */
  const openEdit = (trainer) => {
    if (!selectedMonth) {
      alert("Please select month first");
      return;
    }

    setSelectedTrainer(trainer);

    const currentYear = new Date().getFullYear();

    const monthKey = `${currentYear}-${selectedMonth}`;

    const record = salaries.find(
      (s) =>
        s.trainerId === trainer.id &&
        (s.month === selectedMonth || s.month === monthKey),
    );

    setEditData({
      monthlySalary: trainer.monthlySalary || "",
      bonus: record?.bonus || "",
      deductions: record?.deductions || "",
      paidAmount: record?.paidAmount || "",
      paymentMethod: record?.paymentMethod || "",
      transactionId: record?.transactionId || "",
      paidDate: record?.paidDate || "",
    });

    setShowEditModal(true);
  };

  /* SAVE SALARY */
  /* SAVE SALARY */
  const saveSalary = async () => {
    if (!selectedTrainer) return;

    const {
      monthlySalary,
      bonus,
      deductions,
      paidAmount,
      paymentMethod,
      transactionId,
      paidDate,
    } = editData;

    const currentYear = new Date().getFullYear();

    const monthKey = `${currentYear}-${selectedMonth}`;

    const totalSalary =
      Number(monthlySalary || 0) + Number(bonus || 0) - Number(deductions || 0);

    const existing = salaries.find(
      (s) =>
        s.trainerId === selectedTrainer.id &&
        (s.month === selectedMonth || s.month === monthKey),
    );

    await setDoc(
      doc(db, "InstituteTrainers", selectedTrainer.id),
      {
        monthlySalary: Number(monthlySalary),
      },
      { merge: true },
    );

    let updatedSalaryDoc;

    if (existing) {
      updatedSalaryDoc = {
        ...existing,
        totalAmount: totalSalary,
        monthlySalary: Number(monthlySalary),
        bonus: Number(bonus),
        deductions: Number(deductions),
        paidAmount: Number(paidAmount),
        paymentMethod,
        transactionId,
        paidDate,
        updatedAt: new Date(),
      };

      await setDoc(
        doc(db, "instituteSalaries", existing.id),
        updatedSalaryDoc,
        { merge: true },
      );

      setSalaries((prev) =>
        prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                ...updatedSalaryDoc,
              }
            : item,
        ),
      );
    } else {
      const newRef = doc(collection(db, "instituteSalaries"));

      updatedSalaryDoc = {
        id: newRef.id,
        trainerId: selectedTrainer.id,
        instituteId: user.uid,
        totalAmount: totalSalary,
        monthlySalary: Number(monthlySalary),
        bonus: Number(bonus),
        deductions: Number(deductions),
        paidAmount: Number(paidAmount),
        paymentMethod,
        transactionId,
        paidDate,
        month: monthKey,
        createdAt: new Date(),
      };

      await setDoc(newRef, {
        ...updatedSalaryDoc,
        createdAt: serverTimestamp(),
      });

      setSalaries((prev) => [...prev, updatedSalaryDoc]);
    }

    alert("Salary Saved Successfully ✅");

    setShowEditModal(false);
  };
  /* SAVE EXPENSE */
  /* SAVE EXPENSE */
  const saveExpense = async () => {
    const { category, amount, paidThrough, paidDate } = expenseData;

    if (!category || !amount || !paidThrough || !paidDate) {
      alert("Please fill all fields");
      return;
    }

    const expenseMonth = paidDate.slice(0, 7);

    if (editingExpense) {
      const updatedExpense = {
        ...editingExpense,
        category,
        amount: Number(amount),
        paidThrough,
        paidDate,
        month: expenseMonth,
        updatedAt: new Date(),
      };

      await setDoc(
        doc(db, "instituteExpenses", editingExpense.id),
        updatedExpense,
        { merge: true },
      );

      setExpenses((prev) =>
        prev.map((item) =>
          item.id === editingExpense.id ? updatedExpense : item,
        ),
      );

      alert("Expense Updated Successfully ✅");
    } else {
      const newRef = doc(collection(db, "instituteExpenses"));

      const newExpense = {
        id: newRef.id,
        instituteId: user.uid,
        category,
        amount: Number(amount),
        paidThrough,
        paidDate,
        month: expenseMonth,
        createdAt: new Date(),
      };

      await setDoc(newRef, {
        ...newExpense,
        createdAt: serverTimestamp(),
      });

      setExpenses((prev) => [newExpense, ...prev]);

      alert("Expense Added Successfully ✅");
    }

    setExpenseData({
      category: "",
      amount: "",
      paidThrough: "",
      paidDate: "",
    });

    setEditingExpense(null);

    setShowExpenseModal(false);
  };
  /* TOTALS */
  /* TOTALS */

  const currentYear = new Date().getFullYear();

  const selectedMonthKey = selectedMonth
    ? `${currentYear}-${selectedMonth}`
    : "";

  const totalEmployees = trainers.length;

  /* TOTAL SALARY */
  const totalAmount = trainers.reduce(
    (sum, t) => sum + Number(t.monthlySalary || 0),
    0,
  );

  /* TOTAL PAID */
  const totalPaid = selectedMonth
    ? salaries
        .filter(
          (s) =>
            s &&
            s.month &&
            (s.month === selectedMonthKey || s.month === selectedMonth),
        )
        .reduce((sum, s) => sum + Number(s.paidAmount || 0), 0)
    : salaries.reduce((sum, s) => sum + Number(s?.paidAmount || 0), 0);

  /* PENDING */
  const totalPending =
    totalAmount - totalPaid < 0 ? 0 : totalAmount - totalPaid;

  /* FILTER EXPENSES */
  const filteredExpenses = selectedMonth
    ? expenses.filter(
        (e) =>
          e &&
          e.month &&
          (e.month === selectedMonthKey || e.month === selectedMonth),
      )
    : expenses;

  /* TOTAL EXPENSES */
  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);

    setExpenseData({
      category: expense.category || "",
      amount: expense.amount?.toString() || "",
      paidThrough: expense.paidThrough || "",
      paidDate: expense.paidDate || "",
    });

    setShowExpenseModal(true);
  };
  const handleDeleteExpense = async (expenseId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this expense?",
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "instituteExpenses", expenseId));

      setExpenses((prev) => prev.filter((item) => item.id !== expenseId));

      alert("Expense Deleted Successfully ✅");
    } catch (error) {
      console.error(error);

      alert("Failed to delete expense");
    }
  };
  return (
    <div className="bg-[#f7f7f7] px-3 sm:px-4 md:px-8 pt-4 pb-[calc(var(--bottom-navbar-height,64px)+20px)] md:pb-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Salary & Expenses
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage employee salaries and monthly records
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 mt-4 sm:mt-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="h-12 sm:h-14 w-full rounded-2xl bg-white border border-gray-200 pl-11 pr-4 outline-none text-[16px]"
          />
        </div>

        {/* MONTH */}
        <div ref={monthRef} className="relative">
          <button
            type="button"
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="h-12 sm:h-14 w-full rounded-2xl bg-white border border-gray-200 px-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarDays size={18} className="shrink-0 text-gray-600" />
              <span className="font-semibold text-sm sm:text-base truncate">
                {selectedMonth
                  ? MONTHS.find((m) => m.value === selectedMonth)?.label
                  : "Select Month"}
              </span>
            </div>
            <ChevronDown size={16} className="shrink-0" />
          </button>

          {showMonthDropdown && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border overflow-hidden z-50 max-h-64 overflow-y-auto">
              {MONTHS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m.value);
                    setShowMonthDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-orange-50 ${
                    selectedMonth === m.value
                      ? "bg-orange-50 text-[#FF6B00] font-semibold"
                      : ""
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 mt-4 sm:mt-5">
        <StatCard
          title="Employees"
          value={totalEmployees}
          icon={<Users size={20} />}
          bg="bg-orange-50"
          color="text-orange-600"
        />
        <StatCard
          title="Total Salary"
          value={formatCurrency(totalAmount)}
          icon={<Wallet size={20} />}
          bg="bg-green-50"
          color="text-green-600"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(totalPending)}
          icon={<Clock3 size={20} />}
          bg="bg-red-50"
          color="text-red-600"
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<Receipt size={20} />}
          bg="bg-blue-50"
          color="text-blue-600"
        />
      </div>

      {/* EMPLOYEES */}
      <div className="mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
          Employee Salary
        </h2>

        <div className="space-y-3 sm:space-y-4">
          {filteredTrainers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-10 text-center">
              <Users size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No employees found</p>
            </div>
          ) : (
            filteredTrainers.map((trainer) => {
              const data = getTrainerSalaryData(trainer);

              const totalSalary =
                Number(trainer.monthlySalary || 0) +
                Number(data.bonus || 0) -
                Number(data.deductions || 0);

              const isPaid =
                totalSalary > 0 && Number(data.paid) >= totalSalary;

              return (
                <div
                  key={trainer.id}
                  className="bg-white rounded-2xl sm:rounded-[24px] border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_240px] gap-4 sm:gap-6">
                      {/* LEFT */}
                      <div className="flex gap-3 min-w-0">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-600">
                          {trainer.firstName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold truncate">
                            {trainer.firstName} {trainer.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {trainer.designation || "Trainer"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-sm">
                            <Phone size={14} className="shrink-0" />
                            <span className="truncate">
                              {trainer.phone || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CENTER */}
                      <div className="space-y-2.5 sm:space-y-3">
                        <EditableSalaryRow
                          trainer={trainer}
                          value={trainer.monthlySalary || 0}
                          setTrainers={setTrainers}
                        />
                        <SalaryRow
                          title="Bonus"
                          value={formatCurrency(data.bonus || 0)}
                        />
                        <SalaryRow
                          title="Deductions"
                          value={formatCurrency(data.deductions || 0)}
                        />
                        <div className="pt-3 border-t flex justify-between items-end gap-2">
                          <span className="font-bold text-sm sm:text-base">
                            Total Salary
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-[#FF6B00] text-lg sm:text-xl block">
                              {formatCurrency(totalSalary)}
                            </span>
                            {Number(data.paid || 0) > 0 && (
                              <span className="text-xs sm:text-sm text-green-600 font-semibold">
                                Paid: {formatCurrency(data.paid)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT */}
                      <div>
                        <span
                          className={`inline-flex px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                            isPaid
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isPaid ? "Paid" : "Pending"}
                        </span>
                        <p className="text-sm text-gray-500 mt-3">
                          {isPaid ? `Paid on ${data.date}` : "Not paid yet"}
                        </p>
                        <div className="space-y-2 mt-3">
                          <button
                            type="button"
                            onClick={() => openEdit(trainer)}
                            className="min-h-[44px] h-11 w-full rounded-xl border px-3 text-left text-sm"
                          >
                            {data.paymentMethod || "Select method"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(trainer)}
                            className={`min-h-[44px] h-11 w-full rounded-xl font-semibold text-sm ${
                              isPaid
                                ? "border border-orange-300 text-orange-500"
                                : "bg-[#FF6B00] text-white"
                            }`}
                          >
                            {isPaid ? "Edit Salary" : "Mark as Paid"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isPaid && (
                    <div className="bg-green-50 px-4 sm:px-5 py-3 border-t border-green-100">
                      <p className="text-green-700 font-semibold text-sm">
                        Payment via {data.paymentMethod || "—"}
                      </p>
                      {data.transactionId ? (
                        <p className="text-xs sm:text-sm text-green-700 mt-0.5">
                          Transaction ID: {data.transactionId}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EXPENSES */}
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            Maintenance Expenses
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditingExpense(null);
              setExpenseData({
                category: "",
                amount: "",
                paidThrough: "",
                paidDate: "",
              });
              setShowExpenseModal(true);
            }}
            className="shrink-0 min-h-[44px] h-11 px-3.5 sm:px-4 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <Receipt size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">No expenses yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedMonth
                ? "No expenses for this month. Tap Add to record one."
                : "Tap Add to record rent, utilities, and other costs."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 px-3.5 sm:px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {expense.category}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {expense.paidDate || "—"}
                    {expense.paidThrough ? ` · ${expense.paidThrough}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 text-sm sm:text-base">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditExpense(expense)}
                    className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600"
                    aria-label="Edit expense"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-red-500"
                    aria-label="Delete expense"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SALARY MODAL */}
      {showEditModal && (
        <ModalForm
          data={editData}
          setData={setEditData}
          onClose={() => setShowEditModal(false)}
          onSave={saveSalary}
        />
      )}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <ExpenseModal
          data={expenseData}
          setData={setExpenseData}
          isEdit={Boolean(editingExpense)}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSave={saveExpense}
        />
      )}
    </div>
  );
};

/* STAT CARD */
const StatCard = ({ title, value, icon, bg, color }) => (
  <div
    className={`${bg} rounded-2xl border border-transparent p-3 sm:p-4 min-w-0`}
  >
    <div className={`${color}`}>{icon}</div>
    <p className="mt-2 text-gray-600 font-medium text-xs sm:text-sm truncate">
      {title}
    </p>
    <h3
      className={`${color} mt-1 font-bold leading-tight break-words text-base sm:text-xl md:text-2xl`}
    >
      {value}
    </h3>
  </div>
);

const SalaryRow = ({ title, value }) => (
  <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
    <span className="text-gray-600">{title}</span>
    <span className="font-semibold shrink-0">{value}</span>
  </div>
);

const EditableSalaryRow = ({ trainer, value, setTrainers }) => {
  const [open, setOpen] = useState(false);
  const [salary, setSalary] = useState(value);

  useLockBodyScroll(open);

  useEffect(() => {
    setSalary(value);
  }, [value]);

  const saveSalary = async () => {
    try {
      await setDoc(
        doc(db, "InstituteTrainers", trainer.id),
        {
          monthlySalary: Number(salary || 0),
        },
        { merge: true },
      );

      setTrainers((prev) =>
        prev.map((item) =>
          item.id === trainer.id
            ? {
                ...item,
                monthlySalary: Number(salary || 0),
              }
            : item,
        ),
      );

      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to update salary");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 text-sm sm:text-base">
        <span className="text-gray-600">Base Salary</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-[#FF6B00]"
        >
          {formatCurrency(value)}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[10050] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-bold">Edit base salary</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="font-semibold text-sm block mb-2">
              Monthly salary
            </label>
            <input
              autoFocus
              inputMode="numeric"
              value={salary}
              onChange={(e) =>
                setSalary(e.target.value.replace(/[^0-9]/g, ""))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") saveSalary();
              }}
              className="h-12 w-full rounded-xl border px-4 outline-none text-[16px]"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-200 font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSalary}
                className="flex-1 min-h-[48px] rounded-xl bg-[#FF6B00] text-white font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* SALARY MODAL */
const ModalForm = ({ data, setData, onClose, onSave }) => (
  <div
    className="fixed inset-0 z-[10040] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-none"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[min(92dvh,920px)] flex flex-col shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
      <div className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between shrink-0">
        <h2 className="text-lg sm:text-xl font-bold">Update salary</h2>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
        <div>
          <label className="font-semibold text-sm block mb-2">
            Monthly salary
          </label>
          <input
            autoFocus
            inputMode="numeric"
            value={data.monthlySalary}
            onChange={(e) =>
              setData({
                ...data,
                monthlySalary: e.target.value.replace(/[^0-9]/g, ""),
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
            }}
            className="h-12 w-full rounded-xl border px-4 outline-none text-[16px]"
          />
        </div>
        <InputBox
          label="Bonus"
          value={data.bonus}
          onChange={(v) =>
            setData({
              ...data,
              bonus: v.replace(/[^0-9]/g, ""),
            })
          }
        />
        <InputBox
          label="Deductions"
          value={data.deductions}
          onChange={(v) =>
            setData({
              ...data,
              deductions: v.replace(/[^0-9]/g, ""),
            })
          }
        />
        <InputBox
          label="Paid amount"
          value={data.paidAmount}
          onChange={(v) =>
            setData({
              ...data,
              paidAmount: v.replace(/[^0-9]/g, ""),
            })
          }
        />
        <InputBox
          label="Payment method"
          value={data.paymentMethod}
          onChange={(v) =>
            setData({
              ...data,
              paymentMethod: v,
            })
          }
        />
        <InputBox
          label="Transaction ID"
          value={data.transactionId}
          onChange={(v) =>
            setData({
              ...data,
              transactionId: v,
            })
          }
        />
        <div>
          <label className="font-semibold text-sm block mb-2">Paid date</label>
          <input
            type="date"
            value={data.paidDate}
            onChange={(e) =>
              setData({
                ...data,
                paidDate: e.target.value,
              })
            }
            className="h-12 w-full rounded-xl border px-4 outline-none text-[16px]"
          />
        </div>
      </div>

      <div className="shrink-0 border-t bg-white px-4 sm:px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-gray-200 font-semibold text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-[1.4] min-h-[48px] rounded-xl bg-[#FF6B00] text-white font-bold"
          >
            Save salary
          </button>
        </div>
      </div>
    </div>
  </div>
);

/* EXPENSE MODAL */
const ExpenseModal = ({ data, setData, onClose, onSave, isEdit = false }) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[10040] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[min(92dvh,920px)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
        <div className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">
            {isEdit ? "Edit expense" : "Add expense"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
          <div ref={dropdownRef}>
            <label className="font-semibold text-sm block mb-2">
              Expense category
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="h-12 w-full rounded-xl border px-4 flex items-center justify-between bg-white"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {data.category &&
                  (() => {
                    const found = EXPENSE_CATEGORIES.find(
                      (c) => c.label === data.category,
                    );
                    const Icon = found?.icon;
                    return Icon ? (
                      <Icon size={18} className="text-orange-500 shrink-0" />
                    ) : null;
                  })()}
                <span
                  className={`text-sm truncate ${
                    data.category ? "text-black" : "text-gray-400"
                  }`}
                >
                  {data.category || "Select category"}
                </span>
              </div>
              <ChevronDown size={16} className="shrink-0" />
            </button>

            {showCategoryDropdown && (
              <div className="mt-2 bg-white border rounded-2xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto overscroll-contain">
                {EXPENSE_CATEGORIES.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setData({
                          ...data,
                          category: item.label,
                        });
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-orange-50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-orange-600" />
                        </div>
                        <span className="font-medium text-sm truncate">
                          {item.label}
                        </span>
                      </div>
                      {data.category === item.label && (
                        <Check size={16} className="text-green-600 shrink-0" />
                      )}
                    </button>
                  );
                })}

                <div className="border-t p-3 bg-gray-50">
                  <p className="font-semibold text-xs mb-2">Custom category</p>
                  <div className="flex gap-2">
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter name"
                      className="h-11 flex-1 min-w-0 rounded-xl border px-3 outline-none bg-white text-[16px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customCategory.trim()) return;
                        setData({
                          ...data,
                          category: customCategory.trim(),
                        });
                        setCustomCategory("");
                        setShowCategoryDropdown(false);
                      }}
                      className="h-11 px-4 rounded-xl bg-[#FF6B00] text-white text-sm font-semibold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <InputBox
            label="Amount paid"
            value={data.amount}
            onChange={(v) =>
              setData({
                ...data,
                amount: v.replace(/[^0-9]/g, ""),
              })
            }
          />
          <InputBox
            label="Paid through"
            value={data.paidThrough}
            onChange={(v) =>
              setData({
                ...data,
                paidThrough: v,
              })
            }
          />
          <div>
            <label className="font-semibold text-sm block mb-2">Paid date</label>
            <input
              type="date"
              value={data.paidDate}
              onChange={(e) =>
                setData({
                  ...data,
                  paidDate: e.target.value,
                })
              }
              className="h-12 w-full rounded-xl border px-4 outline-none text-[16px]"
            />
          </div>
        </div>

        <div className="shrink-0 border-t bg-white px-4 sm:px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border border-gray-200 font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-[1.4] min-h-[48px] rounded-xl bg-[#FF6B00] text-white font-bold"
            >
              Save expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InputBox = ({ label, value, onChange }) => (
  <div>
    <label className="font-semibold text-sm block mb-2">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-xl border px-4 outline-none text-[16px]"
    />
  </div>
);

export default SalaryDetailsPage;
