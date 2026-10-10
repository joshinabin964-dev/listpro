"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchListings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase.from("listings").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (!error) setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, [router]);

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Permanently delete this listing?")) return;
    setDeletingId(id);
    const { error: dbError } = await supabase.from("listings").delete().eq("id", id);
    if (imageUrl && !dbError) {
      const fileName = imageUrl.split('/').pop();
      if(fileName) await supabase.storage.from('product-images').remove([fileName]);
    }
    if (!dbError) { 
      setListings(listings.filter(l => l.id !== id)); 
      toast.success("Listing deleted.");
    } else { toast.error("Error deleting."); }
    setDeletingId(null);
  };

  const handleCopy = (listing: any, type: string) => {
    const title = listing.ai_title?.split(' - ')[0] || listing.product_name;
    const condition = listing.ai_title?.split(' - ')[1] || 'New';
    const price = listing.sale_price || 0;
    const desc = listing.ai_description || 'No description provided.';
    
    let textToCopy = "";
    if (type === "standard") textToCopy = `${title}\nPrice: $${price}\nCondition: ${condition}\n\n${desc}`;
    else if (type === "fb") textToCopy = `🔥 FOR SALE: ${title}\n💰 Price: $${price} (Firm)\n📍 Condition: ${condition}\n\n${desc}\n\n📩 DM me if interested! First come, first served. No lowballs, please.`;
    else if (type === "ebay") textToCopy = `Title: ${title} - ${condition}\nPrice: $${price}\n\nItem Specifics:\n- Condition: ${condition}\n- High Quality & Authentic\n- Fast & Secure Shipping\n- Satisfaction Guaranteed\n\nDescription:\n${desc}\n\n*Please review all photos carefully. Feel free to message with any questions!*`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopyMenuOpen(null);
    toast.success(`✅ Copied ${type.toUpperCase()} template!`);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">ListPro</h1></Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Dashboard</button></Link>
            <Link href="/marketplace"><button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition">🌍 Public Marketplace</button></Link>
            <Link href="/generate"><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">+ Create New</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-4xl font-bold mb-2">My Listings</h2>
        <p className="text-gray-400 text-lg mb-12">Manage, copy, and publish your products.</p>

        {listings.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
            <p className="text-xl text-gray-400 mb-6">No listings yet.</p>
            <Link href="/generate"><button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">Create Your First Listing</button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <div key={listing.id} className="group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl hover:shadow-2xl hover:border-gray-700 transition-all duration-300 flex flex-col">
                <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                  <img src={listing.image_url} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className={`absolute top-4 right-4 backdrop-blur-md px-3 py-1 rounded-full border ${listing.status === 'Sold' ? 'bg-green-600/90 border-green-400' : 'bg-gray-950/80 border-gray-700'}`}>
                    <span className="text-xs font-bold text-white uppercase">{listing.status}</span>
                  </div>
                  {listing.is_public && listing.status !== 'Sold' && (
                    <div className="absolute top-4 left-4 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400">
                      <span className="text-xs font-bold text-white uppercase">🌍 Public</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{listing.ai_title?.split(' - ')[0] || listing.product_name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-blue-400">${listing.sale_price}</span>
                    {listing.cost_price > 0 && <span className="text-sm text-gray-500">(Cost: ${listing.cost_price})</span>}
                  </div>
                  
                  <div className="relative mt-auto">
                    {copyMenuOpen === listing.id && (
                      <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-10">
                        <button onClick={() => handleCopy(listing, "standard")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition border-b border-gray-700">📋 Standard Copy</button>
                        <button onClick={() => handleCopy(listing, "fb")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition border-b border-gray-700">📘 Facebook Marketplace</button>
                        <button onClick={() => handleCopy(listing, "ebay")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition"> eBay Optimized</button>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setCopyMenuOpen(copyMenuOpen === listing.id ? null : listing.id)} className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition border border-gray-700 flex justify-center items-center gap-2">
                        📋 Copy For...
                      </button>
                      <Link href={`/my-listings/edit/${listing.id}`} className="flex-1">
                        <button className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl text-sm font-bold transition border border-blue-500/20">Edit</button>
                      </Link>
                      <button onClick={() => handleDelete(listing.id, listing.image_url)} disabled={deletingId === listing.id} className="px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-sm font-bold transition border border-red-500/20">
                        {deletingId === listing.id ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}