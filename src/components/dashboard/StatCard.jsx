const colors = {
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-800 rounded animate-pulse" />
      ) : (
        <div className="text-3xl font-bold text-white">{value}</div>
      )}
    </div>
  );
}