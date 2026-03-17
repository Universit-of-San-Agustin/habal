import React from "react";
import { COLORS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Divider
 * Orientation: horizontal, vertical
 */

export default function Divider({
  orientation = "horizontal",
  spacing = "md",
  className = "",
}) {
  const spacings = {
    sm: orientation === "horizontal" ? "my-2" : "mx-2",
    md: orientation === "horizontal" ? "my-4" : "mx-4",
    lg: orientation === "horizontal" ? "my-6" : "mx-6",
  };

  return (
    <div
      className={`${spacings[spacing]} ${className}`}
      style={{
        width: orientation === "horizontal" ? "100%" : "1px",
        height: orientation === "vertical" ? "100%" : "1px",
        background: COLORS.gray200,
      }}
    />
  );
}