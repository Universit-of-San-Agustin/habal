import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts";

const PRIMARY = "#4DC8F0";
const GREEN = "#10b981";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const PURPLE = "#8b5cf6";
const INDIGO = "#6366f1";

export default function AdminAnalytics({ networks, riders, bookings }) {
  // ── Computed values ──────────────────────────────────────────
  const completed  = bookings.filter(b => b.status === "completed").length;
  const cancelled  = bookings.filter(b => b.status === "cancelled").length;
  const active     = bookings.filter(b => ["assigned","otw","arrived","in_progress"].includes(b.status)).length;
  const pending    = bookings.filter(b => ["pending","searching"].includes(b.status)).length;
  const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const avgRating = (() => {
    const rated = bookings.filter(b => b.customer_rating);
    return rated.length ? +(rated.reduce((s, b) => s + b.customer_rating, 0) / rated.length).toFixed(2) : 0;
  })();
  const completionRate = bookings.length ? Math.round(completed / bookings.length * 100) : 0;
  const cancellationRate = bookings.length ? Math.round(cancelled / bookings.length * 100) : 0;

  // Bookings by zone
  const zoneMap = {};
  bookings.forEach(b => { if (b.zone) zoneMap[b.zone] = (zoneMap[b.zone] || 0) + 1; });
  const zoneData = Object.entries(zoneMap).map(([zone, count]) => ({ zone: zone.replace(" ",""), count })).sort((a, b) => b.count - a.count);

  // Revenue by zone
  const zoneRevMap = {};
  bookings.filter(b => b.status === "completed").forEach(b => {
    if (b.zone) zoneRevMap[b.zone] = (zoneRevMap[b.zone] || 0) + (b.fare_estimate || 0);
  });
  const zoneRevData = Object.entries(zoneRevMap).map(([zone, rev]) => ({ zone: zone.replace(" ",""), rev }));

  // Booking status pie
  const statusData = [
    { name: "Completed", value: completed, color: GREEN },
    { name: "Cancelled", value: cancelled, color: RED },
    { name: "Pending", value: pending, color: AMBER },
    { name: "Active", value: active, color: PRIMARY },
  ].filter(d => d.value > 0);

  // Network performance
  const networkPerf = networks.map(n => ({
    name: n.name?.length > 10 ? n.name.slice(0,10)+"…" : n.name,
    completed: bookings.filter(b => b.network_id === n.id && b.status === "completed").length,
    bookings: bookings.filter(b => b.network_id === n.id).length,
    rate: bookings.filter(b => b.network_id === n.id).length
      ? Math.round(bookings.filter(b => b.network_id === n.id && b.status === "completed").length / bookings.filter(b => b.network_id === n.id).length * 100)
      : 0,
  })).filter(n => n.bookings > 0).sort((a, b) => b.bookings - a.bookings).slice(0, 6);

  // Customer ratings distribution
  const ratingDist = [1, 2, 3, 4, 5].map(star => ({
    star: `${star}★`,
    count: bookings.filter(b => b.customer_rating === star).length,
  }));

  // Active riders by status
  const riderStatusData = [
    { name: "Online", value: riders.filter(r => r.online_status === "online").length, color: GREEN },
    { name: "On Trip", value: riders.filter(r => r.online_status === "on_trip").length, color: PRIMARY },
    { name: "Offline", value: riders.filter(r => r.online_status === "offline").length, color: "#d1d5db" },
  ].filter(d => d.value > 0);

  // Rider performance radar (top 5)
  const topRiders = riders
    .filter(r => r.status === "active" && (r.completed_trips || 0) > 0)
    .sort((a, b) => (b.completed_trips || 0) - (a.completed_trips || 0))
    .slice(0, 5);

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Completion Rate", value: `${completionRate}%`, color: completionRate >= 85 ? GREEN : RED, icon: "🏁", sub: "target ≥85%" },
          { label: "Cancellation Rate", value: `${cancellationRate}%`, color: cancellationRate <= 15 ? GREEN : RED, icon: "❌", sub: "target ≤15%" },
          { label: "Avg Customer Rating", value: avgRating ? avgRating.toFixed(1) : "—", color: avgRating >= 4.6 ? GREEN : AMBER, icon: "⭐", sub: "target ≥4.6" },
          { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, color: PURPLE, icon: "💰", sub: "all time" },
          { label: "Active Networks", value: networks.filter(n => n.status === "approved").length, color: PRIMARY, icon: "🏢", sub: "approved" },
          { label: "Total Riders", value: riders.length, color: INDIGO, icon: "🏍", sub: `${riders.filter(r=>r.status==="active").length} active` },
          { label: "Online Now", value: riders.filter(r => r.online_status !== "offline").length, color: GREEN, icon: "🟢", sub: "riders live" },
          { label: "Total Bookings", value: bookings.length, color: AMBER, icon: "📋", sub: `${completed} completed` },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xl">{k.icon}</span>
              <span className="text-[9px] text-gray-300">{k.sub}</span>
            </div>
            <div className="text-xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Trips per Zone — Bar Chart */}
      {zoneData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">📍 Trips per Zone</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={zoneData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="zone" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue per Zone — Bar Chart */}
      {zoneRevData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">💰 Revenue per Zone</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={zoneRevData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="zone" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={v => `₱${v}`} />
              <Tooltip formatter={(v) => [`₱${v}`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="rev" fill={PURPLE} radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Booking Status Pie */}
      {statusData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">📊 Booking Breakdown</div>
          <div className="flex items-center gap-4">
            <PieChart width={130} height={130}>
              <Pie data={statusData} cx={60} cy={60} innerRadius={32} outerRadius={58} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Riders Pie */}
      {riderStatusData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">🏍 Active Riders Status</div>
          <div className="flex items-center gap-4">
            <PieChart width={130} height={130}>
              <Pie data={riderStatusData} cx={60} cy={60} innerRadius={32} outerRadius={58} paddingAngle={3} dataKey="value">
                {riderStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2">
              {riderStatusData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Ratings Distribution */}
      {ratingDist.some(r => r.count > 0) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">⭐ Customer Ratings</div>
          <div className="mb-3 flex items-center gap-2">
            <div className="text-3xl font-black" style={{ color: AMBER }}>{avgRating ? avgRating.toFixed(1) : "—"}</div>
            <div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className="text-base" style={{ color: n <= Math.round(avgRating || 0) ? AMBER : "#e5e7eb" }}>★</span>
                ))}
              </div>
              <div className="text-xs text-gray-400">{bookings.filter(b => b.customer_rating).length} ratings</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={ratingDist} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="star" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="count" fill={AMBER} radius={[3, 3, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Network Performance */}
      {networkPerf.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🏢 Network Performance</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={networkPerf} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="bookings" fill="#e0f2fe" radius={[3, 3, 0, 0]} name="Total" />
              <Bar dataKey="completed" fill={GREEN} radius={[3, 3, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {networkPerf.map(n => (
              <div key={n.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium truncate">{n.name}</span>
                  <span className="font-bold ml-2 flex-shrink-0" style={{ color: n.rate >= 85 ? GREEN : n.rate >= 60 ? AMBER : RED }}>{n.rate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${n.rate}%`, background: n.rate >= 85 ? GREEN : n.rate >= 60 ? AMBER : RED }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Riders */}
      {topRiders.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🏆 Top Riders</div>
          {topRiders.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className={`text-sm font-black w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-700"}`}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                {r.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{r.full_name}</div>
                <div className="text-xs text-gray-400">{r.network_name}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-black" style={{ color: GREEN }}>{r.completed_trips}</div>
                <div className="text-[9px] text-gray-400">trips</div>
              </div>
              {r.avg_rating > 0 && (
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black" style={{ color: AMBER }}>{r.avg_rating?.toFixed(1)}</div>
                  <div className="text-[9px] text-gray-400">rating</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}