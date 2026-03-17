import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { booking_id } = await req.json();

    if (!booking_id) {
      console.error("❌ NOTIFY FAILED: No booking_id provided");
      return Response.json({ error: 'booking_id required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    console.log("📢 NOTIFY: Starting notification broadcast", { booking_id });

    // 1. Get the booking (support both booking_id string field and DB id)
    let booking = null;
    const byCustomId = await db.entities.Booking.filter({ booking_id }, "-created_date", 1);
    if (byCustomId?.[0]) {
      booking = byCustomId[0];
    } else {
      // Fallback: try as DB id
      const byDbId = await db.entities.Booking.filter({ id: booking_id }, "-created_date", 1);
      booking = byDbId?.[0];
    }
    
    if (!booking) {
      console.error("❌ NOTIFY FAILED: Booking not found", { booking_id });
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // CRITICAL: Validate booking has required fields
    const requiredFields = ['id', 'pickup_address', 'customer_name', 'status'];
    const missingFields = requiredFields.filter(field => !booking[field]);
    
    if (missingFields.length > 0) {
      console.error("❌ NOTIFY FAILED: Invalid booking - missing required fields", { 
        booking_id: booking.id,
        missing: missingFields 
      });
      return Response.json({ 
        error: 'Invalid booking object', 
        missing_fields: missingFields 
      }, { status: 400 });
    }
    
    console.log("✅ NOTIFY: Booking validated", { db_id: booking.id, status: booking.status, zone: booking.zone });

    // Only notify for pending/searching bookings
    if (!["pending", "searching"].includes(booking.status)) {
      console.warn("⚠️ NOTIFY SKIPPED: Booking not in notifiable state", { status: booking.status });
      return Response.json({ notified: 0, message: 'Booking not in notifiable state', status: booking.status });
    }

    // 2. Mark booking as searching
    await db.entities.Booking.update(booking.id, { status: "searching" }).catch(() => {});

    // 3. Find all online active riders in the same zone
    let riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
      zone: booking.zone || "City Proper",
    }, "-avg_rating", 100);

    // Also try without zone constraint if no riders found
    if (!riders || riders.length === 0) {
      riders = await db.entities.Rider.filter({
        status: "active",
        online_status: "online",
      }, "-avg_rating", 100);
    }

    if (!riders || riders.length === 0) {
      console.warn("⚠️ NOTIFY: No riders available", { zone: booking.zone });
      return Response.json({ notified: 0, message: 'No riders online' });
    }
    
    console.log("👥 NOTIFY: Found eligible riders", { count: riders.length, rider_ids: riders.map(r => r.id) });

    // 4. Clear old unread booking notifications for this booking to avoid duplicates
    const existingNotifs = await db.entities.Notification.filter({
      reference_id: booking.id,
      type: "booking",
      read_status: false,
    }, "-created_date", 200).catch(() => []);
    for (const n of (existingNotifs || [])) {
      await db.entities.Notification.update(n.id, { read_status: true }).catch(() => {});
    }

    // 5. Create fresh notification records for each eligible rider — in parallel
    const results = await Promise.allSettled(
      riders.map(rider =>
        db.entities.Notification.create({
          user_id: rider.id,
          user_type: "rider",
          title: "New Ride Request",
          message: `${booking.customer_name} needs a ride from ${booking.pickup_address}`,
          type: "booking",
          read_status: false,
          reference_id: booking.id, // DB id for proper linking
          reference_type: "booking",
        }).then(() => ({ rider_id: rider.id, rider_name: rider.full_name }))
      )
    );
    const notifications = results
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    console.log("✅ NOTIFY COMPLETE: Notifications sent", {
      total_sent: notifications.length,
      failed: results.filter(r => r.status === "rejected").length,
      booking_db_id: booking.id,
    });

    return Response.json({
      notified: notifications.length,
      riders: notifications,
      booking_id: booking.id, // Return DB id
      booking_custom_id: booking.booking_id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});