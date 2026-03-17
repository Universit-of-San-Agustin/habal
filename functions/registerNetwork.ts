import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Public endpoint: network operators submit registration application
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const {
      network_name, owner_name, owner_email, owner_phone,
      zone, facebook_page_url, rider_seats,
    } = await req.json();

    if (!network_name || !owner_name || !owner_email || !zone) {
      return Response.json({ error: 'Missing required fields: network_name, owner_name, owner_email, zone' }, { status: 400 });
    }

    // Prevent duplicate
    const existing = await db.entities.Network.filter({ owner_email }, "-created_date", 1).catch(() => []);
    if (existing?.length) {
      return Response.json({ error: 'A network with this owner email already exists', existing: existing[0] }, { status: 409 });
    }

    const network = await db.entities.Network.create({
      name: network_name,
      owner_name,
      owner_email,
      owner_phone: owner_phone || "",
      zone,
      facebook_page_url: facebook_page_url || "",
      status: "pending",
      verified_badge: false,
      wallet_balance: 0,
      active_rider_seats: rider_seats || 30,
      subscription_status: "trial",
      strikes: 0,
      total_bookings: 0,
      completed_bookings: 0,
    });

    return Response.json({ success: true, network });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});