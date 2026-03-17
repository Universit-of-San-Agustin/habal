import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, getDemoRiderLocations, isDemoMode, readDemoStore } from "@/lib/demoStore";
import { ChevronLeft, MessageCircle, Navigation, Phone } from "lucide-react";
import MapboxMap from "../home/MapboxMap";
import ChatPanel from "../chat/ChatPanel";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "";

const STATUS_CONFIG = {
  pending:     { label: "Finding your rider...",       bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b", emoji: "🔍" },
  searching:   { label: "Searching nearby riders...",  bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b", emoji: "🔍" },
  assigned:    { label: "Rider is on the way! 🏍",     bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY, emoji: "🏍" },
  otw:         { label: "Rider heading to you",        bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY, emoji: "🏍" },
  arrived:     { label: "Rider has arrived! 🎉",       bg: "#F0FDF4", color: "#15803d", dot: "#22c55e", emoji: "📍" },
  in_progress: { label: "You're on your way! 🚀",      bg: "#EFF6FF", color: "#1d4ed8", dot: "#3b82f6", emoji: "🚀" },
};

export default function LiveRideMap({ activeRide, user, pickupCoords, dropoffCoords, onClose, onCancel }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [followRider, setFollowRider] = useState(true);
  const [statusChanged, setStatusChanged] = useState(false);
  const prevStatusRef = useRef(activeRide?.status);
  // Flash animation on status change
  useEffect(() => {
    if (prevStatusRef.current && prevStatusRef.current !== activeRide?.status) {
      setStatusChanged(true);
      setTimeout(() => setStatusChanged(false), 1500);
    }
    prevStatusRef.current = activeRide?.status;
  }, [activeRide?.status]);

  // Real-time rider location + ETA polling every 3s
  useEffect(() => {
    if (!activeRide?.rider_id) return;
    const poll = async () => {
      if (isDemoMode()) {
        const loc = getDemoRiderLocations(readDemoStore()).find((entry) => entry.rider_id === activeRide.rider_id);
        if (!loc) return;

        const point = { lat: loc.lat, lng: loc.lng };
        setRiderLocation(point);

        const isInProgress = activeRide.status === "in_progress";
        const target = isInProgress ? dropoffCoords : pickupCoords;
        if (target) {
          try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${point.lng},${point.lat};${target.lng},${target.lat}?access_token=${MAPBOX_TOKEN}&overview=false`;
            const res = await fetch(url);
            const data = await res.json();
            const secs = data.routes?.[0]?.duration;
            if (secs != null) {
              setEta({
                minutes: Math.max(1, Math.round(secs / 60)),
                label: isInProgress ? "to destination" : "to pickup",
              });
            }
          } catch {}
        }
        return;
      }

      const locs = await base44.entities.RiderLocation.filter(
        { rider_id: activeRide.rider_id }, "-updated_date", 1
      ).catch(() => []);
      if (!locs?.[0]) return;

      const loc = { lat: locs[0].lat, lng: locs[0].lng };
      setRiderLocation(loc);

      // Pick ETA target: pickup if en route, dropoff if trip in progress
      const isInProgress = activeRide.status === "in_progress";
      const target = isInProgress ? dropoffCoords : pickupCoords;
      if (target) {
        try {
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${loc.lng},${loc.lat};${target.lng},${target.lat}?access_token=${MAPBOX_TOKEN}&overview=false`;
          const res = await fetch(url);
          const data = await res.json();
          const secs = data.routes?.[0]?.duration;
          if (secs != null) {
            setEta({
              minutes: Math.max(1, Math.round(secs / 60)),
              label: isInProgress ? "to destination" : "to pickup",
            });
          }
        } catch {}
      }
    };

    poll();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, poll);
      return () => window.removeEventListener(DEMO_EVENT, poll);
    }
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeRide?.rider_id, activeRide?.status, pickupCoords, dropoffCoords]);

  const cfg = STATUS_CONFIG[activeRide?.status] || STATUS_CONFIG.pending;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapboxMap
          className="w-full h-full"
          pickupMarker={pickupCoords}
          dropoffMarker={activeRide?.status === "in_progress" ? dropoffCoords : null}
          riderMarker={riderLocation}
          followRider={followRider}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onClose}
            className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Prominent status pill — flashes on change */}
          <div
            className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-md pointer-events-auto transition-all duration-300"
            style={{
              background: statusChanged ? cfg.dot : cfg.bg,
              transform: statusChanged ? "scale(1.04)" : "scale(1)",
            }}>
            <span className="text-base">{cfg.emoji}</span>
            <span className="text-xs font-bold truncate" style={{ color: statusChanged ? "#fff" : cfg.color }}>
              {cfg.label}
            </span>
            {eta && (
              <span className="ml-auto flex-shrink-0 text-xs font-black tabular-nums" style={{ color: statusChanged ? "#fff" : cfg.color }}>
                {eta.minutes}m
              </span>
            )}
          </div>

          <button onClick={() => setFollowRider(f => !f)}
            className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto flex-shrink-0">
            <Navigation className="w-5 h-5" style={{ color: followRider ? PRIMARY : "#9ca3af" }} />
          </button>
        </div>
      </div>

      {/* Bottom info sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        {activeRide?.rider_name ? (
          <div className="flex items-center gap-3 mb-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: PRIMARY_BG }}>
              🏍
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {activeRide.rider_phone || "Your rider"}
              </div>
            </div>
            {eta && (
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black" style={{ color: PRIMARY }}>
                  {eta.minutes}<span className="text-sm font-semibold ml-0.5">min</span>
                </div>
                <div className="text-[10px] text-gray-400">{eta.label}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-3" style={{ background: PRIMARY_BG }}>
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
              style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
            <span className="text-sm font-semibold" style={{ color: PRIMARY_DARK }}>Waiting for a rider to accept...</span>
          </div>
        )}

        {/* Route */}
        <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
            <span className="truncate">{activeRide?.pickup_address}</span>
          </div>
          <div className="w-0.5 h-3 ml-1 bg-gray-200" />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-amber-400 text-sm flex-shrink-0">●</span>
            <span className="truncate">{activeRide?.dropoff_address}</span>
          </div>
        </div>

        {/* Action buttons */}
        {activeRide?.rider_name && (
          <div className="flex gap-2">
            <button onClick={() => setShowChat(true)}
              className="flex-1 py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              <MessageCircle className="w-4 h-4" /> Chat Rider
            </button>
            {onCancel && ["assigned", "otw"].includes(activeRide?.status) && (
              <button onClick={onCancel}
                className="px-4 py-3 rounded-2xl font-bold text-sm border-2 border-red-100 text-red-400">
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {showChat && activeRide && (
        <ChatPanel
          bookingId={activeRide.booking_id || activeRide.id}
          currentUser={user}
          senderRole="customer"
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}