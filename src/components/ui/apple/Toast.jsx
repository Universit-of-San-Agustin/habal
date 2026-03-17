import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { COLORS, SHADOWS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Toast Notification
 * Variants: success, error, info, default
 */

export default function Toast({
  message,
  variant = "default",
  duration = 3000,
  onClose,
  className = "",
}) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variants = {
    success: {
      bg: COLORS.successBg,
      color: COLORS.successDark,
      icon: <CheckCircle className="w-5 h-5" />,
    },
    error: {
      bg: COLORS.errorBg,
      color: COLORS.errorDark,
      icon: <AlertCircle className="w-5 h-5" />,
    },
    info: {
      bg: COLORS.infoBg,
      color: COLORS.infoDark,
      icon: <Info className="w-5 h-5" />,
    },
    default: {
      bg: "#FFFFFF",
      color: COLORS.gray900,
      icon: null,
    },
  };

  const { bg, color, icon } = variants[variant];

  return (
    <div
      className={`flex items-center gap-3 p-4 animate-in slide-in-from-top ${className}`}
      style={{
        background: bg,
        color: color,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOWS.lg,
        border: `1px solid ${COLORS.gray200}`,
      }}
    >
      {icon && <span style={{ color }}>{icon}</span>}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="p-1 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}