"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ListingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 📸 NEW: State for the image gallery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Report & Block State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);

      // Fetch Listing
      const { data: listingData } = await supabase.from("listings").select("*").eq("id", id).single();
      if (listingData) {
        setListing(listingData);
        
        // 📸 Set the first available image as the default selected image
        const firstImage = listingData.image_url || (listingData.image_urls && listingData.image_urls[0]);
        setSelectedImage(firstImage || null);
        
        // Fetch Seller Profile
        const { data: sellerData } = await supabase.from("profiles").select("*").eq("id", listingData.user_id).single();
        if (sellerData) setSeller(sellerData);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleReport = async () => {
    if (!currentUser) { toast.error("Please log in to report."); return; }
    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUser.id,
        reported_listing_id: listing.id,
        reported_user_id: listing.user_id,
        reason: reportReason
      });
      if (error) throw error;
      toast.success("🚩 Report submitted. Our team will review it.");
      setShowReportModal(false);
    } catch (error) {
      toast.error("Failed to submit report.");
    }
    setIsReporting(false);
  };

  const handleBlockUser = async () => {
    if (!currentUser) { toast.error("Please log in to block users."); return; }
    if (!confirm(`Are you sure you want to block ${seller?.full_name || 'this user'}? You will no longer see their listings.`)) return;
    
    setIsBlocking(true);
    try {
      const blockedList = JSON.parse(localStorage.getItem('blockedUsers') || '[]');
      if (!blockedList.includes(listing.user_id)) {
        blockedList.push(listing.user_id);
        localStorage.setItem('blockedUsers', JSON.stringify(blockedList));
      }
      toast.success("🚫 User blocked successfully.");
      router.push("/marketplace");
    } catch (error) {
      toast.error("Failed to block user.");
    }
    setIsBlocking(false);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;
  if (!listing) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Listing not found.</p></main>;

  const currencySymbol = listing.currency_code === 'NPR' ? 'Rs. ' : '$';

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/marketplace"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1></Link>
          <Link href="/marketplace"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Marketplace</button></Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* 📸 UPDATED IMAGE GALLERY SECTION */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden aspect-square flex items-center justify-center">
              {selectedImage ? (
                <img src={selectedImage} alt={listing.product_name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-600 text-xl">No Image Available</div>
              )}
            </div>

            {/* Thumbnails (Only show if there are multiple images in the image_urls array) */}
            {listing.image_urls && listing.image_urls.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {listing.image_urls.map((url: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(url)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                      selectedImage === url ? 'border-blue-500' : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <img src={url} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            <div className="mb-2 text-sm text-purple-400 font-bold uppercase tracking-wider">{listing.condition || 'Used'} • {listing.status}</div>
            <h1 className="text-4xl font-bold mb-4 text-white">{listing.product_name}</h1>
            <div className="text-3xl font-bold text-blue-400 mb-6">{currencySymbol}{listing.sale_price}</div>
            
            <div className="prose prose-invert mb-8">
              <h3 className="text-xl font-bold mb-2 text-white">Description</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{listing.ai_description || listing.description || "No description provided."}</p>
            </div>

            {/* Seller Info */}
            {seller && (
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Sold by</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
                    {seller.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{seller.full_name || "Anonymous Seller"}</p>
                    <p className="text-sm text-gray-500">Member since {new Date(seller.created_at).getFullYear()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-auto">
              {currentUser && currentUser.id !== listing.user_id ? (
                <Link 
                  href={`/chat/${listing.id}?user=${listing.user_id}`} 
                  className="flex-1 min-w-[200px] p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-lg flex items-center justify-center gap-2 text-center"
                >
                  💬 Message Seller
                </Link>
              ) : (
                <div className="flex-1 min-w-[200px] p-4 bg-gray-800 text-gray-400 font-bold rounded-xl text-lg text-center border border-gray-700">
                  {currentUser?.id === listing.user_id ? "This is your listing" : "Log in to message"}
                </div>
              )}
              
              {/* Report & Block Buttons */}
              {currentUser && currentUser.id !== listing.user_id && (
                <>
                  <button 
                    onClick={() => setShowReportModal(true)} 
                    className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2"
                  >
                    🚩 Report
                  </button>
                  <button 
                    onClick={handleBlockUser}
                    disabled={isBlocking}
                    className="px-6 py-4 bg-gray-800 hover:bg-red-900/50 text-red-400 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2"
                  >
                    {isBlocking ? "..." : "🚫 Block"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white">Report Listing</h3>
            <p className="text-gray-400 mb-6 text-sm">Why are you reporting this item? Our team will review it shortly.</p>
            
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 mb-6"
            >
              <option value="Spam">Spam or Misleading</option>
              <option value="Scam">Suspected Scam</option>
              <option value="Inappropriate">Inappropriate Content</option>
              <option value="Prohibited">Prohibited Item</option>
              <option value="Other">Other</option>
            </select>

            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition">Cancel</button>
              <button onClick={handleReport} disabled={isReporting} className="flex-1 p-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition">
                {isReporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}