import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, RefreshCw, Filter, X, ChevronDown, ChevronUp, FileText } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_BG = "#EBF9FE";

const LOG_TYPE_COLORS = {
  admin_action:    { bg: "bg-purple-50", text: "text-purple-700", dot: "#8b5cf6" },
  booking_event:   { bg: "bg-blue-50",   text: "text-blue-700",   dot: "#3b82f6" },
  rider_activity:  { bg: "bg-green-50",  text: "text-green-700",  dot: "#10b981" },
  support:         { bg: "bg-amber-50",  text: "text-amber-700",  dot: "#f59e0b" },
  system:          { bg: "bg-gray-100",  text: "text-gray-600",   dot: "#9ca3af" },
};

const LOG_TYPE_ICONS = {
  admin_action:   "🛡",
  booking_event:  "📋",
  rider_activity: "🏍",
  support:        "🎧",
  system:         "⚙️",
};

function fmt(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-PH", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return ts; }
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AuditLog.list("-created_date", 300).catch(() => []);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.action?.toLowerCase().includes(q) ||
      l.actor_name?.toLowerCase().includes(q) ||
      l.target_name?.toLowerCase().includes(q) ||
      l.target_id?.toLowerCase().includes(q) ||
      l.booking_id?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q);
    const matchType = filterType === "all" || l.log_type === filterType;
    const matchRole = filterRole === "all" || l.actor_role === filterRole;
    return matchSearch && matchType && matchRole;
  });

  const stats = {
    admin: logs.filter(l => l.log_type === "admin_action").length,
    booking: logs.filter(l => l.log_type === "booking_event").length,
    rider: logs.filter(l => l.log_type === "rider_activity").length,
    support: logs.filter(l => l.log_type === "support").length,
    total: logs.length,
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Admin", value: stats.admin, color: "#8b5cf6" },
          { label: "Bookings", value: stats.booking, color: "#3b82f6" },
          { label: "Riders", value: stats.rider, color: "#10b981" },
          { label: "Total", value: stats.total, color: PRIMARY },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
            <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5">
          <Search className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, name, booking ID..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-300"
          />
          {search && (
            <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-gray-300" /></button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className="w-10 h-10 rounded-2xl border border-gray-200 bg-white flex items-center justify-center flex-shrink-0"
          style={showFilters ? { background: PRIMARY_BG, borderColor: PRIMARY } : {}}>
          <Filter className="w-4 h-4" style={{ color: showFilters ? PRIMARY : "#9ca3af" }} />
        </button>
        <button onClick={load}
          className="w-10 h-10 rounded-2xl border border-gray-200 bg-white flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Log Type</div>
            <div className="flex flex-wrap gap-2">
              {["all", "admin_action", "booking_event", "rider_activity", "support", "system"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={filterType === t
                    ? { background: PRIMARY, color: "white" }
                    : { background: "#f3f4f6", color: "#6b7280" }}>
                  {t === "all" ? "All" : t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Actor Role</div>
            <div className="flex flex-wrap gap-2">
              {["all", "admin", "rider", "customer", "dispatcher", "network_owner", "system"].map(r => (
                <button key={r} onClick={() => setFilterRole(r)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={filterRole === r
                    ? { background: PRIMARY, color: "white" }
                    : { background: "#f3f4f6", color: "#6b7280" }}>
                  {r === "all" ? "All" : r.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {search || filterType !== "all" || filterRole !== "all" ? (
        <div className="text-xs text-gray-400 font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""} found</div>
      ) : null}

      {/* Log list */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: "3px", borderStyle: "solid", borderColor: "#EBF9FE", borderTopColor: PRIMARY }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-gray-300">
          <FileText className="w-12 h-12 mb-3" />
          <p className="text-sm text-gray-400 font-semibold">No logs found</p>
          <p className="text-xs text-gray-300 mt-1">Actions performed on the platform appear here</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(log => {
          const cfg = LOG_TYPE_COLORS[log.log_type] || LOG_TYPE_COLORS.system;
          const isOpen = expanded === log.id;
          return (
            <div key={log.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${cfg.bg}`}>
                  {LOG_TYPE_ICONS[log.log_type] || "📝"}
                </div>
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-800 truncate">{log.action || "EVENT"}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.text}`}>
                      {log.log_type?.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {log.actor_name || log.actor_role || "System"}
                    {log.target_name ? ` → ${log.target_name}` : ""}
                  </div>
                  <div className="text-[10px] text-gray-300 mt-0.5">{fmt(log.timestamp || log.created_date)}</div>
                </div>
                {/* Expand chevron */}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
                  {[
                    { label: "Log Type",    value: log.log_type?.replace("_"," ") },
                    { label: "Action",      value: log.action },
                    { label: "Actor",       value: log.actor_name ? `${log.actor_name} (${log.actor_role})` : log.actor_role },
                    { label: "Actor ID",    value: log.actor_id },
                    { label: "Target",      value: log.target_name ? `${log.target_name} [${log.target_type}]` : log.target_type },
                    { label: "Target ID",   value: log.target_id },
                    { label: "Booking ID",  value: log.booking_id },
                    { label: "Network ID",  value: log.network_id },
                    { label: "Timestamp",   value: fmt(log.timestamp || log.created_date) },
                    { label: "Details",     value: log.details },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="flex gap-2">
                      <span className="text-[10px] font-bold text-gray-400 w-20 flex-shrink-0">{f.label}</span>
                      <span className="text-[10px] text-gray-700 break-all">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}