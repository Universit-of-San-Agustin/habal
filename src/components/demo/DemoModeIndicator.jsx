import { COLORS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;

/**
 * Visual indicator that demo mode is active
 * Shows current role and reminds users this is a testing environment
 */
export default function DemoModeIndicator({ currentRole }) {
  const roleEmojis = {
    customer: "👤",
    rider: "🏍",
    dispatcher: "📋",
    operator: "🏢",
    admin: "🛡️",
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
      <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-bold text-gray-700">
          🧪 Demo Mode: <span style={{ color: PRIMARY_DARK }}>{roleEmojis[currentRole]} {currentRole}</span>
        </span>
      </div>
    </div>
  );
}