import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Demo Login Handler
 * 
 * This function creates or retrieves the demo account and generates a login URL.
 * The frontend will redirect to this URL to complete authentication.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    
    console.log("🧪 DEMO LOGIN: Starting demo authentication flow");

    // STEP 1: Check if demo account exists
    const existingUsers = await db.entities.User.filter({ email: "demo.customer@habal.app" }, "-created_date", 1);
    
    if (existingUsers && existingUsers.length > 0) {
      const demoUser = existingUsers[0];
      
      console.log("✅ DEMO ACCOUNT EXISTS:", {
        user_id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role
      });
      
      // Update role to user if needed (Base44 uses "user" not "customer")
      if (demoUser.role !== "user") {
        await db.entities.User.update(demoUser.id, { role: "user" }).catch(err => {
          console.error("Failed to update role:", err.message);
        });
      }
      
      return Response.json({
        success: true,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          full_name: demoUser.full_name || "Demo Customer",
          role: "user"
        }
      });
    }

    // STEP 2: Create demo account if it doesn't exist
    console.log("🔨 CREATING DEMO ACCOUNT: User does not exist");
    
    try {
      // Use Base44 users.inviteUser to create the account (role must be "user" or "admin")
      await base44.users.inviteUser("demo.customer@habal.app", "user");
      
      console.log("✅ DEMO ACCOUNT CREATED: Invitation sent");
      
      // Wait for account creation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Fetch the newly created user
      const newUsers = await db.entities.User.filter({ email: "demo.customer@habal.app" }, "-created_date", 1);
      
      if (newUsers && newUsers.length > 0) {
        const newUser = newUsers[0];
        return Response.json({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name || "Demo Customer",
            role: "user"
          }
        });
      }
    } catch (createErr) {
      console.error("❌ DEMO ACCOUNT CREATION FAILED:", createErr.message);
      return Response.json({ 
        success: false, 
        error: "Failed to create demo account: " + createErr.message 
      }, { status: 500 });
    }

    // If we get here, something went wrong
    return Response.json({ 
      success: false, 
      error: "Demo account creation failed" 
    }, { status: 500 });

  } catch (error) {
    console.error("❌ DEMO LOGIN ERROR:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});