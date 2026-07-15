import React, { useState, useEffect } from "react";
import { useProctoring } from "@/proctoring/ProctoringProvider";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Violation } from "../../types/proctoring.types";
import { motion, AnimatePresence } from "framer-motion";

export const ViolationToast: React.FC = () => {
  const { violations } = useProctoring();
  const [activeViolations, setActiveViolations] = useState<Violation[]>([]);

  useEffect(() => {
    if (violations.length > 0) {
      const newViolation = violations[violations.length - 1];
      
      // Only show toast if this is the absolute first occurrence of this violation type
      const firstIndexOfType = violations.findIndex(v => v.type === newViolation.type);
      const isFirstOccurrence = violations[firstIndexOfType]?.id === newViolation.id;

      if (isFirstOccurrence) {
        // Add new violation to display list
        setActiveViolations(prev => {
          // Keep only unique violations and limit to last 3 active
          const exists = prev.find(v => v.id === newViolation.id);
          if (exists) return prev;
          return [...prev, newViolation].slice(-3);
        });
      }
    }
  }, [violations]);

  const handleDismiss = (id: string) => {
    setActiveViolations(prev => prev.filter(v => v.id !== id));
  };
  
  if (activeViolations.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-1.5 w-60 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeViolations.map((violation) => (
          <motion.div
            key={violation.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
            layout
          >
            <ViolationItem violation={violation} onDismiss={() => handleDismiss(violation.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ViolationItem: React.FC<{ violation: Violation; onDismiss: () => void }> = ({ violation, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const severityColors = {
    LOW: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
    MEDIUM: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
    HIGH: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
    CRITICAL: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  };

  const severityIcons = {
    LOW: <Info className="h-3.5 w-3.5" />,
    MEDIUM: <AlertTriangle className="h-3.5 w-3.5" />,
    HIGH: <AlertTriangle className="h-3.5 w-3.5" />,
    CRITICAL: <AlertCircle className="h-3.5 w-3.5" />,
  };

  return (
    <div className={cn(
      "flex items-start gap-2 p-2.5 rounded-md border shadow-md pointer-events-auto",
      severityColors[violation.severity]
    )}>
      <div className="mt-0.5">
        {severityIcons[violation.severity]}
      </div>
      <div className="flex-1">
        <h4 className="text-[10px] font-bold leading-none mb-1">
          {violation.type.replace("_", " ")}
        </h4>
        <p className="text-[8px] opacity-80 leading-tight">
          {new Date(violation.timestamp).toLocaleTimeString()} - {violation.severity} severity
        </p>
      </div>
    </div>
  );
};
