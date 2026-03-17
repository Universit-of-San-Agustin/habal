import { useState } from "react";
import { COLORS, SHADOWS, RADIUS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;

const DEMO_ROLES = [
  { key: "customer", label: "Customer", emoji: "👤", color: "#4DC8F0", role: "user" },
  { key: "rider",    label: "Rider",    emoji: "🏍", color: "#10b981", role: "rider" },
  { key: "operator", label: "Operator", emoji: "🏢", color: "#8b5cf6", role: "operator" },
  { key: "admin",    label: "Admin",    emoji: "🛡️", color: "#f59e0b", role: "admin" },
];

export default function DemoRoleSwitcher({ currentRole, onSwitch }) {
  const [open, setOpen] = useState(false);

  const current = DEMO_ROLES.find(r => r.key === currentRole) || DEMO_ROLES[0];

  return (
    <div className="fixed bottom-20 right-3 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {/* Role menu */}
      {open && (
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ minWidth: 180 }}>
          <div className="px-3 py-2 border-b border-gray-100" style={{ background: PRIMARY_BG }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PRIMARY_DARK }}>🧪 Demo Testing Mode</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Switch roles instantly</div>
          </div>
          {DEMO_ROLES.map(role => {
            const isActive = role.key === currentRole;
            return (
              <button
                key={role.key}
                onClick={() => { onSwitch(role.key); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                style={isActive ? { background: PRIMARY_BG } : {}}>
                <span className="text-base w-6 text-center">{role.emoji}</span>
                <span className="text-sm font-semibold flex-1" style={{ color: isActive ? PRIMARY_DARK : "#374151" }}>
                  {role.label}
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="pointer-events-auto w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 hover:shadow-2xl"
        style={{
          background: open
            ? `linear-gradient(135deg, ${PRIMARY_DARK} 0%, #0e7ea3 100%)`
            : `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
          boxShadow: `0 6px 20px ${PRIMARY}70`,
          border: "2px solid rgba(255,255,255,0.3)"
        }}
        title="Demo Role Switcher - Testing Mode">
        <span className="text-lg leading-none">{current.emoji}</span>
        <span className="text-white font-bold leading-none mt-1" style={{ fontSize: 9 }}>🧪 TEST</span>
      </button>
    </div>
  );
}