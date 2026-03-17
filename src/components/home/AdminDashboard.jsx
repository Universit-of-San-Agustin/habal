import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, isDemoMode, readDemoStore } from "@/lib/demoStore";
import {
  Users, MapPin, BarChart2, ShieldAlert, LogOut, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Wallet,
  Bike, BookOpen, Star, ChevronRight, Eye, Building2,
  TrendingUp, DollarSign, Clock, Shield, FileText
} from "lucide-react";
import ZoneManagement from "../admin/ZoneManagement";
import EnforcementPanel from "../admin/EnforcementPanel";
import AdminAnalytics from "../admin/AdminAnalytics";
import SupportTicketsPanel from "../admin/SupportTicketsPanel";
import WalletPanel from "../admin/WalletPanel";
import LiveMapMonitor from "../admin/LiveMapMonitor";
import SystemHealthCheck from "../admin/SystemHealthCheck";
import SystemValidationReport from "../admin/SystemValidationReport";
import SensitiveLogsGate from "../admin/SensitiveLogsGate";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";
const GREEN = "#10b981";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const PURPLE = "#8b5cf6";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function AdminDashboard({ user }) {
  const [tab, setTab] = useState("overview");
  const [networks, setNetworks] = useState([]);
  const [riders, setRiders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [networkFilter, setNetworkFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null); // { label, fn }

  // Detail modals
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const load = async () => {
    if (isDemoMode()) {
      const store = readDemoStore();
      setNetworks([{
        id: "demo-network",
        name: "Demo Network",
        owner_name: "Demo Operator",
        zone: "City Proper",
        status: "approved",
        verified_badge: true,
        wallet_balance: 50000 + (store.stats?.earnings || 0),
        strikes: 0,
      }]);
      setRiders(store.riders || []);
      setBookings(store.bookings || []);
      setLoading(false);
      return;
    }

    const [nets, rdrs, bks] = await Promise.all([
      base44.entities.Network.list("-created_date", 100).catch(() => []),
      base44.entities.Rider.list("-created_date", 200).catch(() => []),
      base44.entities.Booking.list("-created_date", 100).catch(() => []),
    ]);
    setNetworks(nets || []);
    setRiders(rdrs || []);
    setBookings(bks || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, load);
      return () => window.removeEventListener(DEMO_EVENT, load);
    }
  }, []);

  // Network actions
  const writeAuditLog = (action, targetType, target, details = "") => {
    base44.entities.AuditLog.create({
      log_type: "admin_action",
      action,
      actor_id: user?.id || user?.email,
      actor_name: user?.full_name || "Admin",
      actor_role: "admin",
      target_type: targetType,
      target_id: target?.id,
      target_name: target?.name || target?.full_name,
      details,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  };

  const confirm = (label, fn) => setConfirmAction({ label, fn });

  const approveNetwork = async (net) => {
    setProcessing(true);
    await base44.entities.Network.update(net.id, { status: "approved", verified_badge: true });
    writeAuditLog("NETWORK_APPROVED", "network", net, "Network approved and verified");
    await load(); setSelectedNetwork(null); setProcessing(false);
  };
  const suspendNetwork = async (net) => {
    confirm(`Suspend network "${net.name}"?`, async () => {
      setProcessing(true);
      await base44.entities.Network.update(net.id, { status: "suspended" });
      writeAuditLog("NETWORK_SUSPENDED", "network", net, "Network suspended by admin");
      await load(); setSelectedNetwork(null); setProcessing(false);
    });
  };
  const banNetwork = async (net) => {
    confirm(`Permanently ban network "${net.name}"? This cannot be undone.`, async () => {
      setProcessing(true);
      await base44.entities.Network.update(net.id, { status: "banned" });
      writeAuditLog("NETWORK_BANNED", "network", net, "Network banned by admin");
      await load(); setSelectedNetwork(null); setProcessing(false);
    });
  };

  // Rider actions
  const approveRider = async (rider) => {
    setProcessing(true);
    await base44.entities.Rider.update(rider.id, { status: "active" });
    writeAuditLog("RIDER_APPROVED", "rider", { id: rider.id, full_name: rider.full_name }, "Rider verified and activated");
    await load(); setSelectedRider(null); setProcessing(false);
  };
  const suspendRider = async (rider) => {
    confirm(`Suspend rider "${rider.full_name}"?`, async () => {
      setProcessing(true);
      await base44.entities.Rider.update(rider.id, { status: "suspended", online_status: "offline" });
      writeAuditLog("RIDER_SUSPENDED", "rider", { id: rider.id, full_name: rider.full_name }, "Rider suspended by admin");
      await load(); setSelectedRider(null); setProcessing(false);
    });
  };
  const banRider = async (rider) => {
    confirm(`Permanently ban rider "${rider.full_name}"? This cannot be undone.`, async () => {
      setProcessing(true);
      await base44.entities.Rider.update(rider.id, { status: "banned", online_status: "offline" });
      writeAuditLog("RIDER_BANNED", "rider", { id: rider.id, full_name: rider.full_name }, "Rider banned by admin");
      await load(); setSelectedRider(null); setProcessing(false);
    });
  };

  // Stats
  const pendingNetworks = networks.filter(n => n.status === "pending");
  const pendingRiders = riders.filter(r => r.status === "pending");
  const activeNetworks = networks.filter(n => n.status === "approved");
  const activeRiders = riders.filter(r => r.online_status === "online" || r.online_status === "on_trip");
  const totalCompleted = bookings.filter(b => b.status === "completed").length;
  const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const totalAlerts = pendingNetworks.length + pendingRiders.length;

  const tabs = [
    { id: "overview",  label: "Overview",  icon: BarChart2 },
    { id: "networks",  label: "Networks",  icon: Building2 },
    { id: "riders",    label: "Riders",    icon: Bike },
    { id: "bookings",  label: "Bookings",  icon: BookOpen },
    { id: "zones",     label: "Zones",     icon: MapPin },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "enforce",   label: "Enforce",   icon: ShieldAlert },
    { id: "wallet",    label: "Wallet",    icon: Wallet },
    { id: "support",   label: "Support",   icon: Shield },
    { id: "audit",     label: "Audit Log", icon: FileText },
  ];

  const activeRidersCount = riders.filter(r => r.online_status === "online" || r.online_status === "on_trip").length;

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col max-w-md mx-auto overflow-hidden">

      {/* Live Map Monitor Overlay */}
      {showLiveMap && (
        <LiveMapMonitor onClose={() => setShowLiveMap(false)} />
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

      {/* Network Detail Modal */}
      {selectedNetwork && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {selectedNetwork.name}
                  {selectedNetwork.verified_badge && <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-semibold" style={{ background: PRIMARY }}>✓</span>}
                </div>
                <div className="text-sm text-gray-400">{selectedNetwork.zone} · {selectedNetwork.owner_name}</div>
              </div>
              <StatusPill status={selectedNetwork.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Wallet", value: `₱${(selectedNetwork.wallet_balance || 0).toLocaleString()}`, color: PURPLE },
                { label: "Strikes", value: selectedNetwork.strikes || 0, color: selectedNetwork.strikes > 0 ? RED : GREEN },
                { label: "Bookings", value: bookings.filter(b => b.network_id === selectedNetwork.id).length, color: PRIMARY },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {selectedNetwork.status === "pending" && (
                <button onClick={() => approveNetwork(selectedNetwork)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: GREEN }}>
                  <CheckCircle className="w-4 h-4" /> Approve & Verify
                </button>
              )}
              {selectedNetwork.status === "approved" && (
                <button onClick={() => suspendNetwork(selectedNetwork)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-amber-200 text-amber-600 disabled:opacity-60 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Suspend Network
                </button>
              )}
              {["pending","approved","suspended"].includes(selectedNetwork.status) && (
                <button onClick={() => banNetwork(selectedNetwork)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-red-200 text-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Ban Network
                </button>
              )}
              {selectedNetwork.status === "suspended" && (
                <button onClick={() => approveNetwork(selectedNetwork)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: PRIMARY }}>
                  <CheckCircle className="w-4 h-4" /> Reinstate Network
                </button>
              )}
              <button onClick={() => setSelectedNetwork(null)} className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Detail Modal */}
      {selectedRider && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                {selectedRider.full_name?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-gray-900">{selectedRider.full_name}</div>
                <div className="text-xs text-gray-400">{selectedRider.network_name} · {selectedRider.zone}</div>
                <div className="text-xs text-gray-400">{selectedRider.plate_number} · {selectedRider.motorcycle_make} {selectedRider.motorcycle_model}</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: "Trips", value: selectedRider.completed_trips || 0, color: GREEN },
                { label: "Rating", value: selectedRider.avg_rating?.toFixed(1) || "—", color: AMBER },
                { label: "Strikes", value: selectedRider.strikes || 0, color: RED },
                { label: "Accept%", value: selectedRider.acceptance_rate ? `${selectedRider.acceptance_rate}%` : "—", color: PRIMARY },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-2.5 text-center">
                  <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {selectedRider.status === "pending" && (
                <button onClick={() => approveRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: GREEN }}>
                  <CheckCircle className="w-4 h-4" /> Verify & Activate
                </button>
              )}
              {selectedRider.status === "active" && (
                <button onClick={() => suspendRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-amber-200 text-amber-600 disabled:opacity-60 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Suspend Rider
                </button>
              )}
              {selectedRider.status === "suspended" && (
                <button onClick={() => approveRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: PRIMARY }}>
                  <CheckCircle className="w-4 h-4" /> Reinstate Rider
                </button>
              )}
              {["pending","active","suspended"].includes(selectedRider.status) && (
                <button onClick={() => banRider(selectedRider)} disabled={processing}
                  className="w-full py-3 rounded-2xl font-bold text-sm border-2 border-red-200 text-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Ban Rider
                </button>
              )}
              <button onClick={() => setSelectedRider(null)} className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono text-xs font-bold mb-1" style={{ color: PRIMARY }}>{selectedBooking.booking_id || selectedBooking.id?.slice(0,12)}</div>
                <div className="font-bold text-gray-900">{selectedBooking.customer_name}</div>
                <div className="text-xs text-gray-400">{selectedBooking.customer_phone}</div>
              </div>
              <StatusPill status={selectedBooking.status} />
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 mb-4 space-y-2">
              <div className="flex gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: PRIMARY }} />
                <span>{selectedBooking.pickup_address}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-600">
                <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{selectedBooking.dropoff_address}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              {[
                { label: "Zone", value: selectedBooking.zone || "—" },
                { label: "Fare", value: selectedBooking.fare_estimate ? `₱${selectedBooking.fare_estimate}` : "—" },
                { label: "Rider", value: selectedBooking.rider_name || "Unassigned" },
                { label: "Network", value: selectedBooking.network_name || "—" },
                { label: "Payment", value: selectedBooking.payment_method?.toUpperCase() || "CASH" },
                { label: "Rating", value: selectedBooking.customer_rating ? `⭐ ${selectedBooking.customer_rating}` : "—" },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-xl px-3 py-2">
                  <div className="text-gray-400 text-[10px]">{f.label}</div>
                  <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate">{f.value}</div>
                </div>
              ))}
            </div>
            {selectedBooking.cancellation_reason && (
              <div className="bg-red-50 rounded-xl p-3 mb-3 text-xs text-red-600">
                <span className="font-bold">Cancellation: </span>{selectedBooking.cancellation_reason}
              </div>
            )}
            <button onClick={() => setSelectedBooking(null)} className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain" onError={e => { e.target.style.display="none"; }} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: PRIMARY }}>Admin Panel</div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{user?.full_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-red-500">{totalAlerts} alerts</span>
              </div>
            )}
            <button onClick={() => setShowLiveMap(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-white text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #059669 100%)` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white overflow-x-auto flex-shrink-0"
        style={{ boxShadow: "0 2px 8px rgba(77,200,240,0.06)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-shrink-0 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-all px-3 relative"
            style={tab === id ? { color: PRIMARY, borderBottom: `2.5px solid ${PRIMARY}` } : { color: "#b0bec5" }}>
            <Icon className="w-4 h-4" />
            {label}
            {id === "networks" && pendingNetworks.length > 0 && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
            {id === "riders" && pendingRiders.length > 0 && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 rounded-full animate-spin" style={{ borderWidth: "3px", borderStyle: "solid", borderColor: PRIMARY_BG, borderTopColor: PRIMARY }} />
            <p className="text-xs text-gray-400 font-medium">Loading data...</p>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {!loading && tab === "overview" && (
          <div className="px-4 pt-4 pb-8 space-y-4">
            {/* System Validation */}
            <SystemValidationReport />
            
            {/* Alert banner */}
            {totalAlerts > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" /> Action Required
                </div>
                {pendingNetworks.length > 0 && (
                  <button onClick={() => setTab("networks")} className="w-full text-left text-xs text-amber-600 py-1 flex items-center justify-between hover:underline">
                    <span>📋 {pendingNetworks.length} network(s) awaiting approval</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                {pendingRiders.length > 0 && (
                  <button onClick={() => setTab("riders")} className="w-full text-left text-xs text-amber-600 py-1 flex items-center justify-between hover:underline">
                    <span>🏍 {pendingRiders.length} rider(s) awaiting verification</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Active Networks", value: activeNetworks.length, color: PRIMARY, icon: "🏢", tab: "networks" },
                { label: "Total Riders", value: riders.length, color: GREEN, icon: "🏍", tab: "riders" },
                { label: "Online Now", value: activeRiders.length, color: "#06b6d4", icon: "🟢", tab: "riders" },
                { label: "Total Bookings", value: bookings.length, color: PURPLE, icon: "📋", tab: "bookings" },
                { label: "Completed Trips", value: totalCompleted, color: GREEN, icon: "✅", tab: "bookings" },
                { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, color: PURPLE, icon: "💰", tab: "analytics" },
                { label: "Pending Networks", value: pendingNetworks.length, color: pendingNetworks.length > 0 ? RED : GREEN, icon: "⏳", tab: "networks" },
                { label: "Pending Riders", value: pendingRiders.length, color: pendingRiders.length > 0 ? AMBER : GREEN, icon: "🔍", tab: "riders" },
              ].map(s => (
                <button key={s.label} onClick={() => setTab(s.tab)}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-xs text-gray-400 font-medium mb-0.5">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </button>
              ))}
            </div>
            {/* Live active bookings */}
            {bookings.filter(b => ["assigned","otw","arrived","in_progress"].includes(b.status)).length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🚀 Live Trips</div>
                {bookings.filter(b => ["assigned","otw","arrived","in_progress"].includes(b.status)).slice(0, 5).map(b => (
                  <button key={b.id} onClick={() => setSelectedBooking(b)}
                    className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: PRIMARY_BG }}>🏍</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{b.customer_name}</div>
                      <div className="text-xs text-gray-400 truncate">{b.rider_name || "Unassigned"}</div>
                    </div>
                    <StatusPill status={b.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NETWORKS ── */}
        {!loading && tab === "networks" && (
          <div className="px-4 pt-4 pb-8 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["all","pending","approved","suspended","banned"].map(f => (
                <NetworkFilter key={f} value={f} active={networkFilter === f} onClick={() => setNetworkFilter(f)} />
              ))}
            </div>
            <NetworkList
              networks={networkFilter === "all" ? networks : networks.filter(n => n.status === networkFilter)}
              bookings={bookings}
              onSelect={setSelectedNetwork}
            />
          </div>
        )}

        {/* ── RIDERS ── */}
        {!loading && tab === "riders" && (
          <div className="px-4 pt-4 pb-8 space-y-2">
            {/* Pending first */}
            {pendingRiders.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-2">
                <div className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {pendingRiders.length} Pending Verification
                </div>
                <div className="space-y-2">
                  {pendingRiders.map(r => (
                    <button key={r.id} onClick={() => setSelectedRider(r)}
                      className="w-full flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5 text-left shadow-sm">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ background: AMBER }}>
                        {r.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{r.full_name}</div>
                        <div className="text-xs text-gray-400">{r.network_name} · {r.plate_number || "No plate"}</div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-xl text-white flex-shrink-0" style={{ background: AMBER }}>Review →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {riders.filter(r => r.status !== "pending").map(r => (
              <button key={r.id} onClick={() => setSelectedRider(r)}
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm text-left hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
                  style={{ background: r.status === "banned" ? RED : r.status === "suspended" ? AMBER : r.status === "active" ? GREEN : PRIMARY }}>
                  {r.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{r.full_name}</div>
                  <div className="text-xs text-gray-400 truncate">{r.network_name} · {r.zone}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RiderDot status={r.online_status} />
                    {r.strikes > 0 && <span className="text-[10px] text-red-500 font-bold">⚠ {r.strikes} strikes</span>}
                    {r.avg_rating > 0 && <span className="text-[10px] text-amber-500">⭐ {r.avg_rating?.toFixed(1)}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusPill status={r.status} />
                  <span className="text-[10px] text-gray-400">{r.completed_trips || 0} trips</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {!loading && tab === "bookings" && (
          <div className="px-4 pt-4 pb-8 space-y-2">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Active", value: bookings.filter(b => ["assigned","otw","arrived","in_progress"].includes(b.status)).length, color: PRIMARY },
                { label: "Done", value: totalCompleted, color: GREEN },
                { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: RED },
                { label: "Pending", value: bookings.filter(b => ["pending","searching"].includes(b.status)).length, color: AMBER },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-2.5 text-center shadow-sm">
                  <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            {bookings.map(b => (
              <button key={b.id} onClick={() => setSelectedBooking(b)}
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-left shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold" style={{ color: PRIMARY }}>{b.booking_id || b.id?.slice(0,10)}</span>
                  <StatusPill status={b.status} />
                </div>
                <div className="font-semibold text-gray-900 text-sm">{b.customer_name}</div>
                <div className="text-xs text-gray-400 truncate">{b.pickup_address}</div>
                <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                  <span>{b.rider_name || "Unassigned"} · {b.zone}</span>
                  {b.fare_estimate && <span className="font-bold text-gray-700">₱{b.fare_estimate}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── ZONES ── */}
        {!loading && tab === "zones" && <ZoneManagement />}

        {/* ── ANALYTICS ── */}
        {!loading && tab === "analytics" && (
          <AdminAnalytics networks={networks} riders={riders} bookings={bookings} />
        )}

        {/* ── ENFORCE ── */}
        {!loading && tab === "enforce" && (
          <EnforcementPanel networks={networks} riders={riders} onRefresh={load} />
        )}

        {/* ── WALLET ── */}
        {!loading && tab === "wallet" && (
          <WalletPanel networks={networks} />
        )}

        {/* ── SUPPORT TICKETS ── */}
        {!loading && tab === "support" && (
          <SupportTicketsPanel />
        )}

        {/* ── AUDIT LOG (SENSITIVE) ── */}
        {!loading && tab === "audit" && (
          <SensitiveLogsGate user={user} onBack={() => setTab("overview")} />
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function NetworkList({ networks, bookings, onSelect }) {
  return (
    <div className="space-y-2">
      {networks.length === 0 && (
        <div className="flex flex-col items-center py-16 text-gray-200">
          <Building2 className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">No networks yet</p>
        </div>
      )}
      {networks.map(n => (
        <button key={n.id} onClick={() => onSelect(n)}
          className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-left hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-sm">{n.name}</span>
              {n.verified_badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: "#4DC8F0" }}>✓</span>}
            </div>
            <StatusPill status={n.status} />
          </div>
          <div className="text-xs text-gray-400">{n.zone} · {n.owner_name}</div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-gray-500">💰 ₱{(n.wallet_balance||0).toLocaleString()}</span>
            {n.strikes > 0 && <span className="text-red-500 font-semibold">⚡ {n.strikes} strikes</span>}
            <span className="text-gray-400">{bookings.filter(b=>b.network_id===n.id).length} bookings</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function NetworkFilter({ value, active, onClick }) {
  const counts = { all: "All", pending: "Pending", approved: "Active", suspended: "Suspended", banned: "Banned" };
  return (
    <button onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
      style={active ? { background: PRIMARY, color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}>
      {counts[value] || value}
    </button>
  );
}

function StatusPill({ status }) {
  const map = {
    pending:     "bg-amber-50 text-amber-600",
    approved:    "bg-green-50 text-green-600",
    suspended:   "bg-orange-50 text-orange-600",
    banned:      "bg-red-100 text-red-700",
    active:      "bg-green-50 text-green-600",
    searching:   "bg-amber-50 text-amber-600",
    assigned:    "bg-blue-50 text-blue-600",
    otw:         "bg-blue-50 text-blue-600",
    arrived:     "bg-green-50 text-green-600",
    in_progress: "bg-purple-50 text-purple-600",
    completed:   "bg-green-50 text-green-600",
    cancelled:   "bg-red-50 text-red-500",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${map[status] || "bg-gray-50 text-gray-500"}`}>{status?.replace("_"," ")}</span>;
}

function RiderDot({ status }) {
  const cfg = { online: { bg: "#22c55e", label: "online" }, on_trip: { bg: "#3b82f6", label: "on trip" }, offline: { bg: "#d1d5db", label: "offline" } };
  const c = cfg[status] || cfg.offline;
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.bg }} />
      <span className="text-[10px] text-gray-400">{c.label}</span>
    </div>
  );
}