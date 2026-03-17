import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, getDemoRiderLocations, isDemoMode, readDemoStore } from "@/lib/demoStore";
import { X, Navigation } from "lucide-react";
import MapboxMap from "./MapboxMap";

const PRIMARY = "#4DC8F0";

/**
 * A full-screen overlay map showing a rider's live GPS position.
 * Used by Dispatcher and NetworkOwner dashboards.
 */
export default function LiveRiderMap({ booking, onClose }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchLocation = async () => {
    if (!booking?.rider_id) return;
    if (isDemoMode()) {
      const loc = getDemoRiderLocations(readDemoStore()).find((entry) => entry.rider_id === booking.rider_id);
      if (loc) {
        setRiderLocation({ lat: loc.lat, lng: loc.lng });
        setLastUpdated(new Date());
      }
      return;
    }
    const locs = await base44.entities.RiderLocation.filter(
      { rider_id: booking.rider_id }, "-updated_date", 1
    ).catch(() => []);
    if (locs?.[0]) {
      setRiderLocation({ lat: locs[0].lat, lng: locs[0].lng });
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchLocation();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, fetchLocation);
      return () => window.removeEventListener(DEMO_EVENT, fetchLocation);
    }
    pollRef.current = setInterval(fetchLocation, 4000);
    return () => clearInterval(pollRef.current);
  }, [booking?.rider_id]);

  const pickupCoords = null; // Could be geocoded — kept simple
  const secondsAgo = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-gray-100 bg-white"
        style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.12)` }}>
        <div>
          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4" style={{ color: PRIMARY }} />
            Live Rider Tracking
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {booking?.rider_name || "Rider"} · {booking?.booking_id}
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapboxMap
          className="w-full h-full"
          riderMarker={riderLocation}
          followRider={true}
        />

        {/* Status overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white rounded-2xl shadow-lg px-4 py-3" style={{ boxShadow: `0 4px 20px rgba(77,200,240,0.15)` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${riderLocation ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
                <span className="text-xs font-semibold text-gray-700">
                  {riderLocation ? "GPS Active" : "Waiting for GPS…"}
                </span>
              </div>
              {secondsAgo !== null && (
                <span className="text-[10px] text-gray-400">Updated {secondsAgo}s ago</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: PRIMARY }} />
                <span className="truncate">{booking?.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-0.5 flex-shrink-0" />
                <span className="truncate">{booking?.dropoff_address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}