import { useState, useEffect, useRef } from "react";
import { X, Users, Filter, Search, Navigation, MapPin, Bike } from "lucide-react";
import MapboxMap from "../home/MapboxMap";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, getDemoRiderLocations, isDemoMode, readDemoStore } from "@/lib/demoStore";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";

export default function LiveMapMonitor({ networkId, onClose, embedded }) {
  const [riders, setRiders] = useState([]);
  const [riderLocations, setRiderLocations] = useState({});
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch network riders + simulation riders
  useEffect(() => {
    const loadRiders = async () => {
      if (isDemoMode()) {
        const store = readDemoStore();
        setRiders((store.riders || []).filter(r => r.status === "active"));
        return;
      }
      const [netRiders, simRiders] = await Promise.all([
        networkId ? base44.entities.Rider.filter({ network_id: networkId }, "-updated_date", 100).catch(() => []) : [],
        base44.entities.Rider.filter({ is_demo_data: true }, "-updated_date", 100).catch(() => []),
      ]);
      
      const allRiders = [...(netRiders || []), ...(simRiders || [])];
      setRiders(allRiders.filter(r => r.status === "active"));
    };
    loadRiders();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, loadRiders);
      return () => window.removeEventListener(DEMO_EVENT, loadRiders);
    }
    const interval = setInterval(loadRiders, 10000);
    return () => clearInterval(interval);
  }, [networkId]);

  // Real-time location polling
  useEffect(() => {
    if (riders.length === 0) return;
    
    const pollLocations = async () => {
      if (isDemoMode()) {
        const locations = Object.fromEntries(getDemoRiderLocations(readDemoStore()).map((loc) => [loc.rider_id, loc]));
        setRiderLocations(locations);
        return;
      }
      const riderIds = riders.map(r => r.id);
      const locations = {};
      
      await Promise.all(riderIds.map(async (riderId) => {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: riderId }, "-updated_date", 1).catch(() => []);
        if (locs?.[0]) {
          locations[riderId] = {
            lat: locs[0].lat,
            lng: locs[0].lng,
            heading: locs[0].heading || 0,
            speed: locs[0].speed || 0,
            status: locs[0].status || "idle",
            booking_id: locs[0].booking_id,
            timestamp: locs[0].updated_date
          };
        }
      }));
      
      setRiderLocations(locations);
    };

    pollLocations();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, pollLocations);
      return () => window.removeEventListener(DEMO_EVENT, pollLocations);
    }
    const interval = setInterval(pollLocations, 5000);
    return () => clearInterval(interval);
  }, [riders]);

  // Fetch active bookings
  useEffect(() => {
    const loadBookings = async () => {
      if (isDemoMode()) {
        const active = (readDemoStore().bookings || []).filter(b => ["assigned", "otw", "arrived", "in_progress"].includes(b.status));
        setActiveBookings(active);
        return;
      }
      const [netBookings, simBookings] = await Promise.all([
        networkId ? base44.entities.Booking.filter({ network_id: networkId }, "-updated_date", 50).catch(() => []) : [],
        base44.entities.Booking.filter({ is_demo_data: true }, "-updated_date", 50).catch(() => []),
      ]);
      
      const allBookings = [...(netBookings || []), ...(simBookings || [])];
      const active = allBookings.filter(b => 
        ["assigned", "otw", "arrived", "in_progress"].includes(b.status)
      );
      setActiveBookings(active);
    };

    loadBookings();
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, loadBookings);
      return () => window.removeEventListener(DEMO_EVENT, loadBookings);
    }
    const interval = setInterval(loadBookings, 8000);
    return () => clearInterval(interval);
  }, [networkId]);

  // Filter riders
  const filteredRiders = riders.filter(rider => {
    const loc = riderLocations[rider.id];
    const hasLocation = !!loc;
    const isOnline = rider.online_status === "online" || rider.online_status === "on_trip";
    const onTrip = loc?.status === "en_route_pickup" || loc?.status === "en_route_dropoff";
    
    if (filter === "online" && !isOnline) return false;
    if (filter === "on_trip" && !onTrip) return false;
    if (filter === "idle" && (onTrip || !isOnline)) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!rider.full_name?.toLowerCase().includes(query) && 
          !rider.id?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    return hasLocation;
  });

  const handleMarkerClick = (riderId) => {
    const rider = riders.find(r => r.id === riderId);
    setSelectedRider(rider);
  };

  return (
    <div className={embedded ? "w-full h-full relative" : "fixed inset-0 z-50 bg-white"}>
      {/* Header */}
      {!embedded && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="font-bold text-gray-900">Live Rider Map</h2>
                <p className="text-xs text-gray-500">{filteredRiders.length} riders visible</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Live</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-3">
            {[
              { id: "all", label: "All" },
              { id: "online", label: "Online" },
              { id: "on_trip", label: "On Trip" },
              { id: "idle", label: "Idle" }
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={filter === f.id ? 
                  { background: PRIMARY, color: "white" } : 
                  { background: "#f3f4f6", color: "#6b7280" }
                }>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search riders..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      )}

      {/* Map */}
      <div className={embedded ? "w-full h-full" : "absolute inset-0 pt-[180px]"}>
        <LiveOperatorMap
          riders={filteredRiders}
          riderLocations={riderLocations}
          activeBookings={activeBookings}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Stats overlay for embedded mode */}
      {embedded && (
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-gray-700">{filteredRiders.length} Riders Live</span>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-gray-100">
            <div className="flex items-center gap-2">
              <Bike className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold text-gray-700">{activeBookings.length} Active Trips</span>
            </div>
          </div>
        </div>
      )}

      {/* Rider Detail Panel */}
      {selectedRider && !embedded && (
        <RiderDetailPanel
          rider={selectedRider}
          location={riderLocations[selectedRider.id]}
          activeBooking={activeBookings.find(b => b.rider_id === selectedRider.id)}
          onClose={() => setSelectedRider(null)}
        />
      )}

      {/* Legend */}
      {!embedded && (
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 text-xs">
          <div className="font-bold text-gray-700 mb-2">Status</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">On Trip</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">Offline</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiderDetailPanel({ rider, location, activeBooking, onClose }) {
  return (
    <div className="absolute right-4 top-[200px] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-30">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: PRIMARY + "10" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: PRIMARY + "30" }}>
            🏍
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{rider.full_name}</div>
            <div className="text-xs text-gray-500">{rider.plate_number || "No plate"}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${rider.online_status === "online" || rider.online_status === "on_trip" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
          <span className="text-sm font-semibold text-gray-700">
            {rider.online_status === "online" ? "Online - Available" : 
             rider.online_status === "on_trip" ? "On Trip" : "Offline"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black text-gray-900">{rider.completed_trips || 0}</div>
            <div className="text-[10px] text-gray-500">Trips</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black text-yellow-500">{rider.avg_rating ? rider.avg_rating.toFixed(1) : "—"}</div>
            <div className="text-[10px] text-gray-500">Rating</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-black" style={{ color: PRIMARY }}>{location?.speed?.toFixed(0) || 0}</div>
            <div className="text-[10px] text-gray-500">km/h</div>
          </div>
        </div>

        {/* Active Booking */}
        {activeBooking && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Active Trip</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                {activeBooking.status}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <span className="text-gray-600 line-clamp-2">{activeBooking.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-2.5 h-2.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 line-clamp-2">{activeBooking.dropoff_address}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Customer</span>
              <span className="text-xs font-semibold text-gray-900">{activeBooking.customer_name}</span>
            </div>
            {activeBooking.fare_estimate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fare</span>
                <span className="text-sm font-black text-emerald-600">₱{activeBooking.fare_estimate}</span>
              </div>
            )}
          </div>
        )}

        {/* Location Info */}
        {location && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            <div className="flex justify-between">
              <span>Last updated</span>
              <span>{new Date(location.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Coordinates</span>
              <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveOperatorMap({ riders, riderLocations, activeBookings, onMarkerClick }) {


  return (
    <div className="w-full h-full relative">
      <MapboxMap 
        className="w-full h-full" 
        zoom={13}
        riderMarkers={riders.map(r => {
          const loc = riderLocations[r.id];
          if (!loc) return null;
          
          const booking = activeBookings.find(b => b.rider_id === r.id);
          const isOnTrip = loc.status === "en_route_pickup" || loc.status === "en_route_dropoff";
          const isAssigned = booking?.status === "assigned";
          const isOnline = r.online_status === "online" || r.online_status === "on_trip";

          let markerColor = "#9ca3af";
          if (isOnTrip) markerColor = "#3b82f6";
          else if (isAssigned) markerColor = "#f59e0b";
          else if (isOnline) markerColor = "#10b981";

          return {
            id: r.id,
            lat: loc.lat,
            lng: loc.lng,
            color: markerColor,
            onClick: () => onMarkerClick(r.id)
          };
        }).filter(Boolean)}
      />
    </div>
  );
}