import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff } from "lucide-react";

import { COLORS, SHADOWS, RADIUS } from "../shared/AppleDesignTokens";

const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";
const PRIMARY = COLORS.primary;
const PRIMARY_DARK = COLORS.primaryDark;
const PRIMARY_BG = COLORS.primaryBg;

const PHONE_RE = /^(\+63|0)9\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Demo account credentials
const DEMO_ACCOUNTS = {
  customer: { email: "demo.customer@habal.app", password: "Demo@1234" },
  rider: { email: "demo.rider@habal.app", password: "Demo@1234" },
  operator: { email: "demo.operator@habal.app", password: "Demo@1234" },
  admin: { email: "demo.admin@habal.app", password: "Demo@1234" },
};

export default function LoginScreen({ onLogin }) {
  const [screen, setScreen]   = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState("");
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    firstName: "", lastName: "", username: "", phone: "", dob: "",
    otp: ["", "", "", "", "", ""],
  });
  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setError(""); };

  const handleRealAuth = () => {
    setLoading(true);
    // Redirect to Base44 OAuth - will return to current URL after authentication
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");
    
    // For demo: Set demo mode flag and navigate directly to home
    // This bypasses OAuth and uses demo session detection in Home.jsx
    console.log("🧪 DEMO LOGIN: Enabling demo mode");
    localStorage.setItem("demo_mode", "true");
    localStorage.setItem("demo_role", "customer");
    localStorage.setItem("base44_access_token", "demo-token-" + Date.now());
    
    // Navigate to home - Home.jsx will detect demo_mode flag and load CustomerHome
    setTimeout(() => {
      window.location.assign(`${window.location.pathname}#/`);
    }, 200);
  };

  const handleLogin = () => {
    if (!form.phone && !form.email) { setError("Please enter your phone number or email."); return; }
    if (!form.password) { setError("Please enter your password."); return; }
    handleRealAuth();
  };

  const handleRegister = () => {
    if (!form.firstName || !form.lastName) { setError("Please enter your full name."); return; }
    if (!form.email || !EMAIL_RE.test(form.email)) { setError("Please enter a valid email address."); return; }
    if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, ""))) { setError("Phone must be a valid PH number (e.g. 09XX XXX XXXX)."); return; }
    if (!form.password || form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    handleRealAuth();
  };

  const handleForgot = () => {
    if (!form.email || !EMAIL_RE.test(form.email)) { setError("Please enter a valid email address."); return; }
    setError("");
    handleRealAuth(); // Routes to the real auth provider which handles password reset
  };

  const handleOtpVerify = () => {
    const code = form.otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setScreen("otp_success");
  };

  // ── REGISTER ─────────────────────────────────────────────────
  if (screen === "register") {
    return (
      <Shell>
        <Logo />
        <Heading title="Create Account" sub="Join Habal and book rides instantly" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field placeholder="First Name" value={form.firstName} onChange={v => set("firstName", v)} />
            <Field placeholder="Last Name"  value={form.lastName}  onChange={v => set("lastName", v)} />
          </div>
          <Field placeholder="Username"    value={form.username} onChange={v => set("username", v)} />
          <Field placeholder="Email"       type="email" value={form.email} onChange={v => set("email", v)} />
          <Field placeholder="Mobile (+63 9XX XXX XXXX)" type="tel" value={form.phone} onChange={v => set("phone", v)} />
          <Field placeholder="Password (min 8 chars)" type={showPass ? "text" : "password"} value={form.password} onChange={v => set("password", v)}
            suffix={<button type="button" onClick={() => setShowPass(p => !p)}>
              {showPass ? <EyeOff className="w-4 h-4 text-gray-300" /> : <Eye className="w-4 h-4 text-gray-300" />}
            </button>} />
          <Field placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} />
        </div>
        {error && <p className="text-red-500 text-xs mt-3 text-center">{error}</p>}
        <Btn onClick={handleRegister} loading={loading} className="mt-4">Create Account</Btn>
        <p className="text-center text-gray-400 text-sm mt-5">
          Already have an account?{" "}
          <button onClick={() => { setScreen("login"); setError(""); }} className="font-semibold" style={{ color: PRIMARY }}>Sign In</button>
        </p>
      </Shell>
    );
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────
  if (screen === "forgot") {
    return (
      <Shell>
        <Logo />
        <Heading title="Forgot Password?" sub="Enter your email and we'll send a reset link" />
        <Field placeholder="Email address" type="email" value={form.email} onChange={v => set("email", v)} />
        {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
        <Btn onClick={handleForgot} className="mt-5">Send Reset Link</Btn>
        <p className="text-center text-gray-400 text-sm mt-5">
          <button onClick={() => { setScreen("login"); setError(""); }} className="font-semibold" style={{ color: PRIMARY }}>← Back to Sign In</button>
        </p>
      </Shell>
    );
  }

  // ── OTP ──────────────────────────────────────────────────────
  if (screen === "otp") {
    return (
      <Shell>
        <Logo />
        <Heading title="Verify Your Email" sub="Enter the 6-digit code we sent you" />
        <div className="flex justify-center gap-2 mb-6">
          {form.otp.map((v, i) => (
            <input key={i} id={`otp-${i}`} maxLength={1} value={v}
              onChange={e => {
                const arr = [...form.otp]; arr[i] = e.target.value;
                set("otp", arr);
                if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
              }}
              className="w-11 h-13 text-center text-gray-800 text-xl font-bold rounded-2xl border-2 focus:outline-none transition-all"
              style={{
                height: 52, background: PRIMARY_BG,
                borderColor: v ? PRIMARY : "rgba(77,200,240,0.25)",
                boxShadow: v ? `0 0 0 3px rgba(77,200,240,0.15)` : "none",
              }}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}
        <p className="text-center text-gray-400 text-xs mb-5">
          Didn't receive it?{" "}
          <button onClick={() => set("otp", ["","","","","",""])} className="font-semibold" style={{ color: PRIMARY }}>Resend Code</button>
        </p>
        <Btn onClick={handleOtpVerify}>Verify</Btn>
        <p className="text-center text-gray-400 text-sm mt-4">
          <button onClick={() => setScreen("login")} className="font-semibold" style={{ color: PRIMARY }}>← Back to Sign In</button>
        </p>
      </Shell>
    );
  }

  // ── OTP SUCCESS ──────────────────────────────────────────────
  if (screen === "otp_success") {
    return (
      <Shell center>
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: PRIMARY_BG }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `rgba(77,200,240,0.2)` }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                  style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                  ✓
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verified!</h2>
          <p className="text-gray-400 text-sm text-center mb-8 max-w-xs">
            Your identity has been confirmed. You can now set a new password.
          </p>
          <Btn onClick={() => setScreen("new_password")} className="w-full">Continue</Btn>
        </div>
      </Shell>
    );
  }

  // ── NEW PASSWORD ─────────────────────────────────────────────
  if (screen === "new_password") {
    const handleSavePassword = () => {
      if (!form.password || form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
      handleRealAuth();
    };
    return (
      <Shell>
        <Logo />
        <Heading title="Set New Password" sub="Choose a strong password for your account" />
        <div className="space-y-3">
          <Field label="New Password" placeholder="Min 8 characters" type="password" value={form.password} onChange={v => set("password", v)} />
          <Field label="Confirm Password" placeholder="••••••••" type="password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} />
          {/* Password strength */}
          {form.password && (
            <div className="space-y-1">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all"
                  style={{
                    width: form.password.length >= 12 ? "100%" : form.password.length >= 8 ? "60%" : "30%",
                    background: form.password.length >= 12 ? "#10b981" : form.password.length >= 8 ? PRIMARY : "#ef4444",
                  }} />
              </div>
              <p className="text-xs text-gray-400">{form.password.length >= 12 ? "Strong ✓" : form.password.length >= 8 ? "Good" : "Too short"}</p>
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
        <Btn onClick={handleSavePassword} loading={loading} className="mt-6">Save Password</Btn>
      </Shell>
    );
  }

  // ── LOGIN (default) ──────────────────────────────────────────
  return (
    <Shell>
      <Logo />
      <Heading title="Welcome Back!" sub="Sign in to continue your journey" />

      <div className="space-y-3">
        <Field label="Phone Number" placeholder="+63 9XX XXX XXXX" type="tel"
          value={form.phone} onChange={v => set("phone", v)} />
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-gray-500">Password</label>
            <button onClick={() => setScreen("forgot")} className="text-xs font-semibold hover:underline"
              style={{ color: PRIMARY }}>Forgot Password?</button>
          </div>
          <div className="relative">
            <input type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password}
              onChange={e => set("password", e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl text-gray-800 placeholder-gray-300 text-sm focus:outline-none transition-all"
              style={{
                background: "#f8fbfd", border: "1.5px solid #e2ecf2",
                fontFamily: "'Poppins', sans-serif",
              }}
              onFocus={e => { e.target.style.borderColor = PRIMARY; e.target.style.boxShadow = "0 0 0 3px rgba(77,200,240,0.15)"; }}
              onBlur={e =>  { e.target.style.borderColor = "#e2ecf2"; e.target.style.boxShadow = "none"; }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showPass ? <EyeOff className="w-4 h-4 text-gray-300" /> : <Eye className="w-4 h-4 text-gray-300" />}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
      <Btn onClick={handleLogin} loading={loading} className="mt-4">Sign In</Btn>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-300 font-medium">or continue with</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Social */}
      <div className="flex justify-center gap-4 mb-6">
         <button onClick={handleRealAuth}
           className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center transition-shadow hover:shadow-md"
           title="Sign in with Google"
           style={{ border: "1.5px solid #e8f0f5", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
           <span className="text-base font-bold" style={{ color: "#4285F4" }}>G</span>
         </button>
       </div>

       {/* Demo Button */}
       <button onClick={handleDemoLogin} disabled={loading}
         className="w-full py-3 rounded-full font-bold text-sm transition-all disabled:opacity-50 mb-6"
         style={{
           background: "#f3f4f6",
           color: "#4b5563",
           border: "1.5px solid #e5e7eb",
         }}>
         {loading ? "Loading..." : "Try Demo"}
       </button>

       <p className="text-center text-gray-400 text-sm">
         Don't have an account?{" "}
         <button onClick={() => setScreen("register")} className="font-semibold" style={{ color: PRIMARY }}>Register Now</button>
       </p>


    </Shell>
  );
}

/* ── Shared components ─────────────────────────────────────── */

function Shell({ children, center }) {
  return (
    <div className="min-h-screen flex flex-col bg-white max-w-md mx-auto px-6 overflow-y-auto"
      style={{ fontFamily: "'Poppins', sans-serif", paddingTop: 48, paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>
      {/* Top accent line */}
      <div className="fixed top-0 left-0 right-0 h-1 z-10"
        style={{ background: `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }} />
      <div className={`flex flex-col flex-1 ${center ? "justify-center" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center mb-7 mt-2">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full scale-125 opacity-50"
          style={{ background: PRIMARY_BG }} />
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #f0faff 0%, #ddf3fc 100%)",
            boxShadow: `0 0 0 8px rgba(77,200,240,0.1), 0 8px 32px rgba(77,200,240,0.2)`,
          }}>
          <img src={HABAL_LOGO} alt="Habal" className="w-14 h-14 object-contain"
            onError={e => { e.target.style.display = "none"; }} />
        </div>
      </div>
      <h1 className="text-xl font-bold text-gray-900 tracking-wide">Habal-Habal</h1>
      <p className="text-xs font-semibold tracking-widest uppercase mt-0.5" style={{ color: PRIMARY }}>Your Ride, Your Way</p>
    </div>
  );
}

function Heading({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, placeholder, type = "text", value, onChange, suffix }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>}
      <div className="relative">
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-3.5 rounded-2xl text-gray-800 placeholder-gray-300 text-sm focus:outline-none transition-all"
          style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2", fontFamily: "'Poppins', sans-serif" }}
          onFocus={e => { e.target.style.borderColor = PRIMARY; e.target.style.boxShadow = "0 0 0 3px rgba(77,200,240,0.15)"; }}
          onBlur={e =>  { e.target.style.borderColor = "#e2ecf2"; e.target.style.boxShadow = "none"; }}
        />
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, loading, className = "" }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full py-4 rounded-full font-bold text-white text-sm disabled:opacity-55 transition-all ${className}`}
      style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
        boxShadow: "0 4px 20px rgba(77,200,240,0.38)",
        fontFamily: "'Poppins', sans-serif",
      }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        : children}
    </button>
  );
}