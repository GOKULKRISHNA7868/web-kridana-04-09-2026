import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import {
  ACCESS_OPTIONS,
  normalizeTrainerAccess,
  trainerDisplayName,
  formatStaffTime,
} from "../../utils/trainerAccess";
import {
  Check,
  Shield,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

const accessSnapshot = (access) =>
  JSON.stringify(normalizeTrainerAccess(access));

const TrainerAccessPage = () => {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [savingId, setSavingId] = useState("");
  const [draftByTrainer, setDraftByTrainer] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "InstituteTrainers"),
      where("instituteId", "==", user.uid),
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        trainerUid: item.data().trainerUid || item.id,
      }));
      setTrainers(list);
      setDraftByTrainer((prev) => {
        const next = { ...prev };
        list.forEach((trainer) => {
          const saved = normalizeTrainerAccess(trainer.access);
          const hasPending =
            prev[trainer.id] &&
            accessSnapshot(prev[trainer.id]) !== accessSnapshot(saved);
          if (!hasPending) {
            next[trainer.id] = saved;
          }
        });
        return next;
      });
    });
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "institutes", user.uid, "staffAudit"),
      orderBy("createdAt", "desc"),
      limit(40),
    );
    return onSnapshot(
      q,
      (snap) => setLogs(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
      async () => {
        const snap = await getDocs(
          collection(db, "institutes", user.uid, "staffAudit"),
        );
        setLogs(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
    );
  }, [user]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(""), 3200);
    return () => clearTimeout(timer);
  }, [successToast]);

  const getDraftAccess = (trainer) =>
    draftByTrainer[trainer.id] ?? normalizeTrainerAccess(trainer.access);

  const hasPendingChanges = (trainer) => {
    const saved = normalizeTrainerAccess(trainer.access);
    const draft = getDraftAccess(trainer);
    return accessSnapshot(saved) !== accessSnapshot(draft);
  };

  const pendingTrainerCount = useMemo(
    () => trainers.filter(hasPendingChanges).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainers, draftByTrainer],
  );

  const toggleDraftAccess = (trainerId, key) => {
    setDraftByTrainer((prev) => {
      const current = prev[trainerId] || normalizeTrainerAccess({});
      return {
        ...prev,
        [trainerId]: { ...current, [key]: !current[key] },
      };
    });
  };

  const revertDraft = (trainer) => {
    setDraftByTrainer((prev) => ({
      ...prev,
      [trainer.id]: normalizeTrainerAccess(trainer.access),
    }));
  };

  const buildChangeList = (trainer) => {
    const saved = normalizeTrainerAccess(trainer.access);
    const draft = getDraftAccess(trainer);
    return ACCESS_OPTIONS.map((option) => {
      const wasOn = Boolean(saved[option.key]);
      const nowOn = Boolean(draft[option.key]);
      if (wasOn === nowOn) return null;
      return {
        ...option,
        wasOn,
        nowOn,
        type: nowOn ? "grant" : "revoke",
      };
    }).filter(Boolean);
  };

  const openConfirm = (trainer) => {
    const changes = buildChangeList(trainer);
    if (!changes.length) return;
    setConfirmModal({ trainer, changes });
  };

  const saveAccess = async () => {
    if (!confirmModal?.trainer) return;
    const { trainer } = confirmModal;
    const nextAccess = getDraftAccess(trainer);
    const changes = buildChangeList(trainer);
    setSavingId(trainer.id);
    try {
      await updateDoc(doc(db, "InstituteTrainers", trainer.id), {
        access: nextAccess,
        accessUpdatedAt: serverTimestamp(),
      });

      if (user?.uid) {
        const granted = changes.filter((c) => c.type === "grant");
        const revoked = changes.filter((c) => c.type === "revoke");
        const details = [
          granted.length
            ? `Granted: ${granted.map((c) => c.label).join(", ")}`
            : "",
          revoked.length
            ? `Removed: ${revoked.map((c) => c.label).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        await addDoc(collection(db, "institutes", user.uid, "staffAudit"), {
          instituteId: user.uid,
          trainerUid: trainer.trainerUid || trainer.id,
          trainerName: trainerDisplayName(trainer),
          action: "access_update",
          page: "Trainer access",
          details,
          createdAt: serverTimestamp(),
        });
      }

      setConfirmModal(null);
      setSuccessToast(
        `Access updated for ${trainerDisplayName(trainer)}`,
      );
    } catch (error) {
      console.error(error);
      alert("Could not update access. Please try again.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="pb-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-[#FF6A00] shrink-0" />
            Trainer access
          </h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Select permissions for each trainer, then tap{" "}
            <span className="font-semibold text-gray-700">OK</span> to confirm.
            Nothing is saved until you approve.
          </p>
        </div>
        {pendingTrainerCount > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1">
            {pendingTrainerCount} pending
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {trainers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
            <User size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">No academy trainers yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add trainers first, then manage their access here.
            </p>
          </div>
        ) : (
          trainers.map((trainer) => {
            const access = getDraftAccess(trainer);
            const name = trainerDisplayName(trainer);
            const pending = hasPendingChanges(trainer);
            const isSaving = savingId === trainer.id;

            return (
              <div
                key={trainer.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${
                  pending
                    ? "border-orange-200 shadow-md ring-1 ring-orange-100"
                    : "border-gray-100 shadow-sm"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {trainer.profileImageUrl ? (
                      <img
                        src={trainer.profileImageUrl}
                        alt=""
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <User size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate text-base">
                        {name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {trainer.subCategory || trainer.category || "Trainer"}
                      </p>
                    </div>
                    {pending ? (
                      <span className="shrink-0 text-[10px] sm:text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full">
                        Unsaved
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    {ACCESS_OPTIONS.map((option) => {
                      const enabled = Boolean(access[option.key]);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          disabled={isSaving}
                          onClick={() => toggleDraftAccess(trainer.id, option.key)}
                          className={`w-full flex items-center justify-between gap-3 min-h-[52px] sm:min-h-[56px] px-3 py-2.5 rounded-xl text-left transition active:scale-[0.99] ${
                            enabled
                              ? "bg-orange-50 border border-orange-200"
                              : "bg-gray-50 border border-transparent hover:border-gray-200"
                          } disabled:opacity-60`}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-800">
                              {option.label}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5 leading-snug">
                              {option.hint}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              enabled
                                ? "bg-[#FF6A00] border-[#FF6A00] text-white"
                                : "bg-white border-gray-300"
                            }`}
                          >
                            {enabled ? <Check size={14} strokeWidth={3} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pending ? (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => revertDraft(trainer)}
                      disabled={isSaving}
                      className="flex-1 min-h-[48px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => openConfirm(trainer)}
                      disabled={isSaving}
                      className="flex-1 min-h-[48px] rounded-xl bg-[#FF6A00] hover:bg-[#e85f00] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Check size={16} strokeWidth={2.5} />
                      OK · Review & save
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shield size={16} className="text-orange-500" />
          Changes made by trainers
        </h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Only the academy can see this log
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No trainer changes yet.</p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {logs.map((item) => (
              <div
                key={item.id}
                className="border border-gray-100 rounded-xl px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {item.trainerName || "Trainer"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.page}
                  {item.details ? ` · ${item.details}` : ""}
                </p>
                {formatStaffTime(item.createdAt) ? (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatStaffTime(item.createdAt)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal ? (
        <div className="fixed inset-0 z-[10050] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-confirm-title"
          >
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
              <h3
                id="access-confirm-title"
                className="text-lg font-bold text-gray-900 text-center"
              >
                Confirm access changes
              </h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                for{" "}
                <span className="font-semibold text-gray-800">
                  {trainerDisplayName(confirmModal.trainer)}
                </span>
              </p>
            </div>

            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-2.5">
              {confirmModal.changes.map((change) => (
                <div
                  key={change.key}
                  className={`flex items-start gap-3 rounded-xl px-3 py-3 border ${
                    change.type === "grant"
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  {change.type === "grant" ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600 shrink-0 mt-0.5"
                    />
                  ) : (
                    <AlertCircle
                      size={18}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        change.type === "grant"
                          ? "text-emerald-900"
                          : "text-red-900"
                      }`}
                    >
                      {change.type === "grant" ? "Allow" : "Remove"} ·{" "}
                      {change.label}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                      {change.hint}
                    </p>
                  </div>
                </div>
              ))}

              {confirmModal.changes.some((c) => c.type === "grant") ? (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed">
                  This trainer will be able to use the selected features from
                  their customer login. You can change or remove access anytime.
                </p>
              ) : null}
            </div>

            <div className="px-5 pt-2 pb-5 flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={Boolean(savingId)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X size={16} />
                Go back
              </button>
              <button
                type="button"
                onClick={saveAccess}
                disabled={Boolean(savingId)}
                className="flex-1 min-h-[48px] rounded-xl bg-[#FF6A00] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {savingId ? (
                  "Saving..."
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    Confirm access
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successToast ? (
        <div className="fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-auto bottom-[calc(var(--bottom-navbar-height,64px)+16px+env(safe-area-inset-bottom))] z-[10060] flex justify-center sm:justify-end pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
            <CheckCircle2 size={18} className="text-emerald-400" />
            {successToast}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TrainerAccessPage;
