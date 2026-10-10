"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SellerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // 1. Fetch Seller Profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (profileData) setProfile(profileData);

      // 2. Fetch their Public, Available Listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", id)
        .eq("is_public", true)
        .eq("status", "Available")
        .order("created_at", { ascending: false });
      
      if (listingsData) setListings(listingsData);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading profile...</p></main>;
  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Seller not found.</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/marketplace"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">ListPro</h1></Link>
          <Link href="/marketplace"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Back to Marketplace</button></Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Seller Header */}
        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-5xl font-bold text-white shadow-lg">
            {profile.email ? profile.email.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-4xl font-bold mb-2 text-white">Seller Profile</h1>
            <p className="text-xl text-gray-400 mb-4">{profile.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              {profile.country && (
                <span className="px-4 py-2 bg-gray-800 rounded-full text-sm font-bold text-blue-400 border border-gray-700">📍 {profile.country}</span>
              )}
              <span className="px-4 py-2 bg-gray-800 rounded-full text-sm font-bold text-purple-400 border border-gray-700">📦 {listings.length} Active Listings</span>
              {profile.plan === 'pro' && (
                <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold border border-yellow-500/30">⭐ Pro Seller</span>
              )}
            </div>
          </div>
        </div>

        {/* Their Listings */}
        <h2 className="text-3xl font-bold mb-8">Active Items from this Seller</h2>
        
        {listings.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/50 rounded-3xl border border-gray-800 border-dashed">
            <p className="text-xl text-gray-400">This seller has no active items right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <div key={listing.id} className="group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300 flex flex-col">
                <div className="relative aspect-[4/3] bg-gray-800 overflow-hidden">
                  <img src={listing.image_url} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{listing.ai_title?.split(' - ')[0] || listing.product_name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-purple-400">${listing.sale_price}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow border-t border-gray-800 pt-4">{listing.ai_description || 'No description provided.'}</p>
                  <Link href={`/marketplace`} className="w-full">
                    <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition">View on Marketplace</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}