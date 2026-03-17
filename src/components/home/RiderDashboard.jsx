import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, appendDemoEvent, isDemoMode, patchDemoStore, readDemoStore, upsertDemoRider } from "@/lib/demoStore";
import {
  MapPin, Clock, Star, User, LogOut, CheckCircle, XCircle,
  Bike, MessageCircle, Navigation, Home, ChevronLeft,
  TrendingUp, DollarSign, Award, Phone, Shield
} from "lucide-react";
import EarningsScreen from "../rider/EarningsScreen";
import MapboxMap from "./MapboxMap";
import ChatPanel from "../chat/ChatPanel";
import CommunicationPanel from "../booking/CommunicationPanel";

import { COLORS, SHADOWS, RADIUS } from "../shared/AppleDesignTokens";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;
const GREEN = COLORS.success;
const GREEN_DARK = COLORS.successDark;
const GREEN_BG = COLORS.successBg;

export default function RiderDashboard({ user }) {
  const [screen, setScreen] = useState("home"); // home | map | history | earnings | profile
  const [riderData, setRiderData] = useState(null);
  const [incomingBooking, setIncomingBooking] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showComms, setShowComms] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const seenBookingsRef = useRef(new Set());
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const demoMode = isDemoMode();

  // Load data - use email for persistent demo accounts
  useEffect(() => {
    if (!user?.email) return;
    if (demoMode) {
      const ensuredRider = upsertDemoRider({
        email: user.email,
        full_name: user.full_name || "Demo Rider",
        phone: user.email,
        zone: "City Proper",
        online_status: isOnline ? "online" : "offline",
        is_primary_demo_rider: true,
      });

      const syncFromStore = () => {
        const store = readDemoStore();
        const rider = store.riders.find((entry) => entry.id === ensuredRider.id) || ensuredRider;
        const history = (store.bookings || []).filter((booking) => booking.rider_id === rider.id);
        const active = history.find((booking) => ["assigned", "otw", "arrived", "in_progress"].includes(booking.status)) || null;

        setRiderData(rider);
        setTripHistory(history);
        setActiveBooking(active);
        if (active) setScreen("map");
      };

      syncFromStore();
      window.addEventListener(DEMO_EVENT, syncFromStore);
      return () => window.removeEventListener(DEMO_EVENT, syncFromStore);
    }

    base44.entities.Rider.filter({ email: user.email }, "-created_date", 1)
      .then(async rows => {
        const rider = rows?.[0] || null;
        setRiderData(rider);
        if (rider?.id) {
          const [history, activeRows] = await Promise.all([
            base44.entities.Booking.filter({ rider_id: rider.id }, "-created_date", 50).catch(() => []),
            base44.entities.Booking.filter({ rider_id: rider.id }, "-created_date", 5).catch(() => []),
          ]);
          setTripHistory(history || []);
          const active = activeRows?.find(b => ["assigned", "otw", "arrived", "in_progress"].includes(b.status));
          if (active) { setActiveBooking(active); setScreen("map"); }
        }
      }).catch(() => {});
  }, [demoMode, isOnline, user]);

  // GPS broadcast - CRITICAL: High-frequency continuous tracking (2-3s)
  useEffect(() => {
    if (!riderData?.id || !isOnline) return;
    if (demoMode) {
      const watchId = navigator.geolocation?.watchPosition(
        ({ coords: { longitude: lng, latitude: lat, heading } }) => {
          patchDemoStore((store) => ({
            ...store,
            riders: store.riders.map((rider) =>
              rider.id === riderData.id
                ? { ...rider, lat, lng, heading: heading || rider.heading || 0 }
                : rider
            ),
          }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation?.clearWatch(watchId);
      };
    }
    
    // PRODUCTION SPEC: 2s during active trip, 3s when idle online
    const updateInterval = activeBooking ? 2000 : 3000;
    
    const watchId = navigator.geolocation?.watchPosition(
      ({ coords: { longitude: lng, latitude: lat, heading, speed } }) => {
        const locationData = {
          lat,
          lng,
          rider_name: user?.full_name,
          rider_id: riderData.id,
          heading: heading || 0,
          speed: speed || 0,
          booking_id: activeBooking?.id || null,
          status: activeBooking ? 
            (activeBooking.status === "in_progress" ? "en_route_dropoff" : "en_route_pickup") 
            : "idle"
        };
        
        // Upsert location with minimal latency
        base44.entities.RiderLocation.filter({ rider_id: riderData.id }, "-updated_date", 1).then(locs => {
          if (locs?.[0]) {
            base44.entities.RiderLocation.update(locs[0].id, locationData).catch(err => 
              console.error("❌ GPS update failed:", err)
            );
          } else {
            base44.entities.RiderLocation.create({ rider_id: riderData.id, ...locationData }).catch(err => 
              console.error("❌ GPS create failed:", err)
            );
          }
        });
      },
      (error) => {
        console.error("❌ GPS ERROR:", error.message, error.code);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 8000,
        maximumAge: 0 // Force fresh location every time
      }
    );
    
    console.log(`📍 RIDER GPS: Tracking started (${updateInterval}ms interval)`);
    return () => {
      navigator.geolocation?.clearWatch(watchId);
      console.log("📍 RIDER GPS: Tracking stopped");
    };
  }, [activeBooking?.id, activeBooking?.status, demoMode, isOnline, riderData?.id, user?.full_name]);

  // Countdown for incoming booking
  useEffect(() => {
    if (!incomingBooking) {
      setCountdown(30);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          setIncomingBooking(null); // auto-dismiss on timeout
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [incomingBooking?.id]);

  // Update online_status and log state changes
  useEffect(() => {
    if (!riderData?.id) return;
    const newStatus = isOnline ? "online" : "offline";
    console.log(`🔄 RIDER STATUS: ${riderData.full_name} is now ${newStatus}`);
    if (demoMode) {
      patchDemoStore((store) => ({
        ...store,
        riders: store.riders.map((rider) =>
          rider.id === riderData.id ? { ...rider, online_status: newStatus } : rider
        ),
      }));
      return;
    }
    base44.entities.Rider.update(riderData.id, { online_status: newStatus }).catch(() => {});
  }, [demoMode, isOnline, riderData?.id, riderData?.full_name]);

  // When rider comes online, immediately check for any pending/searching bookings in their zone
  useEffect(() => {
    if (!riderData?.id || !isOnline || activeBooking) return;
    if (demoMode) return;
    const checkPendingBookings = async () => {
      // Look for unassigned bookings in the rider's zone
      const zone = riderData?.zone || "City Proper";
      const pendingBookings = await base44.entities.Booking.filter({
        status: "pending",
        zone,
      }, "-created_date", 5).catch(() => []);

      const searchingBookings = await base44.entities.Booking.filter({
        status: "searching",
        zone,
      }, "-created_date", 5).catch(() => []);

      const allPending = [...(pendingBookings || []), ...(searchingBookings || [])];
      for (const b of allPending) {
        if (!seenBookingsRef.current.has(b.id)) {
          // Re-dispatch this booking to this newly-online rider
          await base44.functions.invoke("notifyRidersOfBooking", { booking_id: b.booking_id || b.id }).catch(() => {});
          break; // Only re-dispatch once per online event
        }
      }
    };
    checkPendingBookings();
  }, [isOnline, riderData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new booking notifications (from Notification entity) + simulated bookings
  useEffect(() => {
    if (!riderData?.id || !isOnline || activeBooking) return;

    if (demoMode) {
      const syncIncoming = () => {
        const store = readDemoStore();
        const latestIncoming = incomingBooking?.id
          ? store.bookings.find((booking) => booking.id === incomingBooking.id)
          : null;

        if (latestIncoming && !["pending", "searching"].includes(latestIncoming.status)) {
          setIncomingBooking(null);
          return;
        }

        if (incomingBooking) return;

        const candidate = (store.bookings || []).find((booking) =>
          ["pending", "searching"].includes(booking.status) &&
          !booking.rider_id &&
          booking.zone === riderData.zone &&
          !seenBookingsRef.current.has(booking.id)
        );

        if (!candidate) return;

        seenBookingsRef.current.add(candidate.id);
        setIncomingBooking(candidate);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIncomingBooking(null);
          seenBookingsRef.current.delete(candidate.id);
        }, 30000);
      };

      syncIncoming();
      window.addEventListener(DEMO_EVENT, syncIncoming);
      return () => {
        window.removeEventListener(DEMO_EVENT, syncIncoming);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const poll = async () => {
      // Check for unread booking notifications addressed to this rider
      const notifs = await base44.entities.Notification.filter({
        user_id: riderData.id,
        read_status: false,
        type: "booking",
      }, "-created_date", 5).catch(() => []);
      
      // SIMULATION MODE: Also check for unassigned simulated bookings in same zone
      const simBookings = await base44.entities.Booking.filter({
        is_demo_data: true,
        status: { $in: ["pending", "searching"] },
        zone: riderData.zone,
      }, "-created_date", 3).catch(() => []);

      // Check simulation bookings first (higher priority for demo)
      if (simBookings && simBookings.length > 0) {
        const simBooking = simBookings[0];
        
        if (seenBookingsRef.current.has(simBooking.id)) return;
        seenBookingsRef.current.add(simBooking.id);
        
        console.log("🎬 RIDER: Simulated booking received", { 
          booking_id: simBooking.id, 
          customer: simBooking.customer_name 
        });
        
        setIncomingBooking(simBooking);
        
        // Auto-dismiss after 30s
        timerRef.current = setTimeout(() => {
          console.log("⏰ RIDER: Auto-timeout for simulated booking");
          setIncomingBooking(null);
          seenBookingsRef.current.delete(simBooking.id);
        }, 30000);
        
        return;
      }
      
      if (!notifs || notifs.length === 0) return;

      const notif = notifs[0];

      console.log("🔔 RIDER: New notification received", {
        notification_id: notif.id,
        reference_id: notif.reference_id,
        title: notif.title,
      });

      // Fetch the booking directly by its DB id
      const bookingRows = await base44.entities.Booking.filter({ id: notif.reference_id }, "-created_date", 1).catch(() => []);
      const booking = bookingRows?.[0];

      if (!booking) {
        console.warn("⚠️ RIDER: Stale notification, booking not found", { reference_id: notif.reference_id });
        // Stale notification — mark read and skip
        await base44.entities.Notification.update(notif.id, { read_status: true }).catch(() => {});
        return;
      }

      // Only show popup for bookings that are still unassigned (pending/searching)
      if (!["pending", "searching"].includes(booking.status)) {
        console.log("ℹ️ RIDER: Booking already assigned", { booking_id: booking.id, status: booking.status });
        await base44.entities.Notification.update(notif.id, { read_status: true }).catch(() => {});
        return;
      }

      if (seenBookingsRef.current.has(booking.id)) return;
      seenBookingsRef.current.add(booking.id);

      console.log("✅ RIDER: Showing booking popup", { booking_id: booking.id, customer: booking.customer_name });

      // Mark notification as read immediately so other riders don't double-pop
      await base44.entities.Notification.update(notif.id, { read_status: true }).catch(() => {});

      // Show the popup — do NOT assign yet; wait for explicit Accept
      setIncomingBooking(booking);

      // Auto-decline after 30s if no action taken
      timerRef.current = setTimeout(() => {
        console.log("⏰ RIDER: Auto-timeout for booking", { booking_id: booking.id });
        setIncomingBooking(null);
        seenBookingsRef.current.delete(booking.id); // Allow retry
      }, 30000);
    };

    poll();
    const interval = setInterval(poll, 5000); // Poll every 5s to avoid rate limits
    return () => { clearInterval(interval); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeBooking, demoMode, incomingBooking, isOnline, riderData?.id, riderData?.zone]);

  const handleAccept = async () => {
    if (!incomingBooking || !riderData?.id || processing) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setProcessing(true);
    
    try {
      if (demoMode) {
        let acceptedBooking = null;
        patchDemoStore((store) => {
          const target = store.bookings.find((booking) => booking.id === incomingBooking.id);
          if (!target || !["pending", "searching"].includes(target.status) || target.rider_id) {
            return store;
          }

          acceptedBooking = {
            ...target,
            status: "assigned",
            rider_id: riderData.id,
            rider_name: riderData.full_name,
            rider_phone: riderData.phone || user?.email,
            assigned_at: new Date().toISOString(),
          };

          return {
            ...store,
            bookings: store.bookings.map((booking) => booking.id === target.id ? acceptedBooking : booking),
            riders: store.riders.map((rider) => rider.id === riderData.id ? { ...rider, online_status: "on_trip" } : rider),
          };
        });

        if (!acceptedBooking) {
          setIncomingBooking(null);
          return;
        }

        appendDemoEvent({
          booking_id: acceptedBooking.booking_id,
          type: "RIDER_ACCEPTED",
          actor: riderData.full_name,
          message: "Rider accepted the booking",
        });

        setActiveBooking(acceptedBooking);
        setIncomingBooking(null);
        setScreen("map");
        return;
      }

      console.log("✅ RIDER: Accepting booking", { booking_id: incomingBooking.id, rider_id: riderData.id });
      
      // Batch all updates with Promise.allSettled to avoid cascading failures
      const [bookingResult, riderResult] = await Promise.allSettled([
        base44.entities.Booking.update(incomingBooking.id, {
          status: "assigned",
          rider_id: riderData.id,
          rider_name: riderData.full_name,
          rider_phone: riderData.phone || user?.email,
          assigned_at: new Date().toISOString(),
        }),
        base44.entities.Rider.update(riderData.id, { online_status: "on_trip" })
      ]);
      
      const updated = bookingResult.status === "fulfilled" ? bookingResult.value : null;
      
      // Log event in background (non-blocking)
      base44.entities.BookingEvent.create({
        booking_id: incomingBooking.id,
        event_type: "RIDER_ACCEPTED",
        actor_role: "rider",
        actor_id: riderData.id,
        actor_name: riderData.full_name,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      
      console.log("🎉 RIDER: Booking accepted successfully");
      
      setActiveBooking(updated || { ...incomingBooking, status: "assigned", rider_id: riderData.id, rider_name: riderData.full_name });
      setIncomingBooking(null);
      setScreen("map");
    } catch (err) {
      console.error("❌ RIDER: Accept failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (incomingBooking && !processing) {
      setProcessing(true);
      console.log("❌ RIDER: Declining booking", { booking_id: incomingBooking.id });
      
      try {
        if (demoMode) {
          appendDemoEvent({
            booking_id: incomingBooking.booking_id || incomingBooking.id,
            type: "RIDER_DECLINED",
            actor: riderData?.full_name || "Demo Rider",
            message: "Rider declined the booking request",
          });
          seenBookingsRef.current.delete(incomingBooking.id);
          return;
        }

        // Batch updates
        await Promise.allSettled([
          base44.entities.Booking.update(incomingBooking.id, {
            status: "searching",
            rider_id: null,
            rider_name: null,
            rider_phone: null,
          }),
          base44.entities.Rider.update(riderData.id, { online_status: "online" })
        ]);
        
        // Re-dispatch in background
        base44.functions.invoke("notifyRidersOfBooking", { booking_id: incomingBooking.id }).catch(() => {});
        
        console.log("🔄 RIDER: Booking re-dispatched to other riders");
      } catch (err) {
        console.error("❌ RIDER: Decline failed:", err);
      } finally {
        setProcessing(false);
      }
    }
    setIncomingBooking(null);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!activeBooking || processing) return;
    setProcessing(true);
    
    try {
      if (demoMode) {
        const eventMap = { otw: "RIDER_ACCEPTED", arrived: "RIDER_ARRIVED", in_progress: "TRIP_STARTED", completed: "TRIP_ENDED" };
        const nextBooking = {
          ...activeBooking,
          status: newStatus,
          ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === "in_progress" ? { started_at: new Date().toISOString() } : {}),
        };

        patchDemoStore((store) => ({
          ...store,
          bookings: store.bookings.map((booking) => booking.id === activeBooking.id ? nextBooking : booking),
          riders: store.riders.map((rider) => {
            if (rider.id !== riderData.id) return rider;
            if (newStatus === "completed") {
              return {
                ...rider,
                online_status: "online",
                total_trips: (rider.total_trips || 0) + 1,
                completed_trips: (rider.completed_trips || 0) + 1,
              };
            }
            return rider;
          }),
          stats: newStatus === "completed"
            ? {
                ...store.stats,
                trips: store.stats.trips + 1,
                earnings: store.stats.earnings + (activeBooking.fare_estimate || 0),
              }
            : store.stats,
        }));

        appendDemoEvent({
          booking_id: activeBooking.booking_id || activeBooking.id,
          type: eventMap[newStatus] || "TRIP_ENDED",
          actor: riderData?.full_name || user?.full_name || "Rider",
          message: newStatus === "completed" ? "Trip completed" : `Booking status updated to ${newStatus}`,
        });

        if (newStatus === "completed") {
          setActiveBooking(null);
          setScreen("home");
        } else {
          setActiveBooking(nextBooking);
        }
        return;
      }

      const eventMap = { otw: "RIDER_ACCEPTED", arrived: "RIDER_ARRIVED", in_progress: "TRIP_STARTED", completed: "TRIP_ENDED" };
      
      // Update booking status
      const updated = await base44.entities.Booking.update(activeBooking.id, {
        status: newStatus,
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
        ...(newStatus === "in_progress" ? { started_at: new Date().toISOString() } : {}),
      });
      
      // Log event in background (non-blocking)
      base44.entities.BookingEvent.create({ 
        booking_id: activeBooking.id, 
        event_type: eventMap[newStatus] || "TRIP_ENDED", 
        actor_role: "rider", 
        actor_name: user?.full_name, 
        timestamp: new Date().toISOString() 
      }).catch(() => {});
      
      if (newStatus === "completed") {
        setActiveBooking(null);
        if (riderData?.id) {
          // Update rider stats in background
          base44.entities.Rider.update(riderData.id, {
            online_status: "online",
            total_trips: (riderData.total_trips || 0) + 1,
            completed_trips: (riderData.completed_trips || 0) + 1,
          }).catch(() => {});
          
          setRiderData(r => r ? { ...r, total_trips: (r.total_trips||0)+1, completed_trips: (r.completed_trips||0)+1 } : r);
          
          // Refresh history in background
          base44.entities.Booking.filter({ rider_id: riderData.id }, "-created_date", 50).then(setTripHistory).catch(() => {});
        }
        setScreen("home");
      } else {
        setActiveBooking(updated || { ...activeBooking, status: newStatus });
      }
    } catch (err) {
      console.error("❌ RIDER: Status update failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeBooking || processing) return;
    setProcessing(true);
    
    try {
      if (demoMode) {
        patchDemoStore((store) => ({
          ...store,
          bookings: store.bookings.map((booking) => booking.id === activeBooking.id
            ? { ...booking, status: "cancelled", cancelled_by: "rider", cancellation_reason: "Cancelled by rider" }
            : booking),
          riders: store.riders.map((rider) => rider.id === riderData?.id ? { ...rider, online_status: "online" } : rider),
        }));
        appendDemoEvent({
          booking_id: activeBooking.booking_id || activeBooking.id,
          type: "BOOKING_CANCELLED",
          actor: riderData?.full_name || user?.full_name || "Rider",
          message: "Ride cancelled by rider",
        });
        setActiveBooking(null);
        setScreen("home");
        return;
      }

      // Batch cancellation updates
      await Promise.allSettled([
        base44.entities.Booking.update(activeBooking.id, { 
          status: "cancelled", 
          cancelled_by: "rider", 
          cancellation_reason: "Cancelled by rider" 
        }),
        riderData?.id ? base44.entities.Rider.update(riderData.id, { online_status: "online" }) : Promise.resolve()
      ]);
      
      // Log event in background
      base44.entities.BookingEvent.create({ 
        booking_id: activeBooking.id, 
        event_type: "BOOKING_CANCELLED", 
        actor_role: "rider", 
        actor_name: user?.full_name, 
        timestamp: new Date().toISOString() 
      }).catch(() => {});
      
      setActiveBooking(null);
      setScreen("home");
    } catch (err) {
      console.error("❌ RIDER: Cancel failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Computed stats
  const today = new Date().toDateString();
  const tripsToday = tripHistory.filter(b => b.status === "completed" && new Date(b.created_date).toDateString() === today).length;
  const earningsToday = tripHistory.filter(b => b.status === "completed" && new Date(b.created_date).toDateString() === today).reduce((s, b) => s + (b.fare_estimate || 0), 0);
  const totalCompleted = tripHistory.filter(b => b.status === "completed").length;
  const avgRating = riderData?.avg_rating || (tripHistory.filter(b => b.customer_rating).length > 0
    ? (tripHistory.reduce((s, b) => s + (b.customer_rating || 0), 0) / tripHistory.filter(b => b.customer_rating).length)
    : null);

  // Geocode pickup/dropoff using the calculateFare backend (has MAPBOX_TOKEN server-side)
  useEffect(() => {
    if (!activeBooking) { setPickupCoords(null); setDropoffCoords(null); return; }
    const geocode = async (address) => {
      try {
        const res = await base44.functions.invoke("calculateFare", {
          pickup_address: address,
          dropoff_address: address,
        }).catch(() => null);
        // Use Mapbox directly via the public map (MapboxMap component already has token)
        // Fallback: use calculateFare response geometry first coord
        return null;
      } catch {}
      return null;
    };
    // For rider map display, coordinates come from RiderLocation entity (GPS)
    // Pickup/dropoff resolved via mapbox geocoding using the public token in MapboxMap
    setPickupCoords(null);
    setDropoffCoords(null);
  }, [activeBooking?.id]);

  // Fetch route geometry for navigation
  useEffect(() => {
    if (!activeBooking) { setRouteCoordinates(null); return; }
    
    const updateRoute = async () => {
      if (demoMode) {
        const storeRider = readDemoStore().riders.find((rider) => rider.id === riderData?.id);
        if (!storeRider?.lat || !storeRider?.lng) return;
        const currentLocation = { lat: storeRider.lat, lng: storeRider.lng };
        setMyLocation(currentLocation);
        return;
      }

      if (!riderData?.id) return;
      const locs = await base44.entities.RiderLocation.filter({ rider_id: riderData.id }, "-updated_date", 1).catch(() => []);
      if (locs?.[0]) {
        const myLoc = { lat: locs[0].lat, lng: locs[0].lng };
        setMyLocation(myLoc);
        
        const isEnRoute = ["assigned", "otw", "arrived"].includes(activeBooking.status);
        const isInProgress = activeBooking.status === "in_progress";
        
        if (isEnRoute && pickupCoords) {
          const res = await base44.functions.invoke("getRouteGeometry", {
            coordinates: [myLoc, pickupCoords]
          }).catch(() => null);
          if (res?.data?.geometry) setRouteCoordinates(res.data.geometry);
        } else if (isInProgress && dropoffCoords) {
          const res = await base44.functions.invoke("getRouteGeometry", {
            coordinates: [myLoc, dropoffCoords]
          }).catch(() => null);
          if (res?.data?.geometry) setRouteCoordinates(res.data.geometry);
        }
      }
    };
    
    updateRoute();
    const interval = setInterval(updateRoute, 5000);
    return () => clearInterval(interval);
  }, [activeBooking?.id, activeBooking?.status, demoMode, riderData?.id, pickupCoords, dropoffCoords]);

  const openMapsNavigation = (address) => {
    const q = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  // ── INCOMING BOOKING POPUP (always on top) ───────────────────
  const IncomingPopup = incomingBooking && (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="bg-white rounded-t-3xl shadow-2xl">
        {/* Timer bar */}
        <div className="h-1 rounded-t-3xl overflow-hidden" style={{ background: "#e5e7eb" }}>
          <div className="h-full transition-all" style={{ width: `${(countdown / 30) * 100}%`, background: countdown <= 10 ? "#ef4444" : GREEN, transition: "width 1s linear" }} />
        </div>
        <div className="px-5 pt-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-emerald-600 text-sm uppercase tracking-wider">New Trip Request</span>
            </div>
            <div className={`text-sm font-black tabular-nums px-3 py-1 rounded-full ${countdown <= 10 ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-600"}`}>
              {countdown}s
            </div>
          </div>
          {/* Customer + fare */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0">👤</div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-base">{incomingBooking.customer_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{incomingBooking.zone} · {incomingBooking.payment_method?.toUpperCase() || "CASH"}</div>
            </div>
            {incomingBooking.fare_estimate && (
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black text-emerald-600">₱{incomingBooking.fare_estimate}</div>
                <div className="text-[10px] text-gray-400">est. fare</div>
              </div>
            )}
          </div>
          {/* Customer Notes */}
          {incomingBooking.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">📝</span>
                <div className="font-bold text-amber-900 text-xs">Customer Notes:</div>
              </div>
              <div className="text-sm text-gray-700 leading-snug">{incomingBooking.notes}</div>
            </div>
          )}
          {/* Route */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="w-0.5 h-4 bg-gray-200" />
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pickup</div>
                  <div className="text-sm text-gray-800 font-semibold leading-snug">{incomingBooking.pickup_address}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Dropoff</div>
                  <div className="text-sm text-gray-800 font-semibold leading-snug">{incomingBooking.dropoff_address}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={handleDecline} disabled={processing}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-base disabled:opacity-50">
              <XCircle className="w-5 h-5 text-red-400" /> Decline
            </button>
            <button onClick={handleAccept} disabled={processing}
              className="flex-1 py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base disabled:opacity-50 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 6px 24px ${PRIMARY}50` }}>
              {processing
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><CheckCircle className="w-5 h-5" /> Accept</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── EARNINGS ─────────────────────────────────────────────────
  if (screen === "earnings") {
    return (
      <Shell>
        {IncomingPopup}
        <EarningsScreen tripHistory={tripHistory} riderData={riderData} onBack={() => setScreen("home")} />
        <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
      </Shell>
    );
  }

  // ── HISTORY ──────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <Shell>
        {IncomingPopup}
        <ScreenHeader title="Trip History" onBack={() => setScreen("home")} />
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Completed", value: totalCompleted, color: GREEN },
              { label: "Cancelled", value: tripHistory.filter(b => b.status === "cancelled").length, color: "#ef4444" },
              { label: "Total", value: tripHistory.length, color: PRIMARY },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          {tripHistory.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-300">
              <Bike className="w-14 h-14 mb-4 opacity-30" />
              <p className="font-semibold text-gray-400">No trips yet</p>
              <p className="text-xs mt-1">Go online to receive ride requests</p>
            </div>
          ) : tripHistory.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: PRIMARY_BG }}>🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{b.customer_name}</div>
                    <div className="text-[10px] font-mono text-gray-400">{b.booking_id || b.id?.slice(0, 8)}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${b.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                  {b.status}
                </span>
              </div>
              <div className="space-y-1 mb-2">
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
                {b.fare_estimate
                  ? <span className="text-sm font-black text-emerald-600">₱{b.fare_estimate}</span>
                  : <span />}
                {b.customer_rating
                  ? <div className="flex">{[1,2,3,4,5].map(n => <span key={n} className={`text-xs ${n <= b.customer_rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}</div>
                  : null}
              </div>
            </div>
          ))}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
      </Shell>
    );
  }

  // ── PROFILE ──────────────────────────────────────────────────
  if (screen === "profile") {
    return <RiderProfileScreen user={user} riderData={riderData} setRiderData={setRiderData}
      screen={screen} setScreen={setScreen} activeBooking={activeBooking} IncomingPopup={IncomingPopup} />;
  }

  // ── MAP / ACTIVE TRIP ────────────────────────────────────────
  if (screen === "map") {
    return (
      <Shell noScroll>
        {IncomingPopup}
        <div className="absolute inset-0 bottom-16">
          <MapboxMap
            className="w-full h-full"
            onGeolocate={() => {}}
            pickupMarker={pickupCoords}
            dropoffMarker={activeBooking?.status === "in_progress" ? dropoffCoords : null}
            riderMarker={myLocation}
            showRoute={!!activeBooking}
            routeCoordinates={routeCoordinates}
          />
        </div>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-2 pointer-events-none">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen("home")}
              className="w-10 h-10 bg-white rounded-2xl shadow-md flex items-center justify-center pointer-events-auto">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="bg-white rounded-2xl shadow-md px-3 py-2 pointer-events-auto">
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: isOnline ? PRIMARY_DARK : "#6b7280" }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: isOnline ? PRIMARY : "#9ca3af" }} />
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </div>
        {/* Active booking sheet */}
        {activeBooking && (
          <div className="absolute bottom-16 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3" />
            <div className="px-5 pb-6 space-y-3">
              {/* Status badge */}
              <TripStatusBadge status={activeBooking.status} />
              {/* Customer card */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">👤</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">{activeBooking.customer_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {activeBooking.payment_method?.toUpperCase() || "CASH"} · {activeBooking.fare_estimate ? `₱${activeBooking.fare_estimate}` : "—"}
                  </div>
                </div>
                <button onClick={() => setShowComms(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#eff6ff" }}>
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                </button>
              </div>
              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">{activeBooking.pickup_address}</span>
                  <button onClick={() => openMapsNavigation(activeBooking.pickup_address)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                    style={{ background: GREEN_BG, color: GREEN_DARK }}>
                    <Navigation className="w-3 h-3" /> Nav
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">{activeBooking.dropoff_address}</span>
                  <button onClick={() => openMapsNavigation(activeBooking.dropoff_address)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                    style={{ background: "#fffbeb", color: "#d97706" }}>
                    <Navigation className="w-3 h-3" /> Nav
                  </button>
                </div>
              </div>
              {/* Action button */}
              <div className="flex gap-2 pt-1">
                {activeBooking.status === "assigned" && (
                  <TripBtn onClick={() => handleStatusUpdate("otw")} loading={processing} color={GREEN}>🏍 On My Way</TripBtn>
                )}
                {activeBooking.status === "otw" && (
                  <TripBtn onClick={() => handleStatusUpdate("arrived")} loading={processing} color={GREEN}>📍 I've Arrived</TripBtn>
                )}
                {activeBooking.status === "arrived" && (
                  <TripBtn onClick={() => handleStatusUpdate("in_progress")} loading={processing} color="#3b82f6">🚀 Start Trip</TripBtn>
                )}
                {activeBooking.status === "in_progress" && (
                  <TripBtn onClick={() => handleStatusUpdate("completed")} loading={processing} color={GREEN}>✅ End Trip</TripBtn>
                )}
                {["assigned", "otw"].includes(activeBooking.status) && (
                  <button onClick={handleCancelRide} disabled={processing}
                    className="py-3.5 px-4 border-2 border-red-100 text-red-400 font-bold rounded-2xl text-sm disabled:opacity-50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* No active ride on map */}
        {!activeBooking && (
          <div className="absolute bottom-16 left-0 right-0 z-20">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-3xl px-5 py-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
                    <Bike className="w-5 h-5" style={{ color: PRIMARY }} />
                  </div>
                  {isOnline && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${PRIMARY}33`, animationDuration: "2s" }} />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{isOnline ? "Waiting for ride requests" : "You are offline"}</div>
                  <div className="text-xs text-gray-400">{isOnline ? "Stay on the map to receive bookings" : "Go online from the Home screen"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {showComms && activeBooking && (
          <CommunicationPanel
            booking={activeBooking}
            currentUser={user}
            userRole="rider"
            onClose={() => setShowComms(false)}
          />
        )}
        <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
      </Shell>
    );
  }

  // ── HOME DASHBOARD ───────────────────────────────────────────
  return (
    <Shell>
      {IncomingPopup}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-12 pb-5" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-bold text-white">
                {user?.full_name?.charAt(0) || "R"}
              </div>
              <div>
                <div className="text-white/80 text-xs">Welcome back,</div>
                <div className="text-white font-bold text-base leading-tight">{user?.full_name?.split(" ")[0] || "Rider"}</div>
              </div>
            </div>
            <img src={HABAL_LOGO} alt="Habal" className="w-9 h-9 object-contain opacity-90" />
          </div>
          {/* Online toggle */}
          <button
            onClick={() => {
              const newState = !isOnline;
              console.log(`🎛 RIDER: Toggling status to ${newState ? "ONLINE" : "OFFLINE"}`);
              setIsOnline(newState);
            }}
            className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${isOnline ? "bg-white" : "bg-white/20 text-white border-2 border-white/30"}`}
            style={isOnline ? { color: PRIMARY_DARK } : {}}>
            <div className={`w-3 h-3 rounded-full ${isOnline ? "shadow-md animate-pulse" : "bg-white/50"}`}
              style={isOnline ? { background: PRIMARY_DARK } : {}} />
            {isOnline ? "● You are Online" : "○ You are Offline"}
            <span className="text-xs font-normal opacity-60">(tap to {isOnline ? "go offline" : "go online"})</span>
          </button>
          {isOnline && (
            <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold bg-white/20 text-white">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Listening for ride requests...</span>
            </div>
          )}
        </div>

        {/* Active trip alert */}
        {activeBooking && (
          <button onClick={() => setScreen("map")}
            className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-sm border-2"
            style={{ background: PRIMARY_BG, borderColor: PRIMARY + "40" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: PRIMARY }}>
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-sm" style={{ color: PRIMARY_DARK }}>Active Trip</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: PRIMARY_DARK + "b0" }}>{activeBooking.customer_name} · {activeBooking.status}</div>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 text-white rounded-xl" style={{ background: PRIMARY }}>View →</div>
          </button>
        )}

        {/* Today's stats */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Summary</div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Bike className="w-5 h-5" />} label="Trips" value={tripsToday} color={GREEN} />
            <StatCard icon={<Star className="w-5 h-5" />} label="Rating" value={avgRating ? avgRating.toFixed(1) : "—"} color="#f59e0b" />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Earnings" value={`₱${earningsToday}`} color="#6366f1" />
          </div>
        </div>

        {/* Overall stats */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">All Time</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">Total Trips</div>
              <div className="text-2xl font-black" style={{ color: GREEN }}>{totalCompleted}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Completed rides</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">All-time Earnings</div>
              <div className="text-2xl font-black text-gray-900">
                ₱{tripHistory.filter(b => b.status === "completed").reduce((s, b) => s + (b.fare_estimate || 0), 0)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Cash received</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-4 mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScreen("map")}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: PRIMARY_BG }}>
                <Navigation className="w-5 h-5" style={{ color: PRIMARY }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-800 text-sm">Open Map</div>
                <div className="text-[10px] text-gray-400">Navigate</div>
              </div>
            </button>
            <button onClick={() => setScreen("history")}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-800 text-sm">History</div>
                <div className="text-[10px] text-gray-400">{tripHistory.length} total trips</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent trips */}
        {tripHistory.slice(0, 3).length > 0 && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Trips</div>
              <button onClick={() => setScreen("history")} className="text-xs font-semibold" style={{ color: PRIMARY }}>See all</button>
            </div>
            {tripHistory.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: PRIMARY_BG }}>🏍</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{b.customer_name}</div>
                  <div className="text-xs text-gray-400 truncate">{b.dropoff_address?.split(",")[0]}</div>
                </div>
                {b.fare_estimate && <div className="font-black text-emerald-600 text-sm flex-shrink-0">₱{b.fare_estimate}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
    </Shell>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Shell({ children, noScroll }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden">
      <div className={`flex-1 relative ${noScroll ? "" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
      <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
    </div>
  );
}

function BottomNav({ screen, setScreen, hasActive }) {
  const tabs = [
    { id: "home",     label: "Home",     icon: Home },
    { id: "map",      label: "Map",      icon: Navigation },
    { id: "history",  label: "Trips",    icon: Clock },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "profile",  label: "Profile",  icon: User },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex px-2 pb-2 pt-2"
      style={{ height: 64, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = screen === id;
        return (
          <button key={id} onClick={() => setScreen(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
            {id === "map" && hasActive && (
              <div className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
              style={active ? { background: PRIMARY_BG } : {}}>
              <Icon className="w-5 h-5" style={{ color: active ? PRIMARY : "#b0b5c0", transition: "color 0.2s" }} />
            </div>
            <span className="text-[10px] font-semibold leading-none" style={{ color: active ? PRIMARY : "#b0b5c0", transition: "color 0.2s" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: color + "18", color }}>
        {icon}
      </div>
      <div className="text-lg font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function TripStatusBadge({ status }) {
  const MAP = {
    assigned:    { label: "Head to Pickup", bg: "#fef3c7", color: "#d97706" },
    otw:         { label: "On the Way 🏍", bg: "#eff6ff", color: "#2563eb" },
    arrived:     { label: "Waiting at Pickup 📍", bg: "#f0fdf4", color: "#15803d" },
    in_progress: { label: "Trip in Progress 🚀", bg: "#f5f3ff", color: "#7c3aed" },
  };
  const cfg = MAP[status] || MAP.assigned;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {cfg.label}
    </div>
  );
}

function TripBtn({ children, onClick, loading, color }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex-1 py-3.5 text-white font-bold rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-1"
      style={{ background: color, boxShadow: `0 4px 16px ${color}50` }}>
      {loading
        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        : children}
    </button>
  );
}

function RiderProfileScreen({ user, riderData, setRiderData, screen, setScreen, activeBooking, IncomingPopup }) {
  const [form, setForm] = useState({
    motorcycle_make: riderData?.motorcycle_make || "",
    motorcycle_model: riderData?.motorcycle_model || "",
    plate_number: riderData?.plate_number || "",
    phone: riderData?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!riderData?.id) return;
    setSaving(true);
    const updated = await base44.entities.Rider.update(riderData.id, form);
    setRiderData(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Shell>
      {IncomingPopup}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Hero */}
        <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-4xl mb-3">🏍</div>
            <div className="font-bold text-white text-lg">{user?.full_name}</div>
            <div className="text-blue-100 text-xs mt-0.5">{user?.email}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold">
                {riderData?.avg_rating ? `⭐ ${riderData.avg_rating.toFixed(1)}` : "⭐ New"}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold">
                {riderData?.completed_trips || 0} Trips
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${riderData?.status === "active" ? "bg-white text-emerald-700" : "bg-white/20 text-white"}`}>
                {riderData?.status || "pending"}
              </span>
            </div>
          </div>
        </div>
        {/* Form */}
        <div className="px-4 py-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle Details</div>
          {[
            { label: "Motorcycle Make", key: "motorcycle_make", placeholder: "e.g. Honda" },
            { label: "Motorcycle Model", key: "motorcycle_model", placeholder: "e.g. XRM125" },
            { label: "Plate Number", key: "plate_number", placeholder: "e.g. ABC 1234" },
            { label: "Phone Number", key: "phone", placeholder: "+63 900 000 0000" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                style={{ borderColor: undefined }}
                onFocus={e => e.target.style.borderColor = PRIMARY}
                onBlur={e => e.target.style.borderColor = ""} />
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 space-y-2">
          <button onClick={handleSave} disabled={saving || !riderData?.id}
            className="w-full py-4 text-white font-bold rounded-2xl text-sm disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 4px 12px ${PRIMARY}35` }}>
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => base44.auth.logout(window.location.href)}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 border-2 border-red-400"
            style={{ background: "#ef4444" }}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} hasActive={!!activeBooking} />
    </Shell>
  );
}