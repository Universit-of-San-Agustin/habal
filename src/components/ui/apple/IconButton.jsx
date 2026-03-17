import React from "react";
import { COLORS, SHADOWS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Icon Button
 * Variants: primary, secondary, ghost
 */

export default function IconButton({
  icon,
  variant = "secondary",
  size = "md",
  disabled = false,
  onClick,
  ariaLabel,
  className = "",
  ...props
}) {
  const baseStyles = `
    inline-flex items-center justify-center
    transition-all duration-200 ease-out
    active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  `;

  const variants = {
    primary: `bg-[${COLORS.primary}] hover:bg-[${COLORS.primaryDark}] text-white`,
    secondary: `bg-[${COLORS.gray100}] hover:bg-[${COLORS.gray200}] text-gray-700`,
    ghost: `bg-transparent hover:bg-[${COLORS.gray100}] text-gray-600`,
  };

  const sizes = {
    sm: `w-8 h-8 text-sm`,
    md: `w-10 h-10 text-base`,
    lg: `w-12 h-12 text-lg`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        borderRadius: RADIUS.md,
        boxShadow: variant === "secondary" ? SHADOWS.sm : undefined,
      }}
      {...props}
    >
      {icon}
    </button>
  );
}