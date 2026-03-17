import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Users, CheckCircle, XCircle, Send, RefreshCw, LogOut, BarChart2, MessageCircle } from "lucide-react";
import { useToast, ToastContainer } from "./ToastNotification";
import ChatPanel from "../chat/ChatPanel";
import LiveRiderMap from "./LiveRiderMap";

const PRIMARY = "#4DC8F0";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function DispatcherDashboard({ user }) {
  const [tab, setTab] = useState("inbox");
  const [bookings, setBookings] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const pollRef = useRef(null);
  const knownBookingIds = useRef(new Set());
  const { toasts, addToast, dismiss } = useToast();

  const load = async () => {
    const [pendingBks, searchingBks, rdrs] = await Promise.all([
      base44.entities.Booking.filter({ status: "pending" }, "-created_date", 20).catch(() => []),
      base44.entities.Booking.filter({ status: "searching" }, "-created_date", 20).catch(() => []),
      base44.entities.Rider.filter({ online_status: "online" }, "-updated_date", 50).catch(() => []),
    ]);
    const newBks = [...(pendingBks || []), ...(searchingBks || [])];
    // Detect truly new bookings after first load
    if (knownBookingIds.current.size > 0) {
      newBks.forEach(b => {
        if (!knownBookingIds.current.has(b.id)) {
          addToast({ type: "rider", title: "New Booking!", message: `${b.customer_name} · ${b.pickup_address?.slice(0,30)}...` });
        }
      });
    }
    newBks.forEach(b => knownBookingIds.current.add(b.id));
    setBookings(newBks);
    setRiders(rdrs || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => clearInterval(pollRef.current);
  }, []);

  const assignRider = async (booking, rider) => {
    setAssigning(booking.id);
    await base44.entities.Booking.update(booking.id, {
      status: "assigned",
      rider_id: rider.id,
      rider_name: rider.full_name,
      rider_phone: rider.phone,
      assigned_at: new Date().toISOString(),
    });
    await base44.entities.BookingEvent.create({
      booking_id: booking.id, event_type: "RIDER_ASSIGNED",
      actor_role: "dispatcher", actor_name: user?.full_name,
      actor_id: user?.id, timestamp: new Date().toISOString(),
    });
    setAssigning(null);
    addToast({ type: "success", title: "Rider Assigned", message: `${rider.full_name} assigned to booking` });
    load();
  };

  const [chatBooking, setChatBooking] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);

  const tabs = [
    { id: "inbox", label: "Booking Inbox", icon: <Send className="w-4 h-4" /> },
    { id: "riders", label: "Online Riders", icon: <Users className="w-4 h-4" /> },
    { id: "stats", label: "Stats", icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-white flex flex-col max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {chatBooking && <ChatPanel bookingId={chatBooking.booking_id || chatBooking.id} currentUser={user} senderRole="dispatcher" onClose={() => setChatBooking(null)} />}
      {trackingBooking && <LiveRiderMap booking={trackingBooking} onClose={() => setTrackingBooking(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 flex items-center justify-between"
        style={{ boxShadow: `0 2px 20px rgba(77,200,240,0.12)` }}>
        <div className="flex items-center gap-3">
          <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" onError={e => { e.target.style.display="none"; }} />
          <div>
            <div className="text-xs text-gray-400 font-medium">Dispatcher</div>
            <div className="font-bold text-gray-900 text-sm">{user?.full_name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EBF9FE" }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
          </button>
          <button onClick={() => base44.auth.logout(window.location.href)} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
            <LogOut className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors"
            style={tab === t.id ? { color: PRIMARY, borderBottom: `2px solid ${PRIMARY}` } : { color: "#9ca3af" }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}

        {/* INBOX */}
        {!loading && tab === "inbox" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            {bookings.length === 0 && (
              <div className="flex flex-col items-center py-16 text-gray-300">
                <Send className="w-10 h-10 mb-2" />
                <p className="text-sm">No pending bookings</p>
              </div>
            )}
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.08)` }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold" style={{ color: PRIMARY }}>{b.booking_id}</span>
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Pending</span>
                </div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{b.customer_name}</div>
                <div className="flex items-start gap-2 text-xs text-gray-500 mb-1">
                  <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: PRIMARY }} />
                  <span className="truncate">{b.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500 mb-3">
                  <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" style={{ color: PRIMARY }} />
                  <span className="truncate">{b.dropoff_address}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  {b.fare_estimate && <div className="text-sm font-bold" style={{ color: PRIMARY }}>₱{b.fare_estimate}</div>}
                  {b.zone && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{b.zone}</span>}
                  {b.rider_name && (
                    <div className="flex gap-1">
                      <button onClick={() => setTrackingBooking(b)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                        style={{ background: "#10b981" }}>
                        📍 Track
                      </button>
                      <button onClick={() => setChatBooking(b)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                        style={{ background: PRIMARY }}>
                        <MessageCircle className="w-3 h-3" /> Chat
                      </button>
                    </div>
                  )}
                </div>
                {/* Assign to rider */}
                {riders.length > 0 ? (
                  <div>
                    <div className="text-xs text-gray-400 mb-2 font-medium">Assign to online rider:</div>
                    <div className="space-y-1">
                      {riders.slice(0, 3).map(r => (
                        <button key={r.id} onClick={() => assignRider(b, r)} disabled={assigning === b.id}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors disabled:opacity-50"
                          style={{ borderColor: PRIMARY, background: "#F0FBFE" }}>
                          <span className="font-medium text-gray-800">{r.full_name}</span>
                          <span className="text-xs font-bold" style={{ color: PRIMARY }}>Assign →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-500 font-medium">No online riders available</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RIDERS */}
        {!loading && tab === "riders" && (
          <div className="px-4 pt-4 pb-6 space-y-2">
            {riders.length === 0 && (
              <div className="flex flex-col items-center py-16 text-gray-300">
                <Users className="w-10 h-10 mb-2" />
                <p className="text-sm">No riders online</p>
              </div>
            )}
            {riders.map(r => (
              <div key={r.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100" style={{ boxShadow: `0 2px 8px rgba(77,200,240,0.07)` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: PRIMARY }}>
                  {r.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                  <div className="text-xs text-gray-400">{r.zone} · {r.plate_number || "No plate"}</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATS */}
        {!loading && tab === "stats" && (
          <div className="px-4 pt-4 pb-6 space-y-3">
            {[
              { label: "Pending Bookings", value: bookings.length, color: "#f59e0b" },
              { label: "Online Riders", value: riders.length, color: "#10b981" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl px-5 py-4 border border-gray-100" style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.08)` }}>
                <div className="text-sm text-gray-500 font-medium mb-1">{s.label}</div>
                <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}