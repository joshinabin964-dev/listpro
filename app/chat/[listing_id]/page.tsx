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
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      // Fetch existing messages
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

  // 🔥 REALTIME LISTENER - Listen for NEW messages
  useEffect(() => {
    if (!currentUser || !listing_id) return;
    
    const channel = supabase
      .channel(`chat:${listing_id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `listing_id=eq.${listing_id}` 
      }, (payload) => {
        const newMsg = payload.new;
        // Only add if it's between me and the other user
        if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser.id)) {
          // Check if message already exists to avoid duplicates
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUserId || sending) return;
    
    setSending(true);
    const tempId = Date.now(); // Temporary ID for optimistic UI
    
    try {
      // 🔥 OPTIMISTIC UI UPDATE - Add message immediately before server responds
      const optimisticMessage = {
        id: tempId,
        listing_id,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");
      
      // Send to database
      const { data, error } = await supabase.from("messages").insert({
        listing_id, 
        sender_id: currentUser.id, 
        receiver_id: otherUserId, 
        content: newMessage.trim(), 
        is_read: false
      });
      
      if (error) throw error;
      
    } catch (error: any) { 
      toast.error("Failed to send: " + error.message);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally { 
      setSending(false); 
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-white">Loading chat...</div>
    </div>
  );

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      {/*  NAVIGATION BAR WITH BACK TO DASHBOARD */}
      <nav className="border-b border-gray-800 bg-gray-950 p-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Dashboard
        </Link>
        <h2 className="font-bold text-lg">Chat</h2>
        <Link href="/inbox" className="text-gray-400 hover:text-white text-sm">
          Inbox
        </Link>
      </nav>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No messages yet.</p>
            <p className="text-sm mt-2">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            const isOptimistic = typeof msg.id === 'number'; // Temporary messages
            
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  isMine ? "bg-blue-600" : "bg-gray-800"
                } ${isOptimistic ? 'opacity-70' : ''}`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] text-right mt-1 opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* MESSAGE INPUT */}
      <form onSubmit={sendMessage} className="border-t border-gray-800 p-4 flex gap-2 bg-gray-950">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          disabled={sending}
        />
        <button 
          type="submit" 
          disabled={sending || !newMessage.trim()} 
          className="bg-blue-600 px-6 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-500 transition"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </main>
  );
}