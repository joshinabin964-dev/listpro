"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ClientPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sellerRating, setSellerRating] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);

      const { data: listingData } = await supabase.from("listings").select("*").eq("id", id).single();
      if (listingData) {
        setListing(listingData);
        
        // 📈 NEW: Silently increment view count in the background
        // Only increment if the viewer is NOT the owner of the listing
        if (session?.user?.id !== listingData.user_id) {
          supabase
            .from("listings")
            .update({ views: (listingData.views || 0) + 1 })
            .eq("id", listingData.id)
            .then(({ error }) => {
              if (error) console.error("Failed to increment views:", error);
            });
        }
        
        const firstImage = listingData.image_url || (listingData.image_urls && listingData.image_urls[0]);
        setSelectedImage(firstImage || null);
        
        const { data: sellerData } = await supabase.from("profiles").select("*").eq("id", listingData.user_id).single();
        if (sellerData) {
          setSeller(sellerData);
          
          const { data: reviewsData } = await supabase
            .from("reviews")
            .select("rating, comment, created_at")
            .eq("seller_id", listingData.user_id)
            .order("created_at", { ascending: false });
          
          if (reviewsData && reviewsData.length > 0) {
            const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
            const avg = total / reviewsData.length;
            setSellerRating({ average: avg, count: reviewsData.length });
            setReviews(reviewsData);
          }
        }

        if (session) {
          const { data: savedData } = await supabase
            .from("saved_items")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("listing_id", listingData.id)
            .single();
          
          setIsSaved(!!savedData);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleToggleSave = async () => {
    if (!currentUser) { toast.error("Please log in to save items."); router.push("/login"); return; }
    setSaving(true);
    if (isSaved) {
      const { error } = await supabase.from("saved_items").delete().eq("user_id", currentUser.id).eq("listing_id", listing.id);
      if (!error) { setIsSaved(false); toast.success("Removed from saved items"); }
      else { toast.error("Failed to remove item."); }
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: currentUser.id, listing_id: listing.id });
      if (!error) { setIsSaved(true); toast.success("Saved to wishlist! ❤️"); }
      else { toast.error("Failed to save item."); }
    }
    setSaving(false);
  };

  const handleSubmitReview = async () => {
    if (!currentUser) { toast.error("Please log in to leave a review."); return; }
    if (!listing) return;
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: currentUser.id, seller_id: listing.user_id, listing_id: listing.id,
        rating: reviewRating, comment: reviewComment.trim()
      });
      if (error) throw error;
      toast.success("⭐ Review submitted successfully!");
      setShowReviewModal(false); setReviewRating(5); setReviewComment("");
      router.refresh();
    } catch (error) { toast.error("Failed to submit review: " + (error as Error).message); }
    setIsSubmittingReview(false);
  };

  const handleReport = async () => {
    if (!currentUser) { toast.error("Please log in to report."); return; }
    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUser.id, reported_listing_id: listing.id, reported_user_id: listing.user_id, reason: reportReason
      });
      if (error) throw error;
      toast.success("🚩 Report submitted. Our team will review it.");
      setShowReportModal(false);
    } catch (error) { toast.error("Failed to submit report."); }
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
    } catch (error) { toast.error("Failed to block user."); }
    setIsBlocking(false);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;
  if (!listing) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Listing not found.</p></main>;

  const currencySymbol = listing.currency_code === 'NPR' ? 'Rs. ' : '$';
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) stars.push(<span key={i} className={i <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}>★</span>);
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
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden aspect-square flex items-center justify-center">
              {selectedImage ? <img src={selectedImage} alt={listing.product_name} className="w-full h-full object-contain" /> : <div className="text-gray-600 text-xl">No Image Available</div>}
            </div>
            {listing.image_urls && listing.image_urls.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {listing.image_urls.map((url: string, index: number) => (
                  <button key={index} onClick={() => setSelectedImage(url)} className={`aspect-square rounded-xl overflow-hidden border-2 transition ${selectedImage === url ? 'border-blue-500' : 'border-gray-800 hover:border-gray-600'}`}>
                    <img src={url} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="mb-2 text-sm text-purple-400 font-bold uppercase tracking-wider">{listing.condition || 'Used'} • {listing.status}</div>
            <h1 className="text-4xl font-bold mb-4 text-white">{listing.product_name}</h1>
            <div className="text-3xl font-bold text-blue-400 mb-6">{currencySymbol}{listing.sale_price}</div>
            <div className="prose prose-invert mb-8">
              <h3 className="text-xl font-bold mb-2 text-white">Description</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{listing.ai_description || listing.description || "No description provided."}</p>
            </div>
            {seller && (
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Sold by</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shrink-0">{seller.full_name?.charAt(0) || "U"}</div>
                  <div className="flex-1">
                    <Link href={`/profile/${seller.id}`} className="font-bold text-white text-lg hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      {seller.full_name || "Anonymous Seller"}
                      <span className="text-xs text-gray-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity">View Profile →</span>
                    </Link>
                    <p className="text-sm text-gray-500">Member since {new Date(seller.created_at).getFullYear()}</p>
                    {sellerRating.count > 0 ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex text-sm">{renderStars(sellerRating.average)}</div>
                        <span className="text-xs text-gray-400">{sellerRating.average.toFixed(1)} ({sellerRating.count} {sellerRating.count === 1 ? 'review' : 'reviews'})</span>
                      </div>
                    ) : <p className="text-xs text-gray-500 mt-1">No reviews yet</p>}
                  </div>
                </div>
              </div>
            )}
            {reviews.length > 0 && (
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Customer Reviews</h3>
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <div key={index} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex text-sm">{renderStars(review.rating)}</div>
                        <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-300">{review.comment || "No comment provided."}</p>
                      <p className="text-xs text-gray-500 mt-1">- Verified Buyer</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-4 mt-auto">
              {currentUser && currentUser.id !== listing.user_id ? (
                <Link href={`/chat/${listing.id}?user=${listing.user_id}`} className="flex-1 min-w-[200px] p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-lg flex items-center justify-center gap-2 text-center">💬 Message Seller</Link>
              ) : (
                <div className="flex-1 min-w-[200px] p-4 bg-gray-800 text-gray-400 font-bold rounded-xl text-lg text-center border border-gray-700">{currentUser?.id === listing.user_id ? "This is your listing" : "Log in to message"}</div>
              )}
              {currentUser && currentUser.id !== listing.user_id && (
                <button onClick={handleToggleSave} disabled={saving} className={`px-6 py-4 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2 ${isSaved ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border-red-500/50' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                  {saving ? "..." : (isSaved ? "❤️ Saved" : "🤍 Save")}
                </button>
              )}
              {currentUser && currentUser.id !== listing.user_id && (
                <>
                  <button onClick={() => setShowReviewModal(true)} className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-green-400 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2">⭐ Leave a Review</button>
                  <button onClick={() => setShowReportModal(true)} className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2">🚩 Report</button>
                  <button onClick={handleBlockUser} disabled={isBlocking} className="px-6 py-4 bg-gray-800 hover:bg-red-900/50 text-red-400 font-bold rounded-xl transition border border-gray-700 flex items-center gap-2">{isBlocking ? "..." : "🚫 Block"}</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white">Leave a Review</h3>
            <p className="text-gray-400 mb-6 text-sm">How was your experience with this seller?</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)} className={`text-3xl transition ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}>★</button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Comment (Optional)</label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none" placeholder="Share your experience..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition">Cancel</button>
              <button onClick={handleSubmitReview} disabled={isSubmittingReview} className="flex-1 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition">{isSubmittingReview ? "Submitting..." : "Submit Review"}</button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white">Report Listing</h3>
            <p className="text-gray-400 mb-6 text-sm">Why are you reporting this item?</p>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 mb-6">
              <option value="Spam">Spam or Misleading</option>
              <option value="Scam">Suspected Scam</option>
              <option value="Inappropriate">Inappropriate Content</option>
              <option value="Prohibited">Prohibited Item</option>
              <option value="Other">Other</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition">Cancel</button>
              <button onClick={handleReport} disabled={isReporting} className="flex-1 p-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition">{isReporting ? "Submitting..." : "Submit Report"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}