import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

// Habal motorcycle fare structure (Iloilo City rates)
const BASE_FARE = 40;          // ₱40 base fare
const RATE_PER_KM = 12;        // ₱12 per km
const RATE_PER_MIN = 1.5;      // ₱1.50 per minute
const MIN_FARE = 40;           // Minimum fare
const BOOKING_FEE = 5;         // ₱5 booking fee

Deno.serve(async (req) => {
  try {
    // No user auth needed — calculate fare purely via Mapbox
    const { pickup_address, dropoff_address, pickup_coords, dropoff_coords } = await req.json();

    if (!MAPBOX_TOKEN) {
      return Response.json({ error: "MAPBOX_TOKEN not configured" }, { status: 500 });
    }

    let fromLng, fromLat, toLng, toLat;

    // Use provided coords if available, otherwise geocode
    if (pickup_coords?.lng && pickup_coords?.lat) {
      fromLng = pickup_coords.lng;
      fromLat = pickup_coords.lat;
    } else if (pickup_address) {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickup_address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=PH`
      );
      const data = await res.json();
      if (data.features?.[0]?.center) {
        [fromLng, fromLat] = data.features[0].center;
      }
    }

    if (dropoff_coords?.lng && dropoff_coords?.lat) {
      toLng = dropoff_coords.lng;
      toLat = dropoff_coords.lat;
    } else if (dropoff_address) {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(dropoff_address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=PH`
      );
      const data = await res.json();
      if (data.features?.[0]?.center) {
        [toLng, toLat] = data.features[0].center;
      }
    }

    if (!fromLng || !toLng) {
      return Response.json({ error: "Could not resolve coordinates for addresses" }, { status: 400 });
    }

    // Get route from Mapbox Directions API
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${MAPBOX_TOKEN}&overview=full&geometries=geojson`;
    const dirRes = await fetch(directionsUrl);
    const dirData = await dirRes.json();

    const route = dirData.routes?.[0];
    if (!route) {
      return Response.json({ error: "No route found between locations" }, { status: 400 });
    }

    const distanceKm = route.distance / 1000;       // meters → km
    const durationMin = route.duration / 60;         // seconds → minutes

    // Calculate fare
    const distanceFare = distanceKm * RATE_PER_KM;
    const timeFare = durationMin * RATE_PER_MIN;
    const rawFare = BASE_FARE + distanceFare + timeFare + BOOKING_FEE;
    const fare = Math.max(MIN_FARE, Math.round(rawFare / 5) * 5); // Round to nearest ₱5

    return Response.json({
      fare,
      breakdown: {
        base_fare: BASE_FARE,
        distance_km: +distanceKm.toFixed(2),
        distance_fare: +distanceFare.toFixed(2),
        duration_min: +durationMin.toFixed(1),
        time_fare: +timeFare.toFixed(2),
        booking_fee: BOOKING_FEE,
        total: fare,
      },
      route_geometry: route.geometry,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});