import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, user_type, title, message, type, reference_id, reference_type } = await req.json();

    if (!user_id || !title || !message) {
      return Response.json({ error: "user_id, title, and message are required" }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      user_id,
      user_type: user_type || "customer",
      title,
      message,
      type: type || "system",
      read_status: false,
      reference_id: reference_id || null,
      reference_type: reference_type || null,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});