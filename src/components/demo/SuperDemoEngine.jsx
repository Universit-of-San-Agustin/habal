import { useState, useEffect, useRef } from "react";
import {
  Play, Square, MapPin, Bike, DollarSign, RotateCcw, Zap, Activity,
  GripVertical, Minimize2, Settings, CloudRain, Sparkles, Sun,
} from "lucide-react";
import { COLORS } from "../shared/AppleDesignTokens";
import { readDemoStore, patchDemoStore, clearDemoStore, DEMO_EVENT, appendDemoEvent } from "@/lib/demoStore";

const PRIMARY = COLORS.primary;
const GREEN   = COLORS.success;
const AMBER   = COLORS.warning;

const ZONES = {
  Jaro:          { center: [122.5621, 10.7202], radius: 0.015, landmarks: ["SM City Iloilo",  "Jaro Cathedral", "WVSU"],        baseDemand: 0.7 },
  Mandurriao:    { center: [122.5453, 10.7081], radius: 0.012, landmarks: ["Airport",          "Festive Walk",   "Megaworld"],   baseDemand: 0.8 },
  "City Proper": { center: [122.5685, 10.6935], radius: 0.010, landmarks: ["City Hall",        "Molo Church",    "Robinsons"],   baseDemand: 1.0 },
  "La Paz":      { center: [122.5531, 10.7156], radius: 0.013, landmarks: ["La Paz Market",    "Smallville",     "Atria"],       baseDemand: 0.6 },
  Arevalo:       { center: [122.5394, 10.6998], radius: 0.011, landmarks: ["Arevalo Plaza",    "Fort San Pedro", "CPU"],         baseDemand: 0.5 },
};

const RIDER_NAMES    = ["Miguel Santos","Juan dela Cruz","Carlos Reyes","Marco Gonzales","Jose Ramos","Pedro Aquino","Ramon Cruz","Luis Fernandez","Antonio Lopez","Diego Martinez","Ben Villanueva","Rico Ocampo"];
const CUSTOMER_NAMES = ["Maria Santos","Ana Cruz","Carmen Lopez","Sofia Martinez","Isabella Garcia","Elena Reyes","Rosa Flores","Lucia Torres","Gabriela Silva","Valentina Morales"];

function uid()       { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function pick(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }
function randLoc(z)  { const zone = ZONES[z] || ZONES.Jaro; const a = Math.random()*Math.PI*2, r = Math.random()*zone.radius; return { lat: zone.center[1]+r*Math.cos(a), lng: zone.center[0]+r*Math.sin(a) }; }
function calcDist(a, b) { const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180, x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }

function pushEvent(type, bookingId, actor, message) {
  appendDemoEvent({ id: uid(), type, booking_id: bookingId, actor, message, timestamp: new Date().toISOString() });
}

export default function SuperDemoEngine({ currentRole, onRoleSwitch, simulationActive, onSimulationToggle }) {
  const [isActive,       setIsActive]       = useState(false);
  const [isMinimized,    setIsMinimized]    = useState(true);
  const [trafficDensity, setTrafficDensity] = useState("medium");
  const [activeEvent,    setActiveEvent]    = useState(null);
  const [surgeZones,     setSurgeZones]     = useState([]);
  const [stats,          setStats]          = useState({ riders: 0, bookings: 0, trips: 0, earnings: 0 });
  const [loading,        setLoading]        = useState(false);
  const [position,       setPosition]       = useState({ x: Math.max(10, window.innerWidth - 340), y: Math.max(10, window.innerHeight - 540) });
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragOffset,     setDragOffset]     = useState({ x: 0, y: 0 });
  const widgetRef    = useRef(null);
  const intervalsRef = useRef({ bookings: null, movement: null, surge: null });
  const assignmentTimersRef = useRef({});

  useEffect(() => { if (simulationActive !== undefined) setIsActive(simulationActive); }, [simulationActive]);

  useEffect(() => {
    const onUpdate = (e) => { const s = e.detail?.stats; if (s) setStats({ ...s }); };
    window.addEventListener(DEMO_EVENT, onUpdate);
    setStats(readDemoStore().stats);
    return () => window.removeEventListener(DEMO_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    const calcSurge = () => {
      const store = readDemoStore();
      const list  = [];
      Object.keys(ZONES).forEach(z => {
        const online  = store.riders.filter(r => r.zone === z && r.online_status === "online").length;
        const pending = store.bookings.filter(b => b.zone === z && ["pending","searching"].includes(b.status)).length;
        const ratio   = pending / Math.max(1, online);
        if (ratio > 1.5) list.push({ zone: z, multiplier: parseFloat(Math.min(2.5, ratio * 0.9).toFixed(1)) });
      });
      setSurgeZones(list);
    };
    intervalsRef.current.surge = setInterval(calcSurge, 8000);
    return () => clearInterval(intervalsRef.current.surge);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const onUp   = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, dragOffset]);

  const handleDragStart = (e) => {
    if (widgetRef.current) {
      const r = widgetRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    if (isActive) startSim(); else stopSim();
    return () => stopSim();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, trafficDensity]);

  const getInterval = () => {
    const base = trafficDensity === "low" ? 12000 : trafficDensity === "high" ? 4000 : 7000;
    const mult = activeEvent === "rush_hour" ? 0.5 : activeEvent === "rainstorm" ? 0.65 : activeEvent === "festival" ? 0.4 : 1;
    return Math.max(2000, base * mult);
  };

  const startSim = () => {
    if (intervalsRef.current.bookings) return;
    if (readDemoStore().riders.filter(r => r.online_status === "online").length < 5) seedRiders(12);
    runBookingCycle();
    intervalsRef.current.bookings = setInterval(runBookingCycle, getInterval());
    intervalsRef.current.movement = setInterval(moveRiders, 3500);
    console.log("▶️ Demo simulation started (local)");
  };

  const stopSim = () => {
    ["bookings","movement"].forEach(k => {
      if (intervalsRef.current[k]) { clearInterval(intervalsRef.current[k]); intervalsRef.current[k] = null; }
    });
    Object.values(assignmentTimersRef.current).forEach(clearTimeout);
    assignmentTimersRef.current = {};
  };

  const seedRiders = (count = 12) => {
    const zones     = Object.keys(ZONES);
    const newRiders = Array.from({ length: count }, (_, i) => {
      const zone = zones[i % zones.length];
      const loc  = randLoc(zone);
      return {
        id:               "dr-" + uid(),
        full_name:        RIDER_NAMES[i % RIDER_NAMES.length] + (i >= RIDER_NAMES.length ? ` ${Math.floor(i/RIDER_NAMES.length)+1}` : ""),
        phone:            `+639${Math.floor(Math.random()*900000000+100000000)}`,
        plate_number:     `ABC ${Math.floor(Math.random()*9000+1000)}`,
        motorcycle_make:  pick(["Honda","Yamaha","Suzuki","Kawasaki"]),
        motorcycle_model: pick(["XRM125","TMX155","Raider150","Wave110"]),
        zone,
        status:           "active",
        online_status:    "online",
        avg_rating:       parseFloat((Math.random()*1.5+3.5).toFixed(1)),
        completed_trips:  Math.floor(Math.random()*300),
        acceptance_rate:  Math.floor(Math.random()*30+70),
        strikes:          0,
        lat:              loc.lat,
        lng:              loc.lng,
        heading:          Math.random()*360,
        is_demo_data:     true,
      };
    });
    patchDemoStore(s => {
      const riders = [...s.riders.filter(r => !r.id.startsWith("dr-")), ...newRiders];
      return { ...s, riders, stats: { ...s.stats, riders: riders.length } };
    });
  };

  const runBookingCycle = () => {
    const store    = readDemoStore();
    const free     = store.riders.filter(r => r.online_status === "online");
    if (free.length === 0) { seedRiders(8); return; }
    const zones    = Object.keys(ZONES);
    const pz       = pick(zones);
    const dz       = pick(zones);
    const pu       = randLoc(pz);
    const dr       = randLoc(dz);
    const fare     = Math.round(calcDist(pu, dr)*14 + Math.random()*35 + 55);
    const surge    = surgeZones.find(s => s.zone === pz);
    const finalFare = surge ? Math.round(fare * surge.multiplier) : fare;
    const pLm      = pick(ZONES[pz].landmarks);
    const dLm      = pick(ZONES[dz].landmarks);
    const booking  = {
      id:             "db-" + uid(),
      booking_id:     `DM-${Date.now().toString(36).toUpperCase()}`,
      customer_name:  pick(CUSTOMER_NAMES),
      customer_phone: `+639${Math.floor(Math.random()*900000000+100000000)}`,
      pickup_address: `${pLm}, ${pz}, Iloilo City`,
      dropoff_address:`${dLm}, ${dz}, Iloilo City`,
      zone:           pz,
      status:         "pending",
      fare_estimate:  finalFare,
      payment_method: Math.random()>0.5 ? "cash" : "gcash",
      network_id:     "demo-network",
      network_name:   "Demo Network",
      created_date:   new Date().toISOString(),
      is_demo_data:   true,
    };
    pushEvent("BOOKING_CREATED", booking.booking_id, "Customer", `New booking: ${pLm} → ${dLm} · ₱${finalFare}`);
    pushEvent("BOOKING_BROADCASTED", booking.booking_id, "Dispatch", `Request broadcasted to nearby riders in ${pz}`);
    patchDemoStore(s => ({ ...s, bookings: [booking, ...s.bookings].slice(0,50), stats: { ...s.stats, bookings: s.stats.bookings+1 } }));
    assignmentTimersRef.current[booking.id] = setTimeout(() => {
      autoAssign(booking.id, booking.booking_id, finalFare, free);
      delete assignmentTimersRef.current[booking.id];
    }, 12000);
  };

  const autoAssign = (bookingId, bookingRef, fare, riderPool) => {
    const store  = readDemoStore();
    const booking = store.bookings.find(b => b.id === bookingId);
    if (!booking || !["pending", "searching"].includes(booking.status) || booking.rider_id) return;
    const pool   = (riderPool || store.riders).filter(r => r.online_status === "online" && !r.is_primary_demo_rider);
    if (pool.length === 0) return;
    const rider  = pick(pool);
    patchDemoStore(s => ({
      ...s,
      bookings: s.bookings.map(b => b.id === bookingId ? { ...b, status:"assigned", rider_id:rider.id, rider_name:rider.full_name, rider_phone:rider.phone, assigned_at:new Date().toISOString() } : b),
      riders:   s.riders.map(r => r.id === rider.id ? { ...r, online_status:"on_trip" } : r),
    }));
    pushEvent("RIDER_ACCEPTED", bookingRef, rider.full_name, `Rider accepted · heading to pickup`);
    setTimeout(() => setStatus(bookingId, bookingRef, "otw",         rider.full_name, "Rider on the way"),          5000);
    setTimeout(() => setStatus(bookingId, bookingRef, "arrived",     rider.full_name, "Rider arrived at pickup"), 13000);
    setTimeout(() => setStatus(bookingId, bookingRef, "in_progress", rider.full_name, "Trip in progress"),        19000);
    setTimeout(() => finishTrip(bookingId, bookingRef, rider.id, rider.full_name, fare), 38000);
  };

  const setStatus = (bookingId, bookingRef, status, riderName, label) => {
    patchDemoStore(s => ({ ...s, bookings: s.bookings.map(b => b.id === bookingId ? { ...b, status } : b) }));
    const eType = { otw:"RIDER_ACCEPTED", arrived:"RIDER_ARRIVED", in_progress:"TRIP_STARTED" }[status] || "TRIP_STARTED";
    pushEvent(eType, bookingRef, riderName, label);
  };

  const finishTrip = (bookingId, bookingRef, riderId, riderName, fare) => {
    patchDemoStore(s => ({
      ...s,
      bookings: s.bookings.map(b => b.id === bookingId ? { ...b, status:"completed", completed_at:new Date().toISOString(), customer_rating:Math.floor(Math.random()*2)+4 } : b),
      riders:   s.riders.map(r => r.id === riderId ? { ...r, online_status:"online", completed_trips:(r.completed_trips||0)+1 } : r),
      stats:    { ...s.stats, trips:s.stats.trips+1, earnings:s.stats.earnings+fare },
    }));
    pushEvent("TRIP_ENDED", bookingRef, riderName, `Trip completed · ₱${fare}`);
  };

  const moveRiders = () => {
    patchDemoStore(s => ({
      ...s,
      riders: s.riders.map(r => {
        const delta = 0.0003 + Math.random()*0.0002;
        const h     = Math.random()*360;
        const rad   = h*Math.PI/180;
        return { ...r, lat:(r.lat||10.7)+delta*Math.cos(rad), lng:(r.lng||122.55)+delta*Math.sin(rad), heading:h };
      }),
    }));
  };

  const spawnBooking = () => {
    const store = readDemoStore();
    if (store.riders.filter(r => r.online_status === "online").length === 0) seedRiders(8);
    runBookingCycle();
  };

  const spawnRider = () => seedRiders(3);

  const triggerCityEvent = (et) => setActiveEvent(prev => prev === et ? null : et);

  const resetDemo = () => {
    stopSim();
    clearDemoStore();
    setStats({ riders:0, bookings:0, trips:0, earnings:0 });
    setIsActive(false);
    if (onSimulationToggle) onSimulationToggle(false);
    setSurgeZones([]);
  };

  const toggleSim = () => {
    const next = !isActive;
    setIsActive(next);
    if (onSimulationToggle) onSimulationToggle(next);
  };

  if (isMinimized) {
    return (
      <div ref={widgetRef} className="fixed z-[9998] cursor-move" style={{ left:position.x, top:position.y }} onMouseDown={handleDragStart}>
        <button onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-white relative"
          style={{ background:`linear-gradient(135deg, ${isActive ? GREEN : PRIMARY} 0%, ${isActive ? "#059669" : PRIMARY}dd 100%)`, boxShadow:`0 6px 20px ${isActive ? GREEN : PRIMARY}60` }}>
          <Settings className="w-6 h-6 text-white" />
          {isActive && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />}
        </button>
      </div>
    );
  }

  return (
    <div ref={widgetRef} className="fixed z-[9998] w-80" style={{ left:position.x, top:position.y, cursor:isDragging?"grabbing":"default" }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[600px] flex flex-col">

        <div className="px-4 py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing" style={{ background:PRIMARY+"10" }} onMouseDown={handleDragStart}>
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:PRIMARY+"20" }}>
              <Zap className="w-4 h-4" style={{ color:PRIMARY }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">Super Demo Mode</div>
              <div className="text-[10px] text-gray-400">Live simulation engine</div>
            </div>
            <button onClick={() => setIsMinimized(true)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {onRoleSwitch && (
          <div className="px-4 py-3 border-b border-gray-100" style={{ background:"#fafbff" }}>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Switch Role</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key:"customer", label:"Customer", icon:"👤", color:"#3b82f6" },
                { key:"rider",    label:"Rider",    icon:"🏍", color:"#10b981" },
                { key:"operator", label:"Operator", icon:"🏢", color:"#8b5cf6" },
                { key:"admin",    label:"Admin",    icon:"🛡️", color:"#ef4444" },
              ].map(role => (
                <button key={role.key} onClick={() => onRoleSwitch(role.key)}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={currentRole === role.key
                    ? { background:role.color+"15", color:role.color, border:`1.5px solid ${role.color}40` }
                    : { background:"white", color:"#6b7280", border:"1.5px solid #e5e7eb" }}>
                  <span className="text-base">{role.icon}</span>
                  <span className="text-[9px]">{role.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 grid grid-cols-4 gap-2 border-b border-gray-100">
          {[
            { label:"Riders",   value:stats.riders,               color:GREEN   },
            { label:"Bookings", value:stats.bookings,             color:AMBER   },
            { label:"Trips",    value:stats.trips,                color:PRIMARY },
            { label:"₱",        value:`${stats.earnings||0}`,     color:"#8b5cf6" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-base font-black" style={{ color:s.color }}>{s.value}</div>
              <div className="text-[9px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Simulation</div>
          <button onClick={toggleSim} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: isActive ? "#ef4444" : GREEN }}>
            {isActive ? <><Square className="w-4 h-4" /> Stop Simulation</> : <><Play className="w-4 h-4" /> Start Simulation</>}
          </button>
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">{stats.bookings} bookings · {stats.trips} trips completed</span>
            </div>
          )}

          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-3">Traffic Density</div>
          <div className="flex gap-2">
            {["low","medium","high"].map(d => (
              <button key={d} onClick={() => setTrafficDensity(d)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize"
                style={trafficDensity === d ? { background:PRIMARY, color:"white" } : { background:"#f3f4f6", color:"#6b7280" }}>
                {d}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            {trafficDensity==="low"&&"1-2 bookings/min"}{trafficDensity==="medium"&&"3-5 bookings/min"}{trafficDensity==="high"&&"8-12 bookings/min"}
          </div>

          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-3">City Events</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id:"rush_hour", label:"Rush Hour", Icon:Sun,      color:"#f59e0b" },
              { id:"rainstorm", label:"Rainstorm", Icon:CloudRain, color:"#3b82f6" },
              { id:"festival",  label:"Festival",  Icon:Sparkles,  color:"#8b5cf6" },
            ].map(ev => (
              <button key={ev.id} onClick={() => triggerCityEvent(ev.id)}
                className="py-2.5 rounded-lg text-xs font-bold transition-all"
                style={activeEvent===ev.id ? { background:ev.color, color:"white" } : { background:"#f3f4f6", color:"#6b7280", border:"2px solid #e5e7eb" }}>
                <ev.Icon className="w-3.5 h-3.5 mx-auto mb-1" />
                {ev.label}
              </button>
            ))}
          </div>
          {activeEvent && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-700">
                {{ rush_hour:"Rush Hour Active", rainstorm:"Rainstorm Active", festival:"Festival Active" }[activeEvent]}
              </span>
            </div>
          )}

          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={spawnBooking} disabled={loading}
              className="py-2 rounded-lg text-xs font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex flex-col items-center gap-1">
              <MapPin className="w-3 h-3" /> Spawn Booking
            </button>
            <button onClick={spawnRider} disabled={loading}
              className="py-2 rounded-lg text-xs font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex flex-col items-center gap-1">
              <Bike className="w-3 h-3" /> Spawn Rider
            </button>
          </div>

          {surgeZones.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-1">
              <div className="text-xs font-bold text-red-700 mb-1">⚡ Active Surge Zones</div>
              {surgeZones.slice(0,3).map(s => (
                <div key={s.zone} className="flex justify-between text-xs text-red-600 py-0.5">
                  <span>{s.zone}</span><span className="font-black">{s.multiplier}x</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={resetDemo} disabled={loading || isActive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-gray-600 text-sm border-2 border-gray-200 hover:bg-gray-50 disabled:opacity-50 mt-2">
            <RotateCcw className="w-4 h-4" /> Reset Demo
          </button>
        </div>
      </div>
    </div>
  );
}
