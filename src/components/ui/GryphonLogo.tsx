import React from "react";

interface GryphonLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light" | "auto";
  iconOnly?: boolean;
}

export const GryphonLogo: React.FC<GryphonLogoProps> = ({
  className = "",
  size = "md",
  variant = "auto",
  iconOnly = false,
}) => {
  const sizeMap = {
    sm: {
      icon: "w-7 h-7",
      text: "text-lg",
      num: "text-lg",
      deg: "w-2 h-2 -top-1",
      gap: "gap-2",
    },
    md: {
      icon: "w-8 h-8",
      text: "text-xl",
      num: "text-xl",
      deg: "w-2.5 h-2.5 -top-1.5",
      gap: "gap-2.5",
    },
    lg: {
      icon: "w-10 h-10",
      text: "text-2xl",
      num: "text-2xl",
      deg: "w-3 h-3 -top-2",
      gap: "gap-3",
    },
    xl: {
      icon: "w-12 h-12",
      text: "text-3xl",
      num: "text-3xl",
      deg: "w-3.5 h-3.5 -top-2.5",
      gap: "gap-3.5",
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

      {/* 🏛️ VISA-Inspired Bold Italic Wordmark (Clean zero-gap lockup with degree circle) */}
      {!iconOnly && (
        <div className="font-heading font-black italic uppercase leading-none flex items-baseline tracking-[-0.045em]">
          {/* GRYPHON */}
          <span className={`${sizeMap.text} ${primaryTextColor} transition-colors`}>
            GRYPHON
          </span>

          {/* 360 with Clean Degree Circle (Solid Primary Blue, Zero-gap) */}
          <span className={`${primaryBlueColor} ${sizeMap.num} flex items-baseline`}>
            360
            {/* Clean, perfectly-scaled degree circle ring */}
            <span className={`relative ${sizeMap.deg} ml-0.5 inline-flex items-center justify-center shrink-0`}>
              <svg
                className="w-full h-full text-current"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default GryphonLogo;
