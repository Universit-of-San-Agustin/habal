import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { readDemoStore, DEMO_EVENT, appendDemoEvent, isDemoMode, patchDemoStore } from "@/lib/demoStore";
import {
  Users, Send, BarChart2, ShieldAlert, LogOut, RefreshCw,
  MapPin, Star, MessageCircle, Wallet, CheckCircle, XCircle,
  Clock, TrendingUp, Bike, AlertTriangle, Eye, PhoneCall,
  Navigation, ChevronRight, Plus, Minus, Shield, Award,
  Activity, DollarSign, Target, Zap
} from "lucide-react";
import ChatPanel from "../chat/ChatPanel";
import LiveRiderMap from "./LiveRiderMap";
import { useToast, ToastContainer } from "./ToastNotification";
import LiveMapMonitor from "../network/LiveMapMonitor";

import { COLORS, SHADOWS, RADIUS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;
const GREEN = COLORS.success;
const RED = COLORS.error;
const AMBER = COLORS.warning;
const PURPLE = "#8b5cf6";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function NetworkOwnerDashboard({ user }) {
  const [tab, setTab] = useState("bookings");
  const [network, setNetwork] = useState(null);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [strikes, setStrikes] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const knownBookingIds = useRef(new Set());
  const pollRef = useRef(null);
  const { toasts, addToast, dismiss } = useToast();

  // Sub-panels
  const [chatBooking, setChatBooking] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    if (!user?.email) return;
    // ── DEMO MODE: read entirely from local store ──
    if (localStorage.getItem("demo_mode") === "true") {
      const store = readDemoStore();
      const demoNet = {
        id: "demo-network",
        name: "Demo Network",
        owner_name: user?.full_name || "Demo Operator",
        owner_email: user?.email,
        zone: "City Proper",
        status: "approved",
        verified_badge: true,
        wallet_balance: 50000 + (store.stats?.earnings || 0),
        wallet_threshold: 5000,
        active_rider_seats: 30,
        subscription_status: "active",
        strikes: 0,
        total_bookings: store.stats?.bookings || 0,
        completed_bookings: store.stats?.trips || 0,
        cancelled_bookings: 0,
        avg_rating: 4.8,
      };
      setNetwork(demoNet);
      const newBks = store.bookings || [];
      if (knownBookingIds.current.size > 0) {
        newBks.forEach(b => {
          if (!knownBookingIds.current.has(b.id)) {
            addToast({ type: "rider", title: "New Booking", message: `${b.customer_name} needs a rider` });
          }
        });
      }
      newBks.forEach(b => knownBookingIds.current.add(b.id));
      setRiders(store.riders || []);
      setBookings(newBks);
      setStrikes([]);
      setZones([]);
      setLoading(false);
      return;
    }

    // ── REAL MODE ──
    let nets = await base44.entities.Network.filter({ owner_email: user.email }, "-created_date", 1).catch(() => []);
    let net  = nets?.[0];
    if (!net) {
      net = {
        id: "demo-network", name: "Demo Network",
        owner_name: user?.full_name || "Demo Operator", owner_email: user?.email,
        zone: "City Proper", status: "approved", verified_badge: true,
        wallet_balance: 50000, wallet_threshold: 5000, active_rider_seats: 30,
        subscription_status: "active", strikes: 0, total_bookings: 0,
        completed_bookings: 0, cancelled_bookings: 0, avg_rating: 4.8,
      };
    }
    setNetwork(net);
    if (net) {
      const [rdrs, bks, stks, zns] = await Promise.all([
        base44.entities.Rider.filter({ network_id: net.id }, "-created_date", 100).catch(() => []),
        base44.entities.Booking.filter({ network_id: net.id }, "-created_date", 50).catch(() => []),
        base44.entities.Strike.filter({ target_id: net.id }, "-created_date", 20).catch(() => []),
        base44.entities.Zone.list("-created_date", 10).catch(() => []),
      ]);
      const newBks = bks || [];
      if (knownBookingIds.current.size > 0) {
        newBks.forEach(b => {
          if (!knownBookingIds.current.has(b.id)) {
            addToast({ type: "rider", title: "New Booking", message: `${b.customer_name} needs a rider` });
          }
        });
      }
      newBks.forEach(b => knownBookingIds.current.add(b.id));
      setRiders(rdrs || []);
      setBookings(newBks);
      setStrikes(stks || []);
      setZones(zns || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (localStorage.getItem("demo_mode") === "true") {
      const onUpdate = () => load();
      window.addEventListener(DEMO_EVENT, onUpdate);
      return () => window.removeEventListener(DEMO_EVENT, onUpdate);
    }
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const writeAuditLog = (action, targetType, targetId, targetName, details = "") => {
    base44.entities.AuditLog.create({
      log_type: "admin_action",
      action,
      actor_id: user?.id || user?.email,
      actor_name: user?.full_name || "Operator",
      actor_role: "network_owner",
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      details,
      network_id: network?.id,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  };

  const handleVerifyRider = async (rider) => {
    setProcessing(true);
    await base44.entities.Rider.update(rider.id, { status: "active" });
    writeAuditLog("RIDER_APPROVED", "rider", rider.id, rider.full_name, "Rider verified by network operator");
    await load();
    addToast({ type: "success", title: "Rider Verified", message: `${rider.full_name} is now active` });
    setProcessing(false);
  };

  const handleSuspendRider = async (rider) => {
    setConfirmAction({
      label: `Suspend ${rider.full_name}? They will be taken offline.`,
      fn: async () => {
        setProcessing(true);
        await base44.entities.Rider.update(rider.id, { status: "suspended", online_status: "offline" });
        writeAuditLog("RIDER_SUSPENDED", "rider", rider.id, rider.full_name, "Rider suspended by network operator");
        await load();
        addToast({ type: "alert", title: "Rider Suspended", message: `${rider.full_name} has been suspended` });
        setProcessing(false);
        setSelectedRider(null);
      }
    });
  };

  const handleIssueStrike = async (riderId, riderName) => {
    setProcessing(true);
    const r = riders.find(r => r.id === riderId);
    await base44.entities.Rider.update(riderId, { strikes: (r?.strikes || 0) + 1 });
    await base44.entities.Strike.create({
      target_type: "rider", target_id: riderId, target_name: riderName,
      reason: "Manual strike by network operator", severity: "strike",
      issued_by: user?.full_name || "Network Owner", timestamp: new Date().toISOString()
    });
    await load();
    addToast({ type: "alert", title: "Strike Issued", message: `Strike recorded for ${riderName}` });
    setProcessing(false);
  };

  const handleAssignRider = async (bookingId, rider) => {
    setProcessing(true);
    if (isDemoMode()) {
      patchDemoStore((store) => ({
        ...store,
        bookings: store.bookings.map((booking) => booking.id === bookingId ? {
          ...booking,
          rider_id: rider.id,
          rider_name: rider.full_name,
          rider_phone: rider.phone,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        } : booking),
        riders: store.riders.map((entry) => entry.id === rider.id ? { ...entry, online_status: "on_trip" } : entry),
      }));
      appendDemoEvent({
        booking_id: bookingId,
        type: "RIDER_ASSIGNED",
        actor: user?.full_name || "Operator",
        message: `Assigned to ${rider.full_name}`,
      });
      await load();
      addToast({ type: "success", title: "Rider Assigned", message: `${rider.full_name} assigned successfully` });
      setAssigningBooking(null);
      setProcessing(false);
      return;
    }

    await base44.entities.Booking.update(bookingId, {
      rider_id: rider.id, rider_name: rider.full_name, rider_phone: rider.phone,
      status: "assigned", assigned_at: new Date().toISOString()
    });
    await base44.entities.BookingEvent.create({
      booking_id: bookingId, event_type: "RIDER_ASSIGNED",
      actor_role: "network_owner", actor_name: user?.full_name,
      details: `Assigned to ${rider.full_name}`, timestamp: new Date().toISOString()
    });
    await load();
    addToast({ type: "success", title: "Rider Assigned", message: `${rider.full_name} assigned successfully` });
    setAssigningBooking(null);
    setProcessing(false);
  };

  const handleBroadcast = async (booking) => {
    setProcessing(true);
    if (isDemoMode()) {
      patchDemoStore((store) => ({
        ...store,
        bookings: store.bookings.map((entry) => entry.id === booking.id ? { ...entry, status: "searching" } : entry),
      }));
      appendDemoEvent({
        booking_id: booking.booking_id || booking.id,
        type: "BOOKING_BROADCASTED",
        actor: user?.full_name || "Operator",
        message: "Booking re-broadcasted to available riders",
      });
      addToast({ type: "info", title: "Broadcasted", message: "Booking sent to available riders" });
      setProcessing(false);
      return;
    }

    base44.functions.invoke("matchRider", { booking_id: booking.booking_id || booking.id }).catch(() => {});
    addToast({ type: "info", title: "Broadcasted", message: "Booking sent to available riders" });
    setProcessing(false);
  };

  // Computed stats
  const completed = bookings.filter(b => b.status === "completed").length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const active = bookings.filter(b => ["assigned","otw","arrived","in_progress"].includes(b.status)).length;
  const pending = bookings.filter(b => ["pending","searching"].includes(b.status)).length;
  const completionRate = bookings.length ? Math.round(completed / bookings.length * 100) : 0;
  const cancellationRate = bookings.length ? Math.round(cancelled / bookings.length * 100) : 0;
  const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const avgRating = bookings.filter(b => b.customer_rating).length
    ? (bookings.filter(b => b.customer_rating).reduce((s, b) => s + b.customer_rating, 0) / bookings.filter(b => b.customer_rating).length).toFixed(1)
    : null;
  const onlineRiders = riders.filter(r => r.online_status === "online" || r.online_status === "on_trip").length;
  const pendingVerification = riders.filter(r => r.status === "pending").length;

  const tabs = [
    { id: "map",       label: "Map",      icon: Navigation },
    { id: "bookings",  label: "Inbox",    icon: Send },
    { id: "members",   label: "Members",  icon: Users },
    { id: "analytics", label: "Analytics",icon: BarChart2 },
    { id: "wallet",    label: "Wallet",   icon: Wallet },
  ];

  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderWidth: "3px", borderColor: PRIMARY_BG, borderTopColor: PRIMARY }} />
      <p className="text-xs text-gray-400 font-medium">Loading dashboard...</p>
    </div>
  );

  if (!network) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white px-8 text-center">
      <div className="w-10 h-10 border-3 rounded-full animate-spin mb-4" style={{ borderWidth: "3px", borderColor: PRIMARY_BG, borderTopColor: PRIMARY }} />
      <p className="text-sm text-gray-400 font-medium">Setting up your network...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col max-w-md mx-auto overflow-hidden">
      
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {chatBooking && <ChatPanel bookingId={chatBooking.booking_id || chatBooking.id} currentUser={user} senderRole="network_owner" onClose={() => setChatBooking(null)} />}
      {trackingBooking && <LiveRiderMap booking={trackingBooking} onClose={() => setTrackingBooking(null)} />}
      {showLiveMap && network && (
        <LiveMapMonitor onClose={() => setShowLiveMap(false)} networkId={network.id} />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-2xl mb-3 text-center">⚠️</div>
            <p className="text-sm font-semibold text-gray-800 text-center mb-5">{confirmAction.label}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">
                Cancel
              </button>
              <button onClick={async () => { const fn = confirmAction.fn; setConfirmAction(null); await fn(); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Rider Modal */}
      {assigningBooking && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[70vh] flex flex-col">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="font-bold text-gray-900 mb-1">Assign Rider</div>
            <div className="text-xs text-gray-400 mb-4">Select an available rider for {assigningBooking.customer_name}</div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {riders.filter(r => r.status === "active" && r.online_status === "online").length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No available online riders</div>
              )}
              {riders.filter(r => r.status === "active" && r.online_status === "online").map(r => (
                <button key={r.id} onClick={() => handleAssignRider(assigningBooking.id, r)} disabled={processing}
                  className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 text-left hover:bg-blue-50 transition-colors disabled:opacity-50">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ background: GREEN }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                    <div className="text-xs text-gray-400">{r.plate_number} · ⭐ {r.avg_rating?.toFixed(1) || "New"}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </button>
              ))}
            </div>
            <button onClick={() => setAssigningBooking(null)} className="mt-4 w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rider Detail Modal */}
      {selectedRider && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                {selectedRider.full_name?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-gray-900">{selectedRider.full_name}</div>
                <div className="text-xs text-gray-400">{selectedRider.plate_number} · {selectedRider.motorcycle_make} {selectedRider.motorcycle_model}</div>
                <div className="flex items-center gap-1 mt-1">
                  <RiderStatusDot status={selectedRider.online_status} />
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${selectedRider.status === "active" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>{selectedRider.status}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Trips", value: selectedRider.completed_trips || 0, color: GREEN },
                { label: "Rating", value: selectedRider.avg_rating?.toFixed(1) || "—", color: AMBER },
                { label: "Strikes", value: selectedRider.strikes || 0, color: RED },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {selectedRider.status === "pending" && (
                <button onClick={() => handleVerifyRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: GREEN }}>
                  <CheckCircle className="w-4 h-4" /> Verify & Activate
                </button>
              )}
              <button onClick={() => handleIssueStrike(selectedRider.id, selectedRider.full_name)} disabled={processing}
                className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-amber-200 text-amber-600 disabled:opacity-60 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Issue Strike
              </button>
              {selectedRider.status === "active" && (
                <button onClick={() => handleSuspendRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-red-200 text-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Suspend Rider
                </button>
              )}
              <button onClick={() => setSelectedRider(null)} className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" onError={e => { e.target.style.display="none"; }} />
            <div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Operator</div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{network.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingVerification > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold text-amber-600">{pendingVerification} pending</span>
              </div>
            )}
            <button onClick={() => setShowLiveMap(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shadow-md"
              style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #059669 100%)` }}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live Map
            </button>
            <button onClick={load} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
              <RefreshCw className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            </button>
            <button onClick={() => base44.auth.logout(window.location.href)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        {/* Status bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {network.verified_badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: PRIMARY }}>✓ Verified</span>}
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{network.zone}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600">🟢 {onlineRiders} online</span>
          {active > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">🚀 {active} active</span>}
          {pending > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">⏳ {pending} waiting</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white overflow-x-auto flex-shrink-0"
        style={{ boxShadow: "0 2px 8px rgba(77,200,240,0.06)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-all min-w-[56px]"
            style={tab === id ? { color: PRIMARY, borderBottom: `2.5px solid ${PRIMARY}` } : { color: "#b0bec5" }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── LIVE MAP ── */}
        {tab === "map" && (
          <div className="h-full">
            <LiveMapMonitor networkId={network.id} embedded />
          </div>
        )}

        {/* ── BOOKING INBOX ── */}
        {tab === "bookings" && (
          <div className="px-4 pt-4 pb-8 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Booking Inbox</div>
            {bookings.length === 0 && <EmptyState icon={<Send className="w-10 h-10" />} label="No bookings yet" />}
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{b.customer_name}</div>
                    <div className="text-[10px] font-mono text-gray-400">{b.booking_id || b.id?.slice(0,8)}</div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                    <span className="truncate">{b.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{b.dropoff_address}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="text-xs text-gray-400">
                    {b.rider_name
                      ? <span className="font-semibold text-gray-600">🏍 {b.rider_name}</span>
                      : <span className="text-amber-500 font-medium">Unassigned</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.fare_estimate && <span className="text-xs font-black text-gray-800">₱{b.fare_estimate}</span>}
                    {["pending","searching"].includes(b.status) && (
                      <>
                        <button onClick={() => setAssigningBooking(b)}
                          className="text-[10px] font-bold px-2 py-1 rounded-xl text-white"
                          style={{ background: PRIMARY }}>
                          Assign
                        </button>
                        <button onClick={() => handleBroadcast(b)} disabled={processing}
                          className="text-[10px] font-bold px-2 py-1 rounded-xl border-2 text-gray-500 disabled:opacity-50"
                          style={{ borderColor: "#e5e7eb" }}>
                          Broadcast
                        </button>
                      </>
                    )}
                    {b.rider_name && (
                      <>
                        <button onClick={() => setTrackingBooking(b)}
                          className="text-[10px] font-bold px-2 py-1 rounded-xl text-white"
                          style={{ background: GREEN }}>
                          📍 Track
                        </button>
                        <button onClick={() => setChatBooking(b)}
                          className="text-[10px] font-bold px-2 py-1 rounded-xl text-white"
                          style={{ background: PRIMARY }}>
                          💬 Chat
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MEMBER DIRECTORY ── */}
        {tab === "members" && (
          <div className="px-4 pt-4 pb-8">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Total", value: riders.length, color: PRIMARY },
                { label: "Active", value: riders.filter(r => r.status === "active").length, color: GREEN },
                { label: "Pending", value: pendingVerification, color: AMBER },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pending verification */}
            {pendingVerification > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">⏳ Pending Verification</div>
                <div className="space-y-2">
                  {riders.filter(r => r.status === "pending").map(r => (
                    <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: AMBER }}>
                        {r.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                        <div className="text-xs text-gray-500">{r.plate_number || "No plate"}</div>
                      </div>
                      <button onClick={() => setSelectedRider(r)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                        style={{ background: AMBER }}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active riders */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">All Members</div>
            <div className="space-y-2">
              {riders.length === 0 && <EmptyState icon={<Users className="w-10 h-10" />} label="No riders yet" />}
              {riders.filter(r => r.status !== "pending").map(r => (
                <button key={r.id} onClick={() => setSelectedRider(r)}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm text-left hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: r.status === "suspended" ? "#ef4444" : r.status === "active" ? GREEN : PRIMARY }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                    <div className="text-xs text-gray-400">{r.plate_number || "No plate"} · {r.motorcycle_make}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RiderStatusDot status={r.online_status} />
                      {r.strikes > 0 && <span className="text-[10px] text-red-500 font-bold">⚠ {r.strikes} strikes</span>}
                      {r.avg_rating > 0 && <span className="text-[10px] text-amber-500">⭐ {r.avg_rating?.toFixed(1)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                      r.status === "active" ? "bg-green-50 text-green-600" :
                      r.status === "suspended" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{r.completed_trips || 0} trips</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <div className="px-4 pt-4 pb-8 space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Completion Rate", value: `${completionRate}%`, target: "≥ 85%", color: completionRate >= 85 ? GREEN : RED, icon: <Target className="w-5 h-5" /> },
                { label: "Cancellation Rate", value: `${cancellationRate}%`, target: "≤ 15%", color: cancellationRate <= 15 ? GREEN : RED, icon: <XCircle className="w-5 h-5" /> },
                { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, target: "All time", color: PURPLE, icon: <DollarSign className="w-5 h-5" /> },
                { label: "Avg Rating", value: avgRating || "—", target: "≥ 4.6", color: avgRating >= 4.6 ? GREEN : AMBER, icon: <Star className="w-5 h-5" /> },
              ].map(m => (
                <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: m.color + "18", color: m.color }}>
                      {m.icon}
                    </div>
                    <span className="text-[10px] text-gray-400">{m.target}</span>
                  </div>
                  <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Booking breakdown */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Booking Breakdown</div>
              {[
                { label: "Completed", value: completed, color: GREEN, total: bookings.length },
                { label: "Active / In Progress", value: active, color: PRIMARY, total: bookings.length },
                { label: "Pending / Searching", value: pending, color: AMBER, total: bookings.length },
                { label: "Cancelled", value: cancelled, color: RED, total: bookings.length },
              ].map(b => (
                <div key={b.label} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{b.label}</span>
                    <span className="font-bold" style={{ color: b.color }}>{b.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: b.total ? `${Math.round(b.value / b.total * 100)}%` : "0%", background: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Rider performance */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Rider Performance</div>
              {riders.filter(r => r.status === "active").slice(0, 5).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No active riders yet</p>
              )}
              {riders.filter(r => r.status === "active").sort((a, b) => (b.completed_trips || 0) - (a.completed_trips || 0)).slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="text-xs font-black text-gray-300 w-4">{i + 1}</div>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{r.full_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">{r.completed_trips || 0} trips</span>
                      {r.avg_rating > 0 && <span className="text-[10px] text-amber-500">⭐ {r.avg_rating?.toFixed(1)}</span>}
                    </div>
                  </div>
                  <RiderStatusDot status={r.online_status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ZONE CONTROL ── */}
        {tab === "zone" && (
          <div className="px-4 pt-4 pb-8 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Territory Assignment</div>
            {/* My zone */}
            <div className="rounded-2xl p-4 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              <div className="text-xs font-bold opacity-80 uppercase tracking-wider mb-1">Your Zone</div>
              <div className="text-2xl font-black mb-1">{network.zone || "—"}</div>
              <div className="flex items-center gap-2 flex-wrap text-xs opacity-80">
                <span>🏍 {riders.filter(r => r.status === "active").length} active riders</span>
                <span>📋 {bookings.length} total bookings</span>
                {network.verified_badge && <span>✓ Verified Network</span>}
              </div>
            </div>

            {/* All zones */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">All Zones</div>
              {zones.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No zone data available</div>
              ) : zones.map(z => (
                <div key={z.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${z.name === network.zone ? "text-sky-500" : "text-gray-300"}`} />
                    <div>
                      <div className={`text-sm font-semibold ${z.name === network.zone ? "text-gray-900" : "text-gray-600"}`}>
                        {z.name} {z.name === network.zone && <span className="text-[10px] text-sky-500 font-bold">(yours)</span>}
                      </div>
                      {z.assigned_network_name && <div className="text-[10px] text-gray-400">{z.assigned_network_name}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <ZoneStatusPill status={z.status} />
                    {z.is_premium && <span className="text-[10px] text-amber-500 font-bold">⭐ Premium</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Network subscription info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Network Info</div>
              {[
                { label: "Subscription", value: network.subscription_status, color: network.subscription_status === "active" ? GREEN : RED },
                { label: "Rider Seats", value: `${riders.filter(r => r.status !== "banned").length} / ${network.active_rider_seats || 30}`, color: PRIMARY },
                { label: "Network Strikes", value: network.strikes || 0, color: network.strikes > 2 ? RED : GREEN },
                { label: "Status", value: network.status, color: network.status === "approved" ? GREEN : AMBER },
              ].map(i => (
                <div key={i.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{i.label}</span>
                  <span className="text-sm font-bold capitalize" style={{ color: i.color }}>{i.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === "wallet" && (
          <div className="px-4 pt-4 pb-8 space-y-4">
            {/* Balance card */}
            <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #6d28d9 100%)` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold uppercase tracking-widest opacity-70">Network Wallet</div>
                <Wallet className="w-5 h-5 opacity-70" />
              </div>
              <div className="mb-3">
                <div className="text-xs opacity-70 mb-1">Available Balance</div>
                <div className="text-4xl font-black">₱{(network.wallet_balance || 0).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs opacity-60">{network.name}</div>
                {network.wallet_balance < (network.wallet_threshold || 5000) && (
                  <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-bold">⚠ Low Balance</span>
                )}
              </div>
            </div>

            {/* Threshold */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">Minimum Threshold</span>
                <span className="font-bold text-gray-900">₱{(network.wallet_threshold || 5000).toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
                <div className="h-2.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((network.wallet_balance || 0) / (network.wallet_threshold || 5000)) * 100)}%`,
                    background: (network.wallet_balance || 0) >= (network.wallet_threshold || 5000) ? GREEN : RED
                  }} />
              </div>
              <div className="text-xs text-gray-400 mt-1.5">
                {(network.wallet_balance || 0) >= (network.wallet_threshold || 5000) ? "✅ Balance is healthy" : "⚠ Below required threshold"}
              </div>
            </div>

            {/* Penalties / strikes log */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Penalties & Strikes</div>
              {strikes.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No strikes or penalties</p>
                </div>
              ) : strikes.map(s => (
                <div key={s.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.severity === "ban" ? "bg-red-100" : s.severity === "suspension" ? "bg-orange-100" : "bg-amber-100"}`}>
                    <AlertTriangle className={`w-3.5 h-3.5 ${
                      s.severity === "ban" ? "text-red-500" : s.severity === "suspension" ? "text-orange-500" : "text-amber-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 capitalize">{s.severity}</div>
                    <div className="text-xs text-gray-400 truncate">{s.reason}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">{s.created_date ? new Date(s.created_date).toLocaleDateString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue summary */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue Summary</div>
              {[
                { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, color: GREEN },
                { label: "Completed Trips", value: completed, color: PRIMARY },
                { label: "Avg Fare", value: completed ? `₱${Math.round(totalRevenue / completed)}` : "—", color: PURPLE },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{s.label}</span>
                  <span className="font-black" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending:     "bg-amber-50 text-amber-600",
    searching:   "bg-amber-50 text-amber-600",
    assigned:    "bg-blue-50 text-blue-600",
    otw:         "bg-blue-50 text-blue-600",
    arrived:     "bg-green-50 text-green-600",
    in_progress: "bg-purple-50 text-purple-600",
    completed:   "bg-green-50 text-green-600",
    cancelled:   "bg-red-50 text-red-500",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${map[status] || "bg-gray-50 text-gray-500"}`}>{status}</span>;
}

function ZoneStatusPill({ status }) {
  const map = {
    available: "bg-green-50 text-green-600",
    assigned:  "bg-blue-50 text-blue-600",
    locked:    "bg-gray-100 text-gray-500",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${map[status] || "bg-gray-50 text-gray-500"}`}>{status}</span>;
}

function RiderStatusDot({ status }) {
  const cfg = {
    online:  { color: "#22c55e", label: "online" },
    on_trip: { color: "#3b82f6", label: "on trip" },
    offline: { color: "#d1d5db", label: "offline" },
  };
  const c = cfg[status] || cfg.offline;
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      <span className="text-[10px] text-gray-400">{c.label}</span>
    </div>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center py-16 text-gray-200">
      {icon}
      <p className="text-sm text-gray-400 mt-2">{label}</p>
    </div>
  );
}