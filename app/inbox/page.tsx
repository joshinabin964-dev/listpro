"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      await fetchConversations(session.user.id);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchConversations = async (userId: string) => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    const convos: any = {};
    
    for (const msg of messages) {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const convoKey = `${otherUserId}-${msg.listing_id}`;
      
      if (!convos[convoKey]) {
        const { data: otherUser } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, phone_number")
          .eq("id", otherUserId)
          .single();
        
        const { data: listing } = await supabase
          .from("listings")
          .select("product_name, image_url, price")
          .eq("id", msg.listing_id)
          .single();
        
        convos[convoKey] = {
          id: convoKey,
          // 🔥 FIX 1: Always save the raw IDs from the message, so the link never breaks
          other_user_id: otherUserId, 
          listing_id: msg.listing_id,
          
          other_user: otherUser,
          listing: listing,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0,
          is_sender: msg.sender_id === userId
        };
      }
      
      if (msg.sender_id !== userId && !msg.is_read) {
        convos[convoKey].unread_count++;
      }
    }
    
    const sortedConvos = Object.values(convos).sort((a: any, b: any) => 
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
    
    setConversations(sortedConvos);
  };

  const filteredConvos = conversations.filter((convo: any) => {
    const userName = convo.other_user?.full_name?.toLowerCase() || "";
    const productName = convo.listing?.product_name?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return userName.includes(search) || productName.includes(search);
  });

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white text-lg">Loading messages...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Messages</h1>
            <div className="w-20"></div>
          </div>
          
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredConvos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No messages yet</h3>
            <p className="text-gray-400 mb-6">Start conversations with buyers and sellers</p>
            <Link href="/marketplace">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
                Browse Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConvos.map((convo: any) => (
              <Link 
                key={convo.id} 
                // 🔥 FIX 2: Fallback to the raw IDs if the profile/listing object is missing
                href={`/chat/${convo.listing_id || convo.listing?.id}?user=${convo.other_user_id || convo.other_user?.id}`}
                className="block"
              >
                <div className={`bg-gray-900 rounded-2xl p-4 border transition hover:border-blue-500/50 ${
                  convo.unread_count > 0 ? 'border-blue-500 bg-blue-900/10' : 'border-gray-800'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                        {convo.other_user?.avatar_url ? (
                          <img 
                            src={convo.other_user.avatar_url} 
                            alt={convo.other_user?.full_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            {convo.other_user?.full_name?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                      {convo.unread_count > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-gray-900 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-white text-lg truncate">
                          {convo.other_user?.full_name || "User"}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(convo.last_message_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-blue-400 mb-1 truncate">
                        {convo.listing?.product_name || "Product"}
                        {convo.listing?.price && ` • $${convo.listing.price}`}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate flex-1 ${
                          convo.unread_count > 0 ? 'text-white font-semibold' : 'text-gray-400'
                        }`}>
                          {convo.is_sender && "You: "}
                          {convo.last_message}
                        </p>
                        {convo.unread_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
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