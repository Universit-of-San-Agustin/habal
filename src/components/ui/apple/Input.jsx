import React from "react";
import { COLORS, RADIUS } from "../../shared/AppleDesignTokens";

/**
 * Apple-style Input Component
 * Types: text, email, tel, password, number, search
 */

export default function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  label,
  error,
  disabled = false,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}) {
  const inputId = React.useId();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 text-base text-gray-900 bg-white border
            transition-all duration-200 outline-none
            placeholder:text-gray-400
            focus:border-[${COLORS.primary}] focus:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? "pl-11" : ""}
            ${rightIcon ? "pr-11" : ""}
            ${error ? "border-red-300" : "border-gray-300"}
          `}
          style={{
            borderRadius: RADIUS.md,
            borderColor: error ? COLORS.error : COLORS.gray300,
          }}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}