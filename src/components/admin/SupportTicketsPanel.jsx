import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, AlertCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_BG = "#EBF9FE";

const STATUS_CFG = {
  open:        { label: "Open",        class: "bg-red-50 text-red-600" },
  in_progress: { label: "In Progress", class: "bg-amber-50 text-amber-600" },
  resolved:    { label: "Resolved",    class: "bg-green-50 text-green-600" },
  closed:      { label: "Closed",      class: "bg-gray-100 text-gray-500" },
};

const PRIORITY_CFG = {
  low:    "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-600",
  high:   "bg-orange-50 text-orange-600",
  urgent: "bg-red-100 text-red-700",
};

export default function SupportTicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState("open");

  useEffect(() => {
    base44.entities.SupportTicket.list("-created_date", 100)
      .then(t => { setTickets(t || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateStatus = async (ticket, status) => {
    setUpdating(ticket.id);
    const updated = await base44.entities.SupportTicket.update(ticket.id, {
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
    });
    setTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, status } : t));
    setUpdating(null);
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-8 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          { label: "Open", value: tickets.filter(t => t.status === "open").length, color: "#ef4444" },
          { label: "Active", value: tickets.filter(t => t.status === "in_progress").length, color: "#f59e0b" },
          { label: "Resolved", value: tickets.filter(t => t.status === "resolved").length, color: "#10b981" },
          { label: "Total", value: tickets.length, color: PRIMARY },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
            <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["open", "in_progress", "resolved", "closed", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize"
            style={filter === f ? { background: PRIMARY, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-gray-300">
          <CheckCircle className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">No tickets in this category</p>
        </div>
      )}

      {filtered.map(ticket => (
        <div key={ticket.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
            className="w-full px-4 py-4 text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-semibold text-gray-900 text-sm truncate">{ticket.subject || "No subject"}</div>
                <div className="text-xs text-gray-400 mt-0.5">{ticket.customer_name} · {ticket.category?.replace("_", " ")}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CFG[ticket.status]?.class || ""}`}>
                  {STATUS_CFG[ticket.status]?.label || ticket.status}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${PRIORITY_CFG[ticket.priority] || ""}`}>
                  {ticket.priority || "medium"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-300">
                {ticket.created_date ? new Date(ticket.created_date).toLocaleDateString("en-PH") : ""}
              </span>
              {expanded === ticket.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />}
            </div>
          </button>

          {expanded === ticket.id && (
            <div className="px-4 pb-4 border-t border-gray-50">
              <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-4">{ticket.message}</p>
              {ticket.customer_email && (
                <p className="text-xs text-gray-400 mb-3">📧 {ticket.customer_email}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {ticket.status !== "in_progress" && (
                  <button onClick={() => updateStatus(ticket, "in_progress")} disabled={updating === ticket.id}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-amber-600 border border-amber-200 bg-amber-50 disabled:opacity-50">
                    Mark In Progress
                  </button>
                )}
                {ticket.status !== "resolved" && (
                  <button onClick={() => updateStatus(ticket, "resolved")} disabled={updating === ticket.id}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-green-600 border border-green-200 bg-green-50 disabled:opacity-50">
                    ✓ Resolve
                  </button>
                )}
                {ticket.status !== "closed" && (
                  <button onClick={() => updateStatus(ticket, "closed")} disabled={updating === ticket.id}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 disabled:opacity-50">
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}