import React from "react";
import { COLORS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Avatar Component
 * Sizes: sm, md, lg, xl
 */

export default function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  status,
  className = "",
}) {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const statusColors = {
    online: COLORS.success,
    offline: COLORS.gray400,
    busy: COLORS.error,
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizes[size]} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center font-semibold text-gray-600`}
        style={{ borderRadius: RADIUS.full }}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span>{fallback || "?"}</span>
        )}
      </div>
      {status && (
        <span
          className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full"
          style={{
            background: statusColors[status],
            borderRadius: RADIUS.full,
          }}
        />
      )}
    </div>
  );
}