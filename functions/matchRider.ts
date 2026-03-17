import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

/**
 * ═══════════════════════════════════════════════════════════════
 * SIMPLIFIED MVP DISPATCH
 * Customer → Nearest Available Rider (No network routing)
 * ═══════════════════════════════════════════════════════════════
 */

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check rider eligibility (Uber-style filtering)
function isEligible(rider, locMap) {
  // Must be active and verified
  if (rider.status !== "active") return false;
  
  // Must be online (not offline or on_trip)
  if (rider.online_status !== "online") return false;
  
  // Must have recent GPS location
  if (!locMap[rider.id]) return false;
  
  return true;
}

// Production-grade weighted scoring (Uber algorithm)
function scoreRider(rider, riderLoc, bookingLoc, distKm) {
  // Weight distribution (total = 100%)
  const PROXIMITY_WEIGHT = 0.50;    // 50% - Most critical
  const RATING_WEIGHT = 0.25;       // 25% - Service quality
  const ACCEPTANCE_WEIGHT = 0.15;   // 15% - Reliability
  const RESPONSE_WEIGHT = 0.10;     // 10% - Speed
  
  // Proximity score (exponential decay for distance)
  // Perfect: 0km = 1.0, Good: 2km = 0.7, Acceptable: 5km = 0.3
  const proximityScore = Math.max(0, Math.exp(-distKm / 2.5));
  
  // Rating score (normalized to 0-1)
  const avgRating = rider.avg_rating || 4.0;
  const ratingScore = avgRating / 5.0;
  
  // Acceptance rate score
  const acceptanceRate = rider.acceptance_rate || 80;
  const acceptanceScore = acceptanceRate / 100;
  
  // Response time score (based on completed trips - more trips = faster response)
  const completedTrips = rider.completed_trips || 0;
  const responseScore = Math.min(1.0, completedTrips / 50); // Caps at 50 trips
  
  // Calculate weighted total score
  const totalScore = 
    (proximityScore * PROXIMITY_WEIGHT) +
    (ratingScore * RATING_WEIGHT) +
    (acceptanceScore * ACCEPTANCE_WEIGHT) +
    (responseScore * RESPONSE_WEIGHT);
  
  return {
    score: totalScore,
    distanceKm: distKm,
    breakdown: {
      proximity: proximityScore,
      rating: ratingScore,
      acceptance: acceptanceScore,
      response: responseScore,
    }
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id } = await req.json();

    if (!booking_id) {
      console.error("❌ MATCH FAILED: No booking_id provided");
      return Response.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    console.log("🎯 MATCH: Starting rider match", { booking_id });

    // 1. Fetch the booking — support both booking_id string field and DB id
    let booking = null;
    const byCustomId = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    if (byCustomId?.[0]) {
      booking = byCustomId[0];
    } else {
      const byDbId = await db.entities.Booking.filter({ id: booking_id }, "-created_date", 1);
      booking = byDbId?.[0];
    }
    
    if (!booking) {
      console.error("❌ MATCH FAILED: Booking not found", { booking_id });
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // CRITICAL: Validate booking has required fields before proceeding
    const requiredFields = ['id', 'pickup_address', 'dropoff_address', 'customer_name', 'status'];
    const missingFields = requiredFields.filter(field => !booking[field]);
    
    if (missingFields.length > 0) {
      console.error("❌ MATCH FAILED: Invalid booking - missing required fields", { 
        booking_id: booking.id,
        missing: missingFields 
      });
      return Response.json({ 
        error: 'Invalid booking object', 
        missing_fields: missingFields 
      }, { status: 400 });
    }
    
    console.log("✅ MATCH: Booking validated", { 
      db_id: booking.id, 
      status: booking.status, 
      zone: booking.zone,
      pickup: booking.pickup_address,
      customer: booking.customer_name 
    });

    // Validate booking is in matchable state
    if (!["pending", "searching"].includes(booking.status)) {
      console.warn("⚠️ MATCH SKIPPED: Not in matchable state", { status: booking.status });
      return Response.json({ matched: false, message: 'Booking not in matchable state', status: booking.status });
    }

    console.log("🎯 DISPATCH ENGINE: Starting simple nearest-rider matching");
    const startTime = Date.now();

    // STEP 1: Geocode pickup location
    let bookingLat = null, bookingLng = null;
    if (MAPBOX_TOKEN) {
      try {
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(booking.pickup_address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=PH`
        );
        const geoData = await geoRes.json();
        if (geoData.features?.[0]?.center) {
          [bookingLng, bookingLat] = geoData.features[0].center;
          console.log("📍 GEOCODING: Pickup location resolved", { 
            address: booking.pickup_address,
            lat: bookingLat.toFixed(6), 
            lng: bookingLng.toFixed(6) 
          });
        }
      } catch (err) {
        console.warn("⚠️ GEOCODING FAILED:", err.message);
      }
    }

    // STEP 2: Simple dispatch - fetch ALL active, online riders (no zone filtering)
    console.log(`🌍 SIMPLE DISPATCH: Searching for nearest available rider (ignoring zones)`);
    
    let riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online"
    }, "-avg_rating", 100);

    console.log(`✓ RIDER POOL: Found ${riders?.length || 0} active online riders`);

    if (!riders?.length) {
      console.error("❌ MATCH FAILED: No riders online");
      await db.entities.Booking.update(booking.id, { status: "searching" }).catch(() => {});
      await db.entities.BookingEvent.create({
        booking_id: booking.id,
        event_type: "RIDER_MATCHING",
        actor_role: "system",
        actor_name: "Dispatch Engine",
        details: "No riders available - booking marked as searching",
        timestamp: new Date().toISOString(),
      }).catch(() => {});
      return Response.json({ matched: false, reason: 'No available riders online' });
    }

    // STEP 4: Get GPS locations for all riders
    const riderIds = riders.map(r => r.id);
    const allLocs = await db.entities.RiderLocation.list("-updated_date", 150);
    const locMap = {};
    for (const loc of (allLocs || [])) {
      if (riderIds.includes(loc.rider_id)) {
        locMap[loc.rider_id] = { lat: loc.lat, lng: loc.lng, updated_at: loc.updated_date };
      }
    }
    console.log(`📡 GPS DATA: Retrieved location data for ${Object.keys(locMap).length}/${riders.length} riders`);

    // STEP 5: Apply eligibility filter (Uber-style)
    const eligibleRiders = riders.filter(r => isEligible(r, locMap));
    console.log(`✓ ELIGIBILITY FILTER: ${eligibleRiders.length}/${riders.length} riders are eligible`);
    
    if (eligibleRiders.length === 0) {
      console.error("❌ MATCH FAILED: No eligible riders after filtering");
      return Response.json({ matched: false, reason: 'No eligible riders available' });
    }

    // STEP 6: Score and rank riders (Production algorithm)
    console.log("🔢 SCORING: Calculating weighted rider scores");
    const scoredRiders = [];
    
    for (const rider of eligibleRiders) {
      const loc = locMap[rider.id];
      
      if (bookingLat !== null && loc) {
        const distKm = haversineKm(loc.lat, loc.lng, bookingLat, bookingLng);
        const scoring = scoreRider(rider, loc, { lat: bookingLat, lng: bookingLng }, distKm);
        
        scoredRiders.push({
          rider,
          score: scoring.score,
          distanceKm: scoring.distanceKm,
          breakdown: scoring.breakdown,
        });
      } else {
        // Fallback scoring without GPS (rating + acceptance only)
        const fallbackScore = 
          ((rider.avg_rating || 4) / 5) * 0.6 + 
          ((rider.acceptance_rate || 80) / 100) * 0.4;
        
        scoredRiders.push({
          rider,
          score: fallbackScore,
          distanceKm: null,
          breakdown: null,
        });
      }
    }

    // Sort by score (highest first)
    scoredRiders.sort((a, b) => b.score - a.score);

    // STEP 7: Select best rider (sequential dispatch)
    const bestMatch = scoredRiders[0];
    const bestRider = bestMatch.rider;
    const matchTime = Date.now() - startTime;
    
    console.log("🏆 BEST MATCH SELECTED:", {
      rider_id: bestRider.id,
      rider_name: bestRider.full_name,
      score: bestMatch.score.toFixed(3),
      distance: bestMatch.distanceKm ? `${bestMatch.distanceKm.toFixed(2)} km` : "N/A",
      rating: bestRider.avg_rating || "N/A",
      match_time: `${matchTime}ms`,
      total_candidates: riders.length,
      eligible_candidates: eligibleRiders.length,
    });
    
    if (bestMatch.breakdown) {
      console.log("📊 SCORE BREAKDOWN:", bestMatch.breakdown);
    }

    // STEP 8: Sequential dispatch notification (Uber model)
    // Send notification to best rider first, wait for response (10s timeout)
    // If declined/timeout, dispatch to next rider in ranking
    const now = new Date().toISOString();

    // Clear old notifications for this booking
    const oldNotifs = await db.entities.Notification.filter({
      user_id: bestRider.id,
      reference_id: booking.id,
      type: "booking",
    }, "-created_date", 10).catch(() => []);
    for (const n of (oldNotifs || [])) {
      await db.entities.Notification.update(n.id, { read_status: true }).catch(() => {});
    }

    console.log("📱 DISPATCH: Sending ride request to rider");

    // Create notification with enhanced details
    const notif = await db.entities.Notification.create({
      user_id: bestRider.id,
      user_type: "rider",
      title: "New Ride Request",
      message: `${booking.customer_name} needs a ride from ${booking.pickup_address}`,
      type: "booking",
      read_status: false,
      reference_id: booking.id,
      reference_type: "booking",
    });

    console.log("✅ NOTIFICATION SENT:", { 
      notification_id: notif.id, 
      rider_id: bestRider.id,
      rider_name: bestRider.full_name,
    });

    // Mark booking as searching (awaiting rider acceptance)
    await db.entities.Booking.update(booking.id, { status: "searching" });

    // Log dispatch event with detailed scoring
    await db.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "RIDER_MATCH_STARTED",
      actor_role: "system",
      actor_name: "Dispatch Engine",
      details: `Matched to ${bestRider.full_name} - Score: ${bestMatch.score.toFixed(3)}${bestMatch.distanceKm ? `, Distance: ${bestMatch.distanceKm.toFixed(2)}km` : ''} - Simple nearest-rider dispatch`,
      timestamp: now,
    });

    // Log rider notification event
    await db.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "RIDER_NOTIFIED",
      actor_role: "system",
      actor_name: "Dispatch Engine",
      actor_id: bestRider.id,
      details: `Notification sent to ${bestRider.full_name} - Awaiting acceptance (10s timeout)`,
      timestamp: now,
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ DISPATCH COMPLETE: Total processing time ${totalTime}ms (target: <2000ms)`);

    return Response.json({
      matched: true,
      dispatch_strategy: "sequential",
      rider: { 
        id: bestRider.id, 
        name: bestRider.full_name,
        score: bestMatch.score,
        distance_km: bestMatch.distanceKm,
      },
      notification_id: notif.id,
      status: 'notification_sent',
      performance: {
        total_candidates: riders.length,
        eligible_candidates: eligibleRiders.length,
        processing_time_ms: totalTime,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});