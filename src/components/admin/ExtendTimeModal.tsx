import React, { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { testService, TestSession } from "@/lib/test-service";

export interface ExtendTimeCandidateSession {
  id: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  testTitle?: string;
  formattedRemaining?: string;
  remainingSeconds?: number;
}

export interface ExtendTimeModalProps {
  isOpen: boolean;
  session: ExtendTimeCandidateSession | null;
  onClose: () => void;
  onSuccess?: (updatedSession: TestSession) => void;
}

export const ExtendTimeModal: React.FC<ExtendTimeModalProps> = ({
  isOpen,
  session,
  onClose,
  onSuccess,
}) => {
  const [minutes, setMinutes] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      setMinutes(15);
      setError("");
      setSuccessMsg("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const handleExtend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!minutes || minutes < 1 || minutes > 180) {
      setError("Please specify a duration between 1 and 180 minutes.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const updatedSession = await testService.extendTime(session.id, minutes);

      setSuccessMsg(
        `Successfully added +${minutes} min${minutes > 1 ? "s" : ""}!`
      );

      if (onSuccess) {
        onSuccess(updatedSession);
      }

      setTimeout(() => {
        onClose();
        setSuccessMsg("");
      }, 1200);
    } catch (err: unknown) {
      let errMsg = "Failed to extend candidate time. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        errMsg = axiosErr.response?.data?.message || errMsg;
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Extend Time</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleExtend} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Minutes
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={minutes || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                setMinutes(val);
              }}
              placeholder="15"
              disabled={loading}
              autoFocus
              className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
            />
            <p className="text-[11px] text-slate-400">
              Specify the extra duration to add (minimum 1 minute, maximum 180 minutes).
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !minutes || minutes < 1 || minutes > 180}
              className="px-4 py-2 text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Extend Time</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtendTimeModal;
