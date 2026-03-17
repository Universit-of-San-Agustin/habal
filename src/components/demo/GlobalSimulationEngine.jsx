import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * GLOBAL SIMULATION ENGINE
 * Runs autonomous simulation that works across all roles
 * - Spawns simulated riders with GPS
 * - Generates ride requests automatically
 * - Moves riders along realistic routes
 * - Updates every 2-3 seconds
 * - Persists state across role switches
 */

const ILOILO_CENTER = { lat: 10.7202, lng: 122.5621 };
const SERVICE_RADIUS = 0.03; // ~3km radius

const LANDMARKS = [
  { name: "SM City Iloilo", lat: 10.7156, lng: 122.5778 },
  { name: "Robinsons Place", lat: 10.6999, lng: 122.5503 },
  { name: "Iloilo Business Park", lat: 10.7183, lng: 122.5808 },
  { name: "Jaro Cathedral", lat: 10.7305, lng: 122.5654 },
  { name: "Smallville Complex", lat: 10.7156, lng: 122.5531 },
  { name: "Molo Church", lat: 10.6935, lng: 122.5685 },
  { name: "Festive Walk", lat: 10.7081, lng: 122.5453 },
  { name: "Fort San Pedro", lat: 10.6998, lng: 122.5394 },
];

const RIDER_NAMES = [
  "Juan Cruz", "Pedro Santos", "Miguel Reyes", "Carlos Garcia", "Jose Torres",
  "Ramon Lopez", "Luis Martinez", "Antonio Fernandez", "Diego Gonzales", "Marco Ramos"
];

const CUSTOMER_NAMES = [
  "Maria Cruz", "Ana Santos", "Carmen Lopez", "Sofia Martinez", "Isabella Garcia",
  "Elena Reyes", "Rosa Flores", "Lucia Torres", "Gabriela Silva", "Valentina Morales"
];

// Helper: Get random point within service area
function getRandomLocation() {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * SERVICE_RADIUS;
  return {
    lat: ILOILO_CENTER.lat + radius * Math.cos(angle),
    lng: ILOILO_CENTER.lng + radius * Math.sin(angle),
  };
}

// Helper: Get nearest landmark
function getNearestLandmark(lat, lng) {
  let nearest = LANDMARKS[0];
  let minDist = Infinity;
  
  LANDMARKS.forEach(landmark => {
    const dist = Math.sqrt(
      Math.pow(landmark.lat - lat, 2) + 
      Math.pow(landmark.lng - lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = landmark;
    }
  });
  
  return nearest.name;
}

// Helper: Calculate bearing between two points
function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// Helper: Move point toward target
function moveToward(fromLat, fromLng, toLat, toLng, speed = 0.0003) {
  const bearing = calculateBearing(fromLat, fromLng, toLat, toLng);
  const bearingRad = bearing * Math.PI / 180;
  
  const newLat = fromLat + speed * Math.cos(bearingRad);
  const newLng = fromLng + speed * Math.sin(bearingRad);
  
  return { lat: newLat, lng: newLng, heading: bearing };
}

export default function GlobalSimulationEngine({ isActive }) {
  const intervalsRef = useRef({
    riders: null,
    bookings: null,
    movement: null,
  });
  
  const stateRef = useRef({
    initialized: false,
    riderIds: [],
  });

  useEffect(() => {
    if (!isActive) {
      stopSimulation();
      return;
    }
    
    startSimulation();
    return () => stopSimulation();
  }, [isActive]);

  const stopSimulation = () => {
    Object.values(intervalsRef.current).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    intervalsRef.current = { riders: null, bookings: null, movement: null };
    console.log("⏹️ SIMULATION: Stopped");
  };

  const startSimulation = async () => {
    if (intervalsRef.current.movement) {
      console.log("⚠️ SIMULATION: Already running");
      return;
    }
    
    console.log("🎬 SIMULATION: Starting global engine...");
    
    // Initialize riders
    if (!stateRef.current.initialized) {
      await initializeRiders();
      stateRef.current.initialized = true;
    }
    
    // Movement updates every 10 seconds (optimized to prevent rate limiting)
    intervalsRef.current.movement = setInterval(() => {
      updateRiderMovement();
    }, 10000);
    
    // Generate bookings every 45 seconds (reduced frequency to prevent rate limiting)
    intervalsRef.current.bookings = setInterval(() => {
      generateSimulatedBooking();
    }, 45000);
    
    // Initial booking
    setTimeout(() => generateSimulatedBooking(), 3000);
    
    console.log("✅ SIMULATION: Engine active");
  };

  const initializeRiders = async () => {
    try {
      console.log("🏍 SIMULATION: Initializing riders...");
      
      // Check existing simulated riders
      const existing = await base44.entities.Rider.filter({ 
        is_demo_data: true 
      }).catch(() => []);
      
      if (existing.length >= 15) {
        stateRef.current.riderIds = existing.map(r => r.id);
        console.log(`✅ SIMULATION: ${existing.length} riders already exist`);
        return;
      }
      
      // Create 20 simulated riders
      const riders = [];
      for (let i = 0; i < 20; i++) {
        const location = getRandomLocation();
        riders.push({
          full_name: RIDER_NAMES[i % RIDER_NAMES.length] + ` ${Math.floor(Math.random() * 999)}`,
          phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
          email: `sim.rider${i}@habal.app`,
          zone: "City Proper",
          status: "active",
          online_status: "online",
          avg_rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          completed_trips: Math.floor(Math.random() * 200),
          acceptance_rate: Math.floor(Math.random() * 30 + 70),
          network_id: "simulation-network",
          network_name: "Simulation Network",
          motorcycle_make: ["Honda", "Yamaha", "Suzuki"][Math.floor(Math.random() * 3)],
          motorcycle_model: ["XRM125", "TMX155", "Raider150"][Math.floor(Math.random() * 3)],
          plate_number: `SIM ${Math.floor(Math.random() * 9000 + 1000)}`,
          is_demo_data: true,
        });
      }
      
      const created = await Promise.all(
        riders.map(r => base44.entities.Rider.create(r).catch(() => null))
      );
      
      const validRiders = created.filter(r => r);
      stateRef.current.riderIds = validRiders.map(r => r.id);
      
      // Create initial GPS locations
      await Promise.all(validRiders.map(rider => {
        const loc = getRandomLocation();
        return base44.entities.RiderLocation.create({
          rider_id: rider.id,
          rider_name: rider.full_name,
          lat: loc.lat,
          lng: loc.lng,
          heading: Math.random() * 360,
          speed: 0,
          status: "idle",
          is_demo_data: true,
        }).catch(() => null);
      }));
      
      console.log(`✅ SIMULATION: Created ${validRiders.length} riders`);
    } catch (err) {
      console.error("❌ SIMULATION: Rider init failed:", err);
    }
  };

  const updateRiderMovement = async () => {
    try {
      // Get all simulated rider locations
      const locations = await base44.entities.RiderLocation.filter({ 
        is_demo_data: true 
      }).catch(() => []);
      
      if (locations.length === 0) return;
      
      // Get active bookings for assigned riders
      const activeBookings = await base44.entities.Booking.filter({
        is_demo_data: true,
        status: { $in: ["assigned", "otw", "arrived", "in_progress"] }
      }).catch(() => []);
      
      const bookingMap = {};
      activeBookings.forEach(b => {
        if (b.rider_id) bookingMap[b.rider_id] = b;
      });
      
      // Update riders in batches of 3 to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < locations.length; i += batchSize) {
        const batch = locations.slice(i, i + batchSize);
        await Promise.all(batch.map(async (loc) => {
          const booking = bookingMap[loc.rider_id];
          
          if (booking) {
            return updateRiderWithBooking(loc, booking);
          } else {
            return updateIdleRider(loc);
          }
        }));
        
        // Delay between batches to prevent rate limiting
        if (i + batchSize < locations.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error("❌ SIMULATION: Movement update failed:", err);
    }
  };

  const updateRiderWithBooking = async (loc, booking) => {
    try {
      // Parse pickup/dropoff coordinates from addresses (simplified - uses landmarks)
      const pickup = LANDMARKS.find(l => booking.pickup_address.includes(l.name)) || LANDMARKS[0];
      const dropoff = LANDMARKS.find(l => booking.dropoff_address.includes(l.name)) || LANDMARKS[1];
      
      let target, newStatus;
      
      if (booking.status === "assigned" || booking.status === "otw") {
        // Moving toward pickup
        target = pickup;
        newStatus = "en_route_pickup";
      } else if (booking.status === "in_progress") {
        // Moving toward dropoff
        target = dropoff;
        newStatus = "en_route_dropoff";
      } else {
        // Arrived at pickup
        return;
      }
      
      // Calculate distance to target
      const dist = Math.sqrt(
        Math.pow(target.lat - loc.lat, 2) + 
        Math.pow(target.lng - loc.lng, 2)
      );
      
      if (dist < 0.001) {
        // Reached target
        if (booking.status === "assigned" || booking.status === "otw") {
          await base44.entities.Booking.update(booking.id, { status: "arrived" });
        } else if (booking.status === "in_progress") {
          await base44.entities.Booking.update(booking.id, { 
            status: "completed",
            completed_at: new Date().toISOString(),
            customer_rating: Math.floor(Math.random() * 2) + 4,
          });
          await base44.entities.Rider.update(loc.rider_id, { 
            online_status: "online" 
          });
        }
        return;
      }
      
      // Move toward target
      const movement = moveToward(loc.lat, loc.lng, target.lat, target.lng, 0.0004);
      
      await base44.entities.RiderLocation.update(loc.id, {
        lat: movement.lat,
        lng: movement.lng,
        heading: movement.heading,
        speed: 25 + Math.random() * 10,
        status: newStatus,
      });
    } catch (err) {
      console.error("❌ SIMULATION: Rider booking update failed:", err);
    }
  };

  const updateIdleRider = async (loc) => {
    try {
      // Random movement
      const angle = Math.random() * Math.PI * 2;
      const movement = 0.0002 + Math.random() * 0.0001;
      
      const newLat = loc.lat + movement * Math.cos(angle);
      const newLng = loc.lng + movement * Math.sin(angle);
      const heading = angle * 180 / Math.PI;
      
      await base44.entities.RiderLocation.update(loc.id, {
        lat: newLat,
        lng: newLng,
        heading: (heading + 360) % 360,
        speed: Math.random() * 20,
        status: "idle",
      });
    } catch (err) {
      console.error("❌ SIMULATION: Idle rider update failed:", err);
    }
  };

  const generateSimulatedBooking = async () => {
    try {
      console.log("📍 SIMULATION: Generating booking...");
      
      // Random pickup and dropoff
      const pickup = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
      const dropoff = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
      
      if (pickup === dropoff) return;
      
      const distance = Math.sqrt(
        Math.pow(pickup.lat - dropoff.lat, 2) + 
        Math.pow(pickup.lng - dropoff.lng, 2)
      );
      const fare = Math.round(distance * 10000 + 60);
      
      const booking = await base44.entities.Booking.create({
        booking_id: `SIM-${Date.now().toString(36).toUpperCase()}`,
        customer_name: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
        customer_phone: `+639${Math.floor(Math.random() * 900000000 + 100000000)}`,
        pickup_address: `${pickup.name}, Iloilo City`,
        dropoff_address: `${dropoff.name}, Iloilo City`,
        zone: "City Proper",
        status: "pending",
        fare_estimate: fare,
        payment_method: Math.random() > 0.5 ? "cash" : "gcash",
        network_id: "simulation-network",
        network_name: "Simulation Network",
        is_demo_data: true,
      });
      
      console.log(`✅ SIMULATION: Booking created (₱${fare})`);
      
      // Auto-assign after 3 seconds
      setTimeout(() => autoAssignRider(booking), 3000);
    } catch (err) {
      console.error("❌ SIMULATION: Booking generation failed:", err);
    }
  };

  const autoAssignRider = async (booking) => {
    try {
      // Find nearest available rider
      const riders = await base44.entities.Rider.filter({
        is_demo_data: true,
        online_status: "online",
        status: "active",
      }).catch(() => []);
      
      if (riders.length === 0) return;
      
      const locations = await base44.entities.RiderLocation.filter({
        is_demo_data: true,
        status: "idle",
      }).catch(() => []);
      
      if (locations.length === 0) return;
      
      const pickup = LANDMARKS.find(l => booking.pickup_address.includes(l.name)) || LANDMARKS[0];
      
      // Find nearest rider to pickup
      let nearestLoc = locations[0];
      let minDist = Infinity;
      
      locations.forEach(loc => {
        const dist = Math.sqrt(
          Math.pow(pickup.lat - loc.lat, 2) + 
          Math.pow(pickup.lng - loc.lng, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestLoc = loc;
        }
      });
      
      const rider = riders.find(r => r.id === nearestLoc.rider_id);
      if (!rider) return;
      
      // Assign booking
      await base44.entities.Booking.update(booking.id, {
        status: "assigned",
        rider_id: rider.id,
        rider_name: rider.full_name,
        rider_phone: rider.phone,
        assigned_at: new Date().toISOString(),
      });
      
      await base44.entities.Rider.update(rider.id, { 
        online_status: "on_trip" 
      });
      
      console.log(`✅ SIMULATION: Rider ${rider.full_name} assigned`);
      
      // Progress through stages
      setTimeout(() => updateBookingStatus(booking.id, "otw"), 4000);
      setTimeout(() => updateBookingStatus(booking.id, "in_progress"), 15000);
    } catch (err) {
      console.error("❌ SIMULATION: Auto-assign failed:", err);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await base44.entities.Booking.update(bookingId, { status });
    } catch (err) {
      console.error("❌ SIMULATION: Status update failed:", err);
    }
  };

  return null; // This is a headless component
}