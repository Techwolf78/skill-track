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
      svg: "w-5 h-5",
      text: "text-lg",
      num: "text-lg",
      gap: "gap-2",
    },
    md: {
      svg: "w-6 h-6",
      text: "text-xl",
      num: "text-xl",
      gap: "gap-2.5",
    },
    lg: {
      svg: "w-7 h-7",
      text: "text-2xl",
      num: "text-2xl",
      gap: "gap-3",
    },
    xl: {
      svg: "w-9 h-9",
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

  const primaryIndigoColor =
    variant === "dark"
      ? "text-indigo-400"
      : "text-indigo-600 dark:text-indigo-400";

  return (
    <div className={`inline-flex items-center select-none group ${sizeMap.gap} ${className}`}>
      {/* 🦅 High-Precision Gryphon Emblem (Electric Indigo & Gradient Accents) */}
      <div className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizeMap.svg} ${
            variant === "dark"
              ? "drop-shadow-[0_2px_10px_rgba(99,102,241,0.55)]"
              : "drop-shadow-[0_2px_6px_rgba(79,70,229,0.3)]"
          }`}
        >
          <defs>
            <linearGradient id={`gryphon-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#3730A3" />
            </linearGradient>
            <linearGradient id={`gryphon-accent-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E0E7FF" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>

          {/* Hexagonal Shield Container with Electric Indigo Gradient */}
          <path
            d="M18 2.5L31.5 9.5V20.5C31.5 27.8 25.5 32.8 18 34.8C10.5 32.8 4.5 27.8 4.5 20.5V9.5L18 2.5Z"
            fill={`url(#gryphon-grad-${size})`}
          />

          {/* Inner Dimensional Facet */}
          <path
            d="M18 4.2L6 10.6V20.5C6 26.5 11 30.8 18 32.8V4.2Z"
            fill="white"
            fillOpacity="0.14"
          />

          {/* Precision G + A Wings & Monogram */}
          <path
            d="M18 8.5L26.5 13.8L23.8 17.2L18 13.6L12.2 17.2L9.5 13.8L18 8.5Z"
            fill={`url(#gryphon-accent-${size})`}
          />
          <path
            d="M18 15.8L24.8 20L22.5 23.2L18 20.5L13.5 23.2L11.2 20L18 15.8Z"
            fill="white"
            fillOpacity="0.92"
          />

          {/* 360 Horizon Degree Arc */}
          <path
            d="M11.5 25.2C13.3 26.6 15.5 27.4 18 27.4C20.5 27.4 22.7 26.6 24.5 25.2L25.8 27C23.6 28.7 20.9 29.6 18 29.6C15.1 29.6 12.4 28.7 10.2 27L11.5 25.2Z"
            fill="#C7D2FE"
          />
          <circle cx="18" cy="24" r="1.6" fill="white" />
        </svg>
      </div>

      {/* 🏛️ Bold Wordmark with Electric Indigo 360° Accent */}
      {!iconOnly && (
        <div className="font-heading font-black italic uppercase leading-none flex items-baseline tracking-[-0.045em]">
          <span className={`${sizeMap.text} ${primaryTextColor} transition-colors`}>
            GRYPHON
          </span>
          <span className={`${primaryIndigoColor} ${sizeMap.num} transition-colors ml-0.5`}>
            360°
          </span>
        </div>
      )}
    </div>
  );
};

export default GryphonLogo;
