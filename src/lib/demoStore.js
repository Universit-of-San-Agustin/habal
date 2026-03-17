/**
 * HABAL Demo Store
 * Fully local, in-memory demo simulation state backed by localStorage.
 * No backend API calls — works with fake demo session tokens.
 *
 * All demo components read/write through this module.
 * Cross-component reactivity via the "habal_demo_update" CustomEvent.
 */

export const DEMO_STORE_KEY = "habal_demo_state";
export const DEMO_EVENT = "habal_demo_update";

const empty = () => ({
  riders: [],
  bookings: [],
  events: [],
  stats: { riders: 0, bookings: 0, trips: 0, earnings: 0 },
});

export function readDemoStore() {
  try {
    const raw = localStorage.getItem(DEMO_STORE_KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

export function writeDemoStore(data) {
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: data }));
  return data;
}

export function patchDemoStore(patchFn) {
  const next = patchFn(readDemoStore());
  return writeDemoStore(next);
}

export function clearDemoStore() {
  const e = empty();
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(e));
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: e }));
  return e;
}

export function isDemoMode() {
  return localStorage.getItem("demo_mode") === "true";
}

export function appendDemoEvent(event) {
  return patchDemoStore((store) => ({
    ...store,
    events: [
      {
        id: event.id || `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: event.timestamp || new Date().toISOString(),
        ...event,
      },
      ...store.events,
    ].slice(0, 80),
  }));
}

export function upsertDemoRider(riderInput) {
  let resolvedRider = null;
  patchDemoStore((store) => {
    const existing = store.riders.find((r) =>
      (riderInput.id && r.id === riderInput.id) ||
      (riderInput.email && r.email === riderInput.email)
    );

    resolvedRider = {
      id: existing?.id || riderInput.id || `demo-rider-${Date.now().toString(36)}`,
      full_name: riderInput.full_name || existing?.full_name || "Demo Rider",
      email: riderInput.email || existing?.email || null,
      phone: riderInput.phone || existing?.phone || null,
      zone: riderInput.zone || existing?.zone || "City Proper",
      plate_number: riderInput.plate_number || existing?.plate_number || "DEMO 1001",
      motorcycle_make: riderInput.motorcycle_make || existing?.motorcycle_make || "Honda",
      motorcycle_model: riderInput.motorcycle_model || existing?.motorcycle_model || "TMX155",
      status: riderInput.status || existing?.status || "active",
      online_status: riderInput.online_status || existing?.online_status || "offline",
      avg_rating: riderInput.avg_rating ?? existing?.avg_rating ?? 4.8,
      completed_trips: riderInput.completed_trips ?? existing?.completed_trips ?? 0,
      acceptance_rate: riderInput.acceptance_rate ?? existing?.acceptance_rate ?? 98,
      strikes: riderInput.strikes ?? existing?.strikes ?? 0,
      lat: riderInput.lat ?? existing?.lat ?? 10.7002,
      lng: riderInput.lng ?? existing?.lng ?? 122.5531,
      heading: riderInput.heading ?? existing?.heading ?? 0,
      is_demo_data: true,
      is_primary_demo_rider: riderInput.is_primary_demo_rider ?? existing?.is_primary_demo_rider ?? false,
      network_id: riderInput.network_id || existing?.network_id || "demo-network",
      network_name: riderInput.network_name || existing?.network_name || "Demo Network",
    };

    const riders = existing
      ? store.riders.map((r) => (r.id === existing.id ? resolvedRider : r))
      : [resolvedRider, ...store.riders];

    return {
      ...store,
      riders,
      stats: { ...store.stats, riders: riders.length },
    };
  });

  return resolvedRider;
}

export function getDemoRiderLocations(store = readDemoStore()) {
  const activeBookingsByRider = Object.fromEntries(
    (store.bookings || [])
      .filter((booking) => booking.rider_id && ["assigned", "otw", "arrived", "in_progress"].includes(booking.status))
      .map((booking) => [booking.rider_id, booking])
  );

  return (store.riders || [])
    .filter((rider) => rider.lat != null && rider.lng != null)
    .map((rider) => {
      const booking = activeBookingsByRider[rider.id];
      return {
        id: `loc-${rider.id}`,
        rider_id: rider.id,
        rider_name: rider.full_name,
        lat: rider.lat,
        lng: rider.lng,
        heading: rider.heading || 0,
        speed: rider.online_status === "on_trip" ? 18 : 0,
        status: booking
          ? booking.status === "in_progress"
            ? "en_route_dropoff"
            : "en_route_pickup"
          : "idle",
        booking_id: booking?.booking_id || booking?.id || null,
        updated_date: new Date().toISOString(),
      };
    });
}
