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
  const [loading, setLoading] = useState(true);
  
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  
  const router = useRouter();

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        
        const { data: profile } = await supabase.from("profiles").select("latitude, longitude").eq("id", session.user.id).single();
        if (profile && profile.latitude && profile.longitude) {
          setUserLocation({ lat: profile.latitude, lng: profile.longitude });
        }

        const { data: savedData } = await supabase
          .from("saved_items")
          .select("listing_id")
          .eq("user_id", session.user.id);
        
        if (savedData) {
          setSavedListingIds(savedData.map((item: any) => item.listing_id));
        }
      }
      await fetchListings("");
      setLoading(false);
    };
    initData();
  }, []);

  const fetchListings = async (term: string) => {
    setLoading(true);
    
    let query = supabase
      .from("listings")
      .select("*")
      .eq("is_public", true)
      .in("status", ["Available", "Active"]);
    
    if (term) {
      query = query.or(`product_name.ilike.%${term}%,ai_description.ilike.%${term}%,description.ilike.%${term}%`);
    }

    if (minPrice) {
      query = query.gte("sale_price", Number(minPrice));
    }
    if (maxPrice) {
      query = query.lte("sale_price", Number(maxPrice));
    }
    if (conditionFilter !== "all") {
      query = query.eq("condition", conditionFilter);
    }

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
      const { error } = await supabase
        .from("saved_items")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("listing_id", listingId);

      if (!error) {
        setSavedListingIds(prev => prev.filter(id => id !== listingId));
        toast.success("Removed from saved items");
      } else {
        toast.error("Failed to remove item.");
      }
    } else {
      const { error } = await supabase
        .from("saved_items")
        .insert({ user_id: currentUser.id, listing_id: listingId });

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
    setSearchTerm(""); 
    setDistanceFilter("all"); 
    setMinPrice("");
    setMaxPrice("");
    setConditionFilter("all");
    fetchListings(""); 
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-400 font-medium animate-pulse">Loading Marketplace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link href="/"><h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin</h1></Link>
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/dashboard"><button className="px-3 py-2 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition">My Dashboard</button></Link>
            <Link href="/generate"><button className="px-3 py-2 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs md:text-sm font-bold transition">+ Sell</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Public Marketplace</h1>
          <p className="text-gray-400 text-base md:text-lg">Discover unique items listed by the Margin community.</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-5xl mx-auto mb-12 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search for anything (e.g. iPhone, Sofa, Car, Nike)..." 
              className="flex-1 p-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500" 
            />
            <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
              Search
            </button>
            {(searchTerm || distanceFilter !== 'all' || minPrice || maxPrice || conditionFilter !== 'all') && (
              <button 
                type="button" 
                onClick={handleClearSearch} 
                className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
            <select 
              value={distanceFilter} 
              onChange={(e) => { setDistanceFilter(e.target.value); fetchListings(searchTerm); }} 
              className="flex-1 min-w-[140px] p-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer text-sm"
            >
              <option value="all">🌍 Anywhere</option>
              <option value="5">📍 Within 5 km</option>
              <option value="10">📍 Within 10 km</option>
              <option value="25">📍 Within 25 km</option>
            </select>
            
            <input 
              type="number" 
              value={minPrice} 
              onChange={(e) => setMinPrice(e.target.value)} 
              placeholder="Min Price" 
              className="flex-1 min-w-[120px] p-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" 
            />
            <input 
              type="number" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)} 
              placeholder="Max Price" 
              className="flex-1 min-w-[120px] p-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" 
            />
            
            <select 
              value={conditionFilter} 
              onChange={(e) => { setConditionFilter(e.target.value); fetchListings(searchTerm); }} 
              className="flex-1 min-w-[140px] p-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer text-sm"
            >
              <option value="all">✨ Any Condition</option>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </form>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-2xl text-gray-400 mb-6">No items found matching your filters.</p>
            <Link href="/generate"><button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">Be the first to list an item!</button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {listings.map((listing) => {
              const isSaved = savedListingIds.includes(listing.id);
              const firstImage = listing.image_url || (listing.image_urls && listing.image_urls[0]);
              
              return (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-blue-500 transition relative h-full flex flex-col">
                    
                    <button
                      onClick={(e) => handleToggleSave(e, listing.id)}
                      className="absolute top-4 left-4 z-20 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-600/80 transition"
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

                    {listing.distance < 9999 && (<div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-green-400 border border-green-500/30 z-10">📍 {listing.distance.toFixed(1)} km</div>)}
                    
                    {/* Standard img tag - works without config */}
                    <div className="aspect-square bg-gray-800 overflow-hidden">
                      {firstImage ? (
                        <img src={firstImage} alt={listing.product_name || "Listing"} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg truncate pr-2">{listing.product_name || listing.title}</h3>
                        <span className="text-blue-400 font-bold text-lg whitespace-nowrap">{listing.currency_code === 'NPR' ? 'Rs. ' : '$'}{listing.sale_price}</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{listing.ai_description || listing.description || "No description provided."}</p>
                      <div className="mt-auto flex justify-between items-center text-xs text-gray-600 pt-4 border-t border-gray-800">
                        <span>{listing.condition || "Used"}</span>
                        <span>{listing.status}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}