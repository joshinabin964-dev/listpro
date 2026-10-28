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
  const [userCountry, setUserCountry] = useState("Unknown");
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

  // 24-HOUR HOLD STATES
  const [holdRequest, setHoldRequest] = useState<any>(null);
  const [isRequestingHold, setIsRequestingHold] = useState(false);

  // AUCTION STATES
  const [timeLeft, setTimeLeft] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState("");

  // 📊 LIVE SOCIAL PROOF STATE
  const [socialProof, setSocialProof] = useState("");

  // 📤 EXPORT MODAL STATE
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase.from("profiles").select("country").eq("id", session.user.id).single();
        if (profile) setUserCountry(profile.country || "Unknown");
      }

      const { data: listingData } = await supabase.from("listings").select("*").eq("id", id).single();
      if (listingData) {
        setListing(listingData);
        
        const views = listingData.views || 0;
        let proof = `👁️ ${views} ${views === 1 ? 'person has' : 'people have'} viewed this item`;
        
        if (listingData.is_auction) {
          const { count } = await supabase
            .from("bids")
            .select("*", { count: "exact", head: true })
            .eq("listing_id", listingData.id);
          if (count && count > 0) {
            proof += ` • 🔥 ${count} active bid${count > 1 ? 's' : ''}`;
          }
        }
        setSocialProof(proof);

        if (session?.user?.id !== listingData.user_id) {
          supabase
            .from("listings")
            .update({ views: (listingData.views || 0) + 1 })
            .eq("id", listingData.id)
            .then(({ error }) => { if (error) console.error("Failed to increment views:", error); });
        }
        
        const firstImage = listingData.image_url || (listingData.image_urls && listingData.image_urls[0]);
        setSelectedImage(listingData.video_url ? 'video' : (firstImage || null));
        
        const { data: sellerData } = await supabase.from("profiles").select("full_name, created_at, country, is_verified").eq("id", listingData.user_id).single();
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

          const { data: holdData } = await supabase
            .from("hold_requests")
            .select("*")
            .eq("listing_id", listingData.id)
            .eq("buyer_id", session.user.id)
            .in("status", ["pending", "approved"])
            .order("requested_at", { ascending: false })
            .limit(1)
            .single();
          setHoldRequest(holdData || null);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // REALTIME BID SUBSCRIPTION
  useEffect(() => {
    if (!listing?.is_auction) return;
    
    const channel = supabase
      .channel(`auction-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${id}` }, (payload) => {
        setListing((prev: any) => ({ ...prev, current_bid: payload.new.current_bid }));
        toast.success("🔔 New bid placed!");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listing?.is_auction, id]);

  // COUNTDOWN TIMER
  useEffect(() => {
    if (!listing?.is_auction || !listing.auction_end_time) return;

    const timer = setInterval(() => {
      const end = new Date(listing.auction_end_time).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft("Auction Ended");
        setListing((prev: any) => ({ ...prev, status: "Auction Ended" }));
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [listing?.auction_end_time]);

  // SECURE HANDLE PLACE BID
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { toast.error("Please log in to bid."); router.push("/login"); return; }
    
    if (userCountry !== seller?.country) {
      toast.error(`🚫 Bidding is restricted to local buyers (${seller?.country}). This protects you from international shipping scams.`);
      return;
    }

    const currentBid = listing.current_bid || listing.starting_price || listing.starting_bid || 0;
    const bidAmount = customBidAmount ? parseFloat(customBidAmount) : (currentBid + 1);
    const minBid = currentBid + 1;

    if (bidAmount < minBid) {
      toast.error(`Bid must be at least ${listing.currency_code === 'NPR' ? 'Rs. ' : '$'}${minBid}`);
      return;
    }

    setIsBidding(true);
    try {
      const res = await fetch('/api/auctions/place-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, bid_amount: bidAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`🎉 Bid of ${listing.currency_code === 'NPR' ? 'Rs. ' : '$'}${bidAmount} placed successfully!`);
      setCustomBidAmount("");
    } catch (error: any) {
      toast.error("Failed to place bid: " + error.message);
    }
    setIsBidding(false);
  };

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

  const handleRequestHold = async () => {
    if (!currentUser) { toast.error("Please log in to request a hold."); router.push("/login"); return; }
    setIsRequestingHold(true);
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("hold_requests").insert({
        listing_id: listing.id,
        buyer_id: currentUser.id,
        seller_id: listing.user_id,
        status: "pending",
        expires_at: expiresAt
      });
      if (error) throw error;
      toast.success("🔒 Hold request sent to seller!");
      setHoldRequest({ status: "pending", expires_at: expiresAt });
    } catch (error: any) {
      toast.error("Failed to request hold: " + error.message);
    }
    setIsRequestingHold(false);
  };

  // 📤 EXPORT FUNCTIONS
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
    setShowExportModal(false);
  };

  const generateInstagramCaption = () => {
    const price = `${listing.currency_code === 'NPR' ? 'Rs. ' : '$'}${listing.sale_price}`;
    const tags = listing.category ? `#${listing.category.replace(/\s+/g, '')}` : '#ForSale';
    const brandTag = listing.brand ? `#${listing.brand.replace(/\s+/g, '')}` : '';
    
    return `🔥 JUST LISTED ON NABJO! 🔥\n\n` +
           `📦 **${listing.product_name}**\n` +
           `💰 Price: ${price}\n` +
           `✨ Condition: ${listing.condition}\n\n` +
           `📝 **Details:**\n${listing.ai_description || listing.description}\n\n` +
           `📍 Location: ${seller?.country || 'Local'}\n` +
           `🔗 Link in bio to buy securely on Nabjo!\n\n` +
           `${tags} ${brandTag} #NabjoMarketplace #ForSale #Deal`;
  };

  const downloadShopifyCSV = () => {
    const price = listing.sale_price;
    const csvContent = "Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Requires Shipping,Variant Taxable,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / AdWords Grouping,Google Shopping / AdWords Labels,Google Shopping / Condition,Google Shopping / Custom Product,Google Shopping / Custom Label 0,Google Shopping / Custom Label 1,Google Shopping / Custom Label 2,Google Shopping / Custom Label 3,Google Shopping / Custom Label 4,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Included / Global,Price / International,Price / US\n" +
      `"nabjo-${listing.id}","${listing.product_name}","${(listing.ai_description || listing.description || '').replace(/"/g, '""')}","Nabjo Seller","${listing.category || 'Other'}","${listing.condition}, ${listing.brand || ''}",1,"Title","Default Title","",0,"shopify",1,"deny","manual","${price}",1,1,"${listing.image_url || ''}",1,"${listing.product_name}",0,"","",0,"","","","New",0,"","","","",0,"","g","",0,1,"${price}","${price}"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nabjo-export-${listing.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("📦 Shopify CSV downloaded successfully!");
    setShowExportModal(false);
  };

  // 🦴 PREMIUM SKELETON LOADER UI
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
            <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-9 w-20 bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 aspect-square animate-pulse"></div>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {[...Array(5)].map((_, i) => (<div key={i} className="aspect-square bg-gray-800 rounded-lg animate-pulse"></div>))}
              </div>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="h-6 w-32 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-10 w-3/4 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-16 w-1/2 bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="space-y-2 mt-4">
                <div className="h-4 w-full bg-gray-800 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-800 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-800 rounded animate-pulse"></div>
              </div>
              <div className="h-32 w-full bg-gray-800 rounded-2xl animate-pulse mt-4"></div>
              <div className="h-14 w-full bg-gray-800 rounded-xl animate-pulse mt-4"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!listing) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Listing not found.</p></main>;

  const currencySymbol = listing.currency_code === 'NPR' ? 'Rs. ' : '$';
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) stars.push(<span key={i} className={i <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}>★</span>);
    return stars;
  };

  const isAuctionActive = listing.is_auction && timeLeft !== "Auction Ended";
  const currentBid = listing.current_bid || listing.starting_price || listing.starting_bid || 0;
  const isOwner = currentUser?.id === listing.user_id;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link href="/marketplace"><h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1></Link>
          <Link href="/marketplace"><button className="px-3 md:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition">Back</button></Link>
        </div>
      </nav>
      
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden aspect-square flex items-center justify-center relative">
              {isAuctionActive && (
                <div className="absolute top-4 left-4 z-20 bg-red-600/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-red-400 flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  <span className="text-xs md:text-sm font-bold text-white">LIVE • {timeLeft}</span>
                </div>
              )}
              {listing.video_url && selectedImage === 'video' ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video src={listing.video_url} controls className="w-full h-full object-contain" />
                  <div className="absolute bottom-4 right-4 z-10 bg-black/80 backdrop-blur-md border border-green-500/50 px-3 py-2 rounded-lg flex flex-col items-end pointer-events-none shadow-2xl">
                    <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs md:text-sm tracking-wide">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      NABJO VERIFIED
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-300 mt-0.5 font-mono">{new Date().toLocaleDateString()} • ID: {listing.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>
              ) : selectedImage ? (
                <img src={selectedImage} alt={listing.product_name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-600 text-xl">No Media Available</div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {listing.video_url && (
                <button onClick={() => setSelectedImage('video')} className={`aspect-square rounded-lg md:rounded-xl overflow-hidden border-2 transition relative ${selectedImage === 'video' ? 'border-blue-500' : 'border-gray-800 hover:border-gray-600'}`}>
                  <video src={listing.video_url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  </div>
                </button>
              )}
              {listing.image_urls && listing.image_urls.map((url: string, index: number) => (
                <button key={index} onClick={() => setSelectedImage(url)} className={`aspect-square rounded-lg md:rounded-xl overflow-hidden border-2 transition ${selectedImage === url ? 'border-blue-500' : 'border-gray-800 hover:border-gray-600'}`}>
                  <img src={url} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="mb-2 text-xs md:text-sm text-purple-400 font-bold uppercase tracking-wider">{listing.condition || 'Used'} • {listing.status}</div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4 text-white break-words">{listing.product_name}</h1>
            
            {listing.is_auction ? (
              <div className="mb-4 md:mb-6 p-4 bg-gray-900 rounded-xl border border-purple-500/30">
                <div className="text-sm text-gray-400 mb-1">Current Highest Bid</div>
                <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">{currencySymbol}{currentBid}</div>
                {isAuctionActive && <div className="text-sm text-gray-300">Next minimum bid: <span className="font-bold text-white">{currencySymbol}{currentBid + 1}</span></div>}
              </div>
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-4 md:mb-6">{currencySymbol}{listing.sale_price}</div>
            )}

            {socialProof && (
              <div className="flex items-center gap-2 mb-6 p-3 bg-gray-900/50 border border-gray-800 rounded-lg w-fit">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs md:text-sm font-medium text-gray-300">{socialProof}</span>
              </div>
            )}

            <div className="prose prose-invert mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-bold mb-2 text-white">Description</h3>
              <p className="text-gray-300 whitespace-pre-wrap text-sm md:text-base">{listing.ai_description || listing.description || "No description provided."}</p>
            </div>
            
            {seller && (
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 mb-4 md:mb-6">
                <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase mb-3">Sold by</h3>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg md:text-xl font-bold text-white shrink-0">{seller.full_name?.charAt(0) || "U"}</div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${seller.id}`} className="font-bold text-white text-base md:text-lg hover:text-blue-400 transition-colors inline-flex items-center gap-1 group truncate">
                      {seller.full_name || "Anonymous Seller"}
                      {seller.is_verified && <span className="text-[10px] md:text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 shrink-0">✅ Verified</span>}
                      <span className="text-xs text-gray-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline">View Profile →</span>
                    </Link>
                    <p className="text-xs md:text-sm text-gray-500 truncate">Location: {seller.country || "Unknown"} • Member since {new Date(seller.created_at).getFullYear()}</p>
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
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 mb-4 md:mb-6">
                <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase mb-4">Customer Reviews</h3>
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
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 mt-auto">
              {isAuctionActive ? (
                <>
                  {currentUser && userCountry === seller?.country ? (
                    <form onSubmit={handlePlaceBid} className="flex-1 min-w-[200px] flex gap-2 w-full sm:w-auto">
                      <input type="number" value={customBidAmount} onChange={(e) => setCustomBidAmount(e.target.value)} placeholder={`Min: ${currencySymbol}${currentBid + 1}`} className="flex-1 p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-base focus:outline-none focus:border-purple-500" />
                      <button type="submit" disabled={isBidding} className="px-4 md:px-6 py-3 md:py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm md:text-base">
                        {isBidding ? "..." : "🔨 Place Bid"}
                      </button>
                    </form>
                  ) : (
                    <div className="flex-1 min-w-[200px] p-3 md:p-4 bg-red-900/20 border border-red-500/30 text-red-400 font-bold rounded-xl text-xs md:text-sm text-center flex items-center justify-center gap-2">
                       🚫 Bidding restricted to local buyers ({seller?.country}) for safety.
                    </div>
                  )}
                </>
              ) : (
                <>
                  {listing.is_reserved && listing.reserved_by !== currentUser?.id ? (
                    <div className="flex-1 min-w-[200px] p-3 md:p-4 bg-gray-800 text-gray-400 font-bold rounded-xl text-base md:text-lg text-center border border-gray-700 flex items-center justify-center gap-2">🔒 Reserved by another buyer</div>
                  ) : holdRequest?.status === "pending" ? (
                    <div className="flex-1 min-w-[200px] p-3 md:p-4 bg-yellow-900/20 text-yellow-400 font-bold rounded-xl text-base md:text-lg text-center border border-yellow-500/30 flex items-center justify-center gap-2">⏳ Hold Request Pending</div>
                  ) : holdRequest?.status === "approved" ? (
                    <div className="flex-1 min-w-[200px] p-3 md:p-4 bg-green-900/20 text-green-400 font-bold rounded-xl text-base md:text-lg text-center border border-green-500/30 flex items-center justify-center gap-2">✅ Item Reserved for You! (24h)</div>
                  ) : currentUser && currentUser.id !== listing.user_id ? (
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Link href={`/chat/${listing.id}?user=${listing.user_id}`} className="flex-1 min-w-[200px] p-3 md:p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-base md:text-lg flex items-center justify-center gap-2 text-center">Message</Link>
                      <button onClick={handleRequestHold} disabled={isRequestingHold} className="flex-1 min-w-[200px] p-3 md:p-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition text-base md:text-lg flex items-center justify-center gap-2">
                        {isRequestingHold ? "..." : "🔒 Hold"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[200px] p-3 md:p-4 bg-gray-800 text-gray-400 font-bold rounded-xl text-base md:text-lg text-center border border-gray-700">{currentUser?.id === listing.user_id ? "This is your listing" : "Log in to message"}</div>
                  )}
                </>
              )}

              {currentUser && currentUser.id !== listing.user_id && (
                <button onClick={handleToggleSave} disabled={saving} className={`px-4 md:px-6 py-3 md:py-4 font-bold rounded-xl transition border border-gray-700 flex items-center justify-center gap-2 text-sm md:text-base ${isSaved ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border-red-500/50' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                  {saving ? "..." : (isSaved ? "❤️ Saved" : "🤍 Save")}
                </button>
              )}

              {/* 📤 EXPORT BUTTON (ONLY FOR OWNER) */}
              {isOwner && (
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="px-4 md:px-6 py-3 md:py-4 bg-gray-800 hover:bg-gray-700 text-blue-400 font-bold rounded-xl transition border border-gray-700 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  📤 Export / Share Listing
                </button>
              )}

              {currentUser && currentUser.id !== listing.user_id && (
                <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
                  <button onClick={() => setShowReviewModal(true)} className="flex-1 sm:flex-none px-4 md:px-6 py-3 md:py-4 bg-gray-800 hover:bg-gray-700 text-green-400 font-bold rounded-xl transition border border-gray-700 flex items-center justify-center gap-2 text-sm md:text-base">⭐ Review</button>
                  <button onClick={() => setShowReportModal(true)} className="flex-1 sm:flex-none px-4 md:px-6 py-3 md:py-4 bg-gray-800 hover:bg-gray-700 text-yellow-400 font-bold rounded-xl transition border border-gray-700 flex items-center justify-center gap-2 text-sm md:text-base">🚩 Report</button>
                  <button onClick={handleBlockUser} disabled={isBlocking} className="flex-1 sm:flex-none px-4 md:px-6 py-3 md:py-4 bg-gray-800 hover:bg-red-900/50 text-red-400 font-bold rounded-xl transition border border-gray-700 flex items-center justify-center gap-2 text-sm md:text-base">{isBlocking ? "..." : "🚫 Block"}</button>
                </div>
              )}
            </div>
            
            {listing.is_auction && (
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-yellow-400 text-sm mb-1">Safety First</h4>
                  <p className="text-xs text-gray-400">Nabjo does not process payments. For high-value auction wins, we strongly recommend Local Pickup in a safe, public place. Never send money via wire transfer or gift cards.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📤 EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-white flex items-center gap-2">📤 Export Listing</h3>
            <p className="text-gray-400 text-sm mb-6">Push this listing to other platforms instantly.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => copyToClipboard(generateInstagramCaption(), "📱 Instagram caption copied to clipboard!")}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition flex items-center justify-between group"
              >
                <span className="flex items-center gap-3"><span className="text-2xl">📱</span> Copy Instagram Caption</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded group-hover:bg-white/30 transition">Auto-Hashtags</span>
              </button>

              <button 
                onClick={downloadShopifyCSV}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition border border-gray-700 flex items-center justify-between group"
              >
                <span className="flex items-center gap-3"><span className="text-2xl">📦</span> Download Shopify CSV</span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded group-hover:bg-gray-600 transition">Bulk Import Ready</span>
              </button>

              <button 
                onClick={() => copyToClipboard(`${window.location.origin}/listing/${listing.id}`, "🔗 Clean share link copied to clipboard!")}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition border border-gray-700 flex items-center justify-between group"
              >
                <span className="flex items-center gap-3"><span className="text-2xl">🔗</span> Copy Share Link</span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded group-hover:bg-gray-600 transition">Direct URL</span>
              </button>
            </div>

            <button 
              onClick={() => setShowExportModal(false)} 
              className="w-full mt-6 p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
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
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-base focus:outline-none focus:border-blue-500 resize-none" placeholder="Share your experience..." />
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-white">Report Listing</h3>
            <p className="text-gray-400 mb-6 text-sm">Why are you reporting this item?</p>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-base focus:outline-none focus:border-blue-500 mb-6">
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