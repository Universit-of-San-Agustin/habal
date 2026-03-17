import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send } from "lucide-react";

const PRIMARY = "#4DC8F0";

export default function ChatPanel({ bookingId, currentUser, senderRole, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = async () => {
    const msgs = await base44.entities.ChatMessage.filter({ booking_id: bookingId }, "-created_date", 100).catch(() => []);
    setMessages(msgs || []);
  };

  // Load chat messages on mount, poll every 2 seconds for new ones
  useEffect(() => {
    if (!bookingId) return;
    load();
    pollRef.current = setInterval(load, 2000);
    return () => clearInterval(pollRef.current);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      booking_id: bookingId,
      sender_id: currentUser?.id || "unknown",
      sender_name: currentUser?.full_name || "User",
      sender_role: senderRole,
      message: text.trim(),
      timestamp: new Date().toISOString(),
    });
    setText("");
    setSending(false);
    load();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isMe = (msg) => msg.sender_id === (currentUser?.id || "unknown");

  const roleColor = {
    customer: "#4DC8F0",
    rider: "#10b981",
    dispatcher: "#6366f1",
    network_owner: "#f59e0b",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-gray-100"
        style={{ boxShadow: `0 2px 12px rgba(77,200,240,0.12)` }}>
        <div>
          <div className="font-bold text-gray-900 text-sm">Ride Chat</div>
          <div className="text-xs text-gray-400 font-mono">{bookingId}</div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-300">
            <Send className="w-8 h-8 mb-2" />
            <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMe(msg);
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${mine ? "" : ""}`}>
                {!mine && (
                  <div className="text-[10px] font-semibold mb-1 ml-1" style={{ color: roleColor[msg.sender_role] || PRIMARY }}>
                    {msg.sender_name} · {msg.sender_role}
                  </div>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${mine ? "text-white rounded-br-md" : "text-gray-800 bg-white rounded-bl-md border border-gray-100"}`}
                  style={mine ? { background: PRIMARY } : {}}>
                  {msg.message}
                </div>
                <div className={`text-[10px] text-gray-300 mt-0.5 ${mine ? "text-right mr-1" : "ml-1"}`}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 focus:outline-none focus:border-[#4DC8F0] max-h-24"
        />
        <button onClick={sendMessage} disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
          style={{ background: PRIMARY }}>
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}