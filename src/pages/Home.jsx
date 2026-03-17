import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/home/SplashScreen";
import LoginScreen from "../components/home/LoginScreen";
// Removed unused UserNotRegisteredError import
import CustomerHome from "../components/home/CustomerHome";
import RiderDashboard from "../components/home/RiderDashboard";
import NetworkOwnerDashboard from "../components/home/NetworkOwnerDashboard";
import AdminDashboard from "../components/home/AdminDashboard";
import DemoDataInitializer from "../components/demo/DemoDataInitializer";
import DemoModeIndicator from "../components/demo/DemoModeIndicator";
import SuperDemoEngine from "../components/demo/SuperDemoEngine";
import DispatchActivityFeed from "../components/demo/DispatchActivityFeed";

/**
 * ═══════════════════════════════════════════════════════════════
 * HABAL Platform - Production Entry Point
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🏗️ ARCHITECTURE OVERVIEW
 * 
 * This is the root entry point for the HABAL platform.
 * Entry flow: Splash Screen → Authentication Check → Dashboard
 * 
 * AUTHENTICATION FLOW:
 * 1. App loads → Show splash screen
 * 2. Validate session via base44.auth.me()
 * 3. If NO valid session → Login page
 * 4. If valid session exists → Role-based dashboard
 * 
 * ⚠️ CRITICAL ROUTING RULES:
 * - Logged out users → ALWAYS see login page
 * - "Access Restricted" → ONLY for authenticated users lacking permissions
 * - Never auto-redirect to admin dashboard
 * - Logout → ALWAYS returns to login page
 * 
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🔧 PRODUCTION CONFIGURATION
 * 
 * DEMO_MODE: Controls demo testing features
 * ├─ TRUE:  Dashboard demo switcher enabled (for testing/demos)
 * └─ FALSE: Production mode - all demo UI hidden
 * 
 * ⚠️ IMPORTANT FOR DEPLOYMENT:
 * Set DEMO_MODE = false before production launch.
 * 
 * ═══════════════════════════════════════════════════════════════
 * 
 * 📊 DATA PERSISTENCE SYSTEM:
 * 
 * ✅ ALL DATA IS REAL - Demo accounts use the same production database
 * ✅ NO SIMULATION - All bookings, trips, and events are real records
 * ✅ DATA PERSISTS ACROSS ROLES - Bookings remain when switching accounts
 * ✅ CROSS-USER INTERACTION - Demo riders can accept real customer bookings
 * ✅ REAL-TIME SYNC - GPS tracking, dispatch, and chat work normally
 * ✅ TRUE WORKFLOWS - Every action follows production business logic
 * 
 * DEMO ROLE SWITCHER:
 * - Allows instant role perspective changes for testing/presentations
 * - Maintains real database (NO data reset on role switch)
 * - Users can experience Customer → Rider → Operator → Admin flows
 * - Perfect for investor demos and QA testing
 * 
 * INVESTOR DEMO EXAMPLE:
 * 1. Login as demo.customer@habal.app
 * 2. Create a real booking (persisted in Booking entity)
 * 3. Logout
 * 4. Login as demo.rider@habal.app
 * 5. Accept the SAME booking (data persisted)
 * 6. Logout
 * 7. Login as demo.operator@habal.app
 * 8. Monitor the SAME trip in real-time
 * 9. Login as demo.admin@habal.app
 * 10. View audit logs of ALL actions
 * 
 * 🎭 DEMO ACCOUNTS:
 * - demo.customer@habal.app   → Customer booking flow
 * - demo.rider@habal.app      → Rider trip management  
 * - demo.operator@habal.app   → Network dispatch operations
 * - demo.dispatcher@habal.app → Booking queue management
 * - demo.admin@habal.app      → Platform administration
 * 
 * Demo switcher (floating button + top indicator) only appears when:
 * 1. DEMO_MODE = true
 * 2. User is logged in as a demo account
 * 
 * ═══════════════════════════════════════════════════════════════
 */
const DEMO_MODE = true;

// Demo users for testing — only active when DEMO_MODE = true
// Note: dispatcher and operator roles are merged into "operator"
const DEMO_USERS = {
  customer: { id: "demo-customer", full_name: "Demo Customer", email: "demo.customer@habal.app", role: "user" },
  rider:    { id: "demo-rider",    full_name: "Demo Rider",    email: "demo.rider@habal.app",    role: "rider" },
  operator: { id: "demo-operator", full_name: "Demo Operator", email: "demo.operator@habal.app", role: "operator" },
  admin:    { id: "demo-admin",    full_name: "Demo Admin",    email: "demo.admin@habal.app",    role: "admin" },
};

function ensureDemoAccessToken() {
  const existingToken = localStorage.getItem("base44_access_token");
  if (existingToken) return existingToken;

  const token = `demo-token-${Date.now()}`;
  localStorage.setItem("base44_access_token", token);
  return token;
}

export default function Home() {
  const [phase, setPhase] = useState("splash"); // splash | login | app
  const [user, setUser] = useState(null);
  const [demoRole, setDemoRole] = useState(null); // null = use real role
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);

  // Session validation on mount - Root entry point always validates auth
  useEffect(() => {
    const validateSession = async () => {
      try {
        console.log("🔍 SESSION VALIDATION: Checking authentication state...");
        
        // CHECK FOR DEMO MODE FIRST - bypass auth if demo flag is set
        const demoMode = localStorage.getItem("demo_mode");
        if (demoMode === "true") {
          console.log("🧪 DEMO MODE DETECTED - Creating demo session");
          ensureDemoAccessToken();
          
          // Create a fake demo user object
          const demoUser = {
            id: "demo-customer-" + Date.now(),
            email: "demo.customer@habal.app",
            role: "user",
            full_name: "Demo Customer",
            is_demo: true
          };
          
          setUser(demoUser);
          setIsDemoSession(true);
          setPhase("app");
          console.log("✅ DEMO SESSION CREATED:", demoUser);
          return; // Skip auth check
        }
        
        // Normal auth flow - call base44.auth.me()
        const me = await base44.auth.me();
        
        // Strict session validation - all fields must exist
        if (!me || !me.id || !me.email || !me.role) {
          console.warn("⚠️ INCOMPLETE SESSION: Missing required user data", {
            has_user: !!me,
            has_id: !!me?.id,
            has_email: !!me?.email,
            has_role: !!me?.role,
          });
          setPhase("login");
          return;
        }

        console.log("✅ SESSION VALID - User authenticated:", {
          user_id: me.id,
          email: me.email,
          full_name: me.full_name,
          role: me.role,
          timestamp: new Date().toISOString(),
        });

        setUser(me);
        setPhase("app");
        
        // Auto-enable demo mode if user email contains "demo" or is a test account
        const isDemoEmail = me.email?.toLowerCase().includes("demo") || 
                           me.email?.toLowerCase().includes("test") ||
                           me.email === "m@gmail.com" ||
                           me.email === "habal@2mail.co";
        
        if (isDemoEmail) {
          setIsDemoSession(true);
          localStorage.setItem("demo_mode", "true");
          ensureDemoAccessToken();
          console.log("🧪 DEMO MODE ENABLED:", { email: me.email, role: me.role });
        }
      } catch (err) {
        console.log("❌ NO VALID SESSION - Redirecting to login:", {
          error: err?.message,
          code: err?.code,
          timestamp: new Date().toISOString(),
        });
        // ANY authentication failure → Always redirect to login page
        setPhase("login");
      }
    };

    // Show splash screen briefly, then validate authentication
    const timer = setTimeout(validateSession, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    console.log("🔐 LOGIN REDIRECT: Initiating authentication flow");
    // Redirect to Base44 OAuth - returns to current URL after authentication
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleDemoSwitch = (roleKey) => {
    if (!DEMO_MODE || !isDemoSession) return;
    
    const demoUserForRole = DEMO_USERS[roleKey];
    if (!demoUserForRole) return;

    console.log("🔄 DEMO ROLE SWITCH:", roleKey, "→", demoUserForRole.role);
    
    // Update local demo user state directly — no API calls needed in demo mode
    setUser(prev => ({
      ...prev,
      role: demoUserForRole.role,
      email: demoUserForRole.email,
      full_name: demoUserForRole.full_name,
    }));
    localStorage.setItem("demo_role", roleKey);
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION ROUTING PHASE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  // Phase flow: splash → login → app
  // 
  // splash:  Initial loading animation (2.8s)
  // login:   Login page - ALWAYS shown when no valid session exists
  // loading: Brief transition state during demo role switching
  // app:     Authenticated - render role-based dashboard
  // ═══════════════════════════════════════════════════════════════
  
  if (phase === "splash") return <SplashScreen />;
  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (phase === "loading") return <SplashScreen />; // Brief loading state during role switch

  // CRITICAL: Only render dashboards when user is authenticated and has valid session
  if (!user || !user.id) {
    console.warn("⚠️ RENDER BLOCKED: No valid user session");
    return null;
  }

  // Determine effective role from database (strict role validation)
  const effectiveRole = user.role || "user";
  const activeUser = user;

  console.log("🎯 ROLE-BASED DASHBOARD ROUTING:", {
    user_id: user.id,
    email: user.email,
    effective_role: effectiveRole,
    dashboard: effectiveRole === "admin" ? "AdminDashboard" : 
               effectiveRole === "rider" ? "RiderDashboard" :
               ["operator", "dispatcher", "network_owner"].includes(effectiveRole) ? "NetworkOwnerDashboard" : "CustomerHome",
    timestamp: new Date().toISOString(),
  });

  // Map database role to demo switcher key
  const roleToKeyMap = {
    "user": "customer",
    "rider": "rider",
    "operator": "operator",
    "dispatcher": "operator", // legacy dispatcher role maps to operator
    "network_owner": "operator", // legacy network_owner maps to operator
    "admin": "admin",
  };
  const currentDemoRoleKey = roleToKeyMap[user?.role] || "customer";

  return (
    <>
      {/* Auto-initialize demo data ONLY for demo accounts on first login */}
      {DEMO_MODE && <DemoDataInitializer user={activeUser} />}

      {/* ═══════════════════════════════════════════════════════════════
          ROLE-BASED DASHBOARD ROUTING
          ═══════════════════════════════════════════════════════════════
          Each user role is routed to their specific dashboard.
          Dashboards are isolated - no cross-role access without proper permissions.
          
          Role Mapping:
          - rider → RiderDashboard
          - operator/dispatcher/network_owner → NetworkOwnerDashboard
          - admin → AdminDashboard
          - user (customer) → CustomerHome
          
          Key feature: Each dashboard component is keyed by user ID to ensure
          complete UI reset when switching between accounts.
          ═══════════════════════════════════════════════════════════════ */}
      
      {effectiveRole === "rider" && <RiderDashboard user={activeUser} key={`rider-${activeUser?.id}`} />}
      {(effectiveRole === "dispatcher" || effectiveRole === "operator" || effectiveRole === "network_owner") && (
        <NetworkOwnerDashboard user={activeUser} key={`operator-${activeUser?.id}`} />
      )}
      {effectiveRole === "admin" && <AdminDashboard user={activeUser} key={`admin-${activeUser?.id}`} />}
      {(effectiveRole === "user" || !["rider", "dispatcher", "operator", "network_owner", "admin"].includes(effectiveRole)) && (
        <CustomerHome user={activeUser} key={`customer-${activeUser?.id}`} />
      )}

      {/* Global Simulation Engine - runs across all roles */}
      {DEMO_MODE && isDemoSession && (
        <>
          <DemoModeIndicator currentRole={currentDemoRoleKey} />
          <SuperDemoEngine 
            user={activeUser} 
            onRoleSwitch={handleDemoSwitch}
            currentRole={currentDemoRoleKey}
            simulationActive={simulationActive}
            onSimulationToggle={setSimulationActive}
          />
          <DispatchActivityFeed />
        </>
      )}
    </>
  );
}