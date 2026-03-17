/**
 * RiderStatusDot - Reusable rider online status indicator
 */
export default function RiderStatusDot({ status }) {
  const config = {
    online:  { bg: "#22c55e", label: "online" },
    on_trip: { bg: "#3b82f6", label: "on trip" },
    offline: { bg: "#d1d5db", label: "offline" },
  };
  
  const c = config[status] || config.offline;
  
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.bg }} />
      <span className="text-[10px] text-gray-400">{c.label}</span>
    </div>
  );
}