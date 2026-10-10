"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

// Magic math to calculate distance between two GPS points (in Kilometers)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCondition, setFilterCondition] = useState("All");
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let userLat = null;
      let userLng = null;

      // 1. Get User's Saved Location
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("latitude, longitude").eq("id", session.user.id).single();
        if (profile && profile.latitude && profile.longitude) {
          userLat = profile.latitude;
          userLng = profile.longitude;
          setUserLoc({ lat: userLat, lng: userLng });
        }
      }

      // 2. Fetch All Public Listings
      const { data, error } = await supabase.from("listings").select("*, profiles(email)").eq("is_public", true).order("created_at", { ascending: false });
      
      if (!error && data) {
        let processedData = data;

        // 3. Filter: Only keep items within 80km (approx 50 miles) IF user has location
        if (userLat && userLng) {
          processedData = data.filter((listing: any) => {
            if (!listing.latitude || !listing.longitude) return false; // Skip items without location data
            const dist = getDistanceFromLatLonInKm(userLat, userLng, listing.latitude, listing.longitude);
            return dist <= 80; 
          });
        }
        
        setListings(processedData);
      }
      setLoading(false);
    };
    fetchMarketplaceData();
  }, []);

  const handleContactSeller = async (listing: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in to contact the seller."); router.push("/login"); return; }
    if (session.user.id === listing.user_id) { toast.error("This is your own listing!"); return; }

    const message = prompt(`Write a message to the seller about "${listing.product_name}":`);
    if (message && message.trim() !== "") {
      const { error } = await supabase.from("messages").insert({
        listing_id: listing.id, sender_id: session.user.id, receiver_id: listing.user_id, content: message
      });
      if (error) { toast.error("Failed to send message."); } 
      else { toast.success("✅ Message sent successfully!"); }
    }
  };

  // Filter Logic (Search + Condition)
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = filterCondition === "All" || listing.ai_title?.includes(filterCondition);
    return matchesSearch && matchesCondition;
  });

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading marketplace...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">ListPro</h1></Link>
          <div className="flex items-center gap-4">
            <Link href="/my-listings"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">My Dashboard</button></Link>
            <Link href="/generate"><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">+ Sell an Item</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Public Marketplace</h1>
          <p className="text-xl text-gray-400">Discover unique items listed by the ListPro community.</p>
        </div>

        {/* NEW: Location Status Banner */}
        {userLoc ? (
          <div className="flex items-center justify-center gap-2 mb-8 text-green-400 bg-green-900/20 py-2 px-4 rounded-full border border-green-800 w-fit mx-auto">
            <span>📍</span>
            <span className="text-sm font-bold">Showing items within 50 miles of your location</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-8 text-yellow-400 bg-yellow-900/20 py-2 px-4 rounded-full border border-yellow-800 w-fit mx-auto">
            <span>⚠️</span>
            <span className="text-sm font-bold">Location not set. <Link href="/dashboard" className="underline hover:text-yellow-300">Set location in Dashboard</Link> to see nearby items!</span>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 bg-gray-900 p-4 rounded-2xl border border-gray-800">
          <input 
            type="text" 
            placeholder="🔍 Search products..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="flex-grow p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
          />
          <select 
            value={filterCondition} 
            onChange={(e) => setFilterCondition(e.target.value)} 
            className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500 w-full md:w-48"
          >
            <option value="All">All Conditions</option>
            <option value="New">Brand New</option>
            <option value="Used - Like New">Used - Like New</option>
            <option value="Used - Good">Used - Good</option>
            <option value="Used - Fair">Used - Fair</option>
          </select>
        </div>

        {filteredListings.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
            <p className="text-2xl text-gray-400 mb-6">No items found matching your search nearby.</p>
            <Link href="/generate"><button className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition">Be the first to list an item!</button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredListings.map((listing) => {
              const titleParts = listing.ai_title?.split(' - ') || [listing.product_name, 'New'];
              const descParts = listing.ai_description?.split('\n\n') || ['', ''];
              const price = listing.sale_price || 0;
              
              return (
                <div key={listing.id} className="group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300 flex flex-col">
                  <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                    <img src={listing.image_url} alt={titleParts[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 right-4 bg-gray-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-gray-700">
                      <span className="text-xs font-bold text-white uppercase">{titleParts[1] || 'New'}</span>
                    </div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{titleParts[0]}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold text-purple-400">${price}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow border-t border-gray-800 pt-4">{descParts[1] || 'No description provided.'}</p>
                    <button onClick={() => handleContactSeller(listing)} className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center gap-2">
                      💬 Contact Seller
                    </button>
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