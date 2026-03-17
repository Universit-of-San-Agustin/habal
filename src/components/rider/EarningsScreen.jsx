import { useState } from "react";
import { TrendingUp, DollarSign, Star, Bike, Clock, ChevronLeft } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_BG = "#EBF9FE";
const GREEN = "#10b981";

export default function EarningsScreen({ tripHistory, riderData, onBack }) {
  const [period, setPeriod] = useState("today"); // today | week | month | all

  const today = new Date().toDateString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const filterByPeriod = (trips) => {
    const completed = trips.filter(b => b.status === "completed");
    if (period === "today") return completed.filter(b => new Date(b.created_date).toDateString() === today);
    if (period === "week") return completed.filter(b => new Date(b.created_date) >= weekAgo);
    if (period === "month") return completed.filter(b => new Date(b.created_date) >= monthAgo);
    return completed;
  };

  const filtered = filterByPeriod(tripHistory || []);
  const earnings = filtered.reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const trips = filtered.length;
  const avgFare = trips ? Math.round(earnings / trips) : 0;
  const avgRating = filtered.filter(b => b.customer_rating).length
    ? (filtered.reduce((s, b) => s + (b.customer_rating || 0), 0) / filtered.filter(b => b.customer_rating).length).toFixed(1)
    : null;

  const PERIODS = [
    { id: "today", label: "Today" },
    { id: "week",  label: "7 Days" },
    { id: "month", label: "30 Days" },
    { id: "all",   label: "All Time" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">My Earnings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Period tabs */}
        <div className="flex gap-2 px-4 pt-4 mb-4 bg-white pb-3 border-b border-gray-50">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all"
              style={period === p.id
                ? { background: GREEN, color: "#fff", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }
                : { background: "#f1f5f9", color: "#94a3b8" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Main earnings card */}
        <div className="mx-4 mt-4 mb-4 rounded-3xl p-6 text-white fade-in"
          style={{ background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`, boxShadow: "0 8px 32px rgba(16,185,129,0.3)" }}>
          <div className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-2">
            {PERIODS.find(p => p.id === period)?.label} Earnings
          </div>
          <div className="text-5xl font-black mb-1">₱{earnings.toLocaleString()}</div>
          <div className="text-white/70 text-sm">{trips} trips completed</div>
        </div>

        {/* Stats grid */}
        <div className="px-4 grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Avg Fare", value: `₱${avgFare}`, icon: <DollarSign className="w-5 h-5" />, color: "#8b5cf6" },
            { label: "Avg Rating", value: avgRating || "—", icon: <Star className="w-5 h-5" />, color: "#f59e0b" },
            { label: "Trips Done", value: trips, icon: <Bike className="w-5 h-5" />, color: GREEN },
            { label: "Acceptance %", value: riderData?.acceptance_rate ? `${riderData.acceptance_rate}%` : "—", icon: <TrendingUp className="w-5 h-5" />, color: PRIMARY },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.color + "15", color: s.color }}>
                {s.icon}
              </div>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Trip list */}
        {filtered.length > 0 && (
          <div className="px-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trip Breakdown</div>
            {filtered.slice(0, 20).map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 shadow-sm">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#f0fdf4" }}>🏍</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{b.customer_name}</div>
                  <div className="text-xs text-gray-400 truncate">{b.dropoff_address?.split(",")[0]}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-[10px] text-gray-300">
                      {b.created_date ? new Date(b.created_date).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-gray-900">₱{b.fare_estimate || 0}</div>
                  {b.customer_rating && (
                    <div className="text-[10px] text-amber-500 mt-0.5">{"★".repeat(b.customer_rating)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <DollarSign className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm text-gray-400">No earnings for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}