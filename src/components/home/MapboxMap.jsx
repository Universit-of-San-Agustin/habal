import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN || "";

// Iloilo City center
const ILOILO_CENTER = [122.5654, 10.7202];

// Custom map style config injected after load
function enhanceMapStyle(map) {
  // Boost label visibility for POI, landmarks, roads, places
  const labelLayersToBoost = [
    "poi-label",
    "airport-label",
    "settlement-label",
    "settlement-subdivision-label",
    "state-label",
    "country-label",
    "road-label",
    "waterway-label",
    "natural-line-label",
    "natural-point-label",
  ];

  labelLayersToBoost.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      // Make text larger and always visible
      map.setLayoutProperty(layerId, "text-field", ["coalesce", ["get", "name_en"], ["get", "name"]]);
      map.setPaintProperty(layerId, "text-color", "#1a1a2e");
      map.setPaintProperty(layerId, "text-halo-color", "#ffffff");
      map.setPaintProperty(layerId, "text-halo-width", 1.5);
    } catch (_) {}
  });

  // Boost POI label size and min-zoom
  if (map.getLayer("poi-label")) {
    try {
      map.setLayoutProperty("poi-label", "text-size", [
        "interpolate", ["linear"], ["zoom"],
        10, 11,
        14, 13,
        17, 15,
      ]);
      map.setLayoutProperty("poi-label", "text-optional", false);
      map.setLayoutProperty("poi-label", "icon-optional", false);
    } catch (_) {}
  }

  // Boost settlement labels (cities/municipalities)
  if (map.getLayer("settlement-label")) {
    try {
      map.setLayoutProperty("settlement-label", "text-size", [
        "interpolate", ["linear"], ["zoom"],
        6, 12,
        10, 14,
        14, 16,
      ]);
    } catch (_) {}
  }

  // Boost subdivision labels (barangays)
  if (map.getLayer("settlement-subdivision-label")) {
    try {
      map.setLayoutProperty("settlement-subdivision-label", "text-size", [
        "interpolate", ["linear"], ["zoom"],
        12, 11,
        15, 13,
      ]);
      map.setLayoutProperty("settlement-subdivision-label", "text-optional", false);
    } catch (_) {}
  }

  // Road labels more readable
  if (map.getLayer("road-label")) {
    try {
      map.setLayoutProperty("road-label", "text-size", [
        "interpolate", ["linear"], ["zoom"],
        12, 10,
        16, 13,
      ]);
    } catch (_) {}
  }
}

// Custom markers for key Iloilo landmarks (shown at zoom >= 13)
const ILOILO_LANDMARKS = [
  { name: "SM City Iloilo",            lng: 122.5778, lat: 10.7156, icon: "🏬" },
  { name: "Iloilo Business Park",       lng: 122.5808, lat: 10.7183, icon: "🏢" },
  { name: "Festive Walk Mall",          lng: 122.5817, lat: 10.7179, icon: "🛍" },
  { name: "Robinsons Place Iloilo",     lng: 122.5503, lat: 10.6999, icon: "🛍" },
  { name: "Iloilo City Hall",           lng: 122.5662, lat: 10.7286, icon: "🏛" },
  { name: "Iloilo Provincial Capitol",  lng: 122.5668, lat: 10.7298, icon: "🏛" },
  { name: "Jaro Cathedral",             lng: 122.5574, lat: 10.7374, icon: "⛪" },
  { name: "Molo Church",               lng: 122.5441, lat: 10.7065, icon: "⛪" },
  { name: "Villa Arevalo Church",       lng: 122.5319, lat: 10.6898, icon: "⛪" },
  { name: "UP Visayas",                 lng: 122.5626, lat: 10.7125, icon: "🎓" },
  { name: "West Visayas State Univ.",   lng: 122.5597, lat: 10.7288, icon: "🎓" },
  { name: "Central Philippine Univ.",   lng: 122.5601, lat: 10.7180, icon: "🎓" },
  { name: "Iloilo Convention Center",   lng: 122.5780, lat: 10.7168, icon: "🏟" },
  { name: "Iloilo International Airport", lng: 122.4959, lat: 10.8335, icon: "✈️" },
  { name: "La Paz Plaza",              lng: 122.5640, lat: 10.7264, icon: "🌳" },
  { name: "Megaworld Boulevard",        lng: 122.5812, lat: 10.7175, icon: "🛣" },
];

function createLandmarkMarkers(map) {
  const markers = [];
  ILOILO_LANDMARKS.forEach((lm) => {
    const el = document.createElement("div");
    el.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      pointer-events: auto;
    `;
    el.innerHTML = `
      <div style="
        background: white;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        padding: 2px 6px;
        display: flex;
        align-items: center;
        gap: 3px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        font-size: 10px;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        color: #1e293b;
        white-space: nowrap;
        max-width: 120px;
      ">
        <span style="font-size:12px">${lm.icon}</span>
        <span style="overflow:hidden;text-overflow:ellipsis">${lm.name}</span>
      </div>
      <div style="width:6px;height:6px;background:#4DC8F0;border-radius:50%;margin-top:2px;border:1.5px solid white;box-shadow:0 0 0 2px rgba(77,200,240,0.3)"></div>
    `;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lm.lng, lm.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: "160px" })
          .setHTML(`<div style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;padding:4px">${lm.icon} ${lm.name}</div>`)
      )
      .addTo(map);

    markers.push(marker);
  });
  return markers;
}

export default function MapboxMap({
  center = ILOILO_CENTER,
  zoom = 14,
  className = "",
  onGeolocate,
  pickupMarker,
  dropoffMarker,
  riderMarker,
  followRider = false,
  pinMode = null,
  onPinPlaced = null,
  routeCoordinates = null,
  showRoute = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const draftMarkerRef = useRef(null);
  const landmarkMarkersRef = useRef([]);
  const prevRiderPos = useRef(null);
  const pinModeRef = useRef(pinMode);
  const onPinPlacedRef = useRef(onPinPlaced);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`w-full h-full bg-slate-100 flex items-center justify-center ${className}`}>
        <div className="text-center px-6">
          <div className="text-sm font-semibold text-slate-700">Map unavailable</div>
          <div className="text-xs text-slate-500 mt-1">
            Missing VITE_MAPBOX_PUBLIC_TOKEN or VITE_MAPBOX_TOKEN in environment.
          </div>
        </div>
      </div>
    );
  }

  // Keep refs in sync so the click handler always sees latest values
  useEffect(() => { pinModeRef.current = pinMode; }, [pinMode]);
  useEffect(() => { onPinPlacedRef.current = onPinPlaced; }, [onPinPlaced]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
      attributionControl: false,
      localIdeographFontFamily: "'Poppins', 'Noto Sans', sans-serif",
      language: "en",
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    if (onGeolocate) {
      const geoCtrl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
      });
      map.addControl(geoCtrl, "top-right");
      geoCtrl.on("geolocate", (e) => {
        onGeolocate(e.coords.longitude, e.coords.latitude);
      });
      map.on("load", () => geoCtrl.trigger());
    }

    // Click-to-pin handler
    map.on("click", async (e) => {
      if (!pinModeRef.current || !onPinPlacedRef.current) return;
      const { lng, lat } = e.lngLat;

      // Show a draft marker immediately
      if (draftMarkerRef.current) { draftMarkerRef.current.remove(); draftMarkerRef.current = null; }
      const isPickup = pinModeRef.current === "pickup";
      const color = isPickup ? "#22c55e" : "#f97316";
      const label = isPickup ? "📍 Pick Up" : "🏁 Drop Off";
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:${color};color:white;font-size:10px;font-weight:700;font-family:'Poppins',sans-serif;padding:3px 8px;border-radius:12px;box-shadow:0 2px 8px ${color}80;white-space:nowrap;animation:pinDrop .3s ease-out">${label}</div>
          <div style="width:2px;height:8px;background:${color}"></div>
          <div style="width:10px;height:10px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 0 3px ${color}50"></div>
        </div>`;
      draftMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map);

      // Reverse geocode to get a human-readable address
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=poi,address,neighborhood,locality,place`
        );
        const data = await res.json();
        const feat = data.features?.[0];
        let address = feat?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        // Fallback: if result is too generic (just coords), use first part of context
        if (!feat?.place_name) {
          address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        onPinPlacedRef.current({ lng, lat, address });
      } catch {
        onPinPlacedRef.current({ lng, lat, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
    });

    // Change cursor in pin mode
    map.on("mousemove", () => {
      if (pinModeRef.current) {
        map.getCanvas().style.cursor = "crosshair";
      } else {
        map.getCanvas().style.cursor = "";
      }
    });

    map.on("load", () => {
      enhanceMapStyle(map);
      const showMarkers = () => {
        const z = map.getZoom();
        landmarkMarkersRef.current.forEach((m) => {
          const el = m.getElement();
          el.style.display = z >= 12 ? "flex" : "none";
        });
      };
      landmarkMarkersRef.current = createLandmarkMarkers(map);
      showMarkers();
      map.on("zoom", showMarkers);
    });

    mapRef.current = map;
    return () => {
      landmarkMarkersRef.current.forEach((m) => m.remove());
      landmarkMarkersRef.current = [];
      if (draftMarkerRef.current) { draftMarkerRef.current.remove(); draftMarkerRef.current = null; }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pickup marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
    if (pickupMarker) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:#22c55e;color:white;font-size:10px;font-weight:700;font-family:'Poppins',sans-serif;padding:3px 8px;border-radius:12px;box-shadow:0 2px 8px rgba(34,197,94,0.5);white-space:nowrap">📍 Pick Up</div>
          <div style="width:2px;height:8px;background:#22c55e"></div>
          <div style="width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 0 0 3px rgba(34,197,94,0.3)"></div>
        </div>`;
      pickupMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pickupMarker.lng, pickupMarker.lat])
        .addTo(mapRef.current);
    }
  }, [pickupMarker]);

  // Dropoff marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null; }
    if (dropoffMarker) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:#f97316;color:white;font-size:10px;font-weight:700;font-family:'Poppins',sans-serif;padding:3px 8px;border-radius:12px;box-shadow:0 2px 8px rgba(249,115,22,0.5);white-space:nowrap">🏁 Drop Off</div>
          <div style="width:2px;height:8px;background:#f97316"></div>
          <div style="width:10px;height:10px;background:#f97316;border-radius:50%;border:2px solid white;box-shadow:0 0 0 3px rgba(249,115,22,0.3)"></div>
        </div>`;
      dropoffMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([dropoffMarker.lng, dropoffMarker.lat])
        .addTo(mapRef.current);
      mapRef.current.flyTo({ center: [dropoffMarker.lng, dropoffMarker.lat], zoom: 14, duration: 600 });
    }
  }, [dropoffMarker]);

  // Rider marker — smooth real-time GPS updates
  useEffect(() => {
    if (!mapRef.current) return;

    if (!riderMarker) {
      if (riderMarkerRef.current) { riderMarkerRef.current.remove(); riderMarkerRef.current = null; }
      prevRiderPos.current = null;
      return;
    }

    const lngLat = [riderMarker.lng, riderMarker.lat];

    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="position:relative">
          <div style="
            width:44px;height:44px;border-radius:50%;
            background:linear-gradient(135deg,#10b981,#059669);
            border:3px solid white;
            box-shadow:0 4px 14px rgba(16,185,129,0.55);
            display:flex;align-items:center;justify-content:center;
            font-size:20px;
          ">🏍</div>
          <div style="
            position:absolute;inset:-4px;border-radius:50%;
            border:2px solid rgba(16,185,129,0.4);
            animation:riderPing 1.6s ease-out infinite;
          "></div>
        </div>
      `;
      riderMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML("<strong style='font-size:12px;font-family:Poppins,sans-serif'>🏍 Your Rider</strong>"))
        .addTo(mapRef.current);
    }

    if (followRider) {
      mapRef.current.easeTo({ center: lngLat, duration: 1000 });
    } else if (!prevRiderPos.current) {
      mapRef.current.flyTo({ center: lngLat, zoom: 15, duration: 800 });
    }

    prevRiderPos.current = lngLat;
  }, [riderMarker, followRider]);

  // Route line rendering
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    
    // Remove existing route if present
    if (map.getSource('route')) {
      if (map.getLayer('route')) map.removeLayer('route');
      map.removeSource('route');
    }
    
    if (!showRoute || !routeCoordinates || routeCoordinates.length < 2) return;
    
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      }
    });
    
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4DC8F0',
        'line-width': 5,
        'line-opacity': 0.85
      }
    });
  }, [showRoute, routeCoordinates]);

  return (
    <>
      <style>{`
        @keyframes riderPing {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes pinDrop {
          0%   { transform: translateY(-16px); opacity: 0; }
          60%  { transform: translateY(3px); }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div ref={containerRef} className={className} />
    </>
  );
}