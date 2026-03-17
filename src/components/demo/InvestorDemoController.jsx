import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Square, RotateCcw, TrendingUp, Minimize2, GripVertical, User, Bike, Building2, Shield } from "lucide-react";
import { COLORS } from "../shared/AppleDesignTokens";

const PRIMARY = COLORS.primary;
const ROLE_CONFIG = {
  customer: { icon: User, label: "Customer", color: "#3b82f6" },
  rider: { icon: Bike, label: "Rider", color: "#10b981" },
  operator: { icon: Building2, label: "Operator", color: "#8b5cf6" },
  admin: { icon: Shield, label: "Admin", color: "#ef4444" },
};

// Iloilo Smart City - Realistic zones with landmarks and coordinates
const ZONES = {
  Jaro: { 
    center: [10.7202, 122.5621], 
    radius: 0.015,
    landmarks: ["Jaro Plaza", "SM City Iloilo", "Jaro Cathedral", "West Visayas State University"]
  },
  Mandurriao: { 
    center: [10.7081, 122.5453], 
    radius: 0.012,
    landmarks: ["Iloilo International Airport", "Festive Walk Parade", "Megaworld Boulevard", "University of San Agustin"]
  },
  "City Proper": { 
    center: [10.6935, 122.5685], 
    radius: 0.01,
    landmarks: ["Iloilo City Hall", "Molo Church", "Plaza Libertad", "Robinsons Place Iloilo"]
  },
  "La Paz": { 
    center: [10.7156, 122.5531], 
    radius: 0.013,
    landmarks: ["La Paz Public Market", "Iloilo Central Market", "Atria Park District", "Smallville Complex"]
  },
  Arevalo: { 
    center: [10.6998, 122.5394], 
    radius: 0.011,
    landmarks: ["Arevalo Plaza", "Iloilo River Esplanade", "Fort San Pedro", "Central Philippine University"]
  },
};

const RIDER_NAMES = [
  "Miguel Santos", "Juan dela Cruz", "Carlos Reyes", "Marco Gonzales", "Jose Ramos",
  "Pedro Aquino", "Ramon Cruz", "Luis Fernandez", "Antonio Lopez", "Diego Martinez",
  "Rafael Torres", "Manuel Garcia", "Roberto Flores", "Fernando Silva", "Andres Morales"
];

const CUSTOMER_NAMES = [
  "Maria Santos", "Ana Cruz", "Carmen Lopez", "Sofia Martinez", "Isabella Garcia",
  "Elena Reyes", "Rosa Flores", "Lucia Torres", "Gabriela Silva", "Valentina Morales"
];

export default function InvestorDemoController({ user, onRoleSwitch, currentRole }) {
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const [stats, setStats] = useState({ riders: 0, bookings: 0, trips: 0 });
  const [loading, setLoading] = useState(false);
  
  const widgetRef = useRef(null);
  const autoHideTimer = useRef(null);
  const intervalRefs = useRef({
    riders: null,
    bookings: null,
    movement: null,
  });

  // Check if user has permission to access demo controls
  const hasPermission = ["admin", "operator", "network_owner"].includes(user?.role) || 
                        user?.email?.includes("demo.");

  // Auto-hide behavior
  useEffect(() => {
    const resetAutoHide = () => {
      setOpacity(1);
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      autoHideTimer.current = setTimeout(() => setOpacity(0.6), 10000);
    };
    
    if (!isMinimized) {
      resetAutoHide();
      window.addEventListener('mousemove', resetAutoHide);
      return () => {
        window.removeEventListener('mousemove', resetAutoHide);
        if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      };
    }
  }, [isMinimized]);

  // Dragging logic
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (isActive) {
      startDemoSimulation();
    } else {
      stopDemoSimulation();
    }
    return () => stopDemoSimulation();
  }, [isActive]);

  const handleDragStart = (e) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const startDemoSimulation = async () => {
    console.log("🎬 INVESTOR DEMO MODE: Starting simulation...");
    
    // Generate demo riders
    await generateDemoRiders();
    
    // Start continuous booking generation
    intervalRefs.current.bookings = setInterval(() => {
      generateDemoBooking();
    }, Math.random() * 40000 + 20000); // 20-60 seconds
    
    // Start rider movement updates
    intervalRefs.current.movement = setInterval(() => {
      updateRiderMovement();
    }, 2000); // Every 2 seconds
    
    console.log("✅ DEMO MODE: Simulation active");
  };

  const stopDemoSimulation = () => {
    Object.values(intervalRefs.current).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    intervalRefs.current = { riders: null, bookings: null, movement: null };
    console.log("⏹️ DEMO MODE: Simulation stopped");
  };

  const generateDemoRiders = async () => {
    try {
      const riderCount = Math.floor(Math.random() * 20) + 10; // 10-30 riders
      console.log(`🏍️ Generating ${riderCount} demo riders...`);
      
      const riders = [];
      for (let i = 0; i < riderCount; i++) {
        const zone = Object.keys(ZONES)[Math.floor(Math.random() * Object.keys(ZONES).length)];
        const location = getRandomLocationInZone(zone);
        
        riders.push({
          full_name: RIDER_NAMES[i % RIDER_NAMES.length] + ` #${i + 1}`,
          phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
          zone,
          status: "active",
          online_status: "online",
          avg_rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          completed_trips: Math.floor(Math.random() * 500),
          acceptance_rate: (Math.random() * 30 + 70).toFixed(0),
          network_id: "demo-network",
          network_name: "Demo Network",
          role: "rider",
          is_demo_data: true,
        });
      }
      
      // Create riders in parallel
      await Promise.all(riders.map(rider => base44.entities.Rider.create(rider)));
      
      // Create initial location markers
      const createdRiders = await base44.entities.Rider.filter({ is_demo_data: true });
      await Promise.all(createdRiders.map(rider => {
        const zone = rider.zone || "Jaro";
        const location = getRandomLocationInZone(zone);
        return base44.entities.RiderLocation.create({
          rider_id: rider.id,
          rider_name: rider.full_name,
          lat: location.lat,
          lng: location.lng,
          heading: Math.random() * 360,
          speed: 0,
          status: "idle",
          is_demo_data: true,
        });
      }));
      
      setStats(s => ({ ...s, riders: createdRiders.length }));
      console.log(`✅ Created ${createdRiders.length} demo riders`);
    } catch (err) {
      console.error("❌ Demo rider generation failed:", err);
    }
  };

  const generateDemoBooking = async () => {
    try {
      const zones = Object.keys(ZONES);
      const pickupZone = zones[Math.floor(Math.random() * zones.length)];
      const dropoffZone = zones[Math.floor(Math.random() * zones.length)];
      
      const pickup = getRandomLocationInZone(pickupZone);
      const dropoff = getRandomLocationInZone(dropoffZone);
      
      // Get realistic landmarks for pickup/dropoff
      const pickupLandmark = ZONES[pickupZone].landmarks[Math.floor(Math.random() * ZONES[pickupZone].landmarks.length)];
      const dropoffLandmark = ZONES[dropoffZone].landmarks[Math.floor(Math.random() * ZONES[dropoffZone].landmarks.length)];
      
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const fare = Math.round(distance * 15 + 40); // Base fare + per-km rate
      
      const booking = {
        customer_name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
        customer_phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
        pickup_address: `${pickupLandmark}, ${pickupZone}, Iloilo City`,
        dropoff_address: `${dropoffLandmark}, ${dropoffZone}, Iloilo City`,
        zone: pickupZone,
        status: "pending",
        fare_estimate: fare,
        payment_method: Math.random() > 0.5 ? "cash" : "gcash",
        network_id: "demo-network",
        network_name: "Demo Network",
        is_demo_data: true,
      };
      
      await base44.entities.Booking.create(booking);
      setStats(s => ({ ...s, bookings: s.bookings + 1 }));
      
      console.log("📍 Smart City Demo Booking:", pickupLandmark, "→", dropoffLandmark);
      
      // Auto-assign rider after 3 seconds
      setTimeout(() => autoAssignRider(booking), 3000);
    } catch (err) {
      console.error("❌ Demo booking generation failed:", err);
    }
  };

  const autoAssignRider = async (bookingData) => {
    try {
      // Find pending booking
      const bookings = await base44.entities.Booking.filter({ 
        is_demo_data: true, 
        status: "pending" 
      });
      
      if (bookings.length === 0) return;
      
      const booking = bookings[0];
      
      // Get available demo riders
      const riders = await base44.entities.Rider.filter({ 
        is_demo_data: true, 
        online_status: "online",
        status: "active"
      });
      
      if (riders.length === 0) return;
      
      // Select random rider
      const rider = riders[Math.floor(Math.random() * riders.length)];
      
      // Assign booking
      await base44.entities.Booking.update(booking.id, {
        status: "assigned",
        rider_id: rider.id,
        rider_name: rider.full_name,
        rider_phone: rider.phone,
        assigned_at: new Date().toISOString(),
      });
      
      // Update rider status
      await base44.entities.Rider.update(rider.id, {
        online_status: "on_trip"
      });
      
      console.log("✅ Auto-assigned rider:", rider.full_name, "to booking", booking.id);
      
      // Simulate trip progression
      setTimeout(() => progressTrip(booking.id, "otw"), 5000);
      setTimeout(() => progressTrip(booking.id, "arrived"), 15000);
      setTimeout(() => progressTrip(booking.id, "in_progress"), 25000);
      setTimeout(() => completeTrip(booking.id, rider.id), 45000);
    } catch (err) {
      console.error("❌ Auto-assign failed:", err);
    }
  };

  const progressTrip = async (bookingId, status) => {
    try {
      const bookings = await base44.entities.Booking.filter({ id: bookingId });
      if (bookings.length === 0) return;
      
      await base44.entities.Booking.update(bookingId, { status });
      console.log(`🚀 Trip progressed to: ${status}`);
    } catch (err) {
      console.error("❌ Trip progression failed:", err);
    }
  };

  const completeTrip = async (bookingId, riderId) => {
    try {
      const bookings = await base44.entities.Booking.filter({ id: bookingId });
      if (bookings.length === 0) return;
      
      await base44.entities.Booking.update(bookingId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      
      // Return rider to online status
      await base44.entities.Rider.update(riderId, {
        online_status: "online",
        completed_trips: (await base44.entities.Rider.filter({ id: riderId }))[0].completed_trips + 1,
      });
      
      setStats(s => ({ ...s, trips: s.trips + 1 }));
      console.log("✅ Trip completed:", bookingId);
    } catch (err) {
      console.error("❌ Trip completion failed:", err);
    }
  };

  const updateRiderMovement = async () => {
    try {
      const locations = await base44.entities.RiderLocation.filter({ is_demo_data: true });
      
      // Smart City movement simulation - realistic road-based patterns
      await Promise.all(locations.map(async (loc) => {
        // Simulate road-network movement (cardinal directions preferred)
        const direction = Math.floor(Math.random() * 8); // 8 compass directions
        const movement = 0.0003 + Math.random() * 0.0002; // Variable speed
        
        let latDelta = 0;
        let lngDelta = 0;
        let heading = loc.heading;
        
        // Simulate movement along road grid
        if (direction === 0) { // North
          latDelta = movement;
          heading = 0;
        } else if (direction === 1) { // Northeast
          latDelta = movement * 0.7;
          lngDelta = movement * 0.7;
          heading = 45;
        } else if (direction === 2) { // East
          lngDelta = movement;
          heading = 90;
        } else if (direction === 3) { // Southeast
          latDelta = -movement * 0.7;
          lngDelta = movement * 0.7;
          heading = 135;
        } else if (direction === 4) { // South
          latDelta = -movement;
          heading = 180;
        } else if (direction === 5) { // Southwest
          latDelta = -movement * 0.7;
          lngDelta = -movement * 0.7;
          heading = 225;
        } else if (direction === 6) { // West
          lngDelta = -movement;
          heading = 270;
        } else { // Northwest
          latDelta = movement * 0.7;
          lngDelta = -movement * 0.7;
          heading = 315;
        }
        
        // Add slight randomness to simulate real traffic patterns
        latDelta += (Math.random() - 0.5) * 0.0001;
        lngDelta += (Math.random() - 0.5) * 0.0001;
        
        const newLat = loc.lat + latDelta;
        const newLng = loc.lng + lngDelta;
        const speed = Math.random() * 15 + 15; // 15-30 km/h urban speed
        
        return base44.entities.RiderLocation.update(loc.id, {
          lat: newLat,
          lng: newLng,
          heading: heading,
          speed: speed,
        });
      }));
    } catch (err) {
      console.error("❌ Rider movement update failed:", err);
    }
  };

  const resetDemo = async () => {
    setLoading(true);
    try {
      console.log("🔄 Resetting demo environment...");
      
      // Delete all demo data
      const demoRiders = await base44.entities.Rider.filter({ is_demo_data: true });
      const demoBookings = await base44.entities.Booking.filter({ is_demo_data: true });
      const demoLocations = await base44.entities.RiderLocation.filter({ is_demo_data: true });
      
      await Promise.all([
        ...demoRiders.map(r => base44.entities.Rider.delete(r.id)),
        ...demoBookings.map(b => base44.entities.Booking.delete(b.id)),
        ...demoLocations.map(l => base44.entities.RiderLocation.delete(l.id)),
      ]);
      
      setStats({ riders: 0, bookings: 0, trips: 0 });
      setIsActive(false);
      
      console.log("✅ Demo environment reset complete");
    } catch (err) {
      console.error("❌ Demo reset failed:", err);
    }
    setLoading(false);
  };

  if (!hasPermission) return null;

  // Minimized state
  if (isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-[9998] cursor-move"
        style={{
          left: position.x,
          top: position.y,
          opacity: opacity,
          transition: isDragging ? 'none' : 'opacity 0.3s',
        }}
        onMouseDown={handleDragStart}>
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-white"
          style={{ 
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY}dd 100%)`,
            boxShadow: `0 6px 20px ${PRIMARY}60`,
          }}>
          <TrendingUp className="w-6 h-6 text-white" />
          {isActive && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div
      ref={widgetRef}
      className="fixed z-[9998] w-80"
      style={{
        left: position.x,
        top: position.y,
        opacity: opacity,
        transition: isDragging ? 'none' : 'opacity 0.3s',
        cursor: isDragging ? 'grabbing' : 'default',
      }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
        {/* Header - Draggable */}
        <div 
          className="px-4 py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ background: PRIMARY + "10" }}
          onMouseDown={handleDragStart}>
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: PRIMARY + "20" }}>
              <TrendingUp className="w-4 h-4" style={{ color: PRIMARY }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">Smart Demo</div>
              <div className="text-[10px] text-gray-400">Iloilo live simulation</div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Role Switcher Section */}
        {onRoleSwitch && (
          <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: "#fafbff" }}>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Switch Role</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = currentRole === key;
                return (
                  <button
                    key={key}
                    onClick={() => onRoleSwitch(key)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all text-xs font-semibold active:scale-95"
                    style={isActive ? { 
                      background: config.color + "15", 
                      color: config.color,
                      border: `1.5px solid ${config.color}40`,
                    } : { 
                      background: "white", 
                      color: "#6b7280",
                      border: "1.5px solid #e5e7eb",
                    }}>
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] leading-tight">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="px-4 py-3 bg-gray-50 grid grid-cols-3 gap-2 flex-shrink-0 border-b border-gray-100">
          <div className="text-center">
            <div className="text-lg font-black" style={{ color: PRIMARY }}>{stats.riders}</div>
            <div className="text-[10px] text-gray-400">Riders</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-amber-600">{stats.bookings}</div>
            <div className="text-[10px] text-gray-400">Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-green-600">{stats.trips}</div>
            <div className="text-[10px] text-gray-400">Completed</div>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="px-4 py-4 space-y-2 flex-shrink-0">
          <button
            onClick={() => setIsActive(!isActive)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
            style={{ background: isActive ? "#ef4444" : PRIMARY, boxShadow: `0 4px 12px ${isActive ? "#ef444440" : PRIMARY + "40"}` }}>
            {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isActive ? "Pause Simulation" : "Start Simulation"}
          </button>
          
          <button
            onClick={resetDemo}
            disabled={loading || isActive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-gray-600 text-sm border-2 border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50">
            <RotateCcw className="w-4 h-4" />
            Reset Demo
          </button>

          {/* Status Indicator */}
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Simulation Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getRandomLocationInZone(zoneName) {
  const zone = ZONES[zoneName] || ZONES.Jaro;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * zone.radius;
  
  return {
    lat: zone.center[0] + radius * Math.cos(angle),
    lng: zone.center[1] + radius * Math.sin(angle),
  };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}