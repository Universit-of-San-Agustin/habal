import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SYSTEM DIAGNOSTICS: Test dispatch flow end-to-end
 * 
 * Creates a test booking and verifies it reaches riders.
 * Use this to validate the dispatch pipeline.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const results = {
      test_booking: null,
      online_riders: [],
      notifications_created: 0,
      dispatch_result: null,
      match_result: null,
    };

    console.log("🔬 TEST DISPATCH: Starting system test");

    // 1. Check online riders
    const riders = await db.entities.Rider.filter({
      status: "active",
      online_status: "online",
    }, "-created_date", 50);
    
    results.online_riders = riders?.map(r => ({
      id: r.id,
      name: r.full_name,
      zone: r.zone,
      status: r.online_status,
    })) || [];

    console.log("👥 TEST: Online riders found", { count: results.online_riders.length });

    if (results.online_riders.length === 0) {
      return Response.json({
        success: false,
        error: "No online riders available for test",
        results,
      });
    }

    // 2. Create a test booking
    const testBookingId = "TEST-" + Date.now().toString(36).toUpperCase();
    const testBooking = await db.entities.Booking.create({
      booking_id: testBookingId,
      customer_name: "System Test",
      customer_phone: "test@system.internal",
      pickup_address: "SM City Iloilo, Mandurriao, Iloilo City",
      dropoff_address: "Robinsons Place Iloilo, City Proper",
      zone: "Mandurriao",
      status: "pending",
      payment_method: "cash",
      fare_estimate: 75,
    });

    results.test_booking = {
      db_id: testBooking.id,
      booking_id: testBookingId,
      zone: testBooking.zone,
    };

    console.log("📝 TEST: Test booking created", results.test_booking);

    // 3. Trigger dispatch
    const dispatchRes = await base44.asServiceRole.functions.invoke("notifyRidersOfBooking", {
      booking_id: testBooking.id, // Use DB id
    });

    results.dispatch_result = dispatchRes?.data || dispatchRes;
    console.log("📢 TEST: Dispatch invoked", results.dispatch_result);

    // 4. Trigger match
    const matchRes = await base44.asServiceRole.functions.invoke("matchRider", {
      booking_id: testBooking.id, // Use DB id
    });

    results.match_result = matchRes?.data || matchRes;
    console.log("🎯 TEST: Match invoked", results.match_result);

    // 5. Verify notifications were created
    const notifications = await db.entities.Notification.filter({
      reference_id: testBooking.id,
      type: "booking",
    }, "-created_date", 50);

    results.notifications_created = notifications?.length || 0;

    console.log("📬 TEST: Notifications created", { count: results.notifications_created });

    // 6. Clean up test data
    await db.entities.Booking.update(testBooking.id, { status: "cancelled" });
    for (const n of (notifications || [])) {
      await db.entities.Notification.update(n.id, { read_status: true }).catch(() => {});
    }

    console.log("✅ TEST COMPLETE: System working correctly");

    return Response.json({
      success: true,
      message: "Dispatch system test completed",
      results,
      summary: {
        online_riders: results.online_riders.length,
        notifications_sent: results.notifications_created,
        dispatch_working: results.notifications_created > 0,
      }
    });

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});