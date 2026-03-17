import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Eye, EyeOff, Lock, AlertTriangle, XCircle } from "lucide-react";
import AuditLogPanel from "./AuditLogPanel";

// Password is verified server-side — nothing sensitive lives in this file
const SESSION_KEY = "habal_sensitive_logs_auth";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function SensitiveLogsGate({ user, onBack }) {
  const [step, setStep] = useState("confirm"); // "confirm" | "password" | "granted" | "locked"
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lockoutSecsLeft, setLockoutSecsLeft] = useState(0);
  const inputRef = useRef(null);
  const lockoutTimerRef = useRef(null);

  // Check session + lockout state on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "granted") {
      setStep("granted");
      return;
    }
    const lockoutStr = sessionStorage.getItem("habal_logs_lockout");
    if (lockoutStr) {
      const until = parseInt(lockoutStr);
      if (Date.now() < until) {
        setLockoutUntil(until);
        setStep("locked");
        return;
      } else {
        sessionStorage.removeItem("habal_logs_lockout");
        sessionStorage.removeItem("habal_logs_attempts");
      }
    }
    const savedAttempts = parseInt(sessionStorage.getItem("habal_logs_attempts") || "0");
    setAttempts(savedAttempts);
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (step !== "locked" || !lockoutUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        sessionStorage.removeItem("habal_logs_lockout");
        sessionStorage.removeItem("habal_logs_attempts");
        setAttempts(0);
        setLockoutUntil(null);
        setStep("password");
        clearInterval(lockoutTimerRef.current);
      } else {
        setLockoutSecsLeft(remaining);
      }
    };
    tick();
    lockoutTimerRef.current = setInterval(tick, 1000);
    return () => clearInterval(lockoutTimerRef.current);
  }, [step, lockoutUntil]);

  useEffect(() => {
    if (step === "password") setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  const handleConfirm = () => setStep("password");
  const handleCancel = () => onBack?.();

  const handleVerify = async () => {
    if (!password || verifying) return;
    setVerifying(true);
    setError("");

    const res = await base44.functions.invoke("verifySensitiveAccess", { password }).catch(() => null);
    const granted = res?.data?.granted === true;

    if (granted) {
      sessionStorage.setItem(SESSION_KEY, "granted");
      sessionStorage.removeItem("habal_logs_attempts");
      sessionStorage.removeItem("habal_logs_lockout");
      setStep("granted");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      sessionStorage.setItem("habal_logs_attempts", String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        sessionStorage.setItem("habal_logs_lockout", String(until));
        setLockoutUntil(until);
        setStep("locked");
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(`Incorrect password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
      }
    }
    setPassword("");
    setVerifying(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleVerify();
  };

  // ── Locked out ────────────────────────────────────────────
  if (step === "locked") {
    const mins = Math.floor(lockoutSecsLeft / 60);
    const secs = lockoutSecsLeft % 60;
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-6 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg">Account Locked</h2>
            <p className="text-gray-400 text-xs mt-1">Too many failed attempts</p>
          </div>
          <div className="px-6 py-6 text-center">
            <div className="text-4xl font-black text-red-500 mb-1 tabular-nums">
              {mins}:{String(secs).padStart(2, "0")}
            </div>
            <p className="text-sm text-gray-500 mb-6">Please wait before trying again.</p>
            <button onClick={handleCancel}
              className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Granted ───────────────────────────────────────────────
  if (step === "granted") {
    return (
      <div>
        <div className="mx-4 mt-3 mb-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
            Confidential Data – Authorized Access Only
          </span>
        </div>
        <AuditLogPanel />
      </div>
    );
  }

  // ── Step 1: Confirmation warning ──────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-6 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">Sensitive Data Access</h2>
            <p className="text-orange-100 text-xs mt-1">Security confirmation required</p>
          </div>
          <div className="px-6 py-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs text-amber-800 leading-relaxed">
                You are about to access sensitive system data including{" "}
                <span className="font-bold">user activity logs, location history, and investigation records</span>.
                This information is protected and should only be accessed for authorized operational purposes.
              </p>
            </div>
            <div className="space-y-1 mb-5">
              {[
                "User activity logs",
                "Booking and trip logs",
                "Location history logs",
                "Communication logs",
                "Support and incident reports",
                "Admin audit logs",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center mb-4">
              Your access attempt will be logged and audited.
            </p>
            <div className="flex gap-3">
              <button onClick={handleCancel}
                className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleConfirm}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600">
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Password verification ────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-sm">
        <div className="bg-gradient-to-br from-red-600 to-red-800 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">Admin Verification</h2>
          <p className="text-red-200 text-xs mt-1">Step 2 of 2 – Password required</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 text-center mb-5 leading-relaxed">
            Enter the <span className="font-bold text-gray-800">Admin Security Password</span> to access Sensitive Logs.
          </p>
          {attempts > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 font-semibold">{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining before lockout</span>
            </div>
          )}
          <div className="relative mb-3">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Security password"
              className="w-full px-4 py-3.5 pr-12 rounded-2xl border-2 text-sm font-mono text-gray-800 focus:outline-none transition-colors"
              style={{ borderColor: error ? "#ef4444" : "#e2e8f0", background: "#f8fafc" }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-600 font-semibold">{error}</span>
            </div>
          )}
          <p className="text-[10px] text-gray-400 text-center mb-4">
            This action will be recorded in the security audit log.
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setStep("confirm"); setPassword(""); setError(""); }}
              className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleVerify} disabled={!password || verifying}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 bg-gradient-to-r from-red-600 to-red-800">
              {verifying
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}