import React from "react";
import { ArrowRight, Database, Zap, Radio, Shield, Users, MapPin, Bell, MessageCircle } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const PURPLE = "#8b5cf6";

/**
 * HABAL SYSTEM ARCHITECTURE
 * 
 * Complete technical architecture documentation including:
 * - Authentication & session management
 * - Real-time GPS tracking system
 * - Dispatch & matching engine
 * - Operator monitoring dashboard
 * - Communication infrastructure
 */

const ARCHITECTURE = {
  overview: {
    title: "HABAL Platform Architecture",
    description: "Production ride-hailing system with real-time GPS tracking, automated dispatch, and role-based access control",
    components: [
      "React Frontend (Vite + TailwindCSS)",
      "Base44 Backend-as-a-Service",
      "Real-time WebSocket Layer",
      "Mapbox Geospatial Services",
      "PostgreSQL Database",
      "Deno Edge Functions"
    ]
  },

  authenticationFlow: {
    title: "Authentication & Session Management",
    description: "Unified OAuth-based authentication with role-based routing",
    steps: [
      {
        phase: "1. Initial Load",
        actors: ["User"],
        actions: [
          "User visits platform root URL",
          "SplashScreen displays (2.8s)",
          "System checks authentication state"
        ],
        technical: "base44.auth.me() → validates session token"
      },
      {
        phase: "2. Login Page",
        actors: ["User"],
        actions: [
          "User enters credentials OR clicks Google OAuth",
          "System redirects to Base44 Auth",
          "OAuth flow completes"
        ],
        technical: "base44.auth.redirectToLogin(returnUrl) → OAuth2 flow"
      },
      {
        phase: "3. Authentication",
        actors: ["Base44 Auth", "Database"],
        actions: [
          "Credentials validated",
          "Session token generated",
          "User record retrieved from DB",
          "Role extracted from User entity"
        ],
        technical: "JWT token stored in localStorage, role field read"
      },
      {
        phase: "4. Role-Based Routing",
        actors: ["Frontend Router"],
        actions: [
          "Check user.role field",
          "Route to appropriate dashboard:",
          "  • role='user' → CustomerHome",
          "  • role='rider' → RiderDashboard",
          "  • role='operator' → NetworkOwnerDashboard",
          "  • role='admin' → AdminDashboard"
        ],
        technical: "Home.jsx effectiveRole switch statement"
      },
      {
        phase: "5. Session Persistence",
        actors: ["Frontend"],
        actions: [
          "Session remains active across refreshes",
          "Auto-logout on token expiration",
          "Demo accounts support role switching"
        ],
        technical: "base44.auth.logout() clears session"
      }
    ],
    security: [
      "All API calls include Bearer token",
      "Role validation enforced at entity level",
      "Admin actions require role='admin' check",
      "Operators can only access own network data"
    ]
  },

  riderTrackingSystem: {
    title: "Real-Time GPS Tracking System",
    description: "Continuous location broadcasting with 2-3 second update intervals",
    components: [
      {
        name: "Rider GPS Broadcast",
        frequency: "2s (active trip) / 3s (idle online)",
        technology: "navigator.geolocation.watchPosition()",
        dataFlow: [
          "Rider enables online status",
          "GPS watch starts → browser Geolocation API",
          "Position acquired with high accuracy",
          "Location data broadcast to RiderLocation entity",
          "Includes: lat, lng, heading, speed, booking_id, status"
        ],
        implementation: "RiderDashboard.jsx useEffect hook (lines 59-97)"
      },
      {
        name: "Location Storage",
        entity: "RiderLocation",
        schema: {
          rider_id: "string",
          rider_name: "string",
          lat: "number",
          lng: "number",
          heading: "number",
          speed: "number",
          booking_id: "string (nullable)",
          status: "idle | en_route_pickup | en_route_dropoff"
        },
        persistence: "Upsert pattern - update existing record or create new"
      },
      {
        name: "Operator Live Map",
        component: "LiveMapMonitor",
        features: [
          "Real-time rider marker updates",
          "Shows all riders in network",
          "Color-coded status indicators:",
          "  • Green = online/idle",
          "  • Blue = on active trip",
          "  • Gray = offline",
          "Auto-refresh every 2-3 seconds",
          "Smooth marker transitions"
        ],
        technology: "Mapbox GL JS + polling interval"
      },
      {
        name: "Customer Live Tracking",
        component: "LiveRideMap",
        features: [
          "Shows rider location during active trip",
          "Displays route geometry from pickup → dropoff",
          "ETA calculation based on current position",
          "Updates every 2s for smooth animation"
        ],
        technology: "Mapbox Directions API + RiderLocation polling"
      }
    ],
    performance: {
      updateFrequency: "2-3 seconds",
      accuracy: "High accuracy GPS (enableHighAccuracy: true)",
      batteryOptimization: "Stops tracking when rider goes offline",
      errorHandling: "Automatic retry on GPS failure"
    }
  },

  dispatchEngine: {
    title: "Automated Dispatch & Matching Engine",
    description: "Intelligent rider assignment with zone-based routing and real-time notifications",
    workflow: [
      {
        step: "1. Booking Creation",
        trigger: "Customer submits ride request",
        actions: [
          "Create Booking entity (status: 'pending')",
          "Extract zone from pickup address",
          "Calculate fare estimate via calculateFare function",
          "Log BookingEvent: BOOKING_CREATED"
        ],
        data: {
          customer_name: "string",
          pickup_address: "string",
          dropoff_address: "string",
          zone: "enum (Jaro, Mandurriao, etc.)",
          fare_estimate: "number",
          payment_method: "cash | gcash"
        }
      },
      {
        step: "2. Rider Notification Broadcast",
        trigger: "notifyRidersOfBooking backend function",
        logic: [
          "Query all riders in same zone as booking",
          "Filter: status='active' AND online_status='online'",
          "For each eligible rider:",
          "  • Create Notification entity",
          "  • Set reference_id to booking DB id",
          "  • Mark read_status=false",
          "Desktop notification sent to operators"
        ],
        implementation: "functions/notifyRidersOfBooking.js"
      },
      {
        step: "3. Rider Discovery",
        trigger: "Rider polls for notifications (2s interval)",
        actions: [
          "Query: Notification.filter({ user_id: rider.id, type: 'booking', read_status: false })",
          "Fetch referenced Booking entity",
          "Display popup with 30s countdown timer",
          "Mark notification as read immediately"
        ],
        ui: "IncomingPopup component in RiderDashboard"
      },
      {
        step: "4. Rider Acceptance",
        trigger: "Rider clicks 'Accept' button",
        actions: [
          "Update Booking: status='assigned', rider_id, rider_name",
          "Update Rider: online_status='on_trip'",
          "Log BookingEvent: RIDER_ACCEPTED",
          "Clear notification timeout",
          "Show trip map with navigation"
        ],
        race_condition: "First rider to accept wins - others get stale booking notification"
      },
      {
        step: "5. Trip Status Updates",
        trigger: "Rider taps status buttons",
        progression: [
          "assigned → otw (Rider en route to pickup)",
          "otw → arrived (Rider at pickup location)",
          "arrived → in_progress (Customer onboard)",
          "in_progress → completed (Trip finished)"
        ],
        events: "BookingEvent logged at each transition"
      },
      {
        step: "6. Fallback: Manual Assignment",
        trigger: "Operator assigns rider manually",
        actions: [
          "Operator selects booking from inbox",
          "Chooses available online rider",
          "System updates Booking with rider details",
          "Logs BookingEvent: RIDER_ASSIGNED (actor: operator)"
        ],
        ui: "NetworkOwnerDashboard booking actions"
      }
    ],
    algorithms: {
      zoneMatching: "Riders only notified for bookings in their assigned zone",
      raceCondition: "Optimistic locking - first accept wins, others retry",
      timeout: "30s auto-decline if rider doesn't respond",
      fallback: "Operator manual dispatch if no riders available"
    }
  },

  operatorMonitoring: {
    title: "Operator Management Dashboard",
    description: "Real-time network oversight with rider tracking and booking management",
    features: [
      {
        name: "Live Map Monitor",
        component: "LiveMapMonitor.jsx",
        capabilities: [
          "View all riders in network on map",
          "Real-time location updates (2-3s refresh)",
          "Status indicators (online/on_trip/offline)",
          "Click rider marker for details",
          "Active trip route visualization"
        ],
        dataSource: "RiderLocation entity + Booking entity"
      },
      {
        name: "Booking Inbox",
        tab: "bookings",
        features: [
          "Unified queue of all network bookings",
          "Filter by status (pending/active/completed)",
          "Manual rider assignment interface",
          "Broadcast to all available riders",
          "Live tracking button for active trips",
          "Chat with customer/rider"
        ],
        actions: [
          "Assign rider manually",
          "Broadcast booking",
          "Track live location",
          "Open chat panel"
        ]
      },
      {
        name: "Rider Directory",
        tab: "members",
        features: [
          "Complete rider roster",
          "Verification queue (pending → active)",
          "Online/offline status indicators",
          "Performance metrics (trips, rating, strikes)",
          "Issue strikes/suspend riders",
          "View detailed rider profiles"
        ],
        management: [
          "Verify pending riders",
          "Issue strikes for violations",
          "Suspend/reactivate riders",
          "Monitor rider activity"
        ]
      },
      {
        name: "Analytics Dashboard",
        tab: "analytics",
        metrics: [
          "Completion rate (target ≥85%)",
          "Cancellation rate (target ≤15%)",
          "Total revenue (all-time)",
          "Average customer rating",
          "Booking breakdown by status",
          "Top performer leaderboard"
        ],
        visualization: "Bar charts + progress indicators"
      },
      {
        name: "Zone Management",
        tab: "zone",
        features: [
          "Territory assignment display",
          "Network subscription status",
          "Rider seat allocation",
          "Strike log for network"
        ]
      },
      {
        name: "Wallet",
        tab: "wallet",
        features: [
          "Network balance tracking",
          "Threshold warnings",
          "Revenue summary",
          "Strike/penalty log"
        ]
      }
    ],
    realTimeUpdates: {
      polling: "8s interval for booking/rider data refresh",
      notifications: "Toast alerts for new bookings",
      liveMap: "Separate component with 2-3s GPS polling"
    }
  },

  communicationInfrastructure: {
    title: "Real-Time Communication System",
    description: "Multi-channel messaging and notification delivery",
    channels: [
      {
        type: "In-App Chat",
        component: "ChatPanel / CommunicationPanel",
        technology: "ChatMessage entity + polling",
        features: [
          "Customer ↔ Rider direct messaging",
          "Operator can view conversations",
          "Message history persistence",
          "Real-time delivery (2s poll)"
        ],
        schema: {
          booking_id: "string",
          sender_id: "string",
          sender_role: "customer | rider | operator",
          message: "string",
          timestamp: "ISO datetime"
        }
      },
      {
        type: "Push Notifications",
        entity: "Notification",
        triggers: [
          "New booking → Rider notification",
          "Rider assigned → Customer notification",
          "Rider arrived → Customer notification",
          "Trip completed → Rating request"
        ],
        delivery: "Browser notifications (desktop) + in-app toast"
      },
      {
        type: "SMS/Email (Optional)",
        integration: "Core.SendEmail",
        useCases: [
          "Booking confirmation",
          "Trip receipt",
          "Password reset"
        ]
      }
    ],
    notificationFlow: [
      "Event occurs (e.g., booking created)",
      "Backend creates Notification entity",
      "Frontend polls for unread notifications",
      "Toast displayed + optional sound",
      "Notification marked read on view"
    ]
  },

  dataModel: {
    title: "Core Data Entities",
    description: "PostgreSQL schema via Base44 entity system",
    entities: [
      {
        name: "User",
        role: "Authentication",
        fields: [
          "id (auto)",
          "email",
          "full_name",
          "role: user | rider | operator | admin",
          "is_demo_account: boolean"
        ],
        security: "Built-in: only admins can modify other users"
      },
      {
        name: "Booking",
        role: "Trip Management",
        fields: [
          "booking_id (custom)",
          "customer_name, customer_phone",
          "pickup_address, dropoff_address",
          "zone: enum",
          "status: pending | searching | assigned | otw | arrived | in_progress | completed | cancelled",
          "rider_id, rider_name",
          "network_id, dispatcher_id",
          "fare_estimate, payment_method",
          "notes (customer instructions)"
        ]
      },
      {
        name: "Rider",
        role: "Driver Profiles",
        fields: [
          "full_name, email, phone",
          "network_id",
          "status: pending | active | suspended",
          "online_status: online | offline | on_trip",
          "motorcycle details, plate_number",
          "completed_trips, avg_rating, strikes"
        ]
      },
      {
        name: "RiderLocation",
        role: "GPS Tracking",
        fields: [
          "rider_id",
          "lat, lng, heading, speed",
          "booking_id (nullable)",
          "status: idle | en_route_pickup | en_route_dropoff"
        ],
        update: "Upsert every 2-3s during online status"
      },
      {
        name: "Network",
        role: "Operator Organizations",
        fields: [
          "name, owner_email",
          "zone (territory)",
          "status: pending | approved | suspended",
          "wallet_balance, active_rider_seats",
          "completed_bookings, avg_rating"
        ]
      },
      {
        name: "Notification",
        role: "Push Notifications",
        fields: [
          "user_id, user_type",
          "title, message",
          "type: booking | trip | alert",
          "read_status: boolean",
          "reference_id (linked entity)"
        ]
      },
      {
        name: "BookingEvent",
        role: "Audit Trail",
        fields: [
          "booking_id",
          "event_type: BOOKING_CREATED | RIDER_ACCEPTED | TRIP_STARTED | etc.",
          "actor_role, actor_name",
          "timestamp"
        ]
      },
      {
        name: "AuditLog",
        role: "System Audit",
        fields: [
          "log_type: admin_action | booking_event | rider_activity",
          "action, actor_id, actor_role",
          "target_type, target_id",
          "details, timestamp"
        ]
      }
    ]
  },

  backendFunctions: {
    title: "Deno Edge Functions",
    description: "Serverless backend functions for complex operations",
    functions: [
      {
        name: "calculateFare",
        purpose: "Compute trip fare + route geometry",
        inputs: "pickup_coords, dropoff_coords, addresses",
        logic: [
          "Call Mapbox Directions API (server-side MAPBOX_TOKEN)",
          "Extract distance (km) and duration (min)",
          "Apply fare formula: base + (km × rate) + (min × rate)",
          "Return: fare, distance, duration, route geometry"
        ],
        security: "MAPBOX_TOKEN kept secret (not exposed to frontend)"
      },
      {
        name: "notifyRidersOfBooking",
        purpose: "Broadcast booking to eligible riders",
        inputs: "booking_id (DB id)",
        logic: [
          "Fetch booking from DB",
          "Query riders: network_id, zone match, status=active, online_status=online",
          "For each rider: create Notification entity",
          "Return count of notified riders"
        ],
        called: "Automatically after booking creation"
      },
      {
        name: "matchRider",
        purpose: "Intelligent rider assignment",
        inputs: "booking_id",
        logic: [
          "Fetch booking + available riders in zone",
          "Score riders by: proximity, rating, acceptance_rate",
          "Assign top-ranked rider",
          "Create notification + update booking"
        ],
        fallback: "Manual operator assignment if no match"
      },
      {
        name: "recordRating",
        purpose: "Process customer feedback",
        inputs: "booking_id, rating, comment",
        logic: [
          "Update Booking.customer_rating",
          "Recalculate Rider.avg_rating",
          "Store in Rating entity for analytics"
        ]
      },
      {
        name: "getRouteGeometry",
        purpose: "Fetch route polyline for map display",
        inputs: "coordinates: [[lng, lat], [lng, lat]]",
        output: "GeoJSON geometry for route line",
        technology: "Mapbox Directions API"
      }
    ],
    deployment: "Deno Deploy (edge runtime)",
    authentication: "Service role for DB access, user token validation"
  },

  integrations: {
    title: "External Service Integrations",
    services: [
      {
        name: "Mapbox",
        usage: [
          "Map rendering (Mapbox GL JS)",
          "Geocoding (address → coordinates)",
          "Reverse geocoding (coordinates → address)",
          "Directions API (route calculation)",
          "Distance Matrix API (ETA calculation)"
        ],
        tokens: [
          "MAPBOX_TOKEN (server-side, secret)",
          "Public token (client-side, restricted)"
        ]
      },
      {
        name: "Base44 Core",
        integrations: [
          "InvokeLLM (AI-powered features)",
          "SendEmail (transactional emails)",
          "UploadFile (rider documents)",
          "GenerateImage (profile pictures)"
        ]
      }
    ]
  },

  deploymentArchitecture: {
    title: "Production Deployment",
    infrastructure: [
      "Frontend: Vite build → Static hosting (CDN)",
      "Backend: Base44 managed infrastructure",
      "Database: PostgreSQL (Base44 managed)",
      "Edge Functions: Deno Deploy",
      "File Storage: Base44 object storage",
      "Authentication: Base44 OAuth2"
    ],
    scaling: [
      "Frontend: CDN edge caching",
      "Database: Automatic connection pooling",
      "Functions: Auto-scale on demand",
      "WebSockets: Load-balanced real-time layer"
    ],
    monitoring: [
      "Frontend: Browser console + error tracking",
      "Backend: Function logs + performance metrics",
      "Database: Query performance monitoring",
      "GPS: Location update frequency tracking"
    ]
  }
};

export default function SystemArchitecture() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
              🏗️
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-black text-gray-900 mb-2">{ARCHITECTURE.overview.title}</h1>
              <p className="text-gray-600 text-lg mb-4">{ARCHITECTURE.overview.description}</p>
              <div className="flex flex-wrap gap-2">
                {ARCHITECTURE.overview.components.map((comp, i) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Flow */}
        <Section title="Authentication & Session Management" icon="🔐" color={PURPLE}>
          <p className="text-gray-600 mb-6">{ARCHITECTURE.authenticationFlow.description}</p>
          <div className="space-y-4">
            {ARCHITECTURE.authenticationFlow.steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-lg"
                    style={{ background: PURPLE }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{step.phase}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{step.actors.join(", ")}</span>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {step.actions.map((action, j) => (
                        <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono text-gray-700">{step.technical}</code>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-red-900">Security Measures</h4>
            </div>
            <ul className="space-y-2">
              {ARCHITECTURE.authenticationFlow.security.map((measure, i) => (
                <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-500">✓</span>
                  <span>{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* GPS Tracking System */}
        <Section title="Real-Time GPS Tracking System" icon="📍" color={GREEN}>
          <p className="text-gray-600 mb-6">{ARCHITECTURE.riderTrackingSystem.description}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {ARCHITECTURE.riderTrackingSystem.components.map((comp, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN + "20" }}>
                    <MapPin className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h4 className="font-bold text-gray-900">{comp.name}</h4>
                </div>
                {comp.frequency && (
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600">Update: {comp.frequency}</span>
                  </div>
                )}
                {comp.technology && (
                  <div className="mb-3 bg-blue-50 rounded-lg px-3 py-2">
                    <code className="text-xs font-mono text-blue-700">{comp.technology}</code>
                  </div>
                )}
                {comp.dataFlow && (
                  <ul className="space-y-1.5 mb-3">
                    {comp.dataFlow.map((flow, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500 flex-shrink-0">→</span>
                        <span>{flow}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {comp.schema && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-gray-500 mb-2">Schema:</div>
                    {Object.entries(comp.schema).map(([key, type]) => (
                      <div key={key} className="text-xs font-mono text-gray-700">
                        <span className="text-blue-600">{key}</span>: <span className="text-gray-500">{type}</span>
                      </div>
                    ))}
                  </div>
                )}
                {comp.features && (
                  <ul className="space-y-1.5">
                    {comp.features.map((feat, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {comp.implementation && (
                  <div className="mt-3 text-xs text-gray-500">
                    📝 {comp.implementation}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 grid md:grid-cols-4 gap-4">
            {Object.entries(ARCHITECTURE.riderTrackingSystem.performance).map(([key, value]) => (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                <div className="font-bold text-gray-900 text-sm">{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Dispatch Engine */}
        <Section title="Automated Dispatch & Matching Engine" icon="⚡" color={AMBER}>
          <p className="text-gray-600 mb-6">{ARCHITECTURE.dispatchEngine.description}</p>
          <div className="space-y-4">
            {ARCHITECTURE.dispatchEngine.workflow.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white"
                    style={{ background: AMBER }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-2">{step.step}</h4>
                    {step.trigger && (
                      <div className="mb-3 flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-600">Trigger: <span className="font-semibold text-gray-800">{step.trigger}</span></span>
                      </div>
                    )}
                    {step.actions && (
                      <ul className="space-y-1.5 mb-3">
                        {step.actions.map((action, j) => (
                          <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.logic && (
                      <div className="bg-amber-50 rounded-lg p-3 mb-3">
                        <div className="text-xs font-bold text-amber-900 mb-2">Logic:</div>
                        <ul className="space-y-1">
                          {step.logic.map((line, j) => (
                            <li key={j} className="text-xs font-mono text-gray-700">{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.data && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="text-xs font-bold text-gray-700 mb-2">Data Structure:</div>
                        {Object.entries(step.data).map(([key, type]) => (
                          <div key={key} className="text-xs font-mono text-gray-700">
                            <span className="text-blue-600">{key}</span>: <span className="text-gray-500">{type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {step.progression && (
                      <div className="flex flex-wrap items-center gap-2">
                        {step.progression.map((stage, j) => (
                          <React.Fragment key={j}>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{stage}</span>
                            {j < step.progression.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    {step.implementation && (
                      <div className="text-xs text-gray-500 mt-2">📄 {step.implementation}</div>
                    )}
                    {step.ui && (
                      <div className="text-xs text-purple-600 mt-2">🎨 UI: {step.ui}</div>
                    )}
                    {step.race_condition && (
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <span className="text-xs text-red-700">⚠️ {step.race_condition}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {Object.entries(ARCHITECTURE.dispatchEngine.algorithms).map(([name, desc]) => (
              <div key={name} className="bg-white rounded-2xl border border-gray-100 p-4">
                <h5 className="font-bold text-gray-900 text-sm mb-2 capitalize">{name.replace(/([A-Z])/g, ' $1')}</h5>
                <p className="text-sm text-gray-700">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Operator Monitoring */}
        <Section title="Operator Management Dashboard" icon="👁️" color={PRIMARY}>
          <p className="text-gray-600 mb-6">{ARCHITECTURE.operatorMonitoring.description}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {ARCHITECTURE.operatorMonitoring.features.map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="font-bold text-gray-900 text-base mb-3">{feature.name}</h4>
                {feature.component && (
                  <div className="mb-3 text-xs bg-blue-50 px-2 py-1 rounded inline-block">
                    <code className="text-blue-700">{feature.component}</code>
                  </div>
                )}
                {feature.tab && (
                  <div className="mb-3 text-xs bg-purple-50 px-2 py-1 rounded inline-block">
                    Tab: <code className="text-purple-700">{feature.tab}</code>
                  </div>
                )}
                {feature.capabilities && (
                  <ul className="space-y-1.5 mb-3">
                    {feature.capabilities.map((cap, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 flex-shrink-0">•</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {feature.features && (
                  <ul className="space-y-1.5 mb-3">
                    {feature.features.map((feat, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 flex-shrink-0">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {feature.metrics && (
                  <div className="grid grid-cols-2 gap-2">
                    {feature.metrics.map((metric, j) => (
                      <div key={j} className="bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700">
                        {metric}
                      </div>
                    ))}
                  </div>
                )}
                {feature.dataSource && (
                  <div className="mt-3 text-xs text-gray-500">
                    <Database className="w-3 h-3 inline mr-1" />
                    {feature.dataSource}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Real-Time Updates
            </h4>
            {Object.entries(ARCHITECTURE.operatorMonitoring.realTimeUpdates).map(([key, value]) => (
              <div key={key} className="text-sm text-blue-800 mb-1">
                <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Communication */}
        <Section title="Communication Infrastructure" icon="💬" color="#6366f1">
          <p className="text-gray-600 mb-6">{ARCHITECTURE.communicationInfrastructure.description}</p>
          <div className="space-y-6">
            {ARCHITECTURE.communicationInfrastructure.channels.map((channel, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-6 h-6 text-indigo-500" />
                  <h4 className="font-bold text-gray-900 text-lg">{channel.type}</h4>
                </div>
                {channel.component && (
                  <div className="mb-3 text-sm bg-indigo-50 px-3 py-1.5 rounded inline-block">
                    <code className="text-indigo-700">{channel.component}</code>
                  </div>
                )}
                {channel.technology && (
                  <div className="mb-3 text-sm text-gray-600">
                    <span className="font-semibold">Technology:</span> {channel.technology}
                  </div>
                )}
                {channel.features && (
                  <ul className="space-y-1.5 mb-3">
                    {channel.features.map((feat, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-indigo-500 flex-shrink-0">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {channel.schema && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-gray-700 mb-2">Message Schema:</div>
                    {Object.entries(channel.schema).map(([key, type]) => (
                      <div key={key} className="text-xs font-mono text-gray-700">
                        <span className="text-blue-600">{key}</span>: <span className="text-gray-500">{type}</span>
                      </div>
                    ))}
                  </div>
                )}
                {channel.entity && (
                  <div className="text-xs text-gray-500 mt-2">
                    <Database className="w-3 h-3 inline mr-1" />
                    Entity: {channel.entity}
                  </div>
                )}
                {channel.triggers && (
                  <div className="mt-3 bg-amber-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-amber-900 mb-2">Notification Triggers:</div>
                    <ul className="space-y-1">
                      {channel.triggers.map((trigger, j) => (
                        <li key={j} className="text-xs text-amber-800">{trigger}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Data Model */}
        <Section title="Core Data Entities" icon="🗄️" color="#8b5cf6">
          <p className="text-gray-600 mb-6">{ARCHITECTURE.dataModel.description}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {ARCHITECTURE.dataModel.entities.map((entity, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900">{entity.name}</h4>
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-semibold">
                    {entity.role}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {entity.fields.map((field, j) => (
                    <div key={j} className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                      {field}
                    </div>
                  ))}
                </div>
                {entity.update && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    🔄 {entity.update}
                  </div>
                )}
                {entity.security && (
                  <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    🔒 {entity.security}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Backend Functions */}
        <Section title="Deno Edge Functions" icon="⚙️" color="#10b981">
          <p className="text-gray-600 mb-6">{ARCHITECTURE.backendFunctions.description}</p>
          <div className="space-y-4">
            {ARCHITECTURE.backendFunctions.functions.map((fn, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: GREEN + "20" }}>
                    <Zap className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{fn.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{fn.purpose}</p>
                    {fn.inputs && (
                      <div className="mb-2">
                        <span className="text-xs font-bold text-gray-500">Inputs:</span>
                        <code className="text-xs bg-gray-50 px-2 py-1 rounded ml-2 text-gray-700">{fn.inputs}</code>
                      </div>
                    )}
                    {fn.logic && (
                      <ul className="space-y-1 mb-2">
                        {fn.logic.map((step, j) => (
                          <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-500 flex-shrink-0">→</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {fn.security && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                        🔒 {fn.security}
                      </div>
                    )}
                    {fn.called && (
                      <div className="text-xs text-blue-600 mt-2">📞 {fn.called}</div>
                    )}
                    {fn.fallback && (
                      <div className="text-xs text-amber-600 mt-2">⚠️ {fn.fallback}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: color + "20" }}>
          {icon}
        </div>
        <h2 className="text-3xl font-black text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}