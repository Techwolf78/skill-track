import React from "react";
import { Clock, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TimeExtensionBannerProps {
  notice: string | null;
  onDismiss?: () => void;
  className?: string;
}

export const TimeExtensionBanner: React.FC<TimeExtensionBannerProps> = ({
  notice,
  onDismiss,
  className = "",
}) => {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`relative flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium shadow-lg shadow-emerald-950/30 backdrop-blur-sm ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{notice}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Auto-synced</span>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimeExtensionBanner;
