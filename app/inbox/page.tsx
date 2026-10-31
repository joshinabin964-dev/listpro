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
      
      // Fetch ALL messages where I am sender or receiver
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });
      
      setMessages(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">Message Feed</h1>
      
      {messages.length === 0 ? (
        <p className="text-gray-500">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            // Figure out who the "other" person is
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
                  <p className="text-xs text-blue-400">Click to open chat for Listing: {msg.listing_id.slice(0, 8)}...</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}