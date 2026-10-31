"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

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
      await loadInbox(session.user.id);
      setLoading(false);
    };
    initChat();
  }, [router]);

  // 🚀 REALTIME LISTENER (Like WhatsApp)
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` },
        (payload) => {
          toast.success('📩 New message received!');
          loadInbox(currentUser.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const loadInbox = async (userId: string) => {
    // Simple, direct query. No complex joins that break.
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, listings(product_name, image_url)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Inbox Error:", error);
      return;
    }

    if (messages) {
      const convos: any = {};
      messages.forEach((msg: any) => {
        const key = msg.listing_id; // Group by listing for now to keep it simple
        
        if (!convos[key]) {
          convos[key] = {
            id: key,
            listing_id: msg.listing_id,
            listing_name: msg.listings?.product_name || "Unknown Item",
            listing_image: msg.listings?.image_url,
            last_message: msg.content,
            last_message_time: msg.created_at,
          };
        }
      });
      
      setConversations(Object.values(convos).sort((a: any, b: any) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><div className="w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1></Link>
          <button onClick={() => currentUser && loadInbox(currentUser.id)} className="p-2 bg-gray-800 rounded-lg">🔄</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">My Inbox</h1>
        <p className="text-gray-400 mb-8">Messages from buyers and sellers.</p>

        {conversations.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <h3 className="text-2xl font-bold mb-2">Your inbox is empty</h3>
            <Link href="/marketplace"><button className="mt-6 px-6 py-3 bg-blue-600 rounded-xl font-bold">🌍 Browse Marketplace</button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv: any) => (
              <Link key={conv.id} href={`/chat/${conv.listing_id}`} className="block">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 hover:border-blue-500 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    {conv.listing_image ? <img src={conv.listing_image} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">📦</div>}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{conv.listing_name}</h3>
                      <p className="text-gray-500 text-sm mt-1">{conv.last_message}</p>
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