"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  const [dbError, setDbError] = useState<any>(null);

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("latitude, longitude").eq("id", session.user.id).single();
        if (profile && profile.latitude && profile.longitude) {
          setUserLocation({ lat: profile.latitude, lng: profile.longitude });
        }
      }
      await fetchListings("");
      setLoading(false);
    };
    initData();
  }, []);

  const fetchListings = async (term: string) => {
    setLoading(true);
    setDbError(null);
    
    // 🔍 100% RAW QUERY: No filters, NO JOINS. Just give me everything in the listings table.
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    
    console.log("🔍 RAW DATA:", data);
    console.log("⚠️ RAW ERROR:", error);
    setDbError(error);

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

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchListings(searchTerm); };
  const handleClearSearch = () => { setSearchTerm(""); setDistanceFilter("all"); fetchListings(""); };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="bg-yellow-600 text-white text-center py-2 text-sm font-bold">🔍 DIAGNOSTIC MODE: No filters, no joins. Check F12 Console.</div>
      
      {/* ERROR DISPLAY: If the database is yelling at us, it will show up here in big red letters */}
      {dbError && (
        <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 font-mono text-sm">
          <strong>DATABASE ERROR:</strong> {JSON.stringify(dbError)}
        </div>
      )}

      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1></Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">My Dashboard</button></Link>
            <Link href="/generate"><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition">+ Sell an Item</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Public Marketplace</h1>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-2xl text-gray-400 mb-6">Database returned 0 rows.</p>
            <p className="text-sm text-gray-500">Check the red error box above or the F12 Console.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-blue-500 transition relative h-full flex flex-col">
                  {listing.distance < 9999 && (<div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-green-400 border border-green-500/30 z-10">📍 {listing.distance.toFixed(1)} km</div>)}
                  <div className="aspect-square bg-gray-800 overflow-hidden">
                    {listing.image_url ? (<img src={listing.image_url} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />) : (<div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>)}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-lg truncate pr-2">{listing.product_name || "Untitled"}</h3>
                      <span className="text-blue-400 font-bold text-lg whitespace-nowrap">{listing.currency_code === 'NPR' ? 'Rs. ' : '$'}{listing.sale_price}</span>
                    </div>
                    {/* DIAGNOSTIC BADGE: Shows us exactly what the database holds for this row */}
                    <div className="mt-2 text-[10px] text-yellow-500 font-mono bg-yellow-900/20 p-1 rounded">
                      status: "{listing.status}" | is_public: {String(listing.is_public)}
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