"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  
  // Review Form State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get Current User
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);

      // 2. Get Profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (profileData) setProfile(profileData);

      // 3. Get Listings
      const { data: listingsData } = await supabase.from("listings").select("*").eq("user_id", id).eq("status", "Active").order("created_at", { ascending: false });
      if (listingsData) setListings(listingsData);

      // 4. Get Reviews
      const { data: reviewsData } = await supabase.from("reviews").select("*, reviewer_id:profiles(id, full_name)").eq("seller_id", id).order("created_at", { ascending: false });
      if (reviewsData) setReviews(reviewsData);

      // 5. Check if current user already reviewed this seller
      if (session && session.user.id !== id) {
        const { data: existingReview } = await supabase.from("reviews").select("id").eq("reviewer_id", session.user.id).eq("seller_id", id).single();
        if (existingReview) setHasReviewed(true);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!currentUser) { toast.error("Please log in to leave a review."); return; }
    if (!comment.trim()) { toast.error("Please write a comment."); return; }
    
    setIsSubmitting(true);
    try {
      // Insert Review
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: currentUser.id,
        seller_id: id,
        rating,
        comment
      });

      if (error) throw error;

      // Update Profile Stats (Simple calculation)
      const newReviewCount = reviews.length + 1;
      const currentTotal = (profile.average_rating || 0) * reviews.length;
      const newAverage = (currentTotal + rating) / newReviewCount;

      await supabase.from("profiles").update({
        review_count: newReviewCount,
        average_rating: newAverage
      }).eq("id", id);

      // Refresh UI
      const { data: newReviews } = await supabase.from("reviews").select("*, reviewer_id:profiles(id, full_name)").eq("seller_id", id).order("created_at", { ascending: false });
      setReviews(newReviews || []);
      setProfile({ ...profile, review_count: newReviewCount, average_rating: newAverage });
      
      setShowReviewModal(false);
      setHasReviewed(true);
      setComment("");
      toast.success("Review submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit review.");
    }
    setIsSubmitting(false);
  };

  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  // Helper to render stars
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`text-xl ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
    ));
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin</h1></Link>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* SELLER HEADER */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{profile.full_name || "Seller"}</h1>
            <div className="flex items-center gap-4 text-gray-400">
              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              {profile.plan === 'pro' && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">⭐ PRO SELLER</span>}
            </div>
          </div>
          
          {/* RATING & REVIEW BUTTON */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="flex">{renderStars(profile.average_rating || 0)}</div>
              <span className="text-xl font-bold text-white">{(profile.average_rating || 0).toFixed(1)}</span>
              <span className="text-gray-500 text-sm">({profile.review_count || 0} reviews)</span>
            </div>
            {currentUser && currentUser.id !== id && !hasReviewed && (
              <button onClick={() => setShowReviewModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition">
                Leave a Review
              </button>
            )}
            {hasReviewed && <span className="text-sm text-green-400 font-bold">✓ You reviewed this seller</span>}
          </div>
        </div>

        {/* REVIEWS SECTION */}
        {reviews.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-300">
                        {review.reviewer_id?.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-bold text-white">{review.reviewer_id?.full_name || "Anonymous User"}</p>
                        <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex">{renderStars(review.rating)}</div>
                  </div>
                  <p className="text-gray-300 mt-3 pl-13">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTINGS GRID */}
        <h2 className="text-2xl font-bold mb-6">Active Listings ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500">This seller has no active listings right now.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="block group">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-blue-500 transition">
                  <div className="aspect-square bg-gray-800 overflow-hidden">
                    {listing.image_url ? (
                      <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white truncate">{listing.title}</h3>
                    <p className="text-blue-400 font-bold mt-1">${listing.sale_price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white">Leave a Review</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className={`text-3xl transition ${star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-600'}`}>★</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Comment</label>
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="How was your experience with this seller?"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 h-32 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition">Cancel</button>
              <button onClick={handleSubmitReview} disabled={isSubmitting} className="flex-1 p-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition">
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}