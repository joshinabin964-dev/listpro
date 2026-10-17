"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SavedItemsPage() {
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSavedItems = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      try {
        // Step 1: Fetch saved_items for this user
        const { data: savedData, error: savedError } = await supabase
          .from("saved_items")
          .select("id, listing_id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (savedError) throw savedError;

        if (!savedData || savedData.length === 0) {
          setSavedListings([]);
          setLoading(false);
          return;
        }

        // Step 2: Extract listing IDs
        const listingIds = savedData.map(item => item.listing_id);

        // Step 3: Fetch the actual listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .in("id", listingIds);

        if (listingsError) throw listingsError;

        // Step 4: Combine the data
        const formattedListings = listingsData?.map((listing: any) => {
          const savedItem = savedData.find(s => s.listing_id === listing.id);
          return {
            saved_id: savedItem?.id,
            ...listing
          };
        }) || [];

        setSavedListings(formattedListings);
      } catch (error) {
        console.error("Error fetching saved items:", error);
        toast.error("Failed to load saved items.");
      }
      setLoading(false);
    };

    fetchSavedItems();
  }, [router]);

  const handleRemove = async (savedId: string) => {
    setRemovingId(savedId);
    
    const { error } = await supabase
      .from("saved_items")
      .delete()
      .eq("id", savedId);

    if (error) {
      toast.error("Failed to remove item.");
    } else {
      toast.success("Removed from saved items!");
      setSavedListings((prev) => prev.filter((item) => item.saved_id !== savedId));
    }
    setRemovingId(null);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading Saved Items...</p></main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin</h1></Link>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">❤️ Saved Items</h1>
          <p className="text-gray-400 text-lg">Products you love, all in one place.</p>
        </div>

        {savedListings.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="text-6xl mb-4">💔</div>
            <p className="text-2xl text-gray-400 mb-6">You haven't saved any items yet.</p>
            <Link href="/marketplace">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
                Browse the Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedListings.map((listing) => {
              const currencySymbol = listing.currency_code === 'NPR' ? 'Rs. ' : '$';
              const firstImage = listing.image_url || (listing.image_urls && listing.image_urls[0]);

              return (
                <div key={listing.saved_id} className="relative group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-red-500 transition h-full flex flex-col">
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(listing.saved_id)}
                    disabled={removingId === listing.saved_id}
                    className="absolute top-3 right-3 z-20 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition disabled:opacity-50"
                    title="Remove from saved"
                  >
                    {removingId === listing.saved_id ? (
                      <span className="animate-spin text-sm">⚙️</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>

                  <Link href={`/listing/${listing.id}`} className="block flex-1 flex flex-col">
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
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}