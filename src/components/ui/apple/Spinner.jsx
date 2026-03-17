import React from "react";
import { COLORS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Loading Spinner
 * Sizes: sm, md, lg
 */

export default function Spinner({
  size = "md",
  color = "primary",
  className = "",
}) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2.5",
    lg: "w-8 h-8 border-3",
  };

  const colors = {
    primary: COLORS.primary,
    white: "#FFFFFF",
    gray: COLORS.gray400,
  };

  const spinnerColor = colors[color];

  return (
    <div
      className={`${sizes[size]} rounded-full animate-spin ${className}`}
      style={{
        borderColor: `${spinnerColor}30`,
        borderTopColor: spinnerColor,
      }}
    />
  );
}