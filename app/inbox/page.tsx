"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*") 
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (error) console.error("Inbox Error:", error);
      setMessages(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      {/* 🔥 NAVIGATION BAR */}
      <nav className="mb-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">My Inbox</h1>
        <div className="w-20"></div>
      </nav>
      
      {messages.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
          <p className="text-gray-400 mb-4">No messages yet.</p>
          <Link href="/marketplace">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
              🌍 Browse Marketplace
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
            const isMe = msg.sender_id === currentUser.id;
            
            return (
              <Link 
                key={msg.id} 
                href={`/chat/${msg.listing_id}?user=${otherUserId}`}
                className="block"
              >
                <div className={`p-4 rounded-xl border ${isMe ? 'bg-blue-900/20 border-blue-800' : 'bg-gray-900 border-gray-800'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400">
                      {isMe ? "You sent:" : "Received:"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white font-medium mb-2">{msg.content}</p>
                  <p className="text-xs text-blue-400">Listing ID: {msg.listing_id.slice(0, 8)}...</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}