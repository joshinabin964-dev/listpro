"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCountry, setUserCountry] = useState("Unknown");
  const [loading, setLoading] = useState(true);
  
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  
  const [visualSearchModalOpen, setVisualSearchModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visualKeyword, setVisualKeyword] = useState("");
  const [includeInternational, setIncludeInternational] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase.from("profiles").select("latitude, longitude, country, plan, visual_searches_used").eq("id", session.user.id).single();
        if (profile) {
          if (profile.latitude && profile.longitude) {
            setUserLocation({ lat: profile.latitude, lng: profile.longitude });
          }
          setUserCountry(profile.country || "Unknown");
        }
        const { data: savedData } = await supabase.from("saved_items").select("listing_id").eq("user_id", session.user.id);
        if (savedData) setSavedListingIds(savedData.map((item: any) => item.listing_id));
      }
      await fetchListings("");
      setLoading(false);
    };
    initData();
  }, []);

  const fetchListings = async (term: string) => {
    setLoading(true);
    let query = supabase.from("listings").select("*").eq("is_public", true).in("status", ["Available", "Active"]);
    
    if (term) query = query.or(`product_name.ilike.%${term}%,ai_description.ilike.%${term}%,description.ilike.%${term}%`);
    if (minPrice) query = query.gte("sale_price", Number(minPrice));
    if (maxPrice) query = query.lte("sale_price", Number(maxPrice));
    if (conditionFilter !== "all") query = query.eq("condition", conditionFilter);

    const { data, error } = await query.order("created_at", { ascending: false });
    
    if (data && !error) {
      const listingsWithDistance = data.map((listing: any) => {
        if (userLocation && listing.latitude && listing.longitude) {
          const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude);
          return { ...listing, distance: dist };
        }
        return { ...listing, distance: 9999 };
      });

      const filteredListings = listingsWithDistance.filter((listing: any) => {
        if (distanceFilter === "all") return true;
        return listing.distance <= Number(distanceFilter);
      });

      filteredListings.sort((a: any, b: any) => a.distance - b.distance);
      setListings(filteredListings);
    } else {
      setListings([]);
    }
    setLoading(false);
  };

  const handleVisualSearch = async () => {
    if (!visualKeyword.trim()) {
      toast.error("Please add a few keywords to describe the item.");
      return;
    }
    if (!currentUser) {
      toast.error("Please log in to use Visual Search.");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("plan, visual_searches_used, country").eq("id", currentUser.id).single();
      const userPlan = profile?.plan || "free";
      const searchesUsed = profile?.visual_searches_used || 0;
      const country = profile?.country || "Unknown";
      setUserCountry(country);

      if (userPlan === "free" && searchesUsed >= 2) {
        toast.error("🔒 Free limit reached (2/2 visual searches). Upgrade to Pro for unlimited!");
        router.push("/pricing");
        setVisualSearchModalOpen(false);
        setLoading(false);
        return;
      }

      if (userPlan === "free") {
        await supabase.from("profiles").update({ visual_searches_used: searchesUsed + 1 }).eq("id", currentUser.id);
      }

      let query = supabase.from("listings").select("*, profiles(country)").eq("is_public", true).in("status", ["Available", "Active"]);
      if (!includeInternational) query = query.eq("profiles.country", country);
      query = query.or(`product_name.ilike.%${visualKeyword}%,ai_description.ilike.%${visualKeyword}%,description.ilike.%${visualKeyword}%`);
      if (minPrice) query = query.gte("sale_price", Number(minPrice));
      if (maxPrice) query = query.lte("sale_price", Number(maxPrice));
      if (conditionFilter !== "all") query = query.eq("condition", conditionFilter);

      const { data, error } = await query.order("created_at", { ascending: false });

      if (data && !error) {
        const listingsWithDistance = data.map((listing: any) => {
          if (userLocation && listing.latitude && listing.longitude) {
            const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude);
            return { ...listing, distance: dist };
          }
          return { ...listing, distance: 9999 };
        });

        const filteredListings = listingsWithDistance.filter((listing: any) => {
          if (distanceFilter === "all") return true;
          return listing.distance <= Number(distanceFilter);
        });

        filteredListings.sort((a: any, b: any) => a.distance - b.distance);
        setListings(filteredListings);
        setSearchTerm(visualKeyword); 
        
        const msg = includeInternational ? `Found ${filteredListings.length} items (including international price checks).` : `Found ${filteredListings.length} local items!`;
        toast.success(msg);
      } else {
        setListings([]);
        toast.error("Error searching items.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
    }
    setLoading(false);
    setVisualSearchModalOpen(false);
    setSelectedImage(null);
    setVisualKeyword("");
  };

  const handleToggleSave = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      toast.error("Please log in to save items.");
      router.push("/login");
      return;
    }

    const isSaved = savedListingIds.includes(listingId);
    if (isSaved) {
      const { error } = await supabase.from("saved_items").delete().eq("user_id", currentUser.id).eq("listing_id", listingId);
      if (!error) {
        setSavedListingIds(prev => prev.filter(id => id !== listingId));
        toast.success("Removed from saved items");
      } else {
        toast.error("Failed to remove item.");
      }
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: currentUser.id, listing_id: listingId });
      if (!error) {
        setSavedListingIds(prev => [...prev, listingId]);
        toast.success("Saved to wishlist! ❤️");
      } else {
        toast.error("Failed to save item.");
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchListings(searchTerm); };
  const handleClearSearch = () => { 
    setSearchTerm(""); setDistanceFilter("all"); setMinPrice(""); setMaxPrice(""); setConditionFilter("all");
    fetchListings(""); 
  };

  // 🦴 PREMIUM SKELETON LOADER UI
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <nav className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
            <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="flex gap-3">
              <div className="h-9 w-24 bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="h-9 w-20 bg-gray-800 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
          <div className="text-center mb-10">
            <div className="h-10 w-64 bg-gray-800 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-5 w-96 bg-gray-800 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className="max-w-5xl mx-auto mb-10 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-14 bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="h-14 w-32 bg-gray-800 rounded-xl animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-900/50 border border-white/5 rounded-3xl animate-pulse">
              <div className="h-12 bg-gray-800 rounded-xl"></div>
              <div className="h-12 bg-gray-800 rounded-xl"></div>
              <div className="h-12 bg-gray-800 rounded-xl"></div>
              <div className="h-12 bg-gray-800 rounded-xl"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900/50 rounded-3xl border border-white/5 overflow-hidden relative h-full flex flex-col animate-pulse">
                <div className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-800 rounded-full"></div>
                <div className="absolute top-4 left-4 z-20 w-20 h-6 bg-gray-800 rounded-full"></div>
                <div className="aspect-square bg-gray-800"></div>
                <div className="p-5 flex-1 flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="h-6 bg-gray-800 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-800 rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-full"></div>
                    <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/5 flex justify-between">
                    <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      <input type="file" id="visualSearchInput" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
            setVisualSearchModalOpen(true);
          };
          reader.readAsDataURL(file);
        }
      }} />

      {/* 🌌 Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🧭 Premium Nav */}
      <nav className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
            Nabjo
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-sm font-medium transition-all">Dashboard</button>
            </Link>
            <Link href="/generate">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">+ Sell Item</button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">Public Marketplace</h1>
          <p className="text-gray-400 text-lg">Discover unique items listed by the Nabjo community.</p>
        </div>

        {/* 🔍 Premium Search & Filter Panel */}
        <form onSubmit={handleSearch} className="max-w-5xl mx-auto mb-12 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 flex">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Search for anything..." 
                className="flex-1 p-4 bg-gray-900/50 border border-white/10 rounded-l-2xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all" 
              />
              <button 
                type="button"
                onClick={() => document.getElementById('visualSearchInput')?.click()}
                className="px-5 bg-gray-800/50 border border-l-0 border-white/10 rounded-r-2xl text-gray-400 hover:text-white hover:bg-gray-700/50 transition flex items-center justify-center group"
                title="Search by Picture"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 text-base flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search
              </button>
              {(searchTerm || distanceFilter !== 'all' || minPrice || maxPrice || conditionFilter !== 'all') && (
                <button type="button" onClick={handleClearSearch} className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all text-base">
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-3xl">
            <select value={distanceFilter} onChange={(e) => { setDistanceFilter(e.target.value); fetchListings(searchTerm); }} className="col-span-2 md:col-span-1 p-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer text-sm">
              <option value="all">🌍 Anywhere</option>
              <option value="5">📍 Within 5 km</option>
              <option value="10">📍 Within 10 km</option>
              <option value="25">📍 Within 25 km</option>
            </select>
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min Price" className="col-span-1 p-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" />
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max Price" className="col-span-1 p-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm" />
            <select value={conditionFilter} onChange={(e) => { setConditionFilter(e.target.value); fetchListings(searchTerm); }} className="col-span-2 md:col-span-1 p-3.5 bg-gray-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer text-sm">
              <option value="all">✨ Any Condition</option>
              <option value="New">New</option>
              <option value="Used - Like New">Like New</option>
              <option value="Used - Good">Good</option>
              <option value="Used - Fair">Fair</option>
            </select>
          </div>
        </form>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-900/30 backdrop-blur-sm rounded-3xl border border-white/10">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-4xl mb-6 animate-pulse">🔍</div>
            <h2 className="text-2xl font-bold text-white mb-2">No items found</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md px-4">Try adjusting your filters or be the first to list an item in this category!</p>
            <Link href="/generate">
              <button className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group">
                <span>List an Item</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const isSaved = savedListingIds.includes(listing.id);
              const firstImage = listing.image_url || (listing.image_urls && listing.image_urls[0]);
              
              return (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
                  <div className="h-full bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden hover:border-blue-500/30 hover:bg-gray-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/5 relative flex flex-col">
                    
                    <button
                      onClick={(e) => handleToggleSave(e, listing.id)}
                      className="absolute top-4 right-4 z-20 p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 hover:scale-110 transition-all duration-300 border border-white/10 shadow-lg"
                      title={isSaved ? "Remove from saved" : "Save to wishlist"}
                    >
                      {isSaved ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>

                    {listing.distance < 9999 && (
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-green-400 border border-green-500/30 z-10 flex items-center gap-1 shadow-lg">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {listing.distance.toFixed(1)} km
                      </div>
                    )}
                    
                    <div className="aspect-square bg-gray-800 overflow-hidden relative">
                      {firstImage ? (
                        <img src={firstImage} alt={listing.product_name || "Listing"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                          <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="text-sm font-medium">No Image</span>
                        </div>
                      )}
                      {/* Subtle gradient overlay at bottom of image for text readability */}
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg truncate pr-3 group-hover:text-blue-400 transition-colors">{listing.product_name || listing.title || "Untitled Item"}</h3>
                        <span className="text-blue-400 font-bold text-lg whitespace-nowrap bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                          {listing.currency_code === 'NPR' ? 'Rs. ' : '$'}{listing.sale_price}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">{listing.ai_description || listing.description || "No description provided."}</p>
                      <div className="mt-auto flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-white/5">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {listing.condition || "Used"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${listing.status === 'Available' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 📸 Premium Visual Search Modal */}
      {visualSearchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900/95 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto ring-1 ring-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📸</span> Visual Search
              </h3>
              <button onClick={() => { setVisualSearchModalOpen(false); setSelectedImage(null); setVisualKeyword(""); }} className="p-2 hover:bg-white/10 rounded-full transition">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">Add a few keywords to describe the item in the photo.</p>
            
            {selectedImage && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 h-48 bg-gray-800 flex items-center justify-center shadow-inner">
                <img src={selectedImage} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Keywords (Required)</label>
              <input 
                type="text" 
                value={visualKeyword} 
                onChange={(e) => setVisualKeyword(e.target.value)}
                className="w-full p-4 bg-gray-950/50 border border-white/10 rounded-xl text-white text-base placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                placeholder="e.g. brown leather chair, vintage lamp"
                autoFocus
              />
            </div>

            <div className="mb-8 flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/[0.07] transition cursor-pointer" onClick={() => setIncludeInternational(!includeInternational)}>
              <input type="checkbox" id="includeInternational" checked={includeInternational} onChange={(e) => setIncludeInternational(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-800 border-gray-600 cursor-pointer" />
              <label htmlFor="includeInternational" className="text-sm text-gray-300 cursor-pointer flex-1">
                🌍 Include International Results 
                <span className="text-xs text-gray-500 block mt-0.5">Great for price checking global markets</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setVisualSearchModalOpen(false); setSelectedImage(null); setVisualKeyword(""); }} className="flex-1 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition text-sm md:text-base">Cancel</button>
              <button onClick={handleVisualSearch} className="flex-1 p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 text-sm md:text-base">Search Items</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}