"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LocationSetup from "@/components/LocationSetup";

// THE GLOBAL CURRENCY MAP (Preserved exactly as provided)
const currencyMap: Record<string, { symbol: string; code: string }> = {
  "Nepal": { symbol: "Rs.", code: "NPR" }, "India": { symbol: "₹", code: "INR" },
  "Pakistan": { symbol: "Rs.", code: "PKR" }, "Bangladesh": { symbol: "৳", code: "BDT" },
  "USA": { symbol: "$", code: "USD" }, "United States": { symbol: "$", code: "USD" },
  "UK": { symbol: "£", code: "GBP" }, "United Kingdom": { symbol: "£", code: "GBP" },
  "Canada": { symbol: "C$", code: "CAD" }, "Australia": { symbol: "A$", code: "AUD" },
  "New Zealand": { symbol: "NZ$", code: "NZD" }, "China": { symbol: "¥", code: "CNY" },
  "Japan": { symbol: "¥", code: "JPY" }, "South Korea": { symbol: "₩", code: "KRW" },
  "Singapore": { symbol: "S$", code: "SGD" }, "Malaysia": { symbol: "RM", code: "MYR" },
  "Indonesia": { symbol: "Rp", code: "IDR" }, "Thailand": { symbol: "฿", code: "THB" },
  "Vietnam": { symbol: "₫", code: "VND" }, "Philippines": { symbol: "₱", code: "PHP" },
  "UAE": { symbol: "د.إ", code: "AED" }, "Saudi Arabia": { symbol: "﷼", code: "SAR" },
  "Qatar": { symbol: "﷼", code: "QAR" }, "Kuwait": { symbol: "د.ك", code: "KWD" },
  "Oman": { symbol: "﷼", code: "OMR" }, "Israel": { symbol: "₪", code: "ILS" },
  "Turkey": { symbol: "₺", code: "TRY" }, "Egypt": { symbol: "£", code: "EGP" },
  "South Africa": { symbol: "R", code: "ZAR" }, "Nigeria": { symbol: "₦", code: "NGN" },
  "Kenya": { symbol: "KSh", code: "KES" }, "Ghana": { symbol: "₵", code: "GHS" },
  "Germany": { symbol: "€", code: "EUR" }, "France": { symbol: "€", code: "EUR" },
  "Italy": { symbol: "€", code: "EUR" }, "Spain": { symbol: "€", code: "EUR" },
  "Switzerland": { symbol: "CHF", code: "CHF" }, "Sweden": { symbol: "kr", code: "SEK" },
  "Norway": { symbol: "kr", code: "NOK" }, "Denmark": { symbol: "kr", code: "DKK" },
  "Poland": { symbol: "zł", code: "PLN" }, "Russia": { symbol: "₽", code: "RUB" },
  "Ukraine": { symbol: "₴", code: "UAH" }, "Brazil": { symbol: "R$", code: "BRL" },
  "Argentina": { symbol: "$", code: "ARS" }, "Mexico": { symbol: "$", code: "MXN" },
  "Colombia": { symbol: "$", code: "COP" }, "Chile": { symbol: "$", code: "CLP" },
  "Peru": { symbol: "S/.", code: "PEN" }, "default": { symbol: "$", code: "USD" }
};

const getSymbol = (country: string | null) => {
  if (!country) return '$';
  const userCountry = country.trim().toLowerCase();
  const matchedKey = Object.keys(currencyMap).find(key => key.toLowerCase() === userCountry);
  return matchedKey ? currencyMap[matchedKey].symbol : '$';
};

export default function DashboardPage() {
  const [plan, setPlan] = useState("free");
  const [stats, setStats] = useState({ revenue: 0, profit: 0 });
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  // 🛡️ EDGE CASE: Prevent double-clicks and handle click-outside
  const [processingNotif, setProcessingNotif] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  // 🔄 Extracted fetch logic so it can be called on mount AND on update
  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("plan, country, latitude, longitude, full_name").eq("id", session.user.id).single();
    if (profile) {
      setPlan(profile.plan || "free");
      setUserName(profile.full_name);
      setCurrencySymbol(getSymbol(profile.country));
    }

    const { data: listings } = await supabase.from("listings").select("sale_price, cost_price, status").eq("user_id", session.user.id);
    if (listings) {
      const soldItems = listings.filter(l => l.status === "Sold");
      const revenue = soldItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
      const profit = soldItems.reduce((sum, item) => sum + ((item.sale_price || 0) - (item.cost_price || 0)), 0);
      setStats({ revenue, profit });
    }

    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (notifs) setNotifications(notifs);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // 1. Fetch on initial load
    fetchData();

    // 2. Listen for the "profileUpdated" event from LocationSetup or Profile pages
    const handleProfileUpdate = () => {
      setLoading(true); // Briefly show loading state for smooth transition
      fetchData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchData]);

  // 🛡️ EDGE CASE: Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const markAsRead = async (id: string) => {
    setProcessingNotif(id);
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setProcessingNotif(null);
  };

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Loading Dashboard...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white relative">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin</h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="px-3 py-2 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition flex items-center gap-1 md:gap-2 relative">
                <span>🔔</span>
                <span className="hidden sm:inline">Notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                // 📱 MOBILE POLISH: Added max-w-[calc(100vw-2rem)] to prevent off-screen clipping on small phones
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-800 bg-gray-800/50">
                    <h3 className="font-bold text-sm text-white">Recent Activity</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">No new notifications.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-3 border-b border-gray-800 hover:bg-gray-800 transition flex justify-between items-start gap-2">
                          <div>
                            <p className="text-sm text-gray-200">{notif.content}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => markAsRead(notif.id)} 
                            disabled={processingNotif === notif.id}
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold whitespace-nowrap disabled:opacity-50"
                          >
                            {processingNotif === notif.id ? "..." : "Mark read"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/notifications" className="block p-3 text-center text-sm text-blue-400 hover:text-blue-300 font-bold border-t border-gray-800 hover:bg-gray-800 transition bg-gray-900/50">
                    View All Notifications →
                  </Link>
                </div>
              )}
            </div>
            <Link href="/pricing">
              <button className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition ${plan === 'pro' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                {plan === 'pro' ? '⭐ Pro' : 'Upgrade'}
              </button>
            </Link>
            <button 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className="px-3 py-2 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back{userName ? `, ${userName}` : ''}!</h1>
        <p className="text-gray-400 text-base md:text-lg mb-6 md:mb-8">Here is your business overview.</p>

        <LocationSetup />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-6 shadow-xl">
            <h2 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Revenue (Sold Items)</h2>
            <div className="text-3xl md:text-4xl font-bold text-blue-400">{currencySymbol}{stats.revenue.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-6 shadow-xl">
            <h2 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Net Profit</h2>
            <div className={`text-3xl md:text-4xl font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {currencySymbol}{stats.profit.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 text-center md:text-left">
            <div>
              <h2 className="text-lg md:text-xl text-gray-400 mb-2">Current Subscription</h2>
              <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-3">
                <span className={`text-3xl md:text-4xl font-bold ${plan === 'pro' ? 'text-blue-400' : 'text-gray-300'}`}>{plan === 'pro' ? 'Pro Seller' : 'Starter'}</span>
                {plan === 'pro' && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-full">ACTIVE</span>}
              </div>
            </div>
            {plan === 'free' && (
              <Link href="/pricing" className="w-full md:w-auto">
                <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/50">
                  Upgrade to Pro
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* 📱 MOBILE POLISH: Added sm:col-span-2 md:col-span-1 to the last item so it centers nicely on tablet screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Link href="/generate" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-blue-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">🚀</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-blue-400 transition">Create Listing</h3>
              <p className="text-sm md:text-base text-gray-400">Upload a photo and publish a new product.</p>
            </div>
          </Link>
          <Link href="/my-listings" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-purple-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">📦</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-purple-400 transition">Manage Inventory</h3>
              <p className="text-sm md:text-base text-gray-400">View, edit, and copy your active listings.</p>
            </div>
          </Link>
          <Link href="/marketplace" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-green-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">🌍</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-green-400 transition">Public Marketplace</h3>
              <p className="text-sm md:text-base text-gray-400">Browse items listed by the community.</p>
            </div>
          </Link>
          <Link href="/inbox" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-yellow-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">💬</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-yellow-400 transition">My Inbox</h3>
              <p className="text-sm md:text-base text-gray-400">Read messages from interested buyers.</p>
            </div>
          </Link>
          <Link href="/saved" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-red-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">❤️</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-red-400 transition">Saved Items</h3>
              <p className="text-sm md:text-base text-gray-400">View your wishlisted products.</p>
            </div>
          </Link>
          <Link href="/profile" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-pink-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">👤</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-pink-400 transition">My Profile</h3>
              <p className="text-sm md:text-base text-gray-400">Update your name and seller details.</p>
            </div>
          </Link>
          <Link href="/optimizer" className="block sm:col-span-2 md:col-span-1">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 md:p-8 hover:border-cyan-500 transition cursor-pointer group">
              <span className="text-3xl md:text-4xl mb-3 md:mb-4 block">⚡</span>
              <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-cyan-400 transition">Bulk Optimizer</h3>
              <p className="text-sm md:text-base text-gray-400">Format CSVs for Daraz, Shopify, Amazon & Etsy.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}