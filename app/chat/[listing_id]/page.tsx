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
  const [otherUser, setOtherUser] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🛡️ EDGE CASE: Prevent double-sends
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🛡️ SAFE HANDOFF STATES
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffToken, setHandoffToken] = useState("");
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);

      const { data: listingData } = await supabase
        .from("listings")
        .select("product_name, image_url, user_id")
        .eq("id", listing_id)
        .single();
      
      if (listingData) {
        setListing(listingData);
        const targetUserId = otherUserId || listingData.user_id;
        
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", targetUserId)
          .single();
        
        setOtherUser(userData);
        await fetchMessages(session.user.id, targetUserId, listing_id as string);
      }
      setLoading(false);
    };
    initChat();
  }, [listing_id, otherUserId, router]);

  useEffect(() => {
    if (!currentUser || !listing_id) return;

    const channel = supabase
      .channel(`chat:${listing_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `listing_id=eq.${listing_id}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, listing_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (userId: string, targetUserId: string, listingId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUserId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        listing_id,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
        is_read: false
      });
      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // 🛡️ SAFE HANDOFF GENERATOR
  const generateHandoff = async () => {
    if (!currentUser || !listing) return;
    setIsGeneratingHandoff(true);
    try {
      // Generate a secure random token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Determine who is buyer and who is seller
      const sellerId = listing.user_id;
      const buyerId = currentUser.id === listing.user_id ? otherUserId : currentUser.id;

      const { error } = await supabase.from("handoff_requests").insert({
        listing_id: listing_id,
        seller_id: sellerId,
        buyer_id: buyerId,
        token: token,
        status: "pending"
      });

      if (error) throw error;
      setHandoffToken(token);
      setShowHandoffModal(true);
      toast.success("🛡️ Safe Handoff QR generated!");
    } catch (error: any) {
      toast.error("Failed to generate handoff: " + error.message);
    } finally {
      setIsGeneratingHandoff(false);
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
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/inbox" className="p-2 hover:bg-gray-800 rounded-lg transition shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          {listing && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {listing.image_url ? (
                <img src={listing.image_url} alt="Item" className="w-10 h-10 rounded-lg object-cover bg-gray-800 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 text-lg">📦</div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-sm md:text-base truncate">{listing.product_name}</h2>
                <p className="text-xs text-gray-400 truncate">Chatting with {otherUser?.full_name || "User"}</p>
              </div>
            </div>
          )}
          <Link href={`/listing/${listing_id}`} className="text-xs md:text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0">
            View Item →
          </Link>
          
          {/* 🛡️ SAFE HANDOFF BUTTON */}
          <button 
            onClick={generateHandoff}
            disabled={isGeneratingHandoff}
            className="text-xs md:text-sm bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0"
          >
            {isGeneratingHandoff ? "..." : "🛡️ Safe Handoff"}
          </button>
        </div>
      </nav>

      <div className="bg-yellow-900/20 border-b border-yellow-500/30 px-4 py-2 text-center shrink-0">
        <p className="text-[10px] md:text-xs text-yellow-400">
          ⚠️ <strong>Safety Tip:</strong> Use the "Safe Handoff" button to generate a secure QR code when meeting in person.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl ${
                  isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700"
                }`}>
                  <p className="text-sm md:text-base whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? "text-blue-200" : "text-gray-500"}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Sending..."}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 bg-gray-950/90 backdrop-blur-md p-4 sticky bottom-0 z-50 shrink-0">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 p-3 md:p-4 bg-gray-900 border border-gray-800 rounded-xl text-white text-base focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 md:px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition flex items-center justify-center shrink-0"
          >
            {sending ? <span className="animate-spin">⚙️</span> : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>

      {/* 🛡️ SAFE HANDOFF MODAL */}
      {showHandoffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-bold mb-2 text-white">🛡️ Safe Handoff</h3>
            <p className="text-gray-400 text-sm mb-6">
              Have the other person scan this QR code with their phone camera to confirm the physical exchange.
            </p>
            <div className="bg-white p-4 rounded-xl inline-block mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/handoff/confirm?listing_id=${listing_id}&token=${handoffToken}`)}`} 
                alt="Handoff QR Code" 
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-gray-500 mb-6">
              This will securely mark the item as "Sold" and verify both accounts.
            </p>
            <button 
              onClick={() => setShowHandoffModal(false)} 
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}