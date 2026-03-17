import React from "react";
import { COLORS, SHADOWS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Button Component
 * Variants: primary, secondary, tertiary, destructive
 * Sizes: sm, md, lg
 */

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  className = "",
  ...props
}) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-semibold
    transition-all duration-200 ease-out
    active:scale-97 disabled:opacity-40 disabled:cursor-not-allowed
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  `;

  const variants = {
    primary: `
      bg-[${COLORS.primary}] hover:bg-[${COLORS.primaryDark}] text-white
      shadow-[${SHADOWS.sm}] hover:shadow-[${SHADOWS.md}]
      focus-visible:ring-[${COLORS.primary}]
    `,
    secondary: `
      bg-[${COLORS.gray100}] hover:bg-[${COLORS.gray200}] text-gray-900
      shadow-[${SHADOWS.sm}]
      focus-visible:ring-[${COLORS.gray400}]
    `,
    tertiary: `
      bg-transparent hover:bg-[${COLORS.primaryBg}] text-[${COLORS.primary}]
      focus-visible:ring-[${COLORS.primary}]
    `,
    destructive: `
      bg-[${COLORS.error}] hover:bg-[${COLORS.errorDark}] text-white
      shadow-[${SHADOWS.sm}] hover:shadow-[${SHADOWS.md}]
      focus-visible:ring-[${COLORS.error}]
    `,
  };

  const sizes = {
    sm: `px-3 py-2 text-sm rounded-[${RADIUS.md}]`,
    md: `px-6 py-3.5 text-base rounded-[${RADIUS.lg}]`,
    lg: `px-8 py-4 text-lg rounded-[${RADIUS.xl}]`,
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      style={{
        background: variant === "primary" ? COLORS.primary : undefined,
        boxShadow: ["primary", "secondary"].includes(variant) ? SHADOWS.sm : undefined,
      }}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}