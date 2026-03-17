import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { booking_id, rider_id, rating, comment, tags } = await req.json();

    if (!booking_id || !rating) {
      return Response.json({ error: "booking_id and rating are required" }, { status: 400 });
    }

    // Get booking for context — support both booking_id string and DB id
    let bookings = await base44.asServiceRole.entities.Booking.filter({ booking_id }, "-created_date", 1).catch(() => []);
    if (!bookings?.length) {
      // Fallback: booking_id may actually be the DB id
      bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id }, "-created_date", 1).catch(() => []);
    }
    const booking = bookings?.[0];

    // Create rating record
    const ratingRecord = await base44.asServiceRole.entities.Rating.create({
      booking_id,
      customer_id: user.email,
      customer_name: user.full_name,
      rider_id: rider_id || booking?.rider_id,
      rider_name: booking?.rider_name,
      network_id: booking?.network_id,
      rating,
      comment: comment || "",
      tags: tags || [],
    });

    // Update booking
    if (booking) {
      await base44.asServiceRole.entities.Booking.update(booking.id, { customer_rating: rating, customer_feedback: comment });
    }

    // Update rider avg rating
    if (booking?.rider_id) {
      const allRatings = await base44.asServiceRole.entities.Rating.filter({ rider_id: booking.rider_id }).catch(() => []);
      if (allRatings?.length) {
        const avg = allRatings.reduce((s, r) => s + (r.rating || 0), 0) / allRatings.length;
        const riders = await base44.asServiceRole.entities.Rider.filter({ id: booking.rider_id }, "-created_date", 1).catch(() => []);
        if (riders?.[0]) {
          await base44.asServiceRole.entities.Rider.update(riders[0].id, {
            avg_rating: Math.round(avg * 10) / 10,
            total_trips: (riders[0].total_trips || 0) + 1,
            completed_trips: (riders[0].completed_trips || 0) + 1,
          });
        }
      }
    }

    return Response.json({ success: true, rating: ratingRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});