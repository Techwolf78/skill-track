import React from "react";

interface GryphonLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light" | "auto";
  iconOnly?: boolean;
  withAssessmentTag?: boolean;
  assessmentMark?: "wing" | "check-degree" | "both" | "classic";
}

export const GryphonLogo: React.FC<GryphonLogoProps> = ({
  className = "",
  size = "md",
  variant = "auto",
  iconOnly = false,
  withAssessmentTag = false,
  assessmentMark = "both",
}) => {
  const sizeMap = {
    sm: {
      icon: "w-7 h-7",
      text: "text-lg",
      num: "text-lg",
      deg: "w-2.5 h-2.5 -top-1",
      wing: "-top-1 -left-2 w-3.5 h-2.5",
      gap: "gap-2",
      tag: "text-[7.5px] tracking-[0.2em]",
    },
    md: {
      icon: "w-8 h-8",
      text: "text-xl",
      num: "text-xl",
      deg: "w-3 h-3 -top-1.5",
      wing: "-top-1.5 -left-2.5 w-4 h-3",
      gap: "gap-2.5",
      tag: "text-[8.5px] tracking-[0.22em]",
    },
    lg: {
      icon: "w-10 h-10",
      text: "text-2xl",
      num: "text-2xl",
      deg: "w-3.5 h-3.5 -top-2",
      wing: "-top-2 -left-3 w-5 h-3.5",
      gap: "gap-3",
      tag: "text-[9.5px] tracking-[0.24em]",
    },
    xl: {
      icon: "w-12 h-12",
      text: "text-3xl",
      num: "text-3xl",
      deg: "w-4 h-4 -top-2.5",
      wing: "-top-2.5 -left-3.5 w-6 h-4",
      gap: "gap-3.5",
      tag: "text-[10.5px] tracking-[0.26em]",
    },
  }[size];

  const primaryTextColor =
    variant === "dark"
      ? "text-white"
      : variant === "light"
      ? "text-slate-900"
      : "text-slate-900 dark:text-white";

  const primaryBlueColor =
    variant === "dark"
      ? "text-blue-400"
      : "text-blue-600 dark:text-blue-400";

  const showWing = assessmentMark === "wing" || assessmentMark === "both";
  const showCheckDegree = assessmentMark === "check-degree" || assessmentMark === "both";

  return (
    <div className={`inline-flex items-center select-none group ${sizeMap.gap} ${className}`}>
      {/* 🦅 Authentic G+A Geometric Silver Emblem */}
      <div className={`relative ${sizeMap.icon} shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
        <img
          src="/ga-icon-silver.png"
          alt="Gryphon 360"
          className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
        />
      </div>

      {/* 🏛️ VISA-Inspired Bold Italic Wordmark with Candidate Assessment Precision Marks */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="font-heading font-black italic uppercase leading-none flex items-baseline tracking-[-0.045em]">
            {/* GRYPHON with Visa-Style Golden Assessment Wing on 'G' */}
            <span className={`${sizeMap.text} ${primaryTextColor} transition-colors flex items-baseline`}>
              <span className="relative inline-flex items-baseline">
                {showWing && (
                  /* 🌟 VISA-Inspired Golden Assessment Wing / Test Checkmark Flick */
                  <svg
                    viewBox="0 0 24 16"
                    className={`absolute ${sizeMap.wing} text-amber-500 drop-shadow-[0_1px_4px_rgba(245,158,11,0.5)] pointer-events-none transition-transform duration-300 group-hover:scale-110`}
                    fill="currentColor"
                  >
                    {/* Dynamic upward checkmark wing echoing VISA's iconic 'V' crest */}
                    <path d="M 0,3 C 5,2 11,5 17,14 L 22,14 C 16,4 9,0 0,3 Z" />
                  </svg>
                )}
                G
              </span>
              RYPHON
            </span>

            {/* 360 in Solid Primary Blue (Zero-gap) */}
            <span className={`${primaryBlueColor} ${sizeMap.num} flex items-baseline`}>
              360
              {/* 🎯 Assessment & Candidate Evaluation Precision Degree Mark */}
              {showCheckDegree ? (
                <span className={`relative ${sizeMap.deg} ml-0.5 inline-flex items-center justify-center shrink-0`}>
                  <svg
                    className="w-full h-full text-amber-500 dark:text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    {/* 360° Candidate Assessment & Proctoring Orbit Ring */}
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.2" opacity="0.95" />
                    {/* Verified Candidate / Passed Assessment Checkmark */}
                    <path
                      d="M5.5 8.2L7.2 9.9L11 5.8"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : (
                <span className="text-base font-bold">°</span>
              )}
            </span>
          </div>

          {/* Optional Subtle Subtitle: ASSESSMENT PLATFORM */}
          {withAssessmentTag && (
            <div className={`font-sans font-bold uppercase text-slate-400 ${sizeMap.tag} mt-1 flex items-center gap-1 opacity-85`}>
              <span>Assessment Platform</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GryphonLogo;
