import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Production-Safe Demo Data Initializer
 * 
 * PURPOSE: Seeds REAL, PERSISTENT demo data for testing and presentations
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 1. All demo data is REAL database records (not simulated)
 * 2. Demo accounts interact with the same production database as regular users
 * 3. Demo riders can accept real bookings from regular customers
 * 4. Real riders can accept bookings from demo customers
 * 5. All real-time systems (dispatch, GPS tracking, chat) work normally
 * 
 * This creates a seamless testing environment where demo users and regular users
 * coexist in the same system without any separation or simulation.
 */
export default function DemoDataInitializer({ user }) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || initialized) return;
    
    const demoEmails = [
      "demo.customer@habal.app",
      "demo.rider@habal.app",
      "demo.operator@habal.app",
      "demo.dispatcher@habal.app",
      "demo.admin@habal.app",
    ];

    if (!demoEmails.includes(user.email)) return;

    const initDemoData = async () => {
      setLoading(true);
      try {
        // Check if demo data already exists
        const existingRider = await base44.entities.Rider.filter({ 
          email: "demo.rider@habal.app" 
        });
        
        if (existingRider.length === 0) {
          // Initialize demo data via backend function
          await base44.functions.invoke("initializeDemoData", { 
            forceInit: false 
          });
        }
        setInitialized(true);
      } catch (error) {
        console.error("Demo data initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initDemoData();
  }, [user, initialized]);

  // Silent component - no UI
  return null;
}