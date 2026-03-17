import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Debits a network wallet (admin penalty or fee deduction)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole;
    const { network_id, amount, reason } = await req.json();

    if (!network_id || !amount || amount <= 0) {
      return Response.json({ error: 'network_id and positive amount required' }, { status: 400 });
    }

    const networks = await db.entities.Network.list("-created_date", 100).catch(() => []);
    const network = networks?.find(n => n.id === network_id);
    if (!network) return Response.json({ error: 'Network not found' }, { status: 404 });

    const newBalance = (network.wallet_balance || 0) - amount;
    await db.entities.Network.update(network.id, { wallet_balance: newBalance });

    // Log as booking event for audit trail
    await db.entities.BookingEvent.create({
      booking_id: network_id,
      event_type: "BOOKING_CANCELLED", // reuse as audit event
      actor_role: "admin",
      actor_name: user.email,
      details: `Wallet debit: ₱${amount} — ${reason || "Admin penalty"}`,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, new_balance: newBalance, network_id, amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});