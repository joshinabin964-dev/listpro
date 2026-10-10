"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SellerProfilePage() {
  const params = useParams();
  const sellerId = params.id as string;
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      // Fetch only public, available listings for this specific seller
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", sellerId)
        .eq("is_public", true)
        .eq("status", "Available")
        .order("created_at", { ascending: false });

      if (!error) setListings(data || []);
      setLoading(false);
    };
    if (sellerId) fetchSellerData();
  }, [sellerId]);

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading seller profile...</div>;

  // Generate a cool avatar using the first 2 letters of their ID
  const avatarText = sellerId ? sellerId.substring(0, 2).toUpperCase() : '?';

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/marketplace" className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 w-fit">← Back to Marketplace</Link>
        
        {/* Seller Header Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-8 text-center shadow-xl">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
            {avatarText}
          </div>
          <h1 className="text-3xl font-bold mb-2">Verified Seller</h1>
          <p className="text-gray-400 text-sm mb-4">Member ID: {sellerId}</p>
          <div className="inline-flex items-center gap-2 bg-green-900/20 text-green-400 px-4 py-2 rounded-full border border-green-800 text-sm font-bold">
            <span>✅</span> Trusted ListPro Member
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Active Listings <span className="text-gray-500 text-lg">({listings.length})</span>
        </h2>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
            <p className="text-gray-400 text-lg">This seller has no active items right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <Link href="/marketplace" key={item.id} className="block group">
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-500 transition shadow-lg">
                  <div className="aspect-[4/3] bg-gray-800 overflow-hidden">
                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white truncate">{item.product_name}</h3>
                    <p className="text-purple-400 text-2xl font-bold mt-2">${item.sale_price}</p>
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