import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DEMO_EVENT, appendDemoEvent, getDemoRiderLocations, isDemoMode, patchDemoStore, readDemoStore } from "@/lib/demoStore";
import {
  MapPin, X, ChevronLeft, ChevronRight, Bike, User, Clock,
  Wallet, Star, LogOut, MessageCircle, Home, Phone, Shield,
  Bell, Settings, ChevronDown, Plus, Check,
  Navigation, Send, CreditCard, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import MapboxMap from "./MapboxMap";
import { useToast, ToastContainer } from "./ToastNotification";
import ChatPanel from "../chat/ChatPanel";
import CommunicationPanel from "../booking/CommunicationPanel";
import WalletScreen from "../customer/WalletScreen.jsx";
import SupportScreen from "../customer/SupportScreen";
import NotificationsPanel from "../customer/NotificationsPanel";
import LiveRideMap from "../customer/LiveRideMap";
import ScheduleRideModal from "../customer/ScheduleRideModal";
import ScheduledRidesTab from "../customer/ScheduledRidesTab";
import RideDetailModal from "../customer/RideDetailModal";

// Mapbox token is stored server-side. MapboxMap component reads from env.
// For client-side geocoding we use the public token only for display (MapboxMap handles it).
// Fare calculation and ETA now go through the secure backend function.
import { COLORS, SHADOWS, RADIUS } from "../shared/AppleDesignTokens";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;
// Public Mapbox token used ONLY for client-side map display (MapboxMap component)
const MAPBOX_PUBLIC = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN || "";

// ── Utilities ─────────────────────────────────────────────────
async function reverseGeocode(lng, lat) {
  if (!MAPBOX_PUBLIC) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (data?.display_name) return data.display_name;
    } catch {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_PUBLIC}&limit=1&types=address,poi`);
    const data = await res.json();
    if (data.features?.length) return data.features[0].place_name;
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function forwardGeocode(query) {
  if (!MAPBOX_PUBLIC) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=ph&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map((item) => ({
        place_name: item.display_name,
        center: [Number(item.lon), Number(item.lat)],
        place_type: item.type || "place",
      }));
    } catch {}
    return [];
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_PUBLIC,
      limit: 8,
      types: "poi,address,place,neighborhood,locality",
      country: "PH",
      bbox: "121.8,10.3,122.9,11.8",
      proximity: "122.5654,10.7202",
      language: "en",
    });
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`);
    const data = await res.json();
    return data.features?.map(f => ({
      place_name: f.place_name,
      center: f.center,
      place_type: f.place_type?.[0],
    })) || [];
  } catch {}
  return [];
}

// Real fare calculation via backend (uses MAPBOX_TOKEN server-side + distance/time formula)
async function calculateRealFare(pickupCoords, dropoffCoords, pickupAddress, dropoffAddress) {
  try {
    const res = await base44.functions.invoke("calculateFare", {
      pickup_coords: pickupCoords,
      dropoff_coords: dropoffCoords,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
    });
    return res?.data || null;
  } catch {}
  return null;
}

async function fetchETAMinutes(fromLng, fromLat, toLng, toLat) {
  try {
    const res = await base44.functions.invoke("calculateFare", {
      pickup_coords: { lng: fromLng, lat: fromLat },
      dropoff_coords: { lng: toLng, lat: toLat },
    });
    return res?.data?.breakdown?.duration_min != null
      ? Math.max(1, Math.round(res.data.breakdown.duration_min))
      : null;
  } catch {}
  return null;
}

function detectZone(address) {
  const a = (address || "").toLowerCase();
  if (a.includes("jaro")) return "Jaro";
  if (a.includes("mandurriao")) return "Mandurriao";
  if (a.includes("la paz") || a.includes("lapaz")) return "La Paz";
  if (a.includes("arevalo")) return "Arevalo";
  if (a.includes("city proper") || a.includes("iloilo city")) return "City Proper";
  return "City Proper";
}

// ── Main Component ────────────────────────────────────────────
export default function CustomerHome({ user }) {
  const demoMode = isDemoMode();
  // screen: map | search | confirm | searching | active | rate | history | wallet | messages | profile | saved | support
  const [screen, setScreen] = useState("map");
  const [bookings, setBookings] = useState([]);
  const { toasts, addToast, dismiss } = useToast();
  const prevStatusRef = useRef(null);

  // Booking
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [fareEstimate, setFareEstimate] = useState(null);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const etaTargetRef = useRef(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(null); // ISO string when scheduling
  // Pin placement: "pickup" | "dropoff" | null
  const [pinMode, setPinMode] = useState(null);
  const [fareLoading, setFareLoading] = useState(false);
  const fareDebounceRef = useRef(null);
  const [historyTab, setHistoryTab] = useState("history");
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingNotes, setBookingNotes] = useState(""); // Customer notes for rider
  const [showComms, setShowComms] = useState(false); // Communication panel



  // Saved locations — persisted in DB via SavedLocation entity
  const [savedLocations, setSavedLocations] = useState([]);
  const [addingLocation, setAddingLocation] = useState(false);
  const [newLocForm, setNewLocForm] = useState({ label: "", address: "", icon: "📍" });

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      const syncFromStore = () => {
        const store = readDemoStore();
        const customerBookings = (store.bookings || []).filter((booking) => booking.customer_phone === user.email);
        const active = customerBookings.find((booking) => ["pending", "searching", "assigned", "otw", "arrived", "in_progress"].includes(booking.status)) || null;
        setBookings(customerBookings);
        if (active) {
          setActiveRide(active);
          setScreen((prev) => (prev === "map" || prev === "confirm" || prev === "searching" ? "active" : prev));
        }
      };

      syncFromStore();
      window.addEventListener(DEMO_EVENT, syncFromStore);
      return () => window.removeEventListener(DEMO_EVENT, syncFromStore);
    }

    // Use email as consistent identifier for demo accounts
    const customerIdentifier = user.email;
    base44.entities.Booking.filter({ customer_phone: customerIdentifier }, "-created_date", 20).then(setBookings).catch(() => {});
    base44.entities.Booking.filter({ customer_phone: customerIdentifier }, "-created_date", 5).then(async rows => {
      const active = rows?.find(b => ["pending", "searching", "assigned", "otw", "arrived", "in_progress"].includes(b.status));
      if (active) { setActiveRide(active); setScreen("active"); }
    });
    // Load saved locations from DB
    base44.entities.SavedLocation.filter({ user_email: customerIdentifier }, "-created_date", 20)
      .then(locs => { if (locs?.length) setSavedLocations(locs); })
      .catch(() => {});
  }, [demoMode, user]);

  // Enhanced real-time tracking with 2s polling during active rides
  useEffect(() => {
    if (!activeRide?.id || !["searching", "assigned", "otw", "arrived", "in_progress"].includes(activeRide.status)) return;
    if (demoMode) {
      const syncRide = () => {
        const store = readDemoStore();
        const updated = (store.bookings || []).find((booking) => booking.id === activeRide.id || booking.booking_id === activeRide.booking_id);
        if (!updated) return;

        if (updated.rider_id) {
          const loc = getDemoRiderLocations(store).find((entry) => entry.rider_id === updated.rider_id);
          if (loc) {
            const point = { lat: loc.lat, lng: loc.lng, heading: loc.heading || 0, speed: loc.speed || 0 };
            setRiderLocation(point);
          }
        }

        if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
          const msgs = {
            assigned:    { type: "rider",    title: "Rider Assigned! 🏍", message: `${updated.rider_name} is on the way` },
            otw:         { type: "rider",    title: "Rider On The Way", message: `${updated.rider_name} is heading to you` },
            arrived:     { type: "location", title: "Rider Arrived! 📍", message: "Your rider is waiting at pickup" },
            in_progress: { type: "info",     title: "Trip Started 🚀", message: "Enjoy your ride!" },
            completed:   { type: "success",  title: "Trip Completed ✅", message: "Please rate your rider" },
            cancelled:   { type: "alert",    title: "Ride Cancelled", message: "Your booking was cancelled" },
          };
          if (msgs[updated.status]) addToast(msgs[updated.status]);
          if (updated.status === "in_progress" && dropoffCoords) etaTargetRef.current = dropoffCoords;
        }

        prevStatusRef.current = updated.status;
        setActiveRide(updated);
        if (updated.status === "completed") setScreen("rate");
        if (updated.status === "cancelled") { setActiveRide(null); setScreen("map"); }
      };

      syncRide();
      window.addEventListener(DEMO_EVENT, syncRide);
      return () => window.removeEventListener(DEMO_EVENT, syncRide);
    }
    
    const pollInterval = ["assigned", "otw", "arrived", "in_progress"].includes(activeRide.status) ? 2000 : 4000;
    
    const interval = setInterval(async () => {
      const rows = await base44.entities.Booking.filter({ booking_id: activeRide.booking_id }, "-created_date", 1);
      const updated = rows?.[0];
      if (!updated) return;

      if (updated.rider_id) {
        const locs = await base44.entities.RiderLocation.filter({ rider_id: updated.rider_id }, "-updated_date", 1).catch(() => []);
        if (locs?.[0]) {
          const loc = { 
            lat: locs[0].lat, 
            lng: locs[0].lng,
            heading: locs[0].heading || 0,
            speed: locs[0].speed || 0
          };
          setRiderLocation(loc);
          const isEnRoutePickup = ["assigned", "otw", "arrived"].includes(updated.status);
          const isInProgress = updated.status === "in_progress";
          const target = etaTargetRef.current;
          if (target && (isEnRoutePickup || isInProgress)) {
            const mins = await fetchETAMinutes(loc.lng, loc.lat, target.lng, target.lat);
            if (mins != null) setEta({ minutes: mins, label: isInProgress ? "to destination" : "to pickup" });
          } else if (!isEnRoutePickup && !isInProgress) {
            setEta(null);
          }
        }
      }

      if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
        const msgs = {
          assigned:    { type: "rider",    title: "Rider Assigned! 🏍", message: `${updated.rider_name} is on the way` },
          otw:         { type: "rider",    title: "Rider On The Way", message: `${updated.rider_name} is heading to you` },
          arrived:     { type: "location", title: "Rider Arrived! 📍", message: "Your rider is waiting at pickup" },
          in_progress: { type: "info",     title: "Trip Started 🚀", message: "Enjoy your ride!" },
          completed:   { type: "success",  title: "Trip Completed ✅", message: "Please rate your rider" },
          cancelled:   { type: "alert",    title: "Ride Cancelled", message: "Your booking was cancelled" },
        };
        if (msgs[updated.status]) addToast(msgs[updated.status]);
        if (updated.status === "in_progress" && dropoffCoords) etaTargetRef.current = dropoffCoords;
      }
      prevStatusRef.current = updated.status;
      setActiveRide(updated);
      if (updated.status === "completed") { setScreen("rate"); clearInterval(interval); }
      if (updated.status === "cancelled") { setActiveRide(null); setScreen("map"); clearInterval(interval); }
    }, pollInterval);
    return () => clearInterval(interval);
  }, [activeRide?.booking_id, activeRide?.id, activeRide?.status, demoMode, dropoffCoords]);

  const handleGeolocate = useCallback(async (lng, lat) => {
    const coords = { lng, lat };
    setPickupCoords(coords);
    const addr = await reverseGeocode(lng, lat);
    setPickup(addr);
    setPickupInput(addr);
  }, []);

  const [searchMode, setSearchMode] = useState("dropoff"); // "pickup" | "dropoff"
  const [pickupInput, setPickupInput] = useState("");

  const handleDropoffChange = useCallback((value) => {
    setDropoffInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) setSuggestions(await forwardGeocode(value));
      else setSuggestions([]);
    }, 350);
  }, []);

  const handlePickupInputChange = useCallback((value) => {
    setPickupInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) setSuggestions(await forwardGeocode(value));
      else setSuggestions([]);
    }, 350);
  }, []);

  // Recalculate fare whenever both coords are known (debounced)
  const triggerFareCalc = useCallback((pCoords, dCoords, pAddr, dAddr) => {
    if (!pCoords || !dCoords) return;
    if (fareDebounceRef.current) clearTimeout(fareDebounceRef.current);
    setFareLoading(true);
    setFareEstimate(null);
    fareDebounceRef.current = setTimeout(async () => {
      const fareData = await calculateRealFare(pCoords, dCoords, pAddr, dAddr);
      setFareLoading(false);
      setFareEstimate(fareData?.fare || 40);
    }, 400);
  }, []);

  const selectSuggestion = useCallback(async (s) => {
    const coords = { lng: s.center[0], lat: s.center[1] };
    setSuggestions([]);
    if (searchMode === "pickup") {
      setPickup(s.place_name);
      setPickupInput(s.place_name);
      setPickupCoords(coords);
      setSearchMode("dropoff");
      // If dropoff already set, recalculate
      if (dropoffCoords) {
        triggerFareCalc(coords, dropoffCoords, s.place_name, dropoff);
      }
    } else {
      setDropoff(s.place_name);
      setDropoffInput(s.place_name);
      setDropoffCoords(coords);
      setFareEstimate(null);
      setScreen("confirm");
      triggerFareCalc(pickupCoords, coords, pickup, s.place_name);
    }
  }, [searchMode, pickupCoords, dropoffCoords, pickup, dropoff, triggerFareCalc]);

  // Handle pin placement from map
  const handlePinPlaced = useCallback(async ({ lng, lat, address }) => {
    if (pinMode === "pickup") {
      setPickup(address);
      setPickupInput(address);
      setPickupCoords({ lng, lat });
      setPinMode(null);
      if (dropoffCoords) triggerFareCalc({ lng, lat }, dropoffCoords, address, dropoff);
    } else if (pinMode === "dropoff") {
      setDropoff(address);
      setDropoffInput(address);
      setDropoffCoords({ lng, lat });
      setPinMode(null);
      setScreen("confirm");
      triggerFareCalc(pickupCoords, { lng, lat }, pickup, address);
    }
  }, [pinMode, pickupCoords, dropoffCoords, pickup, dropoff, triggerFareCalc]);

  const handleRepeatRide = async (b) => {
    setPickup(b.pickup_address);
    setDropoff(b.dropoff_address);
    setDropoffInput(b.dropoff_address);
    setPaymentMethod(b.payment_method || "cash");
    setFareEstimate(b.fare_estimate || null);
    setScreen("confirm");
    // Recalculate fare
    const fareData = await calculateRealFare(pickupCoords, null, b.pickup_address, b.dropoff_address);
    if (fareData?.fare) setFareEstimate(fareData.fare);
    else setFareEstimate(b.fare_estimate || 40);
  };

  const handleBook = async (isScheduled = false) => {
    if (!pickup || !dropoff || booking) return;
    setBooking(true);
    const bookingId = "BK-" + Date.now().toString(36).toUpperCase();
    const detectedZone = detectZone(pickup);
    if (demoMode) {
      const bookingRecord = {
        id: `demo-booking-${Date.now().toString(36)}`,
        booking_id: bookingId,
        customer_name: user?.full_name || "Passenger",
        customer_phone: user?.email || "",
        pickup_address: pickup,
        dropoff_address: dropoff,
        zone: detectedZone,
        status: isScheduled ? "scheduled" : "pending",
        payment_method: paymentMethod,
        fare_estimate: fareEstimate,
        notes: bookingNotes.trim() || null,
        ...(isScheduled && scheduledAt ? { is_scheduled: true, scheduled_at: scheduledAt } : {}),
        network_id: "demo-network",
        network_name: "Demo Network",
        is_demo_data: true,
        created_date: new Date().toISOString(),
      };

      patchDemoStore((store) => ({
        ...store,
        bookings: [bookingRecord, ...store.bookings].slice(0, 100),
        stats: { ...store.stats, bookings: store.stats.bookings + 1 },
      }));
      appendDemoEvent({
        booking_id: bookingRecord.booking_id,
        type: "BOOKING_CREATED",
        actor: user?.full_name || "Passenger",
        message: `New booking from ${pickup} to ${dropoff}`,
      });

      setBooking(false);
      setScheduledAt(null);
      if (isScheduled) {
        addToast({ type: "success", title: "Ride Scheduled! 🗓", message: "Your ride has been booked for later." });
        setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
        setScreen("map");
        return;
      }

      setActiveRide(bookingRecord);
      if (pickupCoords) etaTargetRef.current = pickupCoords;
      setScreen("searching");
      setTimeout(() => setScreen(prev => prev === "searching" ? "active" : prev), 800);
      return;
    }

    const b = await base44.entities.Booking.create({
      booking_id: bookingId,
      customer_name: user?.full_name || "Passenger",
      customer_phone: user?.email || "",
      pickup_address: pickup,
      dropoff_address: dropoff,
      zone: detectedZone,
      status: isScheduled ? "scheduled" : "pending",
      payment_method: paymentMethod,
      fare_estimate: fareEstimate,
      notes: bookingNotes.trim() || null, // Add customer notes
      ...(isScheduled && scheduledAt ? { is_scheduled: true, scheduled_at: scheduledAt } : {}),
    });
    await base44.entities.BookingEvent.create({
      booking_id: b.id, event_type: "BOOKING_CREATED",
      actor_role: "customer", actor_name: user?.full_name || "Passenger",
      timestamp: new Date().toISOString(),
    });
    setBooking(false);
    setScheduledAt(null);
    if (isScheduled) {
      addToast({ type: "success", title: "Ride Scheduled! 🗓", message: "Your ride has been booked for later." });
      setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
      setScreen("map");
      return;
    }
    // CRITICAL VALIDATION: Ensure booking object is complete before dispatch
    if (!b || !b.id || !b.pickup_address || !b.dropoff_address || !b.customer_name || !b.status) {
      console.error("❌ DISPATCH ABORTED: Invalid booking object", { booking: b });
      setBooking(false);
      addToast({ type: "alert", title: "Booking Error", message: "Unable to create booking. Please try again." });
      return;
    }
    
    console.log("✅ BOOKING VALIDATED:", {
      db_id: b.id,
      booking_id: bookingId,
      zone: detectedZone,
      pickup: b.pickup_address,
      dropoff: b.dropoff_address,
      customer: b.customer_name,
      status: b.status
    });
    
    setActiveRide(b);
    if (pickupCoords) etaTargetRef.current = pickupCoords;
    setScreen("searching");
    
    // DISPATCH ENGINE: Trigger rider matching with validated booking
    console.log("🚀 DISPATCH: Starting rider matching engine", { db_id: b.id, booking_id: bookingId, zone: detectedZone });
    
    // Step 1: Notify eligible riders
    base44.functions.invoke("notifyRidersOfBooking", { booking_id: b.id }).catch(err => {
      console.error("❌ DISPATCH FAILED: notifyRidersOfBooking", err);
    });
    
    // Step 2: Match to best rider using Uber-style algorithm
    base44.functions.invoke("matchRider", { booking_id: b.id }).catch(err => {
      console.error("❌ DISPATCH FAILED: matchRider", err);
    });
    
    setTimeout(() => setScreen(prev => prev === "searching" ? "active" : prev), 5000);
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    if (demoMode) {
      patchDemoStore((store) => ({
        ...store,
        bookings: store.bookings.map((booking) => booking.id === activeRide.id
          ? { ...booking, status: "cancelled", cancelled_by: "customer", cancellation_reason: "Cancelled by customer" }
          : booking),
      }));
      appendDemoEvent({
        booking_id: activeRide.booking_id || activeRide.id,
        type: "BOOKING_CANCELLED",
        actor: user?.full_name || "Customer",
        message: "Ride cancelled by customer",
      });
      setActiveRide(null);
      setShowCancelConfirm(false);
      setScreen("map");
      setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
      return;
    }

    await base44.entities.Booking.update(activeRide.id, { status: "cancelled", cancelled_by: "customer", cancellation_reason: "Cancelled by customer" });
    await base44.entities.BookingEvent.create({
      booking_id: activeRide.booking_id || activeRide.id,
      event_type: "BOOKING_CANCELLED",
      actor_role: "customer", actor_name: user?.full_name || "Customer",
      details: "Cancelled by customer",
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    setActiveRide(null);
    setShowCancelConfirm(false);
    setScreen("map");
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    if (activeRide?.id && rating > 0) {
      if (demoMode) {
        patchDemoStore((store) => ({
          ...store,
          bookings: store.bookings.map((booking) => booking.id === activeRide.id ? { ...booking, customer_rating: rating } : booking),
        }));
      } else {
      await base44.functions.invoke("recordRating", {
        booking_id: activeRide.booking_id || activeRide.id,
        rating,
        comment: "",
      }).catch(async () => {
        // fallback: direct update
        await base44.entities.Booking.update(activeRide.id, { customer_rating: rating }).catch(() => {});
      });
      }
    }
    setSubmittingRating(false);
    setActiveRide(null); setRating(0);
    setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
    if (!demoMode) {
      base44.entities.Booking.filter({ customer_phone: user.email }, "-created_date", 20).then(setBookings);
    }
    setScreen("map");
  };

  // sendSupportMessage is unused — support is handled by SupportScreen component directly

  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JD";
  const completedRides = bookings.filter(b => b.status === "completed").length;
  const navScreens = ["map", "history", "wallet", "messages", "profile"];
  const showNav = navScreens.includes(screen);

  // ── RATE ────────────────────────────────────────────────────
  if (screen === "rate") {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 fade-in">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ background: PRIMARY_BG }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#d0ecf9" }}>
                <span className="text-5xl">🎉</span>
              </div>
            </div>
            <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500 shadow-lg">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Trip completed!</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Rate your experience to help us improve</p>
          {activeRide?.fare_estimate && (
            <div className="px-4 py-2 rounded-full mb-6 text-sm font-bold text-center" style={{ background: PRIMARY_BG, color: PRIMARY_DARK }}>
              Fare: ₱{activeRide.fare_estimate}
            </div>
          )}
          {activeRide?.rider_name && (
            <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ background: PRIMARY_BG }}>🏍</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Your rider</div>
                </div>
              </div>
            </div>
          )}
          <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Rate this ride</div>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all"
                  style={n <= rating ? { background: PRIMARY, color: "white", boxShadow: `0 4px 12px ${PRIMARY}60` } : { background: "#f3f4f6", color: "#9ca3af" }}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="w-full space-y-3">
            <button onClick={handleSubmitRating} disabled={submittingRating}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 4px 12px ${PRIMARY}40` }}>
              {submittingRating ? "Submitting..." : rating > 0 ? "Submit Rating" : "Skip for Now"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── SUPPORT ──────────────────────────────────────────────────
  if (screen === "support") {
    return (
      <Shell>
        <SupportScreen user={user} onBack={() => setScreen("profile")} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────
  if (screen === "notifications") {
    return (
      <Shell>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
          <button onClick={() => setScreen("map")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Notifications</h1>
        </div>
        <NotificationsPanel user={user} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
        {showChat && activeRide && (
          <ChatPanel
            bookingId={activeRide.booking_id || activeRide.id}
            currentUser={user}
            senderRole="customer"
            onClose={() => setShowChat(false)}
          />
        )}
      </Shell>
    );
  }

  // ── MESSAGES ─────────────────────────────────────────────────
  if (screen === "messages") {
    const rideWithRider = bookings.find(b => b.rider_name && ["assigned","otw","arrived","in_progress","completed"].includes(b.status));
    return (
      <Shell>
        <ScreenHeader title="Messages" />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
          {/* Support */}
          <button onClick={() => setScreen("support")}
            className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-all mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: PRIMARY_BG }}>
              🛡️
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 text-sm">Habal Support</div>
              <div className="text-xs text-gray-500 mt-0.5">Get help anytime</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
          {/* Active ride chat */}
          {rideWithRider && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-3">Active Ride</div>
              <button onClick={() => { setActiveRide(rideWithRider); setShowChat(true); }}
                className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: "#f0fdf4" }}>
                  🏍
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 text-sm">{rideWithRider.rider_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Tap to chat with your rider</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            </div>
          )}
          {!rideWithRider && (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <MessageCircle className="w-14 h-14 mb-4 opacity-30" />
              <p className="font-medium text-gray-500">No active chats</p>
              <p className="text-xs mt-1 text-gray-400">Messages appear when you book a ride</p>
            </div>
          )}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── SAVED LOCATIONS ──────────────────────────────────────────
  if (screen === "saved") {
    return (
      <Shell>
        <ScreenHeader title="Saved Locations" onBack={() => setScreen("profile")} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
          {savedLocations.length === 0 && !addingLocation && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📍</div>
              <p className="text-sm font-medium">No saved locations yet</p>
              <p className="text-xs mt-1">Save your favorite places for quick access</p>
            </div>
          )}
          {savedLocations.map(loc => (
            <div key={loc.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 mb-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: PRIMARY_BG }}>
                {loc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{loc.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</div>
              </div>
              <button onClick={() => {
                setDropoffInput(loc.address);
                setDropoff(loc.address);
                setScreen("search");
              }} className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:shadow-sm" style={{ background: PRIMARY_BG, color: PRIMARY_DARK }}>
                Go
              </button>
            </div>
          ))}
          {addingLocation ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3 mt-4">
              <div className="text-sm font-bold text-gray-700 mb-3">Add New Location</div>
              <input value={newLocForm.label} onChange={e => setNewLocForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Label (e.g. Home, Office)"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-gray-300"
                style={{ background: "#f9fafb" }} />
              <input value={newLocForm.address} onChange={e => setNewLocForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-100 focus:outline-none focus:border-gray-300"
                style={{ background: "#f9fafb" }} />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setAddingLocation(false)}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={async () => {
                  if (!newLocForm.label || !newLocForm.address) return;
                  const newLoc = await base44.entities.SavedLocation.create({
                    user_id: user?.id || user?.email,
                    user_email: user?.email,
                    label: newLocForm.label,
                    address: newLocForm.address,
                    icon: newLocForm.icon,
                  }).catch(() => null);
                  if (newLoc) setSavedLocations(l => [...l, newLoc]);
                  setAddingLocation(false);
                  setNewLocForm({ label: "", address: "", icon: "📍" });
                }} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>Save Location</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingLocation(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all mt-4">
              <Plus className="w-4 h-4" /> Save New Location
            </button>
          )}
        </div>
      </Shell>
    );
  }

  // ── PROFILE ─────────────────────────────────────────────────
  if (screen === "profile") {
    return (
      <Shell>
        <div className="flex-1 overflow-y-auto pb-20 fade-in">
          {/* Hero */}
          <div className="px-4 pt-14 pb-8 relative" style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {initials}
              </div>
              <div>
                <div className="font-bold text-white text-lg">{user?.full_name || "Customer"}</div>
                <div className="text-blue-100 text-xs mt-0.5">{user?.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-white/20 rounded-full text-white text-[11px] font-semibold">{completedRides} Completed Rides</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="px-4 py-4 space-y-2.5">
            {[
              { icon: "👤", label: "Account Info", sub: "Personal details", action: () => window.location.href = "/ProfileAccount" },
              { icon: "📍", label: "Saved Locations", sub: "Quick access places", screen: "saved" },
              { icon: "🔔", label: "Notifications", sub: "Alerts & messages", screen: "notifications" },
              { icon: "🛡", label: "Help & Support", sub: "Get assistance", screen: "support" },
              { icon: "⭐", label: "My Ratings", sub: `${bookings.filter(b=>b.customer_rating).length} reviews`, action: () => window.location.href = "/ProfileRatings" },
            ].map((item, i) => (
              <button key={i} onClick={() => item.screen ? setScreen(item.screen) : item.action?.()}
                className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: PRIMARY_BG }}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="px-4 pb-4 space-y-2">
            <button onClick={() => base44.auth.logout(window.location.href)}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 border-2 border-red-400"
              style={{ background: "#ef4444" }}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── HISTORY ─────────────────────────────────────────────────
  if (screen === "history") {
    return (
      <Shell>
        <ScreenHeader title="Your Rides" />
        <div className="flex-1 overflow-y-auto pb-20 fade-in">
          {/* Tabs */}
          <div className="px-4 pt-4 flex gap-2 mb-4">
            {[["history","Completed"],["scheduled","Scheduled"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setHistoryTab(id)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={historyTab === id ? { background: PRIMARY, color: "#fff", boxShadow: `0 2px 8px ${PRIMARY}30` } : { background: "#f3f4f6", color: "#6b7280" }}>
                {lbl}
              </button>
            ))}
          </div>
          {historyTab === "scheduled" ? (
            <ScheduledRidesTab user={user} />
          ) : (
           <div className="px-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Completed", value: completedRides, color: "#10b981" },
                { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#ef4444" },
                { label: "Total", value: bookings.length, color: PRIMARY },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 pb-4">
                {bookings.length === 0 ? (
                  <div className="flex flex-col items-center py-20 text-gray-300">
                    <Bike className="w-16 h-16 mb-4 opacity-30" />
                    <p className="font-semibold text-gray-400">No rides yet</p>
                    <p className="text-sm text-gray-300 mt-1">Book your first ride!</p>
                    <button onClick={() => setScreen("map")} className="mt-5 px-6 py-2.5 rounded-full text-white text-sm font-semibold"
                      style={{ background: PRIMARY }}>
                      Book a Ride
                    </button>
                  </div>
                ) : bookings.map(b => (
                   <button key={b.id} onClick={() => setSelectedRide(b)}
                     className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left">
                     <div className="flex items-start justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: PRIMARY_BG }}>🏍</div>
                         <div className="flex-1">
                           <div className="font-bold text-gray-900 text-sm">{b.booking_id || b.id?.slice(0, 8)}</div>
                           <div className="text-xs text-gray-500">{b.created_date ? new Date(b.created_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                         </div>
                       </div>
                       <StatusPill status={b.status} />
                     </div>
                     <div className="space-y-1.5 mb-3">
                       <div className="flex items-center gap-2 text-xs text-gray-600">
                         <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                         <span className="truncate font-medium">{b.pickup_address}</span>
                       </div>
                       <div className="flex items-center gap-2 text-xs text-gray-600">
                         <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                         <span className="truncate font-medium">{b.dropoff_address}</span>
                       </div>
                     </div>
                     <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                       <span className="text-xs font-medium text-gray-500">{b.payment_method?.toUpperCase() || "CASH"}</span>
                       {b.fare_estimate && <span className="font-bold text-gray-900">₱{b.fare_estimate}</span>}
                       {b.customer_rating && (
                         <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(n => <span key={n} className="text-xs" style={{ color: n <= b.customer_rating ? "#f59e0b" : "#e5e7eb" }}>★</span>)}
                         </div>
                       )}
                     </div>
                   </button>
                ))}
                </div>
                </div>
          )}
        </div>
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
        {selectedRide && (
          <RideDetailModal
            booking={selectedRide}
            onClose={() => setSelectedRide(null)}
            onRepeat={handleRepeatRide}
          />
        )}
      </Shell>
    );
  }

  // ── WALLET ───────────────────────────────────────────────────
  if (screen === "wallet") {
    return (
      <Shell>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
          <h1 className="font-bold text-gray-900 text-lg">Wallet</h1>
        </div>
        <WalletScreen user={user} bookings={bookings} />
        <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />
      </Shell>
    );
  }

  // ── MAP + BOOKING SCREENS ────────────────────────────────────
  return (
    <Shell noScroll>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Map */}
      <div className="absolute inset-0" style={{ bottom: showNav ? 64 : 0 }}>
        <MapboxMap className="w-full h-full" onGeolocate={handleGeolocate}
          pickupMarker={pickupCoords} dropoffMarker={dropoffCoords} riderMarker={riderLocation}
          pinMode={pinMode} onPinPlaced={handlePinPlaced} />
      </div>

      {/* Pin mode overlay instruction */}
      {pinMode && (
        <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-12 pb-3 pointer-events-none">
          <div className="bg-gray-900/85 backdrop-blur-md text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
            <span className="text-2xl">{pinMode === "pickup" ? "📍" : "🏁"}</span>
            <div className="flex-1">
              <div className="font-bold text-sm">Tap on map to set {pinMode === "pickup" ? "pickup" : "drop-off"}</div>
              <div className="text-xs text-gray-300 mt-0.5">Tap anywhere on the map</div>
            </div>
            <button onClick={() => setPinMode(null)}
              className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Map Top Header */}
      {screen === "map" && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-white rounded-xl shadow-md border border-gray-100 px-3.5 py-2.5">
              <img src={HABAL_LOGO} alt="Habal" className="w-6 h-6 object-contain" onError={e => { e.target.style.display="none"; }} />
              <div>
                <div className="text-[10px] text-gray-500 leading-none font-medium">Good day,</div>
                <div className="text-sm font-bold text-gray-900 leading-tight">{user?.full_name?.split(" ")[0] || "Rider"}</div>
              </div>
            </div>
            <button onClick={() => setScreen("profile")}
              className="w-10 h-10 rounded-xl shadow-md border border-gray-100 flex items-center justify-center font-bold text-sm text-white"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              {initials}
            </button>
          </div>
        </div>
      )}

      {/* Map Bottom Bar */}
      {screen === "map" && !pinMode && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-4 pb-3">
          {/* Pickup row */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2.5 flex items-center gap-2.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pickup</div>
              <div className="text-sm font-medium text-gray-800 truncate">{pickup || "Your current location"}</div>
            </div>
            <button onClick={() => { setSearchMode("pickup"); setScreen("search"); setSuggestions([]); }}
              className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ background: PRIMARY_BG, color: PRIMARY_DARK }}>Edit</button>
            <button onClick={() => setPinMode("pickup")}
              className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 border border-gray-200 text-gray-500 hover:bg-gray-50">
              📌
            </button>
          </div>

          {/* Notes input (optional) */}
          {dropoff && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2.5 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Notes for Rider (Optional)</div>
              <input
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g., 'Pick me up at side gate', 'I'm wearing a red shirt'"
                className="w-full text-sm bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-400"
                maxLength={200}
              />
            </div>
          )}
          {/* Destination row */}
          <button onClick={() => { setSearchMode("dropoff"); setScreen("search"); setSuggestions([]); }}
            className="w-full bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow px-4 py-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: PRIMARY_BG }}>
              📍
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Where to?</div>
              <div className="text-sm font-medium text-gray-700 mt-0.5">{dropoff || "Enter destination"}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      )}

      {/* SEARCH SCREEN */}
      {screen === "search" && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white">
          <div className="px-4 pt-12 pb-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setScreen("map")}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900 text-lg">
                {searchMode === "pickup" ? "Set Pickup Location" : "Set Destination"}
              </span>
            </div>

            {/* Pickup input */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-2.5 border-2 cursor-pointer transition-all"
              style={searchMode === "pickup"
                ? { borderColor: PRIMARY, background: "#fff" }
                : { borderColor: "#e5e7eb", background: "#f9fafb" }}
              onClick={() => { if (searchMode !== "pickup") { setSearchMode("pickup"); setSuggestions([]); } }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
              {searchMode === "pickup" ? (
                <input
                  autoFocus={searchMode === "pickup"}
                  value={pickupInput}
                  onChange={e => handlePickupInputChange(e.target.value)}
                  placeholder="Search pickup location..."
                  className="flex-1 bg-transparent text-sm text-gray-800 font-medium focus:outline-none placeholder-gray-400"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{pickup || "Your location"}</span>
              )}
              {searchMode === "pickup" && pickupInput && (
                <button onClick={e => { e.stopPropagation(); setPickupInput(""); setSuggestions([]); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setScreen("map"); setPinMode("pickup"); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border border-gray-200 hover:bg-gray-100"
                title="Place pin on map">
                📌
              </button>
            </div>

            {/* Dropoff input */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 cursor-pointer transition-all"
              style={searchMode === "dropoff"
                ? { borderColor: PRIMARY, background: "#fff" }
                : { borderColor: "#e5e7eb", background: "#f9fafb" }}
              onClick={() => { if (searchMode !== "dropoff") { setSearchMode("dropoff"); setSuggestions([]); } }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              {searchMode === "dropoff" ? (
                <input
                  autoFocus={searchMode === "dropoff"}
                  value={dropoffInput}
                  onChange={e => handleDropoffChange(e.target.value)}
                  placeholder="Where to?"
                  className="flex-1 bg-transparent text-sm text-gray-800 font-medium focus:outline-none placeholder-gray-400"
                />
              ) : (
                <span className="flex-1 text-sm font-medium truncate" style={{ color: dropoff ? "#1f2937" : "#9ca3af" }}>
                  {dropoff || "Where to?"}
                </span>
              )}
              {searchMode === "dropoff" && dropoffInput && (
                <button onClick={e => { e.stopPropagation(); setDropoffInput(""); setSuggestions([]); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setScreen("map"); setPinMode("dropoff"); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm border border-gray-200 hover:bg-gray-100"
                title="Place pin on map">
                📌
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-3">
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Search Results</div>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => selectSuggestion(s)}
                    className="w-full flex items-center gap-3 px-3 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: searchMode === "pickup" ? "#f0fdf4" : PRIMARY_BG }}>
                      <MapPin className="w-4 h-4" style={{ color: searchMode === "pickup" ? "#22c55e" : PRIMARY }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{s.place_name.split(",")[0]}</div>
                      <div className="text-xs text-gray-500 truncate">{s.place_name.split(",").slice(1).join(",").trim()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {(searchMode === "dropoff" ? dropoffInput : pickupInput).length >= 3 && suggestions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-gray-500 text-sm font-medium">No results found</div>
                <div className="text-xs text-gray-400 mt-1">Try a different name or use the 📌 pin</div>
              </div>
            )}
            {/* Popular places (shown when destination field is focused & empty) */}
            {searchMode === "dropoff" && !dropoffInput && (
              <div className="pb-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-3">Popular Locations</div>
                <div className="space-y-2">
                  {[
                    { name: "SM City Iloilo", icon: "🏬", sub: "Shopping Mall", center: [122.5778, 10.7156] },
                    { name: "Robinsons Place Iloilo", icon: "🛍", sub: "Shopping Mall", center: [122.5503, 10.6999] },
                    { name: "Iloilo Business Park", icon: "🏢", sub: "Business District", center: [122.5808, 10.7183] },
                    { name: "Fort San Pedro", icon: "🏰", sub: "Historical Site", center: [122.5661, 10.7169] },
                    { name: "Iloilo City Hall", icon: "🏛", sub: "Government", center: [122.5662, 10.7286] },
                  ].map(place => (
                    <div key={place.name} onClick={() => selectSuggestion({ place_name: place.name, center: place.center, place_type: "poi" })}
                      className="w-full flex items-center gap-3 px-3 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-left cursor-pointer">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: PRIMARY_BG }}>
                        {place.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{place.name}</div>
                        <div className="text-xs text-gray-500">{place.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pin on map option */}
                <div
                  onClick={() => { setScreen("map"); setPinMode("dropoff"); }}
                  className="w-full mt-3 flex items-center gap-3 px-3 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg bg-gray-100">
                    📌
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-700">Place a pin on the map</div>
                    <div className="text-xs text-gray-400">Tap anywhere on the map to set destination</div>
                  </div>
                </div>
              </div>
            )}
            {/* Pickup popular places */}
            {searchMode === "pickup" && !pickupInput && (
              <div className="pb-4">
                <div
                  onClick={() => { setScreen("map"); setPinMode("pickup"); }}
                  className="w-full flex items-center gap-3 px-3 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left cursor-pointer">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg bg-gray-100">
                    📌
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-700">Place a pin on the map</div>
                    <div className="text-xs text-gray-400">Tap anywhere on the map to set pickup</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM SCREEN */}
      {screen === "confirm" && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl slide-up max-h-[88vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3" />
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Review Your Ride</h3>
              <button onClick={() => { setSearchMode("dropoff"); setScreen("search"); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: PRIMARY_BG, color: PRIMARY_DARK }}>Edit</button>
            </div>
            {/* Route — editable */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-4 space-y-2.5">
              {/* Pickup */}
              <button
                className="w-full flex items-center gap-3 text-left group"
                onClick={() => { setSearchMode("pickup"); setScreen("search"); }}>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                  <div className="w-0.5 h-5 bg-gray-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pick Up</div>
                  <div className="text-sm font-medium text-gray-800 leading-snug truncate">{pickup}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-medium">edit</span>
                  <button onClick={e => { e.stopPropagation(); setScreen("map"); setPinMode("pickup"); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-medium">📌</button>
                </div>
              </button>
              {/* Dropoff */}
              <button
                className="w-full flex items-center gap-3 text-left group"
                onClick={() => { setSearchMode("dropoff"); setScreen("search"); }}>
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destination</div>
                  <div className="text-sm font-medium text-gray-800 leading-snug truncate">{dropoff}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-medium">edit</span>
                  <button onClick={e => { e.stopPropagation(); setScreen("map"); setPinMode("dropoff"); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-medium">📌</button>
                </div>
              </button>
            </div>
            {/* Ride type + fare (live) */}
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 mb-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: PRIMARY_BG }}>🏍</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Motorcycle</div>
                  <div className="text-xs text-gray-500">1 passenger · fastest</div>
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                {fareLoading || fareEstimate == null ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin ml-auto" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
                    <div className="text-[10px] text-gray-400">calculating...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-black" style={{ color: PRIMARY }}>₱{fareEstimate}</div>
                    <div className="text-[10px] text-gray-500">est. fare</div>
                  </>
                )}
              </div>
            </div>
            {/* Payment */}
            <div className="mb-5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Method</div>
              <div className="flex gap-2">
                {[{ id: "cash", label: "💵 Cash", sub: "Pay driver" }, { id: "gcash", label: "📱 GCash", sub: "Wallet" }].map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className="flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all"
                    style={paymentMethod === m.id
                      ? { borderColor: PRIMARY, background: PRIMARY_BG, color: PRIMARY_DARK, boxShadow: `0 2px 8px ${PRIMARY}20` }
                      : { borderColor: "#e5e7eb", color: "#9ca3af", background: "#f9fafb" }}>
                    <div>{m.label}</div>
                    <div className="text-[10px] font-normal mt-0.5">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <PrimaryBtn onClick={() => handleBook(false)} loading={booking || fareLoading || fareEstimate == null}>
              {booking ? "Booking..." : (fareLoading || fareEstimate == null) ? "Calculating fare..." : `Book Now • ₱${fareEstimate}`}
            </PrimaryBtn>
            <button onClick={() => setShowScheduleModal(true)} disabled={booking}
              className="w-full py-3 rounded-xl font-bold text-sm border-2 mt-2 transition-all"
              style={{ borderColor: PRIMARY + "30", color: PRIMARY_DARK, background: PRIMARY_BG }}>
              📅 Schedule for Later
            </button>
          </div>
        </div>
      )}

      {/* SEARCHING */}
      {screen === "searching" && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-8 fade-in">
            <div className="relative mb-10">
              <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "#D6F3FC" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: PRIMARY }}>
                    <Bike className="w-9 h-9 text-white" />
                  </div>
                </div>
              </div>
              {[1, 1.6, 2.2].map((delay, i) => (
                <div key={i} className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: `rgba(77,200,240,${0.15 - i * 0.04})`, animationDelay: `${delay * 0.4}s`, animationDuration: "2s" }} />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding your rider...</h2>
            <p className="text-sm text-gray-400 text-center mb-8">We're matching you with a verified Habal rider in your area</p>
            <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: PRIMARY }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pickup</div>
                  <div className="text-sm text-gray-700 truncate">{pickup}</div>
                </div>
              </div>
              <div className="ml-1 w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-3">
                <MapPin className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Destination</div>
                  <div className="text-sm text-gray-700 truncate">{dropoff}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 pb-10">
            <button onClick={() => setShowCancelConfirm(true)}
              className="w-full py-3.5 border-2 border-gray-200 text-gray-500 font-semibold rounded-2xl text-sm">
              Cancel Booking
            </button>
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {/* ACTIVE RIDE */}
      {screen === "active" && activeRide && (
        <div className="absolute bottom-16 left-0 right-0 z-20 slide-up">
          <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-5 space-y-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />

            {/* Prominent full-width status banner */}
            <ActiveRideStatusBanner status={activeRide.status} eta={eta} />

            {activeRide.rider_name ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: PRIMARY_BG }}>🏍</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{activeRide.rider_name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-yellow-500">⭐</span>
                      <span className="text-xs text-gray-400">Verified Rider</span>
                    </div>
                  </div>
                </div>
                {riderLocation && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 font-semibold">Live</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: PRIMARY_BG }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
                  style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
                <span className="text-sm font-semibold" style={{ color: PRIMARY_DARK }}>Waiting for a rider to accept...</span>
              </div>
            )}

            {/* Route summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />
                <span className="truncate">{activeRide.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{activeRide.dropoff_address}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 flex-wrap">
              <button onClick={() => setShowLiveMap(true)}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                <Navigation className="w-4 h-4" /> Live Map
              </button>
              {activeRide.rider_name && (
                <button onClick={() => setShowComms(true)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 border-2"
                  style={{ borderColor: PRIMARY + "40", color: PRIMARY_DARK }}>
                  <MessageCircle className="w-4 h-4" /> Contact
                </button>
              )}
              {["pending", "searching", "assigned", "otw"].includes(activeRide.status) && (
                <button onClick={() => setShowCancelConfirm(true)}
                  className="py-3 px-4 border-2 border-red-100 text-red-400 font-bold rounded-2xl text-sm">
                  Cancel
                </button>
              )}
            </div>
            {showComms && activeRide && (
              <CommunicationPanel
                booking={activeRide}
                currentUser={user}
                userRole="customer"
                onClose={() => setShowComms(false)}
              />
            )}
          </div>
          {showCancelConfirm && <CancelModal onCancel={handleCancelRide} onKeep={() => setShowCancelConfirm(false)} />}
        </div>
      )}

      {/* Live Map Overlay */}
      {showLiveMap && activeRide && (
        <LiveRideMap
          activeRide={activeRide}
          user={user}
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          onClose={() => setShowLiveMap(false)}
          onCancel={() => { setShowLiveMap(false); setShowCancelConfirm(true); }}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleRideModal
          onConfirm={async (isoDate) => {
            setShowScheduleModal(false);
            setScheduledAt(isoDate);
            await handleBook(true);
          }}
          onCancel={() => setShowScheduleModal(false)}
        />
      )}

      {showNav && <BottomNav screen={screen} setScreen={setScreen} completedRides={completedRides} />}
    </Shell>
  );
}

// ── Shell ─────────────────────────────────────────────────────
function Shell({ children, noScroll }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-white max-w-md mx-auto overflow-hidden">
      <div className={`flex-1 relative ${noScroll ? "" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}

// ── ScreenHeader ──────────────────────────────────────────────
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

// ── BottomNav ─────────────────────────────────────────────────
function BottomNav({ screen, setScreen, completedRides }) {
  const tabs = [
    { id: "map",      label: "Home",     icon: Home },
    { id: "wallet",   label: "Wallet",   icon: Wallet },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "profile",  label: "Profile",  icon: User },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex px-2 pb-2 pt-2"
      style={{ height: 64, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = screen === id || (id === "map" && ["search","confirm","searching","active"].includes(screen));
        return (
          <button key={id} onClick={() => setScreen(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200`}
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

// ── PrimaryBtn ────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-60 transition-all"
      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 4px 12px ${PRIMARY}35` }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        : children}
    </button>
  );
}

// ── RideStatusBadge ───────────────────────────────────────────
function RideStatusBadge({ status }) {
  const MAP = {
    pending:     { label: "Finding rider...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
    searching:   { label: "Searching...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b" },
    assigned:    { label: "Rider on the way", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
    otw:         { label: "Rider heading to you", bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY },
    arrived:     { label: "Rider has arrived!", bg: "#F0FDF4", color: "#15803d", dot: "#22c55e" },
    in_progress: { label: "Trip in progress", bg: "#EFF6FF", color: "#1d4ed8", dot: "#3b82f6" },
  };
  const cfg = MAP[status] || MAP.pending;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.dot }} />
      {cfg.label}
    </div>
  );
}

// ── StatusPill ────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    completed:   "bg-emerald-100 text-emerald-700",
    cancelled:   "bg-red-100 text-red-700",
    in_progress: "bg-blue-100 text-blue-700",
    pending:     "bg-amber-100 text-amber-700",
    searching:   "bg-amber-100 text-amber-700",
    assigned:    "bg-sky-100 text-sky-700",
    otw:         "bg-sky-100 text-sky-700",
    arrived:     "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`text-xs px-2.5 py-1.5 rounded-lg font-bold capitalize flex-shrink-0 ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── ActiveRideStatusBanner ────────────────────────────────────
function ActiveRideStatusBanner({ status, eta }) {
  const MAP = {
    pending:     { label: "Finding your rider...",   bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b", emoji: "🔍" },
    searching:   { label: "Searching for riders...", bg: "#FFF7ED", color: "#d97706", dot: "#f59e0b", emoji: "🔍" },
    assigned:    { label: "Rider is on the way",     bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY, emoji: "🏍" },
    otw:         { label: "Rider heading to you",    bg: PRIMARY_BG, color: PRIMARY_DARK, dot: PRIMARY, emoji: "🏍" },
    arrived:     { label: "Rider has arrived",       bg: "#F0FDF4", color: "#15803d", dot: "#22c55e", emoji: "📍" },
    in_progress: { label: "Trip in progress",        bg: "#EFF6FF", color: "#1d4ed8", dot: "#3b82f6", emoji: "🚀" },
  };
  const cfg = MAP[status] || MAP.pending;
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: cfg.bg }}>
      <span className="text-2xl flex-shrink-0">{cfg.emoji}</span>
      <div className="flex-1">
        <div className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</div>
        {eta && <div className="text-xs mt-0.5 font-medium" style={{ color: cfg.color }}>ETA: {eta.minutes} min {eta.label}</div>}
      </div>
      <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: cfg.dot }} />
    </div>
  );
}

// ── CancelModal ───────────────────────────────────────────────
function CancelModal({ onCancel, onKeep }) {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end z-30">
      <div className="w-full bg-white rounded-t-3xl px-5 pt-6 pb-10 space-y-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="font-bold text-gray-900 text-lg">Cancel this ride?</h3>
          <p className="text-sm text-gray-500 mt-2">Your rider may be on the way. Cancelling may affect your account.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onKeep}
            className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Keep Ride
          </button>
          <button onClick={onCancel}
            className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}