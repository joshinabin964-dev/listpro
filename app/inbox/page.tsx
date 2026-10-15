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

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading inbox...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1></Link>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">My Inbox</h1>
        <p className="text-gray-400 text-lg mb-8">Messages from buyers and sellers.</p>

        {conversations.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
            <p className="text-2xl text-gray-400 mb-2">No messages yet</p>
            <p className="text-gray-500">When someone messages you about a listing, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv: any) => (
              <Link 
                key={conv.id} 
                href={`/chat/${conv.listing_id}?user=${conv.other_user?.id}`}
                className="block"
              >
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 hover:border-blue-500 transition cursor-pointer group">
                  <div className="flex items-center gap-4">
                    {conv.listing_image ? (
                      <img src={conv.listing_image} alt={conv.listing_name} className="w-16 h-16 rounded-xl object-cover bg-gray-800" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-2xl"></div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition">{conv.listing_name}</h3>
                      <p className="text-sm text-gray-400">With {conv.other_user?.full_name || "User"}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{conv.last_message}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(conv.last_message_time).toLocaleDateString()}</p>
                      {conv.unread_count > 0 && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
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