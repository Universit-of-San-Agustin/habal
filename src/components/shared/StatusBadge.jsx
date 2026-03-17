const statusStyles = {
  pending: "bg-yellow-500/10 text-yellow-400",
  searching: "bg-blue-500/10 text-blue-400",
  assigned: "bg-indigo-500/10 text-indigo-400",
  otw: "bg-purple-500/10 text-purple-400",
  arrived: "bg-cyan-500/10 text-cyan-400",
  in_progress: "bg-orange-500/10 text-orange-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
  active: "bg-green-500/10 text-green-400",
  suspended: "bg-red-500/10 text-red-400",
  banned: "bg-gray-500/10 text-gray-400",
  approved: "bg-green-500/10 text-green-400",
  online: "bg-green-500/10 text-green-400",
  offline: "bg-gray-500/10 text-gray-400",
  on_trip: "bg-orange-500/10 text-orange-400",
  warning: "bg-yellow-500/10 text-yellow-400",
  strike: "bg-orange-500/10 text-orange-400",
  ban: "bg-red-500/10 text-red-400",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[status] || "bg-gray-500/10 text-gray-400"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}