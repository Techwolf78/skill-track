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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        <Card className="border border-slate-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Assessment Submitted
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                {fromResubmit
                  ? "You have already submitted this assessment. Your responses have been recorded."
                  : "Your responses have been successfully recorded and submitted for evaluation."}
              </p>
            </motion.div>

            {/* Info pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs text-slate-700 text-left font-medium">All responses are securely stored and cannot be modified.</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3.5">
                <Clock className="w-5 h-5 text-[#4353a4] shrink-0" />
                <span className="text-xs text-slate-700 text-left font-medium">Results will be shared by your administrator once evaluation is complete.</span>
              </div>
            </motion.div>
          </CardContent>

          <CardFooter className="px-8 pb-8 flex justify-center">
            <div className="w-full text-center p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              You can close this tab now
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-4">
          You may safely close this window.
        </p>
      </motion.div>
    </div>
  );
}