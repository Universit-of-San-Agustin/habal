import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Production-safe demo account seeder
// Used ONLY for testing and investor demos when DEMO_MODE is enabled
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Validate it's a demo account email
    const validDemoEmails = [
      'demo.customer@habal.app',
      'demo.rider@habal.app',
      'demo.operator@habal.app',
      'demo.admin@habal.app',
      'demo.dispatcher@habal.app'
    ];
    
    if (!validDemoEmails.includes(email)) {
      return Response.json({ error: 'Only demo account emails allowed' }, { status: 400 });
    }

    // Determine role from email
    const roleMap = {
      'demo.customer@habal.app': 'user',
      'demo.rider@habal.app': 'rider',
      'demo.operator@habal.app': 'operator',
      'demo.admin@habal.app': 'admin',
      'demo.dispatcher@habal.app': 'dispatcher'
    };

    const targetRole = roleMap[email];
    
    // Initialize demo data via the existing backend function
    await base44.asServiceRole.functions.invoke('initializeDemoData', { 
      email,
      force: true 
    });

    return Response.json({ 
      success: true,
      email,
      role: targetRole,
      message: `Demo environment initialized for ${email}`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});