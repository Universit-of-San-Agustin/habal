import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Issues a strike against a rider or network, escalates if threshold reached
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole;
    const { target_type, target_id, target_name, reason, severity, booking_id, notes } = await req.json();

    if (!target_type || !target_id || !reason || !severity) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create strike record
    const strike = await db.entities.Strike.create({
      target_type, target_id, target_name, reason, severity,
      booking_id: booking_id || null,
      notes: notes || null,
      issued_by: user.email,
    });

    // Increment strike counter on the target entity
    if (target_type === 'rider') {
      const riders = await db.entities.Rider.filter({ id: target_id }, "-created_date", 1).catch(() => []);
      const rider = riders?.[0];
      if (rider) {
        const newStrikes = (rider.strikes || 0) + 1;
        const updates = { strikes: newStrikes };
        // Auto-suspend at 3 strikes
        if (newStrikes >= 3 && rider.status !== 'banned') updates.status = newStrikes >= 5 ? 'banned' : 'suspended';
        await db.entities.Rider.update(rider.id, updates);
      }
    } else if (target_type === 'network') {
      const networks = await db.entities.Network.list("-created_date", 100).catch(() => []);
      const network = networks?.find(n => n.id === target_id);
      if (network) {
        const newStrikes = (network.strikes || 0) + 1;
        const updates = { strikes: newStrikes };
        if (newStrikes >= 3 && network.status !== 'banned') updates.status = newStrikes >= 5 ? 'banned' : 'suspended';
        await db.entities.Network.update(network.id, updates);
      }
    }

    return Response.json({ success: true, strike });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});