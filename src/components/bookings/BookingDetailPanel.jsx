import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, User, MapPin, Phone, Star } from "lucide-react";
import StatusBadge from "../shared/StatusBadge";

const STATUS_FLOW = ["pending", "searching", "assigned", "otw", "arrived", "in_progress", "completed"];

export default function BookingDetailPanel({ booking, riders, onClose, onUpdate }) {
  const [events, setEvents] = useState([]);
  const [selectedRider, setSelectedRider] = useState("");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    base44.entities.BookingEvent.filter({ booking_id: booking.id }, "created_date").then(setEvents);
  }, [booking.id]);

  const networkRiders = riders.filter(r => r.network_id === booking.network_id || !booking.network_id);
  const currentIdx = STATUS_FLOW.indexOf(booking.status);
  const nextStatus = STATUS_FLOW[currentIdx + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">Booking #{booking.booking_id || booking.id?.slice(0, 8)}</h2>
            <StatusBadge status={booking.status} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Customer info */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-white font-medium"><User className="w-4 h-4 text-orange-400" />{booking.customer_name}</div>
            <div className="flex items-center gap-2 text-sm text-gray-300"><Phone className="w-4 h-4 text-gray-400" />{booking.customer_phone}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400"><MapPin className="w-4 h-4" />{booking.pickup_address} → {booking.dropoff_address}</div>
            <div className="text-xs text-gray-500">Zone: {booking.zone} | Payment: {booking.payment_method} {booking.fare_estimate ? `| ₱${booking.fare_estimate}` : ""}</div>
          </div>

          {/* Assign rider */}
          {["pending", "searching", "assigned"].includes(booking.status) && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Assign Rider</label>
              <div className="flex gap-2">
                <select value={selectedRider} onChange={e => setSelectedRider(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-orange-500">
                  <option value="">Select rider...</option>
                  {networkRiders.map(r => <option key={r.id} value={r.id}>{r.full_name} ({r.plate_number || "no plate"})</option>)}
                </select>
                <button onClick={() => {
                  if (!selectedRider) return;
                  const rider = networkRiders.find(r => r.id === selectedRider);
                  onUpdate(booking.id, { status: "assigned", rider_id: rider.id, rider_name: rider.full_name, rider_phone: rider.phone, assigned_at: new Date().toISOString() });
                }} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">Assign</button>
              </div>
            </div>
          )}

          {/* Status progression */}
          {booking.status !== "completed" && booking.status !== "cancelled" && nextStatus && (
            <div className="flex gap-2">
              <button onClick={() => onUpdate(booking.id, { status: nextStatus })}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium capitalize">
                Mark as: {nextStatus.replace(/_/g, " ")}
              </button>
              <button onClick={() => onUpdate(booking.id, { status: "cancelled", cancelled_by: "dispatcher" })}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium border border-red-600/30">
                Cancel
              </button>
            </div>
          )}

          {/* Rating */}
          {booking.status === "completed" && !booking.customer_rating && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Submit Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    className={`w-8 h-8 rounded-lg ${s <= rating ? "text-yellow-400" : "text-gray-600"}`}>
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
                {rating > 0 && (
                  <button onClick={() => onUpdate(booking.id, { customer_rating: rating })}
                    className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">Submit</button>
                )}
              </div>
            </div>
          )}

          {/* Event log */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Audit Log</h4>
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="text-xs text-gray-500">No events yet</div>
              ) : events.map(e => (
                <div key={e.id} className="flex items-start gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-orange-300 font-mono">{e.event_type}</span>
                    {e.actor_name && <span className="text-gray-400"> by {e.actor_name}</span>}
                    <div className="text-gray-600">{new Date(e.created_date).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}