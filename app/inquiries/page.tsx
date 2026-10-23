"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function InquiriesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchInquiries = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase.from("messages").select("*, listings(product_name, image_url, sale_price)").eq("receiver_id", session.user.id).order("created_at", { ascending: false });
      if (!error) setMessages(data || []);
      setLoading(false);
    };
    fetchInquiries();
  }, [router]);

  const handleQuickReply = async (msg: any, template: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let finalMessage = "";
    if (template === "available") finalMessage = `Hi! Yes, the "${msg.listings?.product_name}" is still available. Let me know if you have any questions!`;
    if (template === "firm") finalMessage = `Hi! The price of $${msg.listings?.sale_price} for the "${msg.listings?.product_name}" is firm. Thanks for understanding!`;
    if (template === "pickup") finalMessage = `Hi! The "${msg.listings?.product_name}" is available for local pickup. Let me know what day works for you!`;

    const { error } = await supabase.from("messages").insert({
      listing_id: msg.listing_id, sender_id: session.user.id, receiver_id: msg.sender_id, content: finalMessage
    });

    if (error) { toast.error("Failed to send reply."); } 
    else { 
      toast.success("✅ Quick reply sent!"); 
      setReplyingTo(null); 
      const { data } = await supabase.from("messages").select("*, listings(product_name, image_url, sale_price)").eq("receiver_id", session.user.id).order("created_at", { ascending: false });
      setMessages(data || []);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading inbox...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">Nabjo</h1></Link>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">My Inbox</h1>
        <p className="text-gray-400 text-lg mb-12">Messages from interested buyers about your listings.</p>

        {messages.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
            <p className="text-2xl text-gray-400 mb-6">No inquiries yet.</p>
            <p className="text-gray-500">When someone contacts you about your public listings, it will show up here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex gap-6 hover:border-purple-500/50 transition">
                <div className="w-24 h-24 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={msg.listings?.image_url || "https://via.placeholder.com/100"} alt="Product" className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">Inquiry about: <span className="text-purple-400">{msg.listings?.product_name || "Unknown Item"}</span></h3>
                    <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-300 text-lg mb-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">"{msg.content}"</p>
                  
                  {replyingTo === msg.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleQuickReply(msg, "available")} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-bold transition">✅ Yes, still available!</button>
                        <button onClick={() => handleQuickReply(msg, "firm")} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-bold transition">💰 Price is firm</button>
                        <button onClick={() => handleQuickReply(msg, "pickup")} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-bold transition"> Available for pickup</button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setReplyingTo(null)} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyingTo(msg.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition">Reply to Buyer</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}