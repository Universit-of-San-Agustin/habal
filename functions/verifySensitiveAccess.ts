import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Password is stored securely as SENSITIVE_LOGS_PASSWORD env var
// Admin can rotate it by updating the environment variable in the dashboard
const SENSITIVE_PASSWORD = Deno.env.get("SENSITIVE_LOGS_PASSWORD") || "";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { password } = await req.json();

    if (!password) {
      return Response.json({ error: "Password required" }, { status: 400 });
    }

    if (!SENSITIVE_PASSWORD) {
      return Response.json({ error: "SENSITIVE_LOGS_PASSWORD environment variable is not set. Please configure it in the dashboard." }, { status: 500 });
    }

    const granted = password === SENSITIVE_PASSWORD;

    // Log every attempt
    await base44.asServiceRole.entities.AuditLog.create({
      log_type: "admin_action",
      action: granted ? "SENSITIVE_LOGS_ACCESS_GRANTED" : "SENSITIVE_LOGS_FAILED_PASSWORD",
      actor_id: user.id || user.email,
      actor_name: user.full_name || "Admin",
      actor_role: "admin",
      target_type: "sensitive_logs",
      target_name: "Sensitive Logs Dashboard",
      details: granted ? "Successful password verification via backend" : "Incorrect password attempt via backend",
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    if (!granted) {
      return Response.json({ granted: false, error: "Incorrect password" }, { status: 401 });
    }

    return Response.json({ granted: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});