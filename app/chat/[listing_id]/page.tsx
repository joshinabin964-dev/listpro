"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);

      // Fetch listing details
      const { data: listingData } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listing_id)
        .single();
      
      if (listingData) {
        setListing(listingData);
        
        // Determine the other user (if not provided in URL, use listing owner)
        const targetUserId = otherUserId || listingData.user_id;
        
        // Fetch other user's profile
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", targetUserId)
          .single();
        
        setOtherUser(userData);

        // Fetch existing messages
        await fetchMessages(session.user.id, targetUserId, listing_id);
      }
      
      setLoading(false);
    };
    initChat();
  }, [listing_id, otherUserId, router]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    const channel = supabase
      .channel(`chat:${listing_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${listing_id}`
        },
        (payload) => {
          const newMsg = payload.new;
          // Only add if it's not already in the list
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, otherUserId, listing_id]);

  // Auto-scroll to bottom when new messages arrive
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
    if (!newMessage.trim() || !currentUser || !otherUserId) return;

    const { error } = await supabase.from("messages").insert({
      listing_id,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      content: newMessage.trim(),
      is_read: false
    });

    if (!error) {
      setNewMessage("");
    } else {
      console.error("Failed to send message:", error);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading chat...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/inbox"><button className="text-gray-400 hover:text-white transition">← Back</button></Link>
            <div>
              <h2 className="font-bold text-white">{listing?.product_name}</h2>
              <p className="text-xs text-gray-400">Chat with {otherUser?.full_name || "User"}</p>
            </div>
          </div>
          <Link href={`/listing/${listing_id}`} className="text-sm text-blue-400 hover:text-blue-300">
            View Listing →
          </Link>
        </div>
      </nav>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    isMine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? "text-blue-200" : "text-gray-500"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-950/80 backdrop-blur-md sticky bottom-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}