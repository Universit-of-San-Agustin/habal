import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Comprehensive user flow simulation
 * Tests customer, rider, and operator workflows with real database operations
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const results = {
    timestamp: new Date().toISOString(),
    total_tests: 0,
    passed: 0,
    failed: 0,
    flows: [],
  };

  // ══════════════════════════════════════════════════════════════
  // CUSTOMER FLOW SIMULATIONS (2 users - reduced for speed)
  // ══════════════════════════════════════════════════════════════
  
  for (let i = 1; i <= 2; i++) {
    const flowResult = {
      user_type: "customer",
      user_id: `sim-customer-${i}`,
      steps: [],
      status: "pending",
    };
    
    try {
      // Step 1: Create booking
      flowResult.steps.push({ name: "create_booking", status: "running" });
      const booking = await base44.entities.Booking.create({
        booking_id: `SIM-${Date.now()}-${i}`,
        customer_name: `Test Customer ${i}`,
        customer_phone: `sim-customer-${i}@test.com`,
        pickup_address: "SM City Iloilo",
        dropoff_address: "Robinsons Place Iloilo",
        zone: "Mandurriao",
        status: "pending",
        payment_method: "cash",
        fare_estimate: 60,
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].booking_id = booking.id;
      
      // Step 2: Update to searching
      flowResult.steps.push({ name: "update_to_searching", status: "running" });
      await base44.entities.Booking.update(booking.id, { status: "searching" });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 3: Create booking event
      flowResult.steps.push({ name: "create_event", status: "running" });
      await base44.entities.BookingEvent.create({
        booking_id: booking.id,
        event_type: "BOOKING_CREATED",
        actor_role: "customer",
        actor_name: `Test Customer ${i}`,
        timestamp: new Date().toISOString(),
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 4: Save location
      flowResult.steps.push({ name: "save_location", status: "running" });
      await base44.entities.SavedLocation.create({
        user_id: `sim-customer-${i}`,
        user_email: `sim-customer-${i}@test.com`,
        label: "Home",
        address: "Test Address",
        icon: "🏠",
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 5: Cleanup
      flowResult.steps.push({ name: "cleanup", status: "running" });
      await base44.entities.Booking.delete(booking.id);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      flowResult.status = "pass";
      results.passed++;
    } catch (error) {
      flowResult.status = "fail";
      flowResult.error = error.message;
      flowResult.steps[flowResult.steps.length - 1].status = "fail";
      flowResult.steps[flowResult.steps.length - 1].error = error.message;
      results.failed++;
    }
    
    results.flows.push(flowResult);
    results.total_tests++;
  }
  
  // ══════════════════════════════════════════════════════════════
  // RIDER FLOW SIMULATIONS (2 users - reduced for speed)
  // ══════════════════════════════════════════════════════════════
  
  for (let i = 1; i <= 2; i++) {
    const flowResult = {
      user_type: "rider",
      user_id: `sim-rider-${i}`,
      steps: [],
      status: "pending",
    };
    
    try {
      // Step 1: Check for existing rider
      flowResult.steps.push({ name: "fetch_rider_profile", status: "running" });
      const riders = await base44.entities.Rider.filter({ email: `sim-rider-${i}@test.com` }, "-created_date", 1);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].count = riders?.length || 0;
      
      // Step 2: Create test booking for acceptance
      flowResult.steps.push({ name: "create_test_booking", status: "running" });
      const booking = await base44.entities.Booking.create({
        booking_id: `SIM-RIDER-${Date.now()}-${i}`,
        customer_name: "Test Customer",
        customer_phone: "test@test.com",
        pickup_address: "Test Pickup",
        dropoff_address: "Test Dropoff",
        zone: "Jaro",
        status: "pending",
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].booking_id = booking.id;
      
      // Step 3: Accept booking (simulate)
      flowResult.steps.push({ name: "accept_booking", status: "running" });
      await base44.entities.Booking.update(booking.id, {
        status: "assigned",
        rider_id: `sim-rider-${i}`,
        rider_name: `Test Rider ${i}`,
        assigned_at: new Date().toISOString(),
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 4: Create rider location
      flowResult.steps.push({ name: "broadcast_location", status: "running" });
      const location = await base44.entities.RiderLocation.create({
        rider_id: `sim-rider-${i}`,
        rider_name: `Test Rider ${i}`,
        lat: 10.7202,
        lng: 122.5621,
        booking_id: booking.id,
        status: "en_route_pickup",
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 5: Complete trip
      flowResult.steps.push({ name: "complete_trip", status: "running" });
      await base44.entities.Booking.update(booking.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 6: Cleanup
      flowResult.steps.push({ name: "cleanup", status: "running" });
      await base44.entities.Booking.delete(booking.id);
      await base44.entities.RiderLocation.delete(location.id);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      flowResult.status = "pass";
      results.passed++;
    } catch (error) {
      flowResult.status = "fail";
      flowResult.error = error.message;
      flowResult.steps[flowResult.steps.length - 1].status = "fail";
      flowResult.steps[flowResult.steps.length - 1].error = error.message;
      results.failed++;
    }
    
    results.flows.push(flowResult);
    results.total_tests++;
  }
  
  // ══════════════════════════════════════════════════════════════
  // OPERATOR FLOW SIMULATIONS (1 user - reduced for speed)
  // ══════════════════════════════════════════════════════════════
  
  for (let i = 1; i <= 1; i++) {
    const flowResult = {
      user_type: "operator",
      user_id: `sim-operator-${i}`,
      steps: [],
      status: "pending",
    };
    
    try {
      // Step 1: Fetch networks
      flowResult.steps.push({ name: "fetch_networks", status: "running" });
      const networks = await base44.entities.Network.filter({}, "-created_date", 10);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].count = networks?.length || 0;
      
      // Step 2: Fetch riders
      flowResult.steps.push({ name: "fetch_riders", status: "running" });
      const riders = await base44.entities.Rider.filter({}, "-created_date", 10);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].count = riders?.length || 0;
      
      // Step 3: Fetch bookings
      flowResult.steps.push({ name: "fetch_bookings", status: "running" });
      const bookings = await base44.entities.Booking.filter({}, "-created_date", 20);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      flowResult.steps[flowResult.steps.length - 1].count = bookings?.length || 0;
      
      // Step 4: Create notification
      flowResult.steps.push({ name: "create_notification", status: "running" });
      const notif = await base44.entities.Notification.create({
        user_id: `sim-operator-${i}`,
        user_type: "operator",
        title: "Test Notification",
        message: "Simulation test",
        type: "system",
        read_status: false,
      });
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      // Step 5: Cleanup
      flowResult.steps.push({ name: "cleanup", status: "running" });
      await base44.entities.Notification.delete(notif.id);
      flowResult.steps[flowResult.steps.length - 1].status = "pass";
      
      flowResult.status = "pass";
      results.passed++;
    } catch (error) {
      flowResult.status = "fail";
      flowResult.error = error.message;
      flowResult.steps[flowResult.steps.length - 1].status = "fail";
      flowResult.steps[flowResult.steps.length - 1].error = error.message;
      results.failed++;
    }
    
    results.flows.push(flowResult);
    results.total_tests++;
  }
  
  // ══════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ══════════════════════════════════════════════════════════════
  
  results.success_rate = results.total_tests > 0 
    ? Math.round((results.passed / results.total_tests) * 100) 
    : 0;
  
  results.summary = {
    total_users_simulated: 5,
    customers: 2,
    riders: 2,
    operators: 1,
    all_flows_passed: results.failed === 0,
    critical_failures: results.flows.filter(f => f.status === "fail").length,
  };
  
  return Response.json(results, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});