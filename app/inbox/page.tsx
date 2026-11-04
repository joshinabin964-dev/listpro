"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [userProfiles, setUserProfiles] = useState<any>({}); 
  const [listingsData, setListingsData] = useState<any>({}); 
  
  const router = useRouter();

  // 🔥 Helper function to fetch and group data
  const loadConversations = async (session: any) => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*") 
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });

    if (error) console.error("Inbox Error:", error);
    
    if (messages && messages.length > 0) {
      const uniqueUserIds = [...new Set(messages.map(m => m.sender_id === session.user.id ? m.receiver_id : m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uniqueUserIds);
      if (profiles) {
        setUserProfiles(profiles.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {}));
      }

      // 🔥 FIX: Fetch product_name, title, AND name to guarantee we get the product name
      const uniqueListingIds = [...new Set(messages.map(m => m.listing_id))];
      const { data: listings } = await supabase.from("listings").select("id, product_name, title, name, price").in("id", uniqueListingIds);
      if (listings) {
        setListingsData(listings.reduce((acc: any, l: any) => { acc[l.id] = l; return acc; }, {}));
      }

      const convos: any = {};
      messages.forEach((msg: any) => {
        const isMe = msg.sender_id === session.user.id;
        const otherId = isMe ? msg.receiver_id : msg.sender_id;
        const key = `${otherId}-${msg.listing_id}`; 
        
        if (!convos[key]) {
          convos[key] = {
            id: key,
            otherUserId: otherId,
            listingId: msg.listing_id,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
            isMeLast: isMe
          };
        }
        
        if (!isMe && !msg.is_read) {
          convos[key].unreadCount += 1;
        }
      });

      const sortedConvos = Object.values(convos).sort((a: any, b: any) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      setConversations(sortedConvos);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      await loadConversations(session);
      setLoading(false);
    };
    init();
    
    // 🔥 NEW: Refresh inbox when user returns to the tab/app (so badges disappear instantly)
    const handleFocus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadConversations(session);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router]);

  if (loading || !currentUser) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <nav className="mb-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">My Inbox</h1>
        <div className="w-20"></div>
      </nav>
      
      {conversations.length === 0 ? (
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
          {conversations.map((convo: any) => {
            const otherUser = userProfiles[convo.otherUserId] || {};
            const listing = listingsData[convo.listingId] || {};
            const otherName = otherUser.full_name || "User";
            const otherAvatar = otherUser.avatar_url;
            
            // 🔥 FIX: Fallback to title or name if product_name is missing
            const productName = listing.product_name || listing.title || listing.name || "Item";
            const price = listing.price ? `$${listing.price}` : "";

            return (
              <Link 
                key={convo.id} 
                href={`/chat/${convo.listingId}?user=${convo.otherUserId}`}
                className="block"
              >
                <div className={`p-4 rounded-xl border flex items-center gap-4 transition hover:border-blue-500/50 ${
                  convo.unreadCount > 0 ? 'bg-blue-900/10 border-blue-800' : 'bg-gray-900 border-gray-800'
                }`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      {otherAvatar ? (
                        <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{otherName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {convo.unreadCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-gray-900 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold truncate ${convo.unreadCount > 0 ? 'text-white' : 'text-gray-200'}`}>
                        {otherName}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {new Date(convo.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-blue-400 mb-1 truncate font-medium">
                      {productName} {price && `• ${price}`}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate flex-1 ${convo.unreadCount > 0 ? 'text-white font-semibold' : 'text-gray-400'}`}>
                        {convo.isMeLast ? "You: " : ""}{convo.lastMessage}
                      </p>
                      
                      {convo.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}