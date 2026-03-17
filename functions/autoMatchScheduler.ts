import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled auto-match: picks up unassigned pending/searching bookings and re-triggers notifications
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Fetch unassigned bookings - limit to 5 to prevent timeout
    const [pendingBookings, searchingBookings] = await Promise.all([
      db.entities.Booking.filter({ status: "pending" }, "-created_date", 5).catch(() => []),
      db.entities.Booking.filter({ status: "searching" }, "-created_date", 5).catch(() => [])
    ]);

    const allBookings = [...(pendingBookings || []), ...(searchingBookings || [])]
      .filter(b => !b.rider_id)
      .slice(0, 5); // Process max 5 bookings per run

    if (!allBookings.length) {
      return Response.json({ processed: 0, message: "No pending bookings found" });
    }

    // Simply update status to "searching" to re-trigger notifications
    // This is much faster than calling matchRider which does heavy processing
    const updates = await Promise.allSettled(
      allBookings.map(booking =>
        db.entities.Booking.update(booking.id, { 
          status: "searching",
          updated_date: new Date().toISOString() 
        })
          .then(() => ({ booking_id: booking.id, status: "updated" }))
          .catch(err => ({ booking_id: booking.id, status: "error", error: err.message }))
      )
    );

    const successful = updates.filter(r => r.status === "fulfilled").length;
    
    return Response.json({ 
      processed: allBookings.length, 
      successful,
      message: `Updated ${successful} bookings to searching status`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});