"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestNotificationPermission, onMessageListener } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setCurrentUser(session.user);
      
      // 🔥 Request notification permission
      const token = await requestNotificationPermission();
      if (token) {
        // Save token to database so we can send push notifications
        await supabase
          .from("profiles")
          .upsert({ 
            id: session.user.id, 
            fcm_token: token,
            updated_at: new Date().toISOString()
          });
      }
      
      // Listen for messages when app is open
      onMessageListener((payload: any) => {
        toast.success(`📩 ${payload.notification?.title || 'New message!'}`, {
          duration: 4000
        });
        fetchConversations(session.user.id);
      });
      
      await fetchConversations(session.user.id);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchConversations = async (userId: string) => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, sender:sender_id(full_name), receiver:receiver_id(full_name), listings(product_name)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Group messages by conversation
    const convos: any = {};
    messages?.forEach((msg: any) => {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      const listing = msg.listings;
      const key = `${msg.listing_id}-${otherUser?.id}`;
      
      if (!convos[key]) {
        convos[key] = {
          id: key,
          listing_id: msg.listing_id,
          listing_name: listing?.product_name || "Item",
          other_user: otherUser,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0
        };
      }
    });
    
    setConversations(Object.values(convos));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">My Inbox</h1>
      
      {conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>No messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv: any) => (
            <Link 
              key={conv.id} 
              href={`/chat/${conv.listing_id}?user=${conv.other_user?.id}`}
              className="block"
            >
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white">{conv.listing_name}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.last_message_time).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-1">
                  With: {conv.other_user?.full_name || "User"}
                </p>
                <p className="text-gray-300 truncate">{conv.last_message}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}