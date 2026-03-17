import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, Wallet } from "lucide-react";

const PRIMARY = "#4DC8F0";

export default function EnforcementPanel({ networks, riders, onRefresh }) {
  const [strikes, setStrikes] = useState([]);
  const [loadingStrikes, setLoadingStrikes] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [deducting, setDeducting] = useState(false);
  const [strikeFm, setStrikeFm] = useState({ target_type: "rider", target_id: "", target_name: "", reason: "", severity: "warning", notes: "" });
  const [walletFm, setWalletFm] = useState({ network_id: "", amount: "", reason: "" });
  const [activeForm, setActiveForm] = useState(null); // "strike" | "wallet" | null
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    base44.entities.Strike.list("-created_date", 30)
      .then(s => { setStrikes(s || []); setLoadingStrikes(false); })
      .catch(() => setLoadingStrikes(false));
  }, []);

  const issueStrike = async () => {
    if (!strikeFm.target_id || !strikeFm.reason || !strikeFm.severity) return;
    setIssuing(true);
    const res = await base44.functions.invoke("issueStrike", strikeFm);
    setIssuing(false);
    if (res?.data?.success) {
      setFeedback({ type: "success", msg: "Strike issued successfully" });
      setActiveForm(null);
      const updated = await base44.entities.Strike.list("-created_date", 30).catch(() => []);
      setStrikes(updated || []);
      onRefresh?.();
    } else {
      setFeedback({ type: "error", msg: res?.data?.error || "Failed to issue strike" });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const deductWallet = async () => {
    if (!walletFm.network_id || !walletFm.amount) return;
    setDeducting(true);
    const res = await base44.functions.invoke("walletDebit", { ...walletFm, amount: Number(walletFm.amount) });
    setDeducting(false);
    if (res?.data?.success) {
      setFeedback({ type: "success", msg: `₱${walletFm.amount} deducted from network wallet` });
      setActiveForm(null);
      onRefresh?.();
    } else {
      setFeedback({ type: "error", msg: res?.data?.error || "Failed to deduct wallet" });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const severityColor = {
    warning: "bg-amber-50 text-amber-600 border-amber-200",
    strike: "bg-orange-50 text-orange-600 border-orange-200",
    suspension: "bg-red-50 text-red-600 border-red-200",
    ban: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {feedback.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.msg}
        </div>
      )}

      {/* KPI Thresholds */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform KPI Standards</div>
        {[
          { metric: "Dispatch Speed", standard: "≤ 2 minutes", icon: "⚡" },
          { metric: "Acceptance Rate", standard: "≥ 70%", icon: "✅" },
          { metric: "Completion Rate", standard: "≥ 85%", icon: "🏁" },
          { metric: "Cancellation Rate", standard: "≤ 15%", icon: "❌" },
          { metric: "Customer Rating", standard: "≥ 4.6 / 5.0", icon: "⭐" },
        ].map(k => (
          <div key={k.metric} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-700 flex items-center gap-2"><span>{k.icon}</span>{k.metric}</span>
            <span className="text-sm font-semibold" style={{ color: PRIMARY }}>{k.standard}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setActiveForm(activeForm === "strike" ? null : "strike")}
          className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-colors ${activeForm === "strike" ? "text-white border-transparent" : "border-red-200 text-red-500 bg-white"}`}
          style={activeForm === "strike" ? { background: "#ef4444", borderColor: "#ef4444" } : {}}>
          <ShieldAlert className="w-4 h-4" /> Issue Strike
        </button>
        <button onClick={() => setActiveForm(activeForm === "wallet" ? null : "wallet")}
          className={`py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-colors ${activeForm === "wallet" ? "text-white border-transparent" : "border-amber-200 text-amber-600 bg-white"}`}
          style={activeForm === "wallet" ? { background: "#f59e0b", borderColor: "#f59e0b" } : {}}>
          <Wallet className="w-4 h-4" /> Wallet Penalty
        </button>
      </div>

      {/* Strike Form */}
      {activeForm === "strike" && (
        <div className="bg-white rounded-2xl p-4 border-2 border-red-100 space-y-3">
          <div className="text-sm font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Issue Strike / Penalty</div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Target Type</label>
            <div className="flex gap-2">
              {["rider", "network"].map(t => (
                <button key={t} onClick={() => setStrikeFm(f => ({ ...f, target_type: t, target_id: "", target_name: "" }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize border-2 transition-colors ${strikeFm.target_type === t ? "text-white border-transparent" : "border-gray-200 text-gray-600"}`}
                  style={strikeFm.target_type === t ? { background: PRIMARY } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Select {strikeFm.target_type === "rider" ? "Rider" : "Network"}</label>
            <select value={strikeFm.target_id} onChange={e => {
              const list = strikeFm.target_type === "rider" ? riders : networks;
              const found = list.find(x => x.id === e.target.value);
              setStrikeFm(f => ({ ...f, target_id: e.target.value, target_name: found?.full_name || found?.name || "" }));
            }}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300">
              <option value="">Choose…</option>
              {(strikeFm.target_type === "rider" ? riders : networks).map(x => (
                <option key={x.id} value={x.id}>{x.full_name || x.name} {strikeFm.target_type === "rider" ? `(${x.status})` : `(${x.zone})`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Severity</label>
            <div className="grid grid-cols-2 gap-2">
              {["warning", "strike", "suspension", "ban"].map(s => (
                <button key={s} onClick={() => setStrikeFm(f => ({ ...f, severity: s }))}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${strikeFm.severity === s ? `${severityColor[s]} border-current` : "border-gray-200 text-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Reason</label>
            <textarea value={strikeFm.reason} onChange={e => setStrikeFm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Describe the violation…"
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-red-300" />
          </div>
          <button onClick={issueStrike} disabled={issuing || !strikeFm.target_id || !strikeFm.reason}
            className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ background: "#ef4444" }}>
            {issuing ? "Issuing…" : "Confirm & Issue Strike"}
          </button>
        </div>
      )}

      {/* Wallet Deduction Form */}
      {activeForm === "wallet" && (
        <div className="bg-white rounded-2xl p-4 border-2 border-amber-100 space-y-3">
          <div className="text-sm font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-amber-500" /> Wallet Penalty</div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Select Network</label>
            <select value={walletFm.network_id} onChange={e => setWalletFm(f => ({ ...f, network_id: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-300">
              <option value="">Choose network…</option>
              {networks.map(n => (
                <option key={n.id} value={n.id}>{n.name} (₱{n.wallet_balance?.toLocaleString() || 0})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Amount to Deduct (₱)</label>
            <input type="number" value={walletFm.amount} onChange={e => setWalletFm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-300" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Reason</label>
            <input value={walletFm.reason} onChange={e => setWalletFm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Penalty reason…"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-300" />
          </div>
          <button onClick={deductWallet} disabled={deducting || !walletFm.network_id || !walletFm.amount}
            className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ background: "#f59e0b" }}>
            {deducting ? "Processing…" : "Confirm Deduction"}
          </button>
        </div>
      )}

      {/* Strike Log */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Strike Log</div>
        {loadingStrikes && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}
        {!loadingStrikes && strikes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No strikes issued</p>}
        {strikes.map(s => (
          <div key={s.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${severityColor[s.severity] || "bg-gray-50 text-gray-500 border-gray-200"} flex-shrink-0 mt-0.5`}>{s.severity}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800">{s.target_name || s.target_id}</div>
              <div className="text-xs text-gray-500 truncate">{s.reason}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.target_type} · {s.created_date ? new Date(s.created_date).toLocaleDateString() : ""}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Networks with Issues */}
      {networks.filter(n => (n.strikes || 0) > 0).length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-red-100">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Networks with Strikes
          </div>
          {networks.filter(n => (n.strikes || 0) > 0).map(n => (
            <div key={n.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-semibold text-gray-800">{n.name}</div>
                <div className="text-xs text-gray-400">{n.zone} · {n.status}</div>
              </div>
              <span className="text-sm font-bold text-red-500">{n.strikes} ⚡</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}