import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Plus } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_BG = "#EBF9FE";
const GREEN = "#10b981";
const RED = "#ef4444";
const PURPLE = "#8b5cf6";

export default function WalletPanel({ networks }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crediting, setCrediting] = useState(false);
  const [form, setForm] = useState({ network_id: "", amount: "", description: "", type: "credit" });
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    base44.entities.WalletTransaction.list("-created_date", 50)
      .then(t => { setTransactions(t || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleTransaction = async () => {
    if (!form.network_id || !form.amount) return;
    setCrediting(true);
    const net = networks.find(n => n.id === form.network_id);
    const amount = Number(form.amount);
    const newBalance = form.type === "credit"
      ? (net?.wallet_balance || 0) + amount
      : (net?.wallet_balance || 0) - amount;

    await base44.entities.Network.update(form.network_id, { wallet_balance: newBalance });
    const tx = await base44.entities.WalletTransaction.create({
      network_id: form.network_id,
      network_name: net?.name,
      amount,
      type: form.type,
      description: form.description || (form.type === "credit" ? "Manual credit" : "Manual debit"),
      balance_after: newBalance,
      performed_by: "admin",
    });
    setTransactions(t => [tx, ...t]);
    setFeedback({ type: "success", msg: `₱${amount} ${form.type} processed for ${net?.name}` });
    setForm({ network_id: "", amount: "", description: "", type: "credit" });
    setShowForm(false);
    setCrediting(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const lowBalanceNets = networks.filter(n => (n.wallet_balance || 0) < (n.wallet_threshold || 5000));

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {feedback && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-medium ${feedback.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {feedback.msg}
        </div>
      )}

      {/* Low balance alerts */}
      {lowBalanceNets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Low Balance Alert
          </div>
          {lowBalanceNets.map(n => (
            <div key={n.id} className="flex justify-between items-center py-1.5 text-xs text-amber-700">
              <span>{n.name}</span>
              <span className="font-bold">₱{(n.wallet_balance || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Network wallets overview */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Network Wallets</div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl text-white"
            style={{ background: PRIMARY }}>
            <Plus className="w-3.5 h-3.5" /> Transaction
          </button>
        </div>
        {networks.map(n => (
          <div key={n.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <div className="text-sm font-semibold text-gray-800">{n.name}</div>
              <div className="text-xs text-gray-400">{n.zone}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-sm" style={{ color: (n.wallet_balance || 0) >= (n.wallet_threshold || 5000) ? GREEN : RED }}>
                ₱{(n.wallet_balance || 0).toLocaleString()}
              </div>
              {(n.wallet_balance || 0) < (n.wallet_threshold || 5000) && (
                <div className="text-[10px] text-red-400">Below threshold</div>
              )}
            </div>
          </div>
        ))}
        {networks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No networks</p>}
      </div>

      {/* Transaction form */}
      {showForm && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 space-y-3" style={{ borderColor: `${PRIMARY}30` }}>
          <div className="text-sm font-bold text-gray-900">Record Transaction</div>
          <div className="flex gap-2">
            {["credit", "debit"].map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize border-2 transition-all"
                style={form.type === t
                  ? { background: t === "credit" ? GREEN : RED, color: "#fff", borderColor: t === "credit" ? GREEN : RED }
                  : { borderColor: "#e2e8f0", color: "#64748b" }}>
                {t === "credit" ? "➕ Credit" : "➖ Debit"}
              </button>
            ))}
          </div>
          <select value={form.network_id} onChange={e => setForm(f => ({ ...f, network_id: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }}>
            <option value="">Select network...</option>
            {networks.map(n => <option key={n.id} value={n.id}>{n.name} (₱{(n.wallet_balance||0).toLocaleString()})</option>)}
          </select>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="Amount (₱)"
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }} />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ background: "#f8fbfd", border: "1.5px solid #e2ecf2" }} />
          <button onClick={handleTransaction} disabled={crediting || !form.network_id || !form.amount}
            className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: form.type === "credit" ? GREEN : RED }}>
            {crediting ? "Processing…" : `Confirm ${form.type === "credit" ? "Credit" : "Debit"}`}
          </button>
        </div>
      )}

      {/* Transaction log */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Transaction Log</div>
        {loading && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} /></div>}
        {!loading && transactions.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>}
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "credit" || tx.type === "refund" ? "bg-green-50" : "bg-red-50"}`}>
              {tx.type === "credit" || tx.type === "refund"
                ? <TrendingUp className="w-4 h-4 text-green-600" />
                : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{tx.network_name || "—"}</div>
              <div className="text-xs text-gray-400 truncate">{tx.description}</div>
              <div className="text-[10px] text-gray-300 mt-0.5">
                {tx.created_date ? new Date(tx.created_date).toLocaleDateString("en-PH") : ""}
              </div>
            </div>
            <div className={`font-black text-sm flex-shrink-0 ${tx.type === "credit" || tx.type === "refund" ? "text-green-600" : "text-red-500"}`}>
              {tx.type === "credit" || tx.type === "refund" ? "+" : "-"}₱{tx.amount?.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}