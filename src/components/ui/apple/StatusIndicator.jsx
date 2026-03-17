import React from "react";
import { COLORS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Status Indicator
 * Variants: online, offline, busy, warning
 */

export default function StatusIndicator({
  status = "offline",
  label,
  pulse = false,
  size = "md",
  className = "",
}) {
  const colors = {
    online: COLORS.success,
    offline: COLORS.gray400,
    busy: COLORS.error,
    warning: COLORS.warning,
  };

  const sizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  const color = colors[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative">
        <span
          className={`${sizes[size]} rounded-full block`}
          style={{ background: color }}
        />
        {pulse && (
          <span
            className={`absolute inset-0 rounded-full animate-ping`}
            style={{ background: color, opacity: 0.4 }}
          />
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </div>
  );
}