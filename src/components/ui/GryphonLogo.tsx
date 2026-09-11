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
      icon: "h-5 w-auto",
      text: "text-lg",
      num: "text-lg",
      gap: "gap-2",
    },
    md: {
      icon: "h-6 w-auto",
      text: "text-xl",
      num: "text-xl",
      gap: "gap-2.5",
    },
    lg: {
      icon: "h-7 w-auto",
      text: "text-2xl",
      num: "text-2xl",
      gap: "gap-3",
    },
    xl: {
      icon: "h-9 w-auto",
      text: "text-3xl",
      num: "text-3xl",
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
      {/* 🦅 Authentic G+A Geometric Silver Emblem (Height-matched to cap height) */}
      <div className={`shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
        <img
          src="/ga-icon-silver.png"
          alt="Gryphon 360"
          className={`${sizeMap.icon} object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]`}
        />
      </div>

      {/* 🏛️ VISA-Inspired Bold Italic Wordmark (Rock-solid baseline & native degree) */}
      {!iconOnly && (
        <div className="font-heading font-black italic uppercase leading-none flex items-baseline tracking-[-0.045em]">
          <span className={`${sizeMap.text} ${primaryTextColor} transition-colors`}>
            GRYPHON
          </span>
          <span className={`${primaryBlueColor} ${sizeMap.num} transition-colors`}>
            360°
          </span>
        </div>
      )}
    </div>
  );
};

export default GryphonLogo;
