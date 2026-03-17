import { X, MapPin, Clock, CreditCard, Star, User, Bike } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const STATUS_CONFIG = {
  completed:   { label: "Completed",    bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", emoji: "✅" },
  cancelled:   { label: "Cancelled",    bg: "#fef2f2", color: "#dc2626", border: "#fecaca", emoji: "❌" },
  in_progress: { label: "In Progress",  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", emoji: "🚀" },
  pending:     { label: "Pending",      bg: "#fffbeb", color: "#d97706", border: "#fde68a", emoji: "⏳" },
  searching:   { label: "Searching",    bg: "#fffbeb", color: "#d97706", border: "#fde68a", emoji: "🔍" },
  assigned:    { label: "Assigned",     bg: PRIMARY_BG, color: PRIMARY_DARK, border: "#bae6fd", emoji: "🏍" },
  otw:         { label: "On The Way",   bg: PRIMARY_BG, color: PRIMARY_DARK, border: "#bae6fd", emoji: "🏍" },
  arrived:     { label: "Arrived",      bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", emoji: "📍" },
  scheduled:   { label: "Scheduled",   bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe", emoji: "🗓" },
};

export default function RideDetailModal({ booking: b, onClose, onRepeat }) {
  if (!b) return null;
  const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}>

        {/* Handle + header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 pt-4 pb-3 z-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Ride Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">{b.booking_id || b.id?.slice(0, 12)}</p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Status banner */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ background: status.bg, borderColor: status.border }}>
            <span className="text-2xl">{status.emoji}</span>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: status.color }}>{status.label}</div>
              <div className="text-xs mt-0.5" style={{ color: status.color + "bb" }}>
                {b.completed_at ? `Completed ${formatDate(b.completed_at)}` : formatDate(b.created_date)}
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Route</div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1 gap-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                <div className="w-0.5 flex-1 bg-gray-200 min-h-[20px]" />
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Pickup</div>
                  <div className="text-sm font-medium text-gray-800 leading-snug">{b.pickup_address}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Destination</div>
                  <div className="text-sm font-medium text-gray-800 leading-snug">{b.dropoff_address}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_BG }}>
              <Clock className="w-4 h-4" style={{ color: PRIMARY }} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</div>
              <div className="text-sm font-medium text-gray-800">{formatDate(b.created_date)}</div>
              {b.is_scheduled && b.scheduled_at && (
                <div className="text-xs text-purple-600 font-medium mt-0.5">Scheduled: {formatDate(b.scheduled_at)}</div>
              )}
            </div>
          </div>

          {/* Fare */}
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_BG }}>
              <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fare</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black" style={{ color: PRIMARY }}>
                  {b.fare_estimate ? `₱${b.fare_estimate}` : "—"}
                </span>
                <span className="text-xs text-gray-400 font-medium">{b.payment_method?.toUpperCase() || "CASH"}</span>
              </div>
            </div>
          </div>

          {/* Rider Info */}
          {(b.rider_name || b.rider_phone) && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Rider</div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: PRIMARY_BG }}>
                  🏍
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{b.rider_name || "—"}</div>
                  {b.rider_phone && <div className="text-xs text-gray-500 mt-0.5">{b.rider_phone}</div>}
                  {b.network_name && <div className="text-xs text-gray-400 mt-0.5">Network: {b.network_name}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          {b.network_name && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle / Network</div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_BG }}>
                  <Bike className="w-4 h-4" style={{ color: PRIMARY }} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Motorcycle (Habal-Habal)</div>
                  <div className="text-xs text-gray-500 mt-0.5">{b.network_name} · Zone {b.zone}</div>
                </div>
              </div>
            </div>
          )}

          {/* Rating */}
          {b.customer_rating && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Rating</div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className="text-lg" style={{ color: n <= b.customer_rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-700">{b.customer_rating}/5</span>
              </div>
              {b.customer_feedback && (
                <p className="text-xs text-gray-500 mt-2 italic">"{b.customer_feedback}"</p>
              )}
            </div>
          )}

          {/* Cancellation info */}
          {b.status === "cancelled" && b.cancellation_reason && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Cancellation Reason</div>
              <div className="text-sm text-red-700">{b.cancellation_reason}</div>
              {b.cancelled_by && <div className="text-xs text-red-400 mt-1">Cancelled by: {b.cancelled_by}</div>}
            </div>
          )}

          {/* Notes */}
          {b.notes && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
              <div className="text-sm text-gray-700">{b.notes}</div>
            </div>
          )}

          {/* Repeat CTA */}
          {b.status === "completed" && onRepeat && (
            <button onClick={() => { onRepeat(b); onClose(); }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white mt-2"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 4px 12px ${PRIMARY}35` }}>
              🔁 Repeat This Ride
            </button>
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}