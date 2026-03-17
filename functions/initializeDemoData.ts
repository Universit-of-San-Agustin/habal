import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Initialize persistent demo data for demo accounts.
 * Creates real database records that persist across sessions.
 * This ensures demo accounts behave like production accounts.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role to create data regardless of auth
    const { forceInit } = await req.json();
    
    const results = {
      rider: null,
      network: null,
      bookings: [],
      ratings: [],
    };

    // 1. Create persistent demo network
    const existingNetworks = await base44.asServiceRole.entities.Network.filter({ 
      owner_email: "demo.operator@habal.app" 
    });
    
    if (existingNetworks.length === 0 || forceInit) {
      const network = await base44.asServiceRole.entities.Network.create({
        name: "Demo Habal Network",
        owner_name: "Demo Operator",
        owner_email: "demo.operator@habal.app",
        owner_phone: "+639171234567",
        zone: "Mandurriao",
        status: "approved",
        verified_badge: true,
        wallet_balance: 15000,
        active_rider_seats: 30,
        subscription_status: "active",
        total_bookings: 127,
        completed_bookings: 118,
        cancelled_bookings: 9,
        avg_rating: 4.7,
      });
      results.network = network;
    } else {
      results.network = existingNetworks[0];
    }

    // 2. Create persistent demo rider
    const existingRiders = await base44.asServiceRole.entities.Rider.filter({ 
      email: "demo.rider@habal.app" 
    });
    
    if (existingRiders.length === 0 || forceInit) {
      const rider = await base44.asServiceRole.entities.Rider.create({
        full_name: "Demo Rider",
        phone: "+639171234567",
        email: "demo.rider@habal.app",
        network_id: results.network.id,
        network_name: results.network.name,
        role: "rider",
        status: "active",
        online_status: "offline",
        plate_number: "ABC-1234",
        motorcycle_make: "Honda",
        motorcycle_model: "TMX 155",
        zone: "Mandurriao",
        total_trips: 243,
        completed_trips: 231,
        avg_rating: 4.8,
        acceptance_rate: 94,
        strikes: 0,
      });
      results.rider = rider;
    } else {
      results.rider = existingRiders[0];
    }

    // 3. Create sample historical bookings (only if none exist)
    const existingBookings = await base44.asServiceRole.entities.Booking.filter({
      customer_phone: "demo.customer@habal.app"
    }, "-created_date", 5);

    if (existingBookings.length === 0 || forceInit) {
      const sampleTrips = [
        {
          booking_id: "BK-DEMO-001",
          customer_name: "Demo Customer",
          customer_phone: "demo.customer@habal.app",
          pickup_address: "SM City Iloilo, Mandurriao, Iloilo City",
          dropoff_address: "Robinsons Place Iloilo, City Proper",
          zone: "Mandurriao",
          network_id: results.network.id,
          network_name: results.network.name,
          rider_id: results.rider.id,
          rider_name: results.rider.full_name,
          status: "completed",
          fare_estimate: 85,
          payment_method: "cash",
          customer_rating: 5,
          customer_feedback: "Great ride! Very safe and professional.",
        },
        {
          booking_id: "BK-DEMO-002",
          customer_name: "Demo Customer",
          customer_phone: "demo.customer@habal.app",
          pickup_address: "Iloilo Business Park, Mandurriao",
          dropoff_address: "Fort San Pedro, City Proper",
          zone: "Mandurriao",
          network_id: results.network.id,
          network_name: results.network.name,
          rider_id: results.rider.id,
          rider_name: results.rider.full_name,
          status: "completed",
          fare_estimate: 72,
          payment_method: "gcash",
          customer_rating: 4,
          customer_feedback: "Good service, arrived on time.",
        },
        {
          booking_id: "BK-DEMO-003",
          customer_name: "Demo Customer",
          customer_phone: "demo.customer@habal.app",
          pickup_address: "Jaro Plaza, Jaro District",
          dropoff_address: "Molo Church, Molo District",
          zone: "Jaro",
          network_id: results.network.id,
          network_name: results.network.name,
          rider_id: results.rider.id,
          rider_name: results.rider.full_name,
          status: "completed",
          fare_estimate: 95,
          payment_method: "cash",
          customer_rating: 5,
        },
      ];

      for (const trip of sampleTrips) {
        const booking = await base44.asServiceRole.entities.Booking.create(trip);
        results.bookings.push(booking);
        
        // Create rating records
        if (trip.customer_rating) {
          const rating = await base44.asServiceRole.entities.Rating.create({
            booking_id: booking.id,
            customer_name: trip.customer_name,
            rider_id: trip.rider_id,
            rider_name: trip.rider_name,
            network_id: trip.network_id,
            rating: trip.customer_rating,
            comment: trip.customer_feedback || "",
          });
          results.ratings.push(rating);
        }
      }
    }

    return Response.json({
      success: true,
      message: "Demo data initialized successfully",
      results: {
        network: results.network?.id,
        rider: results.rider?.id,
        bookings_created: results.bookings.length,
        ratings_created: results.ratings.length,
      }
    });

  } catch (error) {
    console.error("Demo data initialization error:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});