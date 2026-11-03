"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ChatRoomPage() {
  const { listing_id } = useParams();
  const searchParams = useSearchParams();
  const otherUserId = searchParams.get("user");
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. INITIAL LOAD
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      if (otherUserId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, username")
          .eq("id", otherUserId)
          .single();
        setOtherUser(profileData);
      }

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", listing_id)
        .order("created_at", { ascending: true });
      
      if (data) {
        const filtered = data.filter(m => 
          (m.sender_id === session.user.id && m.receiver_id === otherUserId) ||
          (m.sender_id === otherUserId && m.receiver_id === session.user.id)
        );
        setMessages(filtered);
      }
      setLoading(false);
    };
    initChat();
  }, [listing_id, otherUserId, router]);

  // 2. LIVE REALTIME LISTENER
  useEffect(() => {
    if (!currentUser || !listing_id || !otherUserId) return;
    
    const channel = supabase
      .channel(`room-${listing_id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `listing_id=eq.${listing_id}` 
      }, (payload) => {
        const newMsg = payload.new;
        
        if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser.id)) {
          
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [currentUser, listing_id, otherUserId]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  // 🔥 FIXED: Safer sendMessage function
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUserId || sending) return;
    
    setSending(true);
    const tempId = Date.now(); 
    
    // 🔥 FIX 1: Force listing_id to be a string to prevent Next.js param bugs
    const safeListingId = String(listing_id); 
    
    const tempMsg = {
      id: tempId,
      listing_id: safeListingId, 
      sender_id: currentUser.id, 
      receiver_id: otherUserId, 
      content: newMessage.trim(), 
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    // Optimistic UI: Show it immediately
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");
    
    try {
      const { error } = await supabase.from("messages").insert({
        listing_id: safeListingId, 
        sender_id: currentUser.id, 
        receiver_id: otherUserId, 
        content: newMessage.trim(), 
        is_read: false
      });
      if (error) throw error;
    } catch (error: any) { 
      console.error("Chat send error:", error);
      // 🔥 FIX 2: Show the EXACT error message so we know what's wrong
      toast.error("Failed to send: " + (error.message || "Unknown error"));
      
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally { 
      setSending(false); 
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950 p-3 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <Link href="/inbox" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Back
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-gray-300">
                {otherUser?.full_name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white leading-tight">
              {otherUser?.full_name || "User"}
            </span>
            <span className="text-[10px] text-green-400">Online</span>
          </div>
        </div>

        <div className="w-16"></div>
      </nav>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No messages yet.</p>
            <p className="text-sm mt-2">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  isMine ? "bg-blue-600 rounded-br-none" : "bg-gray-800 rounded-bl-none"
                }`}>
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className="text-[10px] text-right mt-1 opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-gray-800 p-3 flex gap-2 bg-gray-950 pb-6">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
          disabled={sending}
        />
        <button 
          type="submit" 
          disabled={sending || !newMessage.trim()} 
          className="bg-blue-600 hover:bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 transition"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </main>
  );
}