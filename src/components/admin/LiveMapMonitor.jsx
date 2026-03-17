import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, getDemoRiderLocations, isDemoMode, readDemoStore } from "@/lib/demoStore";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, RefreshCw, Users, Navigation, Bike } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "";
const PRIMARY = "#4DC8F0";
const GREEN = "#10b981";
const BLUE = "#3b82f6";
const GRAY = "#9ca3af";
const RED = "#ef4444";

// Marker color by rider state
function markerColor(rider) {
  if (rider.status === "banned" || rider.status === "suspended") return RED;
  if (rider.online_status === "on_trip") return BLUE;
  if (rider.online_status === "online") return GREEN;
  return GRAY;
}

function markerLabel(rider) {
  if (rider.status === "banned") return "BANNED";
  if (rider.status === "suspended") return "SUSPENDED";
  if (rider.online_status === "on_trip") return "On Trip";
  if (rider.online_status === "online") return "Online";
  return "Offline";
}

export default function LiveMapMonitor({ onClose, networkId = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // riderId -> { marker, popup }
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderLocations, setRiderLocations] = useState([]);
  const [riders, setRiders] = useState([]);
  const [stats, setStats] = useState({ online: 0, on_trip: 0, offline: 0, total: 0 });
  const intervalRef = useRef(null);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center max-w-sm mx-4">
          <p className="text-sm font-semibold text-white">Live map unavailable</p>
          <p className="text-xs text-gray-400 mt-2">Set `VITE_MAPBOX_PUBLIC_TOKEN` to enable map rendering.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Build marker popup HTML
  function buildPopupHTML(rider, loc) {
    const color = markerColor(rider);
    const label = markerLabel(rider);
    return `
      <div style="font-family:'Poppins',sans-serif;min-width:160px;padding:2px">
        <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:2px">${rider.full_name || "Unknown"}</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:4px">${rider.network_name || "—"}</div>
        <div style="font-size:10px;color:#64748b">🏍 ${rider.motorcycle_make || ""} ${rider.plate_number || ""}</div>
        ${rider.avg_rating ? `<div style="font-size:10px;color:#f59e0b">⭐ ${rider.avg_rating.toFixed(1)}</div>` : ""}
        <div style="margin-top:6px;display:inline-flex;align-items:center;gap:5px;background:${color}18;border-radius:20px;padding:2px 8px">
          <div style="width:7px;height:7px;border-radius:50%;background:${color}"></div>
          <span style="font-size:10px;font-weight:700;color:${color}">${label}</span>
        </div>
        ${loc?.booking_id ? `<div style="font-size:10px;color:#64748b;margin-top:4px">Booking: ${loc.booking_id}</div>` : ""}
      </div>
    `;
  }

  // Poll rider locations
  const fetchLocations = async () => {
    try {
      if (isDemoMode()) {
        const store = readDemoStore();
        const demoRiders = networkId
          ? (store.riders || []).filter((rider) => (rider.network_id || "demo-network") === networkId)
          : (store.riders || []);
        const validLocs = getDemoRiderLocations({ ...store, riders: demoRiders });
        const riderMap = {};
        demoRiders.forEach((rider) => { riderMap[rider.id] = rider; });

        setRiders(demoRiders);
        setRiderLocations(validLocs);

        const online = demoRiders.filter(r => r.online_status === "online").length;
        const on_trip = demoRiders.filter(r => r.online_status === "on_trip").length;
        const offline = demoRiders.filter(r => r.online_status === "offline").length;
        setStats({ online, on_trip, offline, total: demoRiders.length });

        if (!mapRef.current) return;

        const activeIds = new Set(validLocs.map(l => l.rider_id));
        Object.keys(markersRef.current).forEach(rid => {
          if (!activeIds.has(rid)) {
            markersRef.current[rid].marker.remove();
            delete markersRef.current[rid];
          }
        });

        validLocs.forEach(loc => {
          const rider = riderMap[loc.rider_id] || { full_name: loc.rider_name, id: loc.rider_id };
          const lngLat = [loc.lng, loc.lat];
          const color = markerColor(rider);
          const popupHTML = buildPopupHTML(rider, loc);

          if (markersRef.current[loc.rider_id]) {
            markersRef.current[loc.rider_id].marker.setLngLat(lngLat);
            markersRef.current[loc.rider_id].popup.setHTML(popupHTML);
          } else {
            const el = document.createElement("div");
            el.style.cssText = `
              display: flex;
              flex-direction: column;
              align-items: center;
              cursor: pointer;
            `;
            el.innerHTML = `
              <div style="
                width: 36px; height: 36px; border-radius: 50%;
                background: ${color};
                border: 3px solid white;
                box-shadow: 0 3px 10px ${color}66;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px;
                position: relative;
              ">🏍
                ${rider.online_status !== "offline" ? `
                <div style="
                  position: absolute; inset: -4px; border-radius: 50%;
                  border: 2px solid ${color}44;
                  animation: lmPing 2s ease-out infinite;
                "></div>` : ""}
              </div>
              <div style="
                background: ${color};
                color: white;
                font-family: 'Poppins', sans-serif;
                font-size: 9px;
                font-weight: 700;
                padding: 1px 5px;
                border-radius: 10px;
                margin-top: 2px;
                white-space: nowrap;
                box-shadow: 0 1px 4px ${color}55;
              ">${(rider.full_name || "Rider").split(" ")[0]}</div>
            `;

            const popup = new mapboxgl.Popup({ offset: 24, closeButton: true, maxWidth: "220px" })
              .setHTML(popupHTML);

            const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
              .setLngLat(lngLat)
              .setPopup(popup)
              .addTo(mapRef.current);

            el.addEventListener("click", () => {
              setSelectedRider({ rider, loc });
            });

            markersRef.current[loc.rider_id] = { marker, popup };
          }
        });
        return;
      }

      const [locs, rdrs] = await Promise.all([
        base44.entities.RiderLocation.list("-updated_date", 200).catch(() => []),
        networkId
          ? base44.entities.Rider.filter({ network_id: networkId }, "-created_date", 200).catch(() => [])
          : base44.entities.Rider.list("-created_date", 200).catch(() => []),
      ]);

      const riderMap = {};
      (rdrs || []).forEach(r => { riderMap[r.id] = r; });

      // Filter locs to network if needed
      const validLocs = (locs || []).filter(loc => {
        if (!loc.lat || !loc.lng) return false;
        if (networkId) {
          const rider = riderMap[loc.rider_id];
          return rider && rider.network_id === networkId;
        }
        return true;
      });

      setRiders(rdrs || []);
      setRiderLocations(validLocs);

      // Update stats
      const online = (rdrs || []).filter(r => r.online_status === "online").length;
      const on_trip = (rdrs || []).filter(r => r.online_status === "on_trip").length;
      const offline = (rdrs || []).filter(r => r.online_status === "offline").length;
      setStats({ online, on_trip, offline, total: (rdrs || []).length });

      // Update map markers
      if (!mapRef.current) return;

      // Remove stale markers
      const activeIds = new Set(validLocs.map(l => l.rider_id));
      Object.keys(markersRef.current).forEach(rid => {
        if (!activeIds.has(rid)) {
          markersRef.current[rid].marker.remove();
          delete markersRef.current[rid];
        }
      });

      // Add/update markers
      validLocs.forEach(loc => {
        const rider = riderMap[loc.rider_id] || { full_name: loc.rider_name, id: loc.rider_id };
        const lngLat = [loc.lng, loc.lat];
        const color = markerColor(rider);
        const popupHTML = buildPopupHTML(rider, loc);

        if (markersRef.current[loc.rider_id]) {
          // Update position + popup
          markersRef.current[loc.rider_id].marker.setLngLat(lngLat);
          markersRef.current[loc.rider_id].popup.setHTML(popupHTML);
        } else {
          // Create new marker
          const el = document.createElement("div");
          el.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
          `;
          el.innerHTML = `
            <div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: ${color};
              border: 3px solid white;
              box-shadow: 0 3px 10px ${color}66;
              display: flex; align-items: center; justify-content: center;
              font-size: 16px;
              position: relative;
            ">🏍
              ${rider.online_status !== "offline" ? `
              <div style="
                position: absolute; inset: -4px; border-radius: 50%;
                border: 2px solid ${color}44;
                animation: lmPing 2s ease-out infinite;
              "></div>` : ""}
            </div>
            <div style="
              background: ${color};
              color: white;
              font-family: 'Poppins', sans-serif;
              font-size: 9px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 10px;
              margin-top: 2px;
              white-space: nowrap;
              box-shadow: 0 1px 4px ${color}55;
            ">${(rider.full_name || "Rider").split(" ")[0]}</div>
          `;

          const popup = new mapboxgl.Popup({ offset: 24, closeButton: true, maxWidth: "220px" })
            .setHTML(popupHTML);

          const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat(lngLat)
            .setPopup(popup)
            .addTo(mapRef.current);

          el.addEventListener("click", () => {
            setSelectedRider({ rider, loc });
          });

          markersRef.current[loc.rider_id] = { marker, popup };
        }
      });
    } catch (_) {}
  };

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [122.5654, 10.7202],
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      fetchLocations();
    });

    return () => {
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Poll every 6s
  useEffect(() => {
    if (isDemoMode()) {
      window.addEventListener(DEMO_EVENT, fetchLocations);
      return () => window.removeEventListener(DEMO_EVENT, fetchLocations);
    }
    intervalRef.current = setInterval(fetchLocations, 6000);
    return () => clearInterval(intervalRef.current);
  }, [networkId]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-900">
      <style>{`
        @keyframes lmPing {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-bold text-sm">Live Map Monitoring</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLocations}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-700 hover:bg-gray-600">
            <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-700 hover:bg-gray-600">
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        {[
          { label: "Online", value: stats.online, color: GREEN },
          { label: "On Trip", value: stats.on_trip, color: BLUE },
          { label: "Offline", value: stats.offline, color: GRAY },
          { label: "Total", value: stats.total, color: PRIMARY },
        ].map(s => (
          <div key={s.label} className="flex-1 text-center">
            <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-gray-400 font-semibold uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0 overflow-x-auto">
        {[
          { color: GREEN, label: "Online" },
          { color: BLUE,  label: "On Trip" },
          { color: GRAY,  label: "Offline" },
          { color: RED,   label: "Flagged" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
            <span className="text-[10px] text-gray-400">{l.label}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-gray-500 flex-shrink-0">Updates every 6s</div>
      </div>

      {/* Map */}
      <div ref={containerRef} className="flex-1" />

      {/* Empty state */}
      {riderLocations.length === 0 && (
        <div className="absolute inset-0 top-28 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-gray-800/90 rounded-2xl px-6 py-5 text-center">
            <Bike className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-300 font-semibold">No active riders on map</p>
            <p className="text-xs text-gray-500 mt-1">Rider locations appear when they go online</p>
          </div>
        </div>
      )}

      {/* Rider detail panel */}
      {selectedRider && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-4 z-20">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: markerColor(selectedRider.rider) }}>
                {selectedRider.rider.full_name?.charAt(0) || "R"}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{selectedRider.rider.full_name}</div>
                <div className="text-xs text-gray-400">{selectedRider.rider.network_name || "—"}</div>
                <div className="text-xs text-gray-400">{selectedRider.rider.plate_number} · {selectedRider.rider.motorcycle_make}</div>
              </div>
            </div>
            <button onClick={() => setSelectedRider(null)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Trips", value: selectedRider.rider.completed_trips || 0, color: GREEN },
              { label: "Rating", value: selectedRider.rider.avg_rating?.toFixed(1) || "—", color: "#f59e0b" },
              { label: "Status", value: markerLabel(selectedRider.rider), color: markerColor(selectedRider.rider) },
            ].map(s => (
              <div key={s.label} className="bg-gray-700 rounded-xl p-2.5 text-center">
                <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          {selectedRider.loc?.booking_id && (
            <div className="mt-2 text-[10px] text-gray-400 text-center">
              Active Booking: <span className="font-mono text-gray-300">{selectedRider.loc.booking_id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}