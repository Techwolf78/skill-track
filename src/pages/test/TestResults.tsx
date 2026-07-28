import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestResults() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const fromResubmit = params.get("submitted") === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      {/* Ambient grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 w-full" />

          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-900/30"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
                Assessment Submitted
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                {fromResubmit
                  ? "You have already submitted this assessment. Your responses have been recorded."
                  : "Your responses have been successfully recorded and submitted for evaluation."}
              </p>
            </motion.div>

            {/* Info pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 text-left">All responses are securely stored and cannot be modified.</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-300 text-left">Results will be shared by your administrator once evaluation is complete.</span>
              </div>
              {sessionId && (
                <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-mono text-left break-all">
                    Session ID: <span className="text-slate-400">{sessionId}</span>
                  </span>
                </div>
              )}
            </motion.div>
          </CardContent>

          <CardFooter className="px-8 pb-8 flex justify-center">
            <div className="w-full text-center p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-xs text-slate-400">
              You can close this tab now
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-4 font-mono">
          You may safely close this window.
        </p>
      </motion.div>
    </div>
  );
}