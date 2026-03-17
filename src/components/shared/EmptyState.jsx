/**
 * EmptyState - Reusable empty state component
 */
export default function EmptyState({ icon, label, sublabel }) {
  return (
    <div className="flex flex-col items-center py-16 text-gray-200">
      {icon}
      <p className="text-sm text-gray-400 mt-2 font-medium">{label}</p>
      {sublabel && <p className="text-xs text-gray-300 mt-1">{sublabel}</p>}
    </div>
  );
}