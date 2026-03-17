import React from "react";
import { COLORS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Badge Component
 * Variants: default, primary, success, warning, error, info
 */

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  className = "",
}) {
  const variants = {
    default: { bg: COLORS.gray100, color: COLORS.gray700 },
    primary: { bg: COLORS.primaryBg, color: COLORS.primaryDark },
    success: { bg: COLORS.successBg, color: COLORS.successDark },
    warning: { bg: COLORS.warningBg, color: COLORS.warningDark },
    error: { bg: COLORS.errorBg, color: COLORS.errorDark },
    info: { bg: COLORS.infoBg, color: COLORS.infoDark },
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const { bg, color } = variants[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${sizes[size]} ${className}`}
      style={{
        background: bg,
        color: color,
        borderRadius: RADIUS.md,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}