"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

// THE GLOBAL CURRENCY MAP (Full 100+ Countries - UNTOUCHED)
const currencyMap: Record<string, { symbol: string; code: string }> = {
  "USA": { symbol: "$", code: "USD" }, "United States": { symbol: "$", code: "USD" },
  "UK": { symbol: "£", code: "GBP" }, "United Kingdom": { symbol: "£", code: "GBP" },
  "Canada": { symbol: "C$", code: "CAD" }, "Australia": { symbol: "A$", code: "AUD" },
  "New Zealand": { symbol: "NZ$", code: "NZD" }, "China": { symbol: "¥", code: "CNY" },
  "Japan": { symbol: "¥", code: "JPY" }, "South Korea": { symbol: "₩", code: "KRW" },
  "Nepal": { symbol: "Rs.", code: "NPR" }, "India": { symbol: "₹", code: "INR" },
  "Pakistan": { symbol: "Rs.", code: "PKR" }, "Bangladesh": { symbol: "৳", code: "BDT" },
  "Sri Lanka": { symbol: "Rs.", code: "LKR" }, "Afghanistan": { symbol: "؋", code: "AFN" },
  "Singapore": { symbol: "S$", code: "SGD" }, "Malaysia": { symbol: "RM", code: "MYR" },
  "Indonesia": { symbol: "Rp", code: "IDR" }, "Thailand": { symbol: "฿", code: "THB" },
  "Vietnam": { symbol: "₫", code: "VND" }, "Philippines": { symbol: "₱", code: "PHP" },
  "Myanmar": { symbol: "K", code: "MMK" }, "Cambodia": { symbol: "៛", code: "KHR" },
  "Laos": { symbol: "₭", code: "LAK" }, "Mongolia": { symbol: "₮", code: "MNT" },
  "Papua New Guinea": { symbol: "K", code: "PGK" }, "Fiji": { symbol: "FJ$", code: "FJD" },
  "UAE": { symbol: "د.إ", code: "AED" }, "Saudi Arabia": { symbol: "﷼", code: "SAR" },
  "Qatar": { symbol: "﷼", code: "QAR" }, "Kuwait": { symbol: "د.ك", code: "KWD" },
  "Oman": { symbol: "﷼", code: "OMR" }, "Bahrain": { symbol: ".د.ب", code: "BHD" },
  "Israel": { symbol: "₪", code: "ILS" }, "Turkey": { symbol: "₺", code: "TRY" },
  "Egypt": { symbol: "£", code: "EGP" }, "Morocco": { symbol: "د.م.", code: "MAD" },
  "Algeria": { symbol: "د.ج", code: "DZD" }, "Tunisia": { symbol: "د.ت", code: "TND" },
  "Jordan": { symbol: "د.ا", code: "JOD" }, "Lebanon": { symbol: "ل.ل", code: "LBP" },
  "Iraq": { symbol: "ع.د", code: "IQD" }, "Iran": { symbol: "﷼", code: "IRR" },
  "South Africa": { symbol: "R", code: "ZAR" }, "Nigeria": { symbol: "₦", code: "NGN" },
  "Kenya": { symbol: "KSh", code: "KES" }, "Ghana": { symbol: "₵", code: "GHS" },
  "Ethiopia": { symbol: "Br", code: "ETB" }, "Tanzania": { symbol: "TSh", code: "TZS" },
  "Uganda": { symbol: "USh", code: "UGX" }, "Rwanda": { symbol: "RF", code: "RWF" },
  "Senegal": { symbol: "CFA", code: "XOF" }, "Cameroon": { symbol: "FCFA", code: "XAF" },
  "Ivory Coast": { symbol: "CFA", code: "XOF" }, "Madagascar": { symbol: "Ar", code: "MGA" },
  "Switzerland": { symbol: "CHF", code: "CHF" }, "Sweden": { symbol: "kr", code: "SEK" },
  "Norway": { symbol: "kr", code: "NOK" }, "Denmark": { symbol: "kr", code: "DKK" },
  "Poland": { symbol: "zł", code: "PLN" }, "Russia": { symbol: "₽", code: "RUB" },
  "Ukraine": { symbol: "₴", code: "UAH" }, "Romania": { symbol: "lei", code: "RON" },
  "Bulgaria": { symbol: "лв", code: "BGN" }, "Hungary": { symbol: "Ft", code: "HUF" },
  "Czech Republic": { symbol: "Kč", code: "CZK" }, "Serbia": { symbol: "din", code: "RSD" },
  "Iceland": { symbol: "kr", code: "ISK" },
  "Germany": { symbol: "€", code: "EUR" }, "France": { symbol: "€", code: "EUR" },
  "Italy": { symbol: "€", code: "EUR" }, "Spain": { symbol: "€", code: "EUR" },
  "Netherlands": { symbol: "€", code: "EUR" }, "Belgium": { symbol: "€", code: "EUR" },
  "Austria": { symbol: "€", code: "EUR" }, "Portugal": { symbol: "€", code: "EUR" },
  "Greece": { symbol: "€", code: "EUR" }, "Finland": { symbol: "€", code: "EUR" },
  "Kazakhstan": { symbol: "₸", code: "KZT" }, "Uzbekistan": { symbol: "лв", code: "UZS" },
  "Azerbaijan": { symbol: "₼", code: "AZN" }, "Georgia": { symbol: "₾", code: "GEL" },
  "Armenia": { symbol: "֏", code: "AMD" },
  "Brazil": { symbol: "R$", code: "BRL" }, "Argentina": { symbol: "$", code: "ARS" },
  "Mexico": { symbol: "$", code: "MXN" }, "Colombia": { symbol: "$", code: "COP" },
  "Chile": { symbol: "$", code: "CLP" }, "Peru": { symbol: "S/.", code: "PEN" },
  "Venezuela": { symbol: "Bs.", code: "VES" }, "Bolivia": { symbol: "Bs.", code: "BOB" },
  "Paraguay": { symbol: "₲", code: "PYG" }, "Uruguay": { symbol: "$U", code: "UYU" },
  "Ecuador": { symbol: "$", code: "USD" }, "Dominican Republic": { symbol: "RD$", code: "DOP" },
  "Jamaica": { symbol: "J$", code: "JMD" }, "Trinidad and Tobago": { symbol: "TT$", code: "TTD" },
  "default": { symbol: "$", code: "USD" }
};

const getSymbol = (code: string) => {
  if (!code) return '$';
  const found = Object.values(currencyMap).find(c => c.code === code);
  return found ? found.symbol : '$';
};

export default function MyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState<string | null>(null);
  const [offersByListing, setOffersByListing] = useState<any>({});
  const [viewingOffersFor, setViewingOffersFor] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("free");
  
  // 🆕 HOLD REQUEST STATES
  const [holdRequests, setHoldRequests] = useState<any[]>([]);
  const [processingHold, setProcessingHold] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", session.user.id).single();
      if (profile) setUserPlan(profile.plan || "free");

      const { data: listingsData } = await supabase.from("listings").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (!listingsData) { setLoading(false); return; }

      // AUTO-EXPIRE OLD LISTINGS (Older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const expiredIds = listingsData
        .filter(l => new Date(l.created_at) < thirtyDaysAgo && (l.status === 'Available' || l.status === 'Active'))
        .map(l => l.id);

      let finalListings = listingsData;
      if (expiredIds.length > 0) {
        await supabase.from("listings").update({ status: 'Expired' }).in("id", expiredIds);
        finalListings = listingsData.map(l => 
          expiredIds.includes(l.id) ? { ...l, status: 'Expired' } : l
        );
      }

      // 📈 Sort by Pinned first, then by Last Bumped, then by Created At
      finalListings.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const dateA = new Date(a.last_bumped_at || a.created_at).getTime();
        const dateB = new Date(b.last_bumped_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setListings(finalListings);

      const { data: offersData } = await supabase.from("offers").select("*").eq("seller_id", session.user.id).eq("status", "pending");
      const offersMap: any = {};
      offersData?.forEach((offer: any) => {
        if (!offersMap[offer.listing_id]) offersMap[offer.listing_id] = [];
        offersMap[offer.listing_id].push(offer);
      });
      setOffersByListing(offersMap);

      // 🆕 FETCH HOLD REQUESTS FOR SELLER'S LISTINGS
      const { data: holdsData } = await supabase
        .from("hold_requests")
        .select("*, buyer:profiles!buyer_id(full_name, hold_strikes)")
        .eq("seller_id", session.user.id)
        .in("status", ["pending", "approved"])
        .order("requested_at", { ascending: false });
      
      if (holdsData) setHoldRequests(holdsData);

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

  const handleMarkAsSold = async (id: string) => {
    if (!confirm("Mark this item as Sold? It will be hidden from the public marketplace.")) return;
    const { error } = await supabase.from("listings").update({ status: 'Sold' }).eq("id", id);
    if (!error) {
      setListings(listings.map(l => l.id === id ? { ...l, status: 'Sold' } : l));
      toast.success("🎉 Marked as Sold!");
    } else {
      toast.error("Error marking as sold.");
    }
  };

  const handlePin = async (id: string, currentPinStatus: boolean) => {
    if (userPlan !== 'pro') { toast.error("🔒 Pin to Top is a Pro feature! Upgrade to use this."); router.push("/pricing"); return; }
    const { error } = await supabase.from("listings").update({ is_pinned: !currentPinStatus }).eq("id", id);
    if (!error) {
      setListings(listings.map(l => l.id === id ? { ...l, is_pinned: !currentPinStatus } : l));
      toast.success(!currentPinStatus ? "📌 Pinned to top!" : "Unpinned.");
    }
  };

  // 🚀 Bump to Top Logic (Freemium: 1 per 30 days for free, unlimited for Pro)
  const handleBump = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (userPlan !== 'pro') {
      const lastBumped = new Date(listing.last_bumped_at || listing.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastBumped > thirtyDaysAgo) {
        toast.error("🔒 Free users get 1 bump per 30 days. Upgrade to Pro for unlimited bumps!");
        router.push("/pricing");
        return;
      }
    }
    
    const now = new Date().toISOString();
    const { error } = await supabase.from("listings").update({ last_bumped_at: now }).eq("id", id);
    if (!error) {
      setListings(prev => {
        const updated = prev.map(l => l.id === id ? { ...l, last_bumped_at: now } : l);
        // Re-sort to put the bumped item at the top (respecting pins)
        return updated.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          const dateA = new Date(a.last_bumped_at || a.created_at).getTime();
          const dateB = new Date(b.last_bumped_at || b.created_at).getTime();
          return dateB - dateA;
        });
      });
      toast.success("🚀 Listing bumped to the top!");
    } else {
      toast.error("Error bumping listing.");
    }
  };

  const handleCopy = (listing: any, type: string) => {
    const title = listing.ai_title?.split(' - ')[0] || listing.product_name;
    const condition = listing.ai_title?.split(' - ')[1] || 'New';
    const price = listing.sale_price || 0;
    const symbol = getSymbol(listing.currency_code);
    const desc = listing.ai_description || 'No description provided.';
    let textToCopy = "";
    if (type === "standard") textToCopy = `${title}\nPrice: ${symbol}${price}\nCondition: ${condition}\n\n${desc}`;
    else if (type === "fb") textToCopy = `🔥 FOR SALE: ${title}\n💰 Price: ${symbol}${price} (Firm)\n📍 Condition: ${condition}\n\n${desc}\n\n📩 DM me if interested!`;
    else if (type === "ebay") textToCopy = `Title: ${title} - ${condition}\nPrice: ${symbol}${price}\n\nDescription:\n${desc}`;
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

  // 🆕 HOLD REQUEST HANDLERS
  const handleApproveHold = async (requestId: string, listingId: string, buyerId: string, expiresAt: string) => {
    setProcessingHold(requestId);
    try {
      await supabase.from("hold_requests").update({ status: "approved" }).eq("id", requestId);
      await supabase.from("listings").update({ is_reserved: true, reserved_by: buyerId, reserved_until: expiresAt }).eq("id", listingId);
      toast.success("✅ Hold approved! Item is now reserved.");
      setHoldRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "approved" } : r));
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, is_reserved: true, reserved_by: buyerId, reserved_until: expiresAt } : l));
    } catch (error) {
      toast.error("Failed to approve hold.");
    }
    setProcessingHold(null);
  };

  const handleDeclineHold = async (requestId: string) => {
    setProcessingHold(requestId);
    try {
      await supabase.from("hold_requests").update({ status: "declined" }).eq("id", requestId);
      toast.success("Hold request declined.");
      setHoldRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error("Failed to decline hold.");
    }
    setProcessingHold(null);
  };

  const handleCancelHold = async (listingId: string, buyerId: string, requestId: string) => {
    if (!confirm("Cancel this hold and mark the buyer as a flake? This will add a strike to their profile.")) return;
    setProcessingHold(listingId);
    try {
      await supabase.from("listings").update({ is_reserved: false, reserved_by: null, reserved_until: null }).eq("id", listingId);
      await supabase.from("hold_requests").update({ status: "cancelled" }).eq("id", requestId);
      
      const { data: buyerProfile } = await supabase.from("profiles").select("hold_strikes").eq("id", buyerId).single();
      const newStrikes = (buyerProfile?.hold_strikes || 0) + 1;
      await supabase.from("profiles").update({ hold_strikes: newStrikes }).eq("id", buyerId);
      
      toast.success("⚠️ Hold cancelled. Buyer received a flake strike.");
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, is_reserved: false, reserved_by: null, reserved_until: null } : l));
      setHoldRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error("Failed to cancel hold.");
    }
    setProcessingHold(null);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">Margin</h1></Link>
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
              const symbol = getSymbol(listing.currency_code);
              
              // 📈 Calculate Conversion Rate safely
              const views = listing.views || 0;
              const offers = offersByListing[listing.id]?.length || 0;
              const conversionRate = views > 0 ? ((offers / views) * 100).toFixed(1) : "0.0";

              // 🆕 FILTER HOLDS FOR THIS SPECIFIC LISTING
              const listingHolds = holdRequests.filter(r => r.listing_id === listing.id);
              const activeHold = listingHolds.find(r => r.status === "approved");
              const pendingHolds = listingHolds.filter(r => r.status === "pending");

              return (
                <div key={listing.id} className={`group bg-gray-900 rounded-2xl border overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col relative ${listing.is_pinned ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-gray-800 hover:border-gray-700'}`}>
                  <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                    <img src={listing.image_url} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    <div className={`absolute top-4 right-4 backdrop-blur-md px-3 py-1 rounded-full border ${listing.status === 'Sold' ? 'bg-green-600/90 border-green-400' : listing.is_reserved ? 'bg-purple-600/90 border-purple-400' : listing.status === 'Pending' ? 'bg-yellow-600/90 border-yellow-400' : listing.status === 'Expired' ? 'bg-gray-600/90 border-gray-400' : 'bg-gray-950/80 border-gray-700'}`}>
                      <span className="text-xs font-bold text-white uppercase">{listing.is_reserved ? '🔒 Reserved' : listing.status}</span>
                    </div>

                    {listing.is_pinned && (
                      <div className="absolute top-4 left-4 bg-yellow-500/90 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-300">
                        <span className="text-xs font-bold text-white uppercase">📌 Pinned</span>
                      </div>
                    )}
                    {listing.is_public && listing.status !== 'Sold' && listing.status !== 'Expired' && !listing.is_pinned && (
                      <div className="absolute top-4 left-4 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400">
                        <span className="text-xs font-bold text-white uppercase"> Public</span>
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
                      <span className="text-3xl font-bold text-blue-400">{symbol}{listing.sale_price}</span>
                      {listing.cost_price > 0 && <span className="text-sm text-gray-500">(Cost: {symbol}{listing.cost_price})</span>}
                    </div>
                    
                    {/* 🆕 HOLD REQUESTS UI FOR SELLER */}
                    {pendingHolds.length > 0 && !isViewingOffers && (
                      <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                        <h4 className="text-sm font-bold text-yellow-400 mb-2">⏳ Pending Hold Requests:</h4>
                        <div className="space-y-2">
                          {pendingHolds.map((req: any) => (
                            <div key={req.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
                              <div>
                                <div className="text-sm font-bold text-white">{req.buyer?.full_name || "Anonymous"}</div>
                                <div className="text-xs text-gray-400">Requested: {new Date(req.requested_at).toLocaleString()}</div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveHold(req.id, listing.id, req.buyer_id, req.expires_at)} disabled={processingHold === req.id} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold disabled:opacity-50">✅ Approve</button>
                                <button onClick={() => handleDeclineHold(req.id)} disabled={processingHold === req.id} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-bold disabled:opacity-50">❌ Decline</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeHold && !isViewingOffers && (
                      <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-green-400 mb-1">🔒 Item Reserved</h4>
                            <div className="text-sm text-gray-300">Buyer: {activeHold.buyer?.full_name || "Anonymous"}</div>
                            <div className="text-xs text-gray-400">Expires: {new Date(activeHold.expires_at).toLocaleString()}</div>
                          </div>
                          <button onClick={() => handleCancelHold(listing.id, activeHold.buyer_id, activeHold.id)} disabled={processingHold === activeHold.id} className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs rounded font-bold border border-red-500/30 transition disabled:opacity-50">
                            ⚠️ Cancel Hold (Buyer Ghosted)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 📈 Pro Analytics Dashboard Widget (UNCHANGED) */}
                    {userPlan === 'pro' ? (
                      <div className="mb-4 p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-blue-500/20 shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            <span>⚡</span> Pro Analytics
                          </h4>
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">Live Data</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-950/50 p-2 rounded-lg border border-gray-800">
                            <div className="text-xs text-gray-500 mb-1">Views</div>
                            <div className="text-lg font-bold text-white">{views}</div>
                          </div>
                          <div className="bg-gray-950/50 p-2 rounded-lg border border-gray-800">
                            <div className="text-xs text-gray-500 mb-1">Offers</div>
                            <div className="text-lg font-bold text-green-400">{offers}</div>
                          </div>
                          <div className="bg-gray-950/50 p-2 rounded-lg border border-gray-800">
                            <div className="text-xs text-gray-500 mb-1">Conv. Rate</div>
                            <div className="text-lg font-bold text-purple-400">{conversionRate}%</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-4 rounded-xl border border-dashed border-gray-700 bg-gray-800/30 flex flex-col items-center text-center gap-2">
                        <span className="text-sm text-gray-400">🔒 Unlock Views, Offers & Conversion Analytics</span>
                        <Link href="/pricing">
                          <button className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-blue-900/30">Upgrade to Pro</button>
                        </Link>
                      </div>
                    )}
                    
                    <div className="relative mt-auto">
                      {isViewingOffers ? (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-green-400 mb-2">Incoming Offers:</h4>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {offersByListing[listing.id].map((offer: any) => (
                              <div key={offer.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                                <span className="font-bold text-white">{symbol}{offer.amount}</span>
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
                              <button onClick={() => handleCopy(listing, "ebay")} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-bold transition">🛒 eBay Optimized</button>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handlePin(listing.id, listing.is_pinned)} className={`px-3 py-3 rounded-xl text-sm font-bold transition border flex justify-center items-center gap-1 ${listing.is_pinned ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500 hover:text-white' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'}`}>📌</button>
                            
                            {/* 🚀 Bump Button */}
                            {listing.status !== 'Sold' && listing.status !== 'Expired' && (
                              <button onClick={() => handleBump(listing.id)} className="px-3 py-3 rounded-xl text-sm font-bold transition border flex justify-center items-center gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white" title="Bump to top of marketplace">
                                🚀
                              </button>
                            )}

                            {/* Mark as Sold Button */}
                            {listing.status !== 'Sold' && listing.status !== 'Expired' && (
                              <button onClick={() => handleMarkAsSold(listing.id)} className="px-4 py-3 bg-green-600/10 hover:bg-green-600 text-green-400 hover:text-white rounded-xl text-sm font-bold transition border border-green-500/20 flex justify-center items-center gap-2">
                                ✅ Sold
                              </button>
                            )}

                            {hasOffers && (
                              <button onClick={() => setViewingOffersFor(listing.id)} className="flex-1 px-4 py-3 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-xl text-sm font-bold transition border border-green-500/20 flex justify-center items-center gap-2">💰 Offers</button>
                            )}
                            <button onClick={() => setCopyMenuOpen(copyMenuOpen === listing.id ? null : listing.id)} className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition border border-gray-700 flex justify-center items-center gap-2">📋 Copy</button>
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