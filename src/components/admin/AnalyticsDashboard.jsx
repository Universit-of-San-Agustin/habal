import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PRIMARY = "#4DC8F0";

export default function AnalyticsDashboard({ networks, riders, bookings }) {
  const completed = bookings.filter(b => b.status === "completed").length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const active = bookings.filter(b => ["assigned", "otw", "arrived", "in_progress"].length).length;
  const pending = bookings.filter(b => b.status === "pending").length;
  const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const avgRating = (() => {
    const rated = bookings.filter(b => b.customer_rating);
    return rated.length ? (rated.reduce((s, b) => s + b.customer_rating, 0) / rated.length).toFixed(1) : "—";
  })();

  // Bookings by zone
  const zoneMap = {};
  bookings.forEach(b => { if (b.zone) zoneMap[b.zone] = (zoneMap[b.zone] || 0) + 1; });
  const zoneData = Object.entries(zoneMap).map(([zone, count]) => ({ zone, count })).sort((a, b) => b.count - a.count);

  // Bookings by status (pie)
  const statusData = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "Cancelled", value: cancelled, color: "#ef4444" },
    { name: "Pending", value: pending, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  // Network performance
  const networkPerf = networks.map(n => ({
    name: n.name?.slice(0, 12),
    completed: bookings.filter(b => b.network_id === n.id && b.status === "completed").length,
    bookings: bookings.filter(b => b.network_id === n.id).length,
  })).filter(n => n.bookings > 0).slice(0, 6);

  const kpis = [
    { label: "Total Bookings", value: bookings.length, color: PRIMARY, icon: "📋" },
    { label: "Completed", value: completed, color: "#10b981", icon: "✅" },
    { label: "Cancelled", value: cancelled, color: "#ef4444", icon: "❌" },
    { label: "Avg Rating", value: avgRating, color: "#f59e0b", icon: "⭐" },
    { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, color: "#6366f1", icon: "💰" },
    { label: "Active Networks", value: networks.filter(n => n.status === "approved").length, color: "#06b6d4", icon: "🏢" },
    { label: "Total Riders", value: riders.length, color: "#8b5cf6", icon: "🏍" },
    { label: "Online Riders", value: riders.filter(r => r.online_status === "online").length, color: "#10b981", icon: "🟢" },
  ];

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 2px 10px rgba(77,200,240,0.08)" }}>
            <div className="text-lg mb-1">{k.icon}</div>
            <div className="text-xs text-gray-400 font-medium">{k.label}</div>
            <div className="text-xl font-black mt-0.5" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Bookings by Zone Bar Chart */}
      {zoneData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Bookings by Zone</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={zoneData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status Pie */}
      {statusData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Booking Status Breakdown</div>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={statusData} cx={55} cy={55} innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network Performance */}
      {networkPerf.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Network Performance</div>
          {networkPerf.map(n => (
            <div key={n.name} className="py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-gray-800">{n.name}</span>
                <span className="text-xs text-gray-400">{n.completed}/{n.bookings} trips</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${n.bookings ? Math.round(n.completed / n.bookings * 100) : 0}%`, background: "#10b981" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}