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
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);
      await fetchMessages(session.user.id);
      setLoading(false);
    };
    initChat();
  }, [router]);

  const fetchMessages = async (userId: string) => {
    console.log("Fetching messages for user:", userId);
    
    // 🛡️ EMERGENCY REVERT: Simple query, no joins, no grouping.
    const { data, error } = await supabase
      .from("messages")
      .select("*") 
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
    } else {
      console.log("Raw messages found:", data?.length);
      setMessages(data || []);
    }
  };

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      
      {/* 🚨 DEBUG BOX: CHECK THIS FIRST! */}
      <div className="bg-red-900/50 border border-red-500 p-4 mb-6 rounded text-sm">
        <p><strong>Logged in as:</strong> {currentUser?.email}</p>
        <p><strong>User ID:</strong> {currentUser?.id}</p>
        <p><strong>Raw Messages Found:</strong> {messages.length}</p>
        <button onClick={() => currentUser && fetchMessages(currentUser.id)} className="mt-2 bg-red-600 px-3 py-1 rounded text-white">
          Force Refresh
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">My Inbox (Raw View)</h1>

      {messages.length === 0 ? (
        <div className="text-gray-500">No messages found for this specific User ID.</div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <Link key={msg.id} href={`/chat/${msg.listing_id}?user=${msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id}`} className="block">
              <div className="bg-gray-900 p-4 rounded border border-gray-800">
                <p className="text-xs text-gray-400">
                  {msg.sender_id === currentUser.id ? "You" : "Other"} sent:
                </p>
                <p className="text-white font-bold">{msg.content}</p>
                <p className="text-xs text-gray-500 mt-1">Listing ID: {msg.listing_id}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}