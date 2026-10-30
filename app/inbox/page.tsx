"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);
      await loadInbox(session.user.id);
      setLoading(false);
    };
    initChat();
  }, [router]);

  const loadInbox = async (userId: string) => {
    setRefreshing(true);
    
    const { data: messages } = await supabase
      .from("messages")
      .select("*, listings(product_name, image_url), sender:sender_id(full_name), receiver:receiver_id(full_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (messages) {
      const convos: any = {};
      messages.forEach((msg: any) => {
        const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
        const listing = msg.listings;
        const key = `${msg.listing_id}-${otherUser?.id}`;
        
        if (!convos[key]) {
          convos[key] = {
            id: key,
            listing_id: msg.listing_id,
            listing_name: listing?.product_name || "Unknown Item",
            listing_image: listing?.image_url,
            other_user: otherUser,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0
          };
        }
      });
      
      setConversations(Object.values(convos).sort((a: any, b: any) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    }
    
    setRefreshing(false);
  };

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="relative w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1></Link>
          <button 
            onClick={() => currentUser && loadInbox(currentUser.id)}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg text-sm font-bold transition flex items-center gap-2"
          >
            {refreshing ? "⏳ Loading..." : "🔄 Refresh Inbox"}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg mb-6">
          <p className="text-yellow-400 text-sm">
            📱 <strong>Mobile Note:</strong> Tap "Refresh Inbox" to check for new messages. Real-time sync will work in the native app.
          </p>
        </div>

        <h1 className="text-2xl md:text-4xl font-bold mb-2">My Inbox</h1>
        <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8">Messages from buyers and sellers.</p>

        {conversations.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Your inbox is empty</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6">
              No messages yet. Tap "Refresh Inbox" after sending a message.
            </p>
            <Link href="/marketplace">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
                🌍 Browse the Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {conversations.map((conv: any) => (
              <Link key={conv.id} href={`/chat/${conv.listing_id}?user=${conv.other_user?.id}`} className="block">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-6 hover:border-blue-500 transition cursor-pointer group">
                  <div className="flex items-center gap-3 md:gap-4">
                    {conv.listing_image ? (
                      <img src={conv.listing_image} alt={conv.listing_name} className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl object-cover bg-gray-800 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gray-800 flex items-center justify-center text-xl md:text-2xl shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base md:text-lg group-hover:text-blue-400 transition truncate">{conv.listing_name}</h3>
                      <p className="text-xs md:text-sm text-gray-400">With {conv.other_user?.full_name || "User"}</p>
                      <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-1">{conv.last_message || "No message content"}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}