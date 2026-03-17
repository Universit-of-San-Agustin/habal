import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Clock, MapPin, X, RefreshCw } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

export default function ScheduledRidesTab({ user, onRebook }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const all = await base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 50).catch(() => []);
    setRides((all || []).filter(b => b.is_scheduled && b.status === "scheduled"));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleCancel = async (booking) => {
    setCancelling(booking.id);
    await base44.entities.Booking.update(booking.id, { status: "cancelled", cancelled_by: "customer", cancellation_reason: "Cancelled by customer" });
    setRides(prev => prev.filter(b => b.id !== booking.id));
    setCancelling(null);
  };

  const formatScheduled = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-PH", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const isUpcoming = (iso) => iso && new Date(iso) > new Date();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }} />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 px-8 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: PRIMARY_BG }}>
          <Calendar className="w-10 h-10" style={{ color: PRIMARY }} />
        </div>
        <p className="font-bold text-gray-700 mb-1">No Scheduled Rides</p>
        <p className="text-sm text-gray-400">Schedule a ride from the home screen by tapping "Schedule" when confirming your booking.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{rides.length} upcoming</span>
        <button onClick={load} className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {rides.map(b => (
        <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          {/* Scheduled time */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: PRIMARY_BG }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PRIMARY_DARK }}>Scheduled For</div>
              <div className="text-sm font-bold" style={{ color: PRIMARY_DARK }}>{formatScheduled(b.scheduled_at)}</div>
            </div>
            {isUpcoming(b.scheduled_at) && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50">Upcoming</span>
            )}
          </div>
          {/* Route */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              <span className="truncate">{b.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">{b.dropoff_address}</span>
            </div>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{b.payment_method?.toUpperCase() || "CASH"}</span>
              {b.fare_estimate && <span className="font-bold text-gray-700 text-sm">₱{b.fare_estimate}</span>}
            </div>
            <button onClick={() => handleCancel(b)} disabled={cancelling === b.id}
              className="flex items-center gap-1 text-xs font-bold text-red-400 px-2.5 py-1.5 rounded-xl bg-red-50 disabled:opacity-50">
              {cancelling === b.id
                ? <div className="w-3 h-3 border border-red-300 border-t-red-400 rounded-full animate-spin" />
                : <X className="w-3 h-3" />}
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}