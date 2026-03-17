import React from "react";
import { COLORS, SHADOWS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Card Component
 * Variants: default, glass, elevated
 */

export default function Card({
  children,
  variant = "default",
  padding = "md",
  hoverable = false,
  onClick,
  className = "",
  ...props
}) {
  const baseStyles = `
    bg-white border border-gray-200 transition-all duration-200
  `;

  const variants = {
    default: `shadow-[${SHADOWS.sm}]`,
    glass: `
      bg-white/72 backdrop-blur-xl backdrop-saturate-180
      border-white/30 shadow-[${SHADOWS.lg}]
    `,
    elevated: `shadow-[${SHADOWS.md}]`,
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
    xl: "p-8",
  };

  const hoverStyles = hoverable
    ? `cursor-pointer hover:shadow-[${SHADOWS.md}] hover:-translate-y-0.5`
    : "";

  const clickableStyles = onClick ? "cursor-pointer" : "";

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${clickableStyles} ${className}`}
      style={{
        borderRadius: RADIUS.lg,
        boxShadow: variant === "default" ? SHADOWS.sm : variant === "elevated" ? SHADOWS.md : SHADOWS.lg,
        background: variant === "glass" ? "rgba(255, 255, 255, 0.72)" : "#FFFFFF",
        backdropFilter: variant === "glass" ? "blur(20px) saturate(180%)" : undefined,
        WebkitBackdropFilter: variant === "glass" ? "blur(20px) saturate(180%)" : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
}