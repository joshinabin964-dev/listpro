"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { id } = useParams(); // listing_id
  const searchParams = useSearchParams();
  const otherUserId = searchParams.get("user");
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);

      if (!otherUserId) {
        toast.error("Invalid chat link.");
        router.push("/inbox");
        return;
      }

      // Fetch listing details
      const { data: listingData } = await supabase
        .from("listings")
        .select("product_name, image_url, user_id")
        .eq("id", id)
        .single();
      
      if (listingData) {
        setListing(listingData);
        
        // Fetch other user details
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", otherUserId)
          .single();
        
        if (userData) setOtherUser(userData);
      }

      // Fetch initial messages
      await fetchMessages(session.user.id, otherUserId, id as string);
      setLoading(false);
    };
    initChat();
  }, [id, otherUserId, router]);

  const fetchMessages = async (userId: string, targetUserId: string, listingId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  // 🆕 REALTIME MESSAGE SUBSCRIPTION
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUserId) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        listing_id: id,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
        is_read: false
      });

      if (error) throw error;
      setNewMessage("");
      // Note: Realtime subscription will handle adding it to the UI, 
      // but we scroll anyway to be safe.
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      toast.error("Failed to send message: " + error.message);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Loading chat...</p>
      </div>
    </main>
  );

  return (
    // 📱 MOBILE POLISH: Full height flex column to keep input at bottom
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Sticky Header */}
      <nav className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/inbox" className="p-2 hover:bg-gray-800 rounded-lg transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          {listing && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {listing.image_url ? (
                <img src={listing.image_url} alt="Item" className="w-10 h-10 rounded-lg object-cover bg-gray-800 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">📦</div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-sm md:text-base truncate">{listing.product_name}</h2>
                <p className="text-xs text-gray-400">Chatting with {otherUser?.full_name || "User"}</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 🛡️ SAFETY BANNER */}
      <div className="bg-yellow-900/20 border-b border-yellow-500/30 px-4 py-2 text-center">
        <p className="text-[10px] md:text-xs text-yellow-400">
          ⚠️ <strong>Safety Tip:</strong> Keep all conversations and payments inside Margin. Never share personal info or pay via wire transfer.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl ${
                  isMe 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700"
                }`}>
                  <p className="text-sm md:text-base whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-gray-500"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Input Area */}
      <div className="border-t border-gray-800 bg-gray-950 p-4 sticky bottom-0 z-50">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            // 🛡️ EDGE CASE: text-base prevents iOS auto-zoom
            className="flex-1 p-3 md:p-4 bg-gray-900 border border-gray-700 rounded-xl text-white text-base focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 md:px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition flex items-center justify-center"
          >
            {sending ? (
              <span className="animate-spin">⚙️</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}