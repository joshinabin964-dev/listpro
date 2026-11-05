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
    
    const handleFocus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadConversations(session);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router]);

  if (loading || !currentUser) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Loading Inbox...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* 🌌 Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🧭 Premium Nav */}
      <nav className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 border border-white/5 group-hover:border-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </div>
            <span className="font-medium hidden sm:inline">Back to Dashboard</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Inbox
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </nav>
      
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 relative z-10">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-900/30 backdrop-blur-sm rounded-3xl border border-white/10">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-4xl mb-6 animate-pulse">
              💬
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No messages yet</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md px-4">
              Start exploring the marketplace and connect with sellers or buyers to begin chatting!
            </p>
            <Link href="/marketplace">
              <button className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group">
                <span>🌍 Browse Marketplace</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((convo: any) => {
              const otherUser = userProfiles[convo.otherUserId] || {};
              const listing = listingsData[convo.listingId] || {};
              const otherName = otherUser.full_name || "User";
              const otherAvatar = otherUser.avatar_url;
              
              const productName = listing.product_name || listing.title || listing.name || "Item";
              const price = listing.price ? `$${listing.price}` : "";
              const isUnread = convo.unreadCount > 0;

              return (
                <Link 
                  key={convo.id} 
                  href={`/chat/${convo.listingId}?user=${convo.otherUserId}`}
                  className="block group"
                >
                  <div className={`relative p-4 md:p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isUnread 
                      ? 'bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:shadow-blue-500/10' 
                      : 'bg-gray-900/50 border-white/10 hover:bg-gray-800/50 hover:border-white/20 hover:shadow-white/5'
                  }`}>
                    
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border transition-colors ${
                          isUnread ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-gray-800'
                        }`}>
                          {otherAvatar ? (
                            <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-gray-400">{otherName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        {isUnread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-950 shadow-lg shadow-blue-500/50 animate-pulse"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className={`font-bold text-lg truncate ${isUnread ? 'text-white' : 'text-gray-200'}`}>
                            {otherName}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-3 mt-1 font-medium">
                            {new Date(convo.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 truncate max-w-[200px]">
                            {productName}
                          </span>
                          {price && <span className="text-xs text-gray-500 font-medium">{price}</span>}
                        </div>
                        
                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-sm truncate flex-1 leading-relaxed ${isUnread ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                            {convo.isMeLast && <span className="text-gray-500">You: </span>}
                            {convo.lastMessage}
                          </p>
                          
                          {isUnread && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 shadow-lg shadow-blue-600/20">
                              {convo.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}