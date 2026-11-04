"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 NEW: State to hold user profiles (Name & Picture)
  const [userProfiles, setUserProfiles] = useState<any>({}); 
  
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      // 🔥 YOUR EXACT MESSAGE FETCH (Untouched)
      const { data, error } = await supabase
        .from("messages")
        .select("*") 
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (error) console.error("Inbox Error:", error);
      setMessages(data || []);

      // 🔥 NEW: Fetch Names and Pictures for the people in these messages
      if (data && data.length > 0) {
        // Find all unique user IDs from the messages
        const uniqueIds = [...new Set(data.map(m => m.sender_id === session.user.id ? m.receiver_id : m.sender_id))];
        
        // Fetch their profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", uniqueIds);
          
        if (profiles) {
          // Create a quick lookup dictionary: { userId: { name, avatar } }
          const profileMap = profiles.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
          setUserProfiles(profileMap);
        }
      }

      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      {/* 🔥 NAVIGATION BAR (Untouched) */}
      <nav className="mb-6 flex justify-between items-center">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">My Inbox</h1>
        <div className="w-20"></div>
      </nav>
      
      {messages.length === 0 ? (
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
          {messages.map((msg) => {
            const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
            const isMe = msg.sender_id === currentUser.id;
            
            // 🔥 NEW: Get the user's name and picture from our new state
            const otherUser = userProfiles[otherUserId] || {};
            const otherName = otherUser.full_name || "User";
            const otherAvatar = otherUser.avatar_url;

            return (
              <Link 
                key={msg.id} 
                href={`/chat/${msg.listing_id}?user=${otherUserId}`}
                className="block"
              >
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${isMe ? 'bg-blue-900/20 border-blue-800' : 'bg-gray-900 border-gray-800'}`}>
                  
                  {/* 🔥 NEW: Profile Picture */}
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {otherAvatar ? (
                      <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-gray-400">{otherName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white truncate">{otherName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate mb-1">{msg.content}</p>
                    <p className="text-[10px] text-blue-400">Listing: {msg.listing_id.slice(0, 8)}...</p>
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