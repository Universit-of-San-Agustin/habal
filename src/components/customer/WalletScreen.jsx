import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, Clock, ChevronRight, ArrowUpRight, Plus, Receipt, Wallet } from "lucide-react";
import PaymentMethodsList from "../wallet/PaymentMethodsList";
import TopUpModal from "../wallet/TopUpModal";
import ReceiptModal from "../wallet/ReceiptModal";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";
const HABAL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8713560c1bb2be40e7e5e/fe9d5d17d_habal.png";

export default function WalletScreen({ user, bookings }) {
  const [walletTxns, setWalletTxns] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [sendModal, setSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sendProcessing, setSendProcessing] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!user) return;
    base44.entities.WalletTransaction.filter({ network_id: user.id || user.email }, "-created_date", 50)
      .then(txns => {
        const list = txns || [];
        setWalletTxns(list);
        const bal = list.reduce((s, t) => {
          if (t.type === "credit" || t.type === "refund") return s + (t.amount || 0);
          return s - (t.amount || 0);
        }, 0);
        setWalletBalance(Math.max(0, bal));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const completedBookings = (bookings || []).filter(b => b.status === "completed" && b.fare_estimate);
  const totalSpent = completedBookings.reduce((s, b) => s + (b.fare_estimate || 0), 0);

  const handleTopUpSuccess = (tx, newBalance) => {
    setWalletTxns(prev => [tx, ...prev]);
    setWalletBalance(newBalance);
    setTimeout(() => setShowTopUp(false), 2200);
  };

  const handleSend = async () => {
    const amt = parseFloat(sendAmount);
    if (!amt || amt <= 0 || amt > walletBalance) return;
    setSendProcessing(true);
    const newBalance = walletBalance - amt;
    const tx = await base44.entities.WalletTransaction.create({
      network_id: user?.id || user?.email,
      network_name: user?.full_name,
      amount: amt,
      type: "debit",
      description: sendNote || "Transfer sent",
      balance_after: newBalance,
      performed_by: user?.email,
    }).catch(() => null);
    if (tx) {
      setWalletTxns(prev => [tx, ...prev]);
      setWalletBalance(newBalance);
    }
    setSendProcessing(false);
    setSendDone(true);
    setTimeout(() => { setSendDone(false); setSendModal(false); setSendAmount(""); setSendNote(""); }, 2000);
  };

  const allItems = [
    ...walletTxns.map(t => ({ ...t, _kind: "wallet" })),
    ...completedBookings.map(b => ({ ...b, _kind: "ride" })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const displayItems = tab === "wallet" ? walletTxns.map(t => ({ ...t, _kind: "wallet" }))
    : tab === "rides" ? completedBookings.map(b => ({ ...b, _kind: "ride" }))
    : allItems;

  const isCredit = (item) => item._kind === "wallet" && (item.type === "credit" || item.type === "refund");

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Wallet Card */}
      <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-lg fade-in"
        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <img src={HABAL_LOGO} alt="Habal" className="w-8 h-8 object-contain opacity-90" onError={e => { e.target.style.display = "none"; }} />
            <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Habal Wallet</span>
          </div>
          <div className="mb-4">
            <div className="text-white/70 text-xs font-medium mb-1">Available Balance</div>
            <div className="text-4xl font-black text-white">
              {loading ? "—" : `₱${walletBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-xs">{user?.full_name?.toUpperCase() || "CUSTOMER"}</div>
            <div className="flex gap-1">{[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10">
          <div className="px-5 py-3 border-r border-white/10">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Total Spent</div>
            <div className="text-white font-bold text-sm mt-0.5">₱{totalSpent.toLocaleString()}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Paid Rides</div>
            <div className="text-white font-bold text-sm mt-0.5">{completedBookings.length}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 grid grid-cols-4 gap-2.5 mt-4 mb-5">
        {[
          { icon: <Plus className="w-5 h-5" />, label: "Top Up", color: "#10b981", action: () => setShowTopUp(true) },
          { icon: <ArrowUpRight className="w-5 h-5" />, label: "Send", color: PRIMARY, action: () => setSendModal(true) },
          { icon: <CreditCard className="w-5 h-5" />, label: "Cards", color: "#6366f1", action: () => setShowPaymentMethods(true) },
          { icon: <Receipt className="w-5 h-5" />, label: "History", color: "#f59e0b", action: () => setTab("all") },
        ].map(a => (
          <button key={a.label} onClick={a.action}
            className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-xl py-3 shadow-sm hover:shadow-md hover:border-gray-200 transition-all active:scale-95">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: a.color + "15", color: a.color }}>
              {a.icon}
            </div>
            <span className="text-[10px] font-bold text-gray-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Payment Methods entry */}
      <div className="px-4 mb-4">
        <button onClick={() => setShowPaymentMethods(true)}
          className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_BG }}>
            <CreditCard className="w-5 h-5" style={{ color: PRIMARY }} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 text-sm">Payment Methods</div>
            <div className="text-xs text-gray-500 mt-0.5">Manage cards & wallets</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Transaction History */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transactions</div>
          <div className="flex gap-1">
            {[["all","All"],["wallet","Wallet"],["rides","Rides"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setTab(id)}
                className="px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all"
                style={tab === id ? { background: PRIMARY, color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Wallet className="w-14 h-14 mb-4 opacity-30" />
            <p className="font-medium text-gray-500">No transactions yet</p>
            <p className="text-xs mt-1 text-gray-400">Complete a ride to see history</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayItems.map((item, i) => {
              const credit = isCredit(item);
              return (
                <button key={item.id || i} onClick={() => setReceipt({ item, type: item._kind })}
                  className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: item._kind === "ride" ? "#fef3c7" : credit ? "#f0fdf4" : "#fff1f2" }}>
                    {item._kind === "ride" ? "🏍" : credit ? "💳" : "📤"}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="font-semibold text-gray-900 text-sm truncate">
                       {item._kind === "ride" ? `Ride to ${item.dropoff_address?.split(",")[0]}` : (item.description || "Transaction")}
                     </div>
                     <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                       <Clock className="w-3 h-3" />
                       {item.created_date ? new Date(item.created_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—"}
                     </div>
                   </div>
                  <div className={`font-black text-sm flex-shrink-0 ${item._kind === "ride" ? "text-red-500" : credit ? "text-emerald-600" : "text-red-500"}`}>
                    {item._kind === "ride" ? "-" : credit ? "+" : "-"}₱{item._kind === "ride" ? item.fare_estimate : item.amount?.toLocaleString()}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-200 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPaymentMethods && <PaymentMethodsList user={user} onClose={() => setShowPaymentMethods(false)} />}
      {showTopUp && <TopUpModal user={user} walletBalance={walletBalance} onSuccess={handleTopUpSuccess} onClose={() => setShowTopUp(false)} />}
      {receipt && <ReceiptModal item={receipt.item} type={receipt.type} onClose={() => setReceipt(null)} />}

      {/* Send Money Modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-6 pb-10 max-w-md mx-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            {sendDone ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-4xl" style={{ background: PRIMARY_BG }}>
                  ✅
                </div>
                <p className="font-bold text-gray-900 text-lg">Sent!</p>
              </div>
            ) : (
              <>
                <div className="font-bold text-gray-900 text-lg mb-3">Send Money</div>
                <div className="text-xs text-gray-500 mb-4">Available: <span className="font-bold text-gray-800">₱{walletBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
                <div className="space-y-3 mb-5">
                  <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)}
                    placeholder="Amount (₱)" min="1" max={walletBalance}
                    className="w-full px-4 py-4 rounded-xl text-gray-800 text-2xl font-black text-center focus:outline-none border border-gray-100"
                    style={{ background: "#f9fafb" }} />
                  <input value={sendNote} onChange={e => setSendNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full px-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none border border-gray-100"
                    style={{ background: "#f9fafb" }} />
                </div>
                {parseFloat(sendAmount) > walletBalance && (
                  <p className="text-xs text-red-500 font-medium mb-3 text-center">Insufficient balance</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setSendModal(false); setSendAmount(""); setSendNote(""); }}
                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={handleSend} disabled={sendProcessing || !sendAmount || parseFloat(sendAmount) > walletBalance}
                    className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center transition-all"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, boxShadow: `0 4px 12px ${PRIMARY}35` }}>
                    {sendProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}