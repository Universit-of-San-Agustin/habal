import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle } from "lucide-react";

const PRIMARY = "#4DC8F0";
const PRIMARY_DARK = "#1a9ecb";
const PRIMARY_BG = "#EBF9FE";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function TopUpModal({ user, walletBalance, onSuccess, onClose }) {
  const [step, setStep] = useState("amount"); // amount | method | confirm | done
  const [amount, setAmount] = useState("");
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.PaymentMethod.filter({ user_id: user.id || user.email }, "-created_date", 20)
      .then(d => {
        const list = d || [];
        setMethods(list);
        const def = list.find(m => m.is_default) || list[0];
        if (def) setSelectedMethod(def);
      }).catch(() => {});
  }, [user]);

  const handleConfirm = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setProcessing(true);
    const newBalance = walletBalance + amt;
    const tx = await base44.entities.WalletTransaction.create({
      network_id: user?.id || user?.email,
      network_name: user?.full_name,
      amount: amt,
      type: "credit",
      description: selectedMethod ? `Top up via ${selectedMethod.label}` : "Wallet top up",
      balance_after: newBalance,
      performed_by: user?.email,
      reference_id: selectedMethod?.id,
    });
    setProcessing(false);
    setStep("done");
    onSuccess(tx, newBalance);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 max-w-md mx-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {step === "done" ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: PRIMARY_BG }}>
              <CheckCircle className="w-10 h-10" style={{ color: PRIMARY }} />
            </div>
            <div className="font-black text-2xl text-gray-900 mb-1">₱{parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} Added!</div>
            <p className="text-sm text-gray-400 text-center mb-6">Your wallet has been topped up successfully.</p>
            <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>Done</button>
          </div>
        ) : step === "amount" ? (
          <>
            <div className="font-bold text-gray-900 text-lg mb-1">Top Up Wallet</div>
            <div className="text-xs text-gray-400 mb-5">Current balance: <span className="font-bold text-gray-700">₱{walletBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className="py-2.5 rounded-2xl text-sm font-bold transition-all"
                  style={amount === String(a)
                    ? { background: PRIMARY, color: "#fff" }
                    : { background: PRIMARY_BG, color: PRIMARY_DARK }}>
                  ₱{a}
                </button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Custom Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount" min="10"
              className="w-full px-4 py-4 rounded-2xl text-gray-800 text-2xl font-black text-center focus:outline-none mb-5"
              style={{ background: "#f8fbfd", border: `1.5px solid ${PRIMARY}40` }}
              onFocus={e => { e.target.style.borderColor = PRIMARY; }}
              onBlur={e => { e.target.style.borderColor = `${PRIMARY}40`; }} />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 text-sm">Cancel</button>
              <button onClick={() => setStep("method")} disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                Next
              </button>
            </div>
          </>
        ) : step === "method" ? (
          <>
            <div className="font-bold text-gray-900 text-lg mb-1">Choose Payment Method</div>
            <div className="text-xs text-gray-400 mb-4">How would you like to add <span className="font-bold text-gray-700">₱{parseFloat(amount).toLocaleString()}</span>?</div>
            {methods.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No saved payment methods. Please add one first.</p>
            ) : (
              <div className="space-y-2 mb-5">
                {methods.map(m => (
                  <button key={m.id} onClick={() => setSelectedMethod(m)}
                    className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 border-2 text-left transition-all"
                    style={selectedMethod?.id === m.id
                      ? { borderColor: PRIMARY, background: PRIMARY_BG }
                      : { borderColor: "#e5e7eb", background: "#fff" }}>
                    <div className="text-xl">{m.type === "card" ? "💳" : m.type === "gcash" ? "📱" : m.type === "maya" ? "📲" : "🏦"}</div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{m.label}</div>
                      <div className="text-xs text-gray-400">{m.last_four ? `•••• ${m.last_four}` : m.account_number_masked || ""}</div>
                    </div>
                    {selectedMethod?.id === m.id && <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: PRIMARY }}>✓</div>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep("amount")} className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 text-sm">Back</button>
              <button onClick={() => setStep("confirm")} disabled={!selectedMethod}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="font-bold text-gray-900 text-lg mb-4">Confirm Top Up</div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-5">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-black text-gray-900">₱{parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-semibold text-gray-700">{selectedMethod?.label}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">New Balance</span><span className="font-black" style={{ color: PRIMARY_DARK }}>₱{(walletBalance + parseFloat(amount)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("method")} className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 text-sm">Back</button>
              <button onClick={handleConfirm} disabled={processing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)` }}>
                {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}