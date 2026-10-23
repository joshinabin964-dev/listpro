"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);
      await fetchConversations(session.user.id);
      setLoading(false);
    };
    initChat();
  }, [router]);

  const fetchConversations = async (userId: string) => {
    // Get all messages where user is sender or receiver
    const { data: messages } = await supabase
      .from("messages")
      .select("*, listings(product_name, image_url), sender:sender_id(full_name), receiver:receiver_id(full_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (messages) {
      // Group messages by conversation (unique pairing of users + listing)
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
  };

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Loading inbox...</p>
      </div>
    </main>
  );

  return (
    // 📱 MOBILE POLISH: Adjusted main container padding
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1></Link>
          <Link href="/dashboard"><button className="px-3 md:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition">Back</button></Link>
        </div>
      </nav>

      {/* 📱 MOBILE POLISH: Adjusted padding and text sizes */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">My Inbox</h1>
        <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8">Messages from buyers and sellers.</p>

        {conversations.length === 0 ? (
          /* ✨ NEW: Premium Empty State */
          <div className="text-center py-16 md:py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-800 mb-4 md:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Your inbox is empty</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6 md:mb-8 max-w-md mx-auto px-4">
              You haven't received any messages yet. Start a conversation by browsing items in the marketplace!
            </p>
            <Link href="/marketplace">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-2 mx-auto text-sm md:text-base">
                <span>🌍</span> Browse the Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {conversations.map((conv: any) => (
              <Link 
                key={conv.id} 
                href={`/chat/${conv.listing_id}?user=${conv.other_user?.id}`}
                className="block"
              >
                {/* 📱 MOBILE POLISH: Adjusted padding, image size, and gaps for mobile */}
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
                    <div className="text-right shrink-0">
                      <p className="text-[10px] md:text-xs text-gray-500">
                        {conv.last_message_time ? new Date(conv.last_message_time).toLocaleDateString() : "Recently"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="inline-block mt-1 md:mt-2 px-2 py-1 bg-blue-600 text-white text-[10px] md:text-xs font-bold rounded-full">
                          {conv.unread_count} new
                        </span>
                      )}
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