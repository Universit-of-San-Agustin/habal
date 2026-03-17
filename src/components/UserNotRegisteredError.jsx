import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { LogOut } from 'lucide-react';

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const DEMO_ACCOUNTS = {
  Customer:   { email: "demo.customer@habal.app",   label: "🚖 Customer",   role: "user" },
  Rider:      { email: "demo.rider@habal.app",      label: "🏍 Rider",      role: "rider" },
  Dispatcher: { email: "demo.dispatcher@habal.app", label: "📋 Dispatcher", role: "dispatcher" },
  Operator:   { email: "demo.operator@habal.app",   label: "🏢 Operator",   role: "operator" },
  Admin:      { email: "demo.admin@habal.app",      label: "🛡 Admin",      role: "admin" },
};

const UserNotRegisteredError = ({ onDemoLogin }) => {
  const [demoLoading, setDemoLoading] = useState(null);

  const handleLogout = async () => {
    await base44.auth.logout(window.location.href);
  };

  const handleDemoRole = (roleName) => {
    const account = DEMO_ACCOUNTS[roleName];
    if (!account) return;

    const normalizedRole = account.role === "dispatcher" ? "operator" : account.role;
    localStorage.setItem("demo_mode", "true");
    localStorage.setItem("demo_role", normalizedRole);
    localStorage.setItem("base44_access_token", `demo-token-${Date.now()}`);

    setDemoLoading(roleName);
    // Redirect to Base44 login with the demo account email pre-filled
    // User will need to enter password: Demo@1234
    base44.auth.redirectToLogin(`${window.location.origin}${window.location.pathname}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full" style={{ background: `${PRIMARY}20` }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: PRIMARY }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Restricted</h1>
          <p className="text-slate-600 text-sm">
            You are not registered to use this application. Contact your administrator or try a demo account below.
          </p>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white rounded-3xl p-5 mb-4 border border-slate-100 shadow-sm">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: PRIMARY }}>Try a Demo Role</p>
          <p className="text-center text-[10px] text-gray-400 mb-4">Explore the app without registration</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(DEMO_ACCOUNTS).map(([roleName, account]) => (
              <button key={roleName} onClick={() => handleDemoRole(roleName)} disabled={demoLoading === roleName}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 ${roleName === "Admin" ? "col-span-2" : ""}`}
                style={{
                  background: "#f9fafb",
                  border: `1.5px solid rgba(77,200,240,0.25)`,
                  color: "#374151",
                  fontFamily: "'Poppins', sans-serif",
                }}>
                {demoLoading === roleName
                  ? <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: `rgba(77,200,240,0.3)`, borderTopColor: PRIMARY }} />
                  : account.label}
              </button>
            ))}
          </div>
          <p className="text-center text-[10px] text-gray-400 leading-relaxed">
            Click a role to login. Use the email shown and password: <span className="font-mono font-bold" style={{ color: PRIMARY }}>Demo@1234</span>
          </p>
        </div>

        {/* Logout Button */}
        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all"
          style={{
            borderColor: PRIMARY,
            color: PRIMARY,
            background: PRIMARY_BG,
          }}>
          <LogOut className="w-4 h-4" /> Try Another Account
        </button>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;