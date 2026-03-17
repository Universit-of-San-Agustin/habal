import React from "react";
import { Shield, Users, Bike, Building2, User, Lock, CheckCircle2, XCircle } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";

/**
 * HABAL Platform Routing Architecture
 * 
 * Complete documentation of authentication flow, role-based routing,
 * dashboard access, and permission system.
 */

const ROUTING_MAP = {
  authentication: {
    title: "Authentication Flow",
    description: "Entry point and session management",
    routes: [
      {
        path: "/",
        component: "Home.jsx → LoginScreen",
        access: "Public",
        behavior: "Default entry point - shows login for unauthenticated users",
        redirects: [
          "Unauthenticated → LoginScreen",
          "Authenticated → Role-based dashboard"
        ]
      },
      {
        path: "/login",
        component: "LoginScreen",
        access: "Public",
        behavior: "Email/password authentication via Base44 Auth",
        onSuccess: "Redirect to role-specific dashboard"
      }
    ]
  },

  dashboards: [
    {
      role: "user",
      displayName: "Customer",
      emoji: "👤",
      color: "#4DC8F0",
      component: "CustomerHome",
      path: "/customer/dashboard",
      description: "Customer booking and ride tracking interface",
      features: [
        "Book rides with pickup/dropoff selection",
        "Real-time rider tracking with live map",
        "Trip history and scheduled rides",
        "In-app messaging with assigned rider",
        "Wallet and payment management",
        "Ratings and feedback system",
        "Support ticket submission"
      ],
      permissions: {
        create: ["Booking", "SavedLocation", "SupportTicket", "Rating"],
        read: ["Booking (own)", "SavedLocation (own)", "Notification (own)", "PaymentMethod (own)"],
        update: ["Booking (cancel own)", "User (own profile)"],
        delete: ["SavedLocation (own)"]
      }
    },
    {
      role: "rider",
      displayName: "Rider",
      emoji: "🏍",
      color: "#10b981",
      component: "RiderDashboard",
      path: "/rider/dashboard",
      description: "Rider trip management and earnings dashboard",
      features: [
        "Receive and accept booking requests",
        "Real-time navigation to pickup/dropoff",
        "Update trip status (arrived, started, completed)",
        "Live GPS location broadcasting",
        "Earnings tracking and history",
        "Chat with customers",
        "Performance metrics and ratings"
      ],
      permissions: {
        create: ["RiderLocation", "ChatMessage", "BookingEvent"],
        read: ["Booking (assigned)", "Rider (own profile)", "Rating (own)"],
        update: ["Booking (status updates)", "Rider (own profile)", "RiderLocation (own)"],
        delete: []
      }
    },
    {
      role: "operator",
      displayName: "Operator / Dispatcher",
      emoji: "🏢",
      color: "#8b5cf6",
      component: "NetworkOwnerDashboard",
      path: "/operator/dashboard",
      description: "Network management and dispatch operations center",
      features: [
        "Manual booking dispatch to riders",
        "Live rider monitoring and location tracking",
        "Booking queue management",
        "Rider approval and verification",
        "Strike system enforcement",
        "Zone territory management",
        "Network analytics and performance",
        "Wallet and financial tracking"
      ],
      permissions: {
        create: ["Rider", "Strike", "WalletTransaction", "BookingEvent"],
        read: ["Network (own)", "Rider (network)", "Booking (network)", "Zone", "AuditLog (network)"],
        update: ["Rider (network)", "Booking (assign/reassign)", "Network (own)", "Zone (assigned)"],
        delete: []
      },
      notes: "Merged dispatcher and network_owner roles into unified operator role"
    },
    {
      role: "admin",
      displayName: "System Administrator",
      emoji: "🛡️",
      color: "#f59e0b",
      component: "AdminDashboard",
      path: "/admin/dashboard",
      description: "Platform-wide system management and oversight",
      features: [
        "Network approval and management",
        "Rider verification system",
        "Zone assignment and pricing",
        "Strike enforcement and appeals",
        "Platform-wide analytics",
        "Support ticket management",
        "Audit log monitoring",
        "System health checks",
        "User role management"
      ],
      permissions: {
        create: ["Network", "Zone", "Strike", "AuditLog", "WalletTransaction"],
        read: ["All entities (platform-wide)"],
        update: ["Network (status)", "Rider (status)", "Zone", "SupportTicket", "User (roles)"],
        delete: ["Strike (appeals)", "Network (ban)"]
      }
    }
  ],

  routeGuards: {
    title: "Route Guard System",
    description: "Role-based access control enforcement",
    implementation: "Home.jsx - effectiveRole-based rendering",
    rules: [
      {
        condition: "Unauthenticated user",
        action: "Force redirect to LoginScreen",
        enforcement: "base44.auth.me() check in useEffect"
      },
      {
        condition: "Authenticated with role=user",
        action: "Render CustomerHome",
        guard: "effectiveRole === 'user' || default case"
      },
      {
        condition: "Authenticated with role=rider",
        action: "Render RiderDashboard",
        guard: "effectiveRole === 'rider'"
      },
      {
        condition: "Authenticated with role=operator",
        action: "Render NetworkOwnerDashboard",
        guard: "effectiveRole === 'operator' || 'dispatcher' || 'network_owner'"
      },
      {
        condition: "Authenticated with role=admin",
        action: "Render AdminDashboard",
        guard: "effectiveRole === 'admin'"
      },
      {
        condition: "Invalid role or missing session",
        action: "Default to CustomerHome or redirect to login",
        guard: "Fallback case"
      }
    ],
    crossRoleAccess: {
      policy: "DENY by default",
      examples: [
        "Customer cannot access /operator → Blocked at component level",
        "Rider cannot access /admin → Blocked at component level",
        "Operator cannot modify other networks → Filtered by network_id in queries"
      ]
    }
  },

  rolePermissionMatrix: {
    title: "Detailed Permission Matrix",
    entities: [
      {
        entity: "Booking",
        customer: { create: true, read: "own", update: "cancel own", delete: false },
        rider: { create: false, read: "assigned", update: "status", delete: false },
        operator: { create: true, read: "network", update: "assign/reassign", delete: false },
        admin: { create: true, read: "all", update: "all", delete: false }
      },
      {
        entity: "Rider",
        customer: { create: false, read: "assigned only", update: false, delete: false },
        rider: { create: false, read: "own profile", update: "own profile", delete: false },
        operator: { create: true, read: "network", update: "network", delete: false },
        admin: { create: true, read: "all", update: "all", delete: "ban" }
      },
      {
        entity: "Network",
        customer: { create: false, read: false, update: false, delete: false },
        rider: { create: false, read: "own network", update: false, delete: false },
        operator: { create: false, read: "own", update: "own", delete: false },
        admin: { create: true, read: "all", update: "all", delete: "ban" }
      },
      {
        entity: "Zone",
        customer: { create: false, read: false, update: false, delete: false },
        rider: { create: false, read: "own zone", update: false, delete: false },
        operator: { create: false, read: "assigned", update: false, delete: false },
        admin: { create: true, read: "all", update: "all", delete: false }
      },
      {
        entity: "Strike",
        customer: { create: false, read: false, update: false, delete: false },
        rider: { create: false, read: "own", update: false, delete: false },
        operator: { create: true, read: "network", update: false, delete: false },
        admin: { create: true, read: "all", update: false, delete: "appeals" }
      },
      {
        entity: "AuditLog",
        customer: { create: false, read: false, update: false, delete: false },
        rider: { create: false, read: false, update: false, delete: false },
        operator: { create: true, read: "network", update: false, delete: false },
        admin: { create: true, read: "all", update: false, delete: false }
      }
    ]
  },

  sessionManagement: {
    title: "Session & Authentication",
    flow: [
      "User enters credentials in LoginScreen",
      "base44.auth.login() authenticates via Base44",
      "Session token stored in browser",
      "base44.auth.me() retrieves authenticated user",
      "User role read from User entity",
      "Dashboard rendered based on role",
      "Session persists until logout or expiration"
    ],
    storage: "Base44 SDK handles token storage automatically",
    logout: "base44.auth.logout() → Clear session → Redirect to login"
  },

  demoSystem: {
    title: "Demo Mode (Testing)",
    enabled: "DEMO_MODE constant in Home.jsx",
    accounts: [
      { email: "demo.customer@habal.app", role: "user" },
      { email: "demo.rider@habal.app", role: "rider" },
      { email: "demo.operator@habal.app", role: "operator" },
      { email: "demo.admin@habal.app", role: "admin" }
    ],
    switcher: "DemoRoleSwitcher component - updates User.role in DB",
    behavior: "Real database operations with is_demo_account flag",
    notes: "Demo accounts use production authentication and real DB records"
  }
};

export default function RoutingArchitecture() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: PRIMARY + "20" }}>
              🗺️
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HABAL Routing Architecture</h1>
              <p className="text-gray-500 mt-1">Complete system routing, role permissions, and access control documentation</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {ROUTING_MAP.dashboards.map(d => (
              <div key={d.role} className="text-center p-4 rounded-xl border border-gray-100"
                style={{ background: d.color + "10" }}>
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="font-bold text-sm" style={{ color: d.color }}>{d.displayName}</div>
                <div className="text-xs text-gray-500 mt-1">{d.component}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication Flow */}
        <Section title="Authentication Flow" icon="🔐">
          {ROUTING_MAP.authentication.routes.map((route, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-3 mb-2">
                <code className="bg-white px-3 py-1 rounded-lg text-sm font-mono font-bold text-blue-600 border border-gray-200">
                  {route.path}
                </code>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                  {route.access}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">{route.behavior}</div>
              {route.redirects && (
                <div className="space-y-1 ml-4">
                  {route.redirects.map((r, j) => (
                    <div key={j} className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="text-blue-500">→</span>
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* Dashboard Details */}
        <Section title="Role-Based Dashboards" icon="📊">
          <div className="grid gap-6">
            {ROUTING_MAP.dashboards.map(dashboard => (
              <div key={dashboard.role} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ background: dashboard.color + "20" }}>
                      {dashboard.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{dashboard.displayName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{dashboard.description}</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block font-mono">
                        {dashboard.component}
                      </code>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: dashboard.color + "20", color: dashboard.color }}>
                    role: {dashboard.role}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Features</div>
                    <ul className="space-y-2">
                      {dashboard.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Permissions</div>
                    <div className="space-y-3">
                      {Object.entries(dashboard.permissions).map(([action, entities]) => (
                        <div key={action}>
                          <div className="text-xs font-semibold text-gray-700 mb-1 capitalize">{action}</div>
                          <div className="flex flex-wrap gap-1">
                            {entities.map((e, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {dashboard.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    ℹ️ {dashboard.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Route Guards */}
        <Section title="Route Guard System" icon="🛡️">
          <div className="bg-gray-50 rounded-xl p-6 mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Implementation</div>
            <code className="bg-white px-4 py-2 rounded-lg text-sm font-mono block border border-gray-200">
              {ROUTING_MAP.routeGuards.implementation}
            </code>
          </div>

          <div className="space-y-3">
            {ROUTING_MAP.routeGuards.rules.map((rule, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm mb-1">{rule.condition}</div>
                    <div className="text-sm text-gray-600 mb-2">→ {rule.action}</div>
                    <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-gray-700 border border-gray-200">
                      {rule.guard || rule.enforcement}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="font-bold text-red-800 text-sm mb-2">🚫 Cross-Role Access Policy: DENY</div>
            <ul className="space-y-1">
              {ROUTING_MAP.routeGuards.crossRoleAccess.examples.map((ex, i) => (
                <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-3 h-3 flex-shrink-0" />
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Permission Matrix */}
        <Section title="Detailed Permission Matrix" icon="🔒">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-3 text-left font-bold">Entity</th>
                  {["Customer", "Rider", "Operator", "Admin"].map(role => (
                    <th key={role} className="border border-gray-200 px-4 py-3 text-center font-bold">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTING_MAP.rolePermissionMatrix.entities.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-200 px-4 py-3 font-mono font-semibold text-gray-900">
                      {row.entity}
                    </td>
                    {["customer", "rider", "operator", "admin"].map(role => (
                      <td key={role} className="border border-gray-200 px-4 py-3">
                        <PermissionCell perms={row[role]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Session Management */}
        <Section title="Session & Authentication" icon="🔑">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="space-y-3">
              {ROUTING_MAP.sessionManagement.flow.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
                    style={{ background: PRIMARY }}>
                    {i + 1}
                  </div>
                  <div className="text-sm text-gray-700">{step}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Storage</div>
                <div className="text-sm text-gray-700">{ROUTING_MAP.sessionManagement.storage}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">Logout</div>
                <div className="text-sm text-gray-700">{ROUTING_MAP.sessionManagement.logout}</div>
              </div>
            </div>
          </div>
        </Section>

        {/* Demo System */}
        <Section title="Demo Mode (Testing)" icon="🧪">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Demo Accounts</div>
                <div className="space-y-2">
                  {ROUTING_MAP.demoSystem.accounts.map((acc, i) => (
                    <div key={i} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between border border-purple-100">
                      <code className="text-xs font-mono text-gray-700">{acc.email}</code>
                      <span className="text-xs font-bold text-purple-600">{acc.role}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Behavior</div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span>{ROUTING_MAP.demoSystem.behavior}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span>DemoRoleSwitcher updates User.role in DB</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span>Production authentication with real sessions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PermissionCell({ perms }) {
  if (!perms) return <span className="text-gray-400">—</span>;
  
  return (
    <div className="space-y-1">
      {Object.entries(perms).map(([action, value]) => {
        const allowed = value === true || (typeof value === "string" && value !== "false");
        return (
          <div key={action} className="flex items-center justify-between text-xs">
            <span className="font-medium capitalize text-gray-600">{action}:</span>
            <span className={`font-semibold ${allowed ? "text-green-600" : "text-red-600"}`}>
              {typeof value === "string" ? value : value ? "✓" : "✗"}
            </span>
          </div>
        );
      })}
    </div>
  );
}