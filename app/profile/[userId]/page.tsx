"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SellerProfilePage() {
  const { userId } = useParams();
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [sellerRating, setSellerRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      // 1. Fetch Seller Profile
      const { data: sellerData } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (sellerData) {
        setSeller(sellerData);

        // 2. Fetch Seller's Reviews
        const { data: reviewsData } = await supabase.from("reviews").select("rating").eq("seller_id", userId);
        if (reviewsData && reviewsData.length > 0) {
          const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
          setSellerRating({ average: total / reviewsData.length, count: reviewsData.length });
        }

        // 3. Fetch Seller's Active Listings
        const { data: listingsData } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", userId)
          .eq("is_public", true)
          .in("status", ["Available", "Active"])
          .order("created_at", { ascending: false });
        
        if (listingsData) setListings(listingsData);
      }
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading Profile...</p></main>;
  if (!seller) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Seller not found.</p></main>;

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}>★</span>);
    }
    return stars;
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/marketplace"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1></Link>
          <Link href="/marketplace"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Marketplace</button></Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Seller Header */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-12 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shrink-0">
            {seller.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{seller.full_name || "Anonymous Seller"}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400 mb-4">
              <span>📍 {seller.country || "Location not specified"}</span>
              <span>📅 Member since {new Date(seller.created_at).getFullYear()}</span>
              {sellerRating.count > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex text-sm">{renderStars(sellerRating.average)}</div>
                  <span className="text-yellow-400 font-bold">{sellerRating.average.toFixed(1)}</span>
                  <span className="text-gray-500">({sellerRating.count} reviews)</span>
                </div>
              )}
            </div>
            {seller.bio && (
              <p className="text-gray-300 max-w-2xl italic">"{seller.bio}"</p>
            )}
          </div>
        </div>

        {/* Listings Grid */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          📦 Active Listings <span className="text-sm font-normal text-gray-500">({listings.length})</span>
        </h2>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-xl text-gray-400">This seller has no active listings right now.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const currencySymbol = listing.currency_code === 'NPR' ? 'Rs. ' : '$';
              const firstImage = listing.image_url || (listing.image_urls && listing.image_urls[0]);
              
              return (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-blue-500 transition relative h-full flex flex-col">
                    <div className="aspect-square bg-gray-800 overflow-hidden">
                      {firstImage ? (
                        <img src={firstImage} alt={listing.product_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg truncate pr-2">{listing.product_name || listing.title}</h3>
                        <span className="text-blue-400 font-bold text-lg whitespace-nowrap">{currencySymbol}{listing.sale_price}</span>
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