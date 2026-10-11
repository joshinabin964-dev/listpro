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
  const [offersByListing, setOffersByListing] = useState<any>({});
  const [viewingOffersFor, setViewingOffersFor] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("free"); // NEW: Track plan
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      // Get Plan
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", session.user.id).single();
      if (profile) setUserPlan(profile.plan || "free");

      const { data: listingsData } = await supabase.from("listings").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (!listingsData) { setLoading(false); return; }
      setListings(listingsData);

      const { data: offersData } = await supabase.from("offers").select("*").eq("seller_id", session.user.id).eq("status", "pending");
      const offersMap: any = {};
      offersData?.forEach((offer: any) => {
        if (!offersMap[offer.listing_id]) offersMap[offer.listing_id] = [];
        offersMap[offer.listing_id].push(offer);
      });
      setOffersByListing(offersMap);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Permanently delete this listing?")) return;
    setDeletingId(id);
    const { error: dbError } = await supabase.from("listings").delete().eq("id", id);
    if (imageUrl && !dbError) {
      const fileName = imageUrl.split('/').pop();
      if(fileName) await supabase.storage.from('product-images').remove([fileName]);
    }
    if (!dbError) { setListings(listings.filter(l => l.id !== id)); toast.success("Listing deleted."); } 
    else { toast.error("Error deleting."); }
    setDeletingId(null);
  };

  // NEW: Handle Pinning
  const handlePin = async (id: string, currentPinStatus: boolean) => {
    if (userPlan !== 'pro') {
      toast.error("🔒 Pin to Top is a Pro feature! Upgrade to use this.");
      router.push("/pricing");
      return;
    }
    const { error } = await supabase.from("listings").update({ is_pinned: !currentPinStatus }).eq("id", id);
    if (!error) {
      setListings(listings.map(l => l.id === id ? { ...l, is_pinned: !currentPinStatus } : l));
      toast.success(!currentPinStatus ? "📌 Pinned to top!" : "Unpinned.");
    }
  };

  const handleCopy = (listing: any, type: string) => {
    const title = listing.ai_title?.split(' - ')[0] || listing.product_name;
    const condition = listing.ai_title?.split(' - ')[1] || 'New';
    const price = listing.sale_price || 0;
    const desc = listing.ai_description || 'No description provided.';
    let textToCopy = "";
    if (type === "standard") textToCopy = `${title}\nPrice: $${price}\nCondition: ${condition}\n\n${desc}`;
    else if (type === "fb") textToCopy = ` FOR SALE: ${title}\n💰 Price: $${price} (Firm)\n Condition: ${condition}\n\n${desc}\n\n📩 DM me if interested!`;
    else if (type === "ebay") textToCopy = `Title: ${title} - ${condition}\nPrice: $${price}\n\nDescription:\n${desc}`;
    navigator.clipboard.writeText(textToCopy);
    setCopyMenuOpen(null);
    toast.success(`✅ Copied ${type.toUpperCase()} template!`);
  };

  const handleOfferAction = async (offerId: string, action: 'accepted' | 'declined', listingId: string) => {
    const { error } = await supabase.from("offers").update({ status: action }).eq("id", offerId);
    if (!error) {
      toast.success(`Offer ${action === 'accepted' ? 'Accepted' : 'Declined'}!`);
      setOffersByListing((prev: any) => {
        const currentOffers = prev[listingId] || [];
        const newOffers = currentOffers.filter((o: any) => o.id !== offerId);
        const newState = { ...prev, [listingId]: newOffers };
        if (newOffers.length === 0) delete newState[listingId];
        return newState;
      });
      if (action === 'accepted') {
        await supabase.from("listings").update({ status: 'Pending' }).eq("id", listingId);
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'Pending' } : l));
      }
    }
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
            {listings.map((listing) => {
              const hasOffers = offersByListing[listing.id] && offersByListing[listing.id].length > 0;
              const isViewingOffers = viewingOffersFor === listing.id;

              return (
                <div key={listing.id} className={`group bg-gray-900 rounded-2xl border overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col relative ${listing.is_pinned ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-gray-800 hover:border-gray-700'}`}>
                  <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                    <img src={listing.image_url} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className={`absolute top-4 right-4 backdrop-blur-md px-3 py-1 rounded-full border ${listing.status === 'Sold' ? 'bg-green-600/90 border-green-400' : listing.status === 'Pending' ? 'bg-yellow-600/90 border-yellow-400' : 'bg-gray-950/80 border-gray-700'}`}>
                      <span className="text-xs font-bold text-white uppercase">{listing.status}</span>
                    </div>
                    {listing.is_pinned && (
                      <div className="absolute top-4 left-4 bg-yellow-500/90 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-300">
                        <span className="text-xs font-bold text-white uppercase"> Pinned</span>
                      </div>
                    )}
                    {listing.is_public && listing.status !== 'Sold' && !listing.is_pinned && (
                      <div className="absolute top-4 left-4 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400">
                        <span className="text-xs font-bold text-white uppercase">🌍 Public</span>
                      </div>
                    )}
                    {hasOffers && !isViewingOffers && (
                      <div className="absolute bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                        💰 {offersByListing[listing.id].length} New Offer{offersByListing[listing.id].length > 1 ? 's' : ''}
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
                      {isViewingOffers ? (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-green-400 mb-2">Incoming Offers:</h4>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {offersByListing[listing.id].map((offer: any) => (
                              <div key={offer.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                                <span className="font-bold text-white">${offer.amount}</span>
                                <div className="flex gap-2">
                                  <button onClick={() => handleOfferAction(offer.id, 'accepted', listing.id)} className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold">Accept</button>
                                  <button onClick={() => handleOfferAction(offer.id, 'declined', listing.id)} className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-bold">Decline</button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setViewingOffersFor(null)} className="w-full mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-bold transition">Close Offers</button>
                        </div>
                      ) : (
                        <>
                          {copyMenuOpen === listing.id && (
                            <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-10">
                              <button onClick={() => handleCopy(listing, "standard")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition border-b border-gray-700"> Standard Copy</button>
                              <button onClick={() => handleCopy(listing, "fb")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition border-b border-gray-700">📘 Facebook Marketplace</button>
                              <button onClick={() => handleCopy(listing, "ebay")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition"> eBay Optimized</button>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {/* NEW: Pin Button */}
                            <button onClick={() => handlePin(listing.id, listing.is_pinned)} className={`px-3 py-3 rounded-xl text-sm font-bold transition border flex justify-center items-center gap-1 ${listing.is_pinned ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500 hover:text-white' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'}`}>
                              📌
                            </button>
                            
                            {hasOffers && (
                              <button onClick={() => setViewingOffersFor(listing.id)} className="flex-1 px-4 py-3 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-xl text-sm font-bold transition border border-green-500/20 flex justify-center items-center gap-2">
                                💰 View Offers
                              </button>
                            )}
                            <button onClick={() => setCopyMenuOpen(copyMenuOpen === listing.id ? null : listing.id)} className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition border border-gray-700 flex justify-center items-center gap-2">
                               Copy
                            </button>
                            <button onClick={() => handleDelete(listing.id, listing.image_url)} disabled={deletingId === listing.id} className="px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-sm font-bold transition border border-red-500/20">
                              {deletingId === listing.id ? "..." : "🗑️"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}