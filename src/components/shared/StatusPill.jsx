/**
 * StatusPill - Reusable status badge component
 * Supports booking, rider, network, and zone statuses
 */
export default function StatusPill({ status, type = "booking" }) {
  const bookingMap = {
    pending:     "bg-amber-50 text-amber-600",
    searching:   "bg-amber-50 text-amber-600",
    assigned:    "bg-blue-50 text-blue-600",
    otw:         "bg-blue-50 text-blue-600",
    arrived:     "bg-green-50 text-green-600",
    in_progress: "bg-purple-50 text-purple-600",
    completed:   "bg-green-50 text-green-600",
    cancelled:   "bg-red-50 text-red-500",
    scheduled:   "bg-sky-50 text-sky-600",
  };

  const riderMap = {
    pending:    "bg-amber-50 text-amber-600",
    active:     "bg-green-50 text-green-600",
    suspended:  "bg-orange-50 text-orange-600",
    banned:     "bg-red-100 text-red-700",
  };

  const networkMap = {
    pending:    "bg-amber-50 text-amber-600",
    approved:   "bg-green-50 text-green-600",
    suspended:  "bg-orange-50 text-orange-600",
    banned:     "bg-red-100 text-red-700",
  };

  const zoneMap = {
    available: "bg-green-50 text-green-600",
    assigned:  "bg-blue-50 text-blue-600",
    locked:    "bg-gray-100 text-gray-500",
  };

  const maps = {
    booking: bookingMap,
    rider: riderMap,
    network: networkMap,
    zone: zoneMap,
  };

  const colorMap = maps[type] || bookingMap;
  const displayStatus = status?.replace(/_/g, " ") || "unknown";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${colorMap[status] || "bg-gray-50 text-gray-500"}`}>
      {displayStatus}
    </span>
  );
}