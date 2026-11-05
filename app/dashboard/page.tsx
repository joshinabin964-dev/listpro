"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LocationSetup from "@/components/LocationSetup";

// 🌍 FULLY EXPANDED GLOBAL CURRENCY MAP
const currencyMap: Record<string, { symbol: string; code: string }> = {
  "Afghanistan": { symbol: "؋", code: "AFN" }, "Albania": { symbol: "L", code: "ALL" },
  "Algeria": { symbol: "دج", code: "DZD" }, "Argentina": { symbol: "$", code: "ARS" },
  "Australia": { symbol: "A$", code: "AUD" }, "Austria": { symbol: "€", code: "EUR" },
  "Bangladesh": { symbol: "৳", code: "BDT" }, "Belgium": { symbol: "€", code: "EUR" },
  "Bolivia": { symbol: "Bs.", code: "BOB" }, "Brazil": { symbol: "R$", code: "BRL" },
  "Canada": { symbol: "C$", code: "CAD" }, "Chile": { symbol: "$", code: "CLP" },
  "China": { symbol: "¥", code: "CNY" }, "Colombia": { symbol: "$", code: "COP" },
  "Costa Rica": { symbol: "₡", code: "CRC" }, "Croatia": { symbol: "€", code: "EUR" },
  "Cuba": { symbol: "$", code: "CUP" }, "Czech Republic": { symbol: "Kč", code: "CZK" },
  "Denmark": { symbol: "kr", code: "DKK" }, "Ecuador": { symbol: "$", code: "USD" },
  "Egypt": { symbol: "£", code: "EGP" }, "Finland": { symbol: "€", code: "EUR" },
  "France": { symbol: "€", code: "EUR" }, "Germany": { symbol: "€", code: "EUR" },
  "Ghana": { symbol: "₵", code: "GHS" }, "Greece": { symbol: "€", code: "EUR" },
  "Hong Kong": { symbol: "HK$", code: "HKD" }, "Hungary": { symbol: "Ft", code: "HUF" },
  "Iceland": { symbol: "kr", code: "ISK" }, "India": { symbol: "₹", code: "INR" },
  "Indonesia": { symbol: "Rp", code: "IDR" }, "Iran": { symbol: "﷼", code: "IRR" },
  "Iraq": { symbol: "ع.د", code: "IQD" }, "Ireland": { symbol: "€", code: "EUR" },
  "Israel": { symbol: "₪", code: "ILS" }, "Italy": { symbol: "€", code: "EUR" },
  "Jamaica": { symbol: "J$", code: "JMD" }, "Japan": { symbol: "¥", code: "JPY" },
  "Jordan": { symbol: "د.ا", code: "JOD" }, "Kenya": { symbol: "KSh", code: "KES" },
  "Kuwait": { symbol: "د.ك", code: "KWD" }, "Lebanon": { symbol: "ل.ل", code: "LBP" },
  "Malaysia": { symbol: "RM", code: "MYR" }, "Mexico": { symbol: "$", code: "MXN" },
  "Morocco": { symbol: "د.م.", code: "MAD" }, "Nepal": { symbol: "Rs.", code: "NPR" },
  "Netherlands": { symbol: "€", code: "EUR" }, "New Zealand": { symbol: "NZ$", code: "NZD" },
  "Nigeria": { symbol: "₦", code: "NGN" }, "Norway": { symbol: "kr", code: "NOK" },
  "Oman": { symbol: "﷼", code: "OMR" }, "Pakistan": { symbol: "Rs.", code: "PKR" },
  "Peru": { symbol: "S/.", code: "PEN" }, "Philippines": { symbol: "₱", code: "PHP" },
  "Poland": { symbol: "zł", code: "PLN" }, "Portugal": { symbol: "€", code: "EUR" },
  "Qatar": { symbol: "﷼", code: "QAR" }, "Romania": { symbol: "lei", code: "RON" },
  "Russia": { symbol: "₽", code: "RUB" }, "Saudi Arabia": { symbol: "﷼", code: "SAR" },
  "Singapore": { symbol: "S$", code: "SGD" }, "South Africa": { symbol: "R", code: "ZAR" },
  "South Korea": { symbol: "₩", code: "KRW" }, "Spain": { symbol: "€", code: "EUR" },
  "Sri Lanka": { symbol: "Rs", code: "LKR" }, "Sweden": { symbol: "kr", code: "SEK" },
  "Switzerland": { symbol: "CHF", code: "CHF" }, "Taiwan": { symbol: "NT$", code: "TWD" },
  "Thailand": { symbol: "฿", code: "THB" }, "Turkey": { symbol: "₺", code: "TRY" },
  "UAE": { symbol: "د.إ", code: "AED" }, "Ukraine": { symbol: "₴", code: "UAH" },
  "United Kingdom": { symbol: "£", code: "GBP" }, "UK": { symbol: "£", code: "GBP" },
  "United States": { symbol: "$", code: "USD" }, "USA": { symbol: "$", code: "USD" },
  "Uruguay": { symbol: "$U", code: "UYU" }, "Venezuela": { symbol: "Bs.S", code: "VES" },
  "Vietnam": { symbol: "₫", code: "VND" }, "Zimbabwe": { symbol: "Z$", code: "ZWL" },
  "default": { symbol: "$", code: "USD" }
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
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [processingNotif, setProcessingNotif] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: profile } = await supabase.from("profiles").select("plan, country, latitude, longitude, full_name, avatar_url").eq("id", session.user.id).single();
    if (profile) {
      setPlan(profile.plan || "free");
      setUserName(profile.full_name);
      setAvatarUrl(profile.avatar_url || "");
      setCurrencySymbol(getSymbol(profile.country));
    }

    const { data: listings } = await supabase.from("listings").select("sale_price, cost_price, status").eq("user_id", session.user.id);
    if (listings) {
      const soldItems = listings.filter(l => l.status === "Sold");
      const revenue = soldItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
      const profit = soldItems.reduce((sum, item) => sum + ((item.sale_price || 0) - (item.cost_price || 0)), 0);
      setStats({ revenue, profit });
    }

    const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(10);
    if (notifs) setNotifications(notifs);

    const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", session.user.id).eq("is_read", false);
    setUnreadMessagesCount(count || 0);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
    const handleProfileUpdate = () => { setLoading(true); fetchData(); };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
    };
    if (showNotifications) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* 🌌 Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🧭 Premium Nav */}
      <nav className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
            Nabjo
          </h1>
          
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/inbox" className="relative group px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="hidden sm:inline">Inbox</span>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-red-500/30 animate-pulse">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative group px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="hidden sm:inline">Alerts</span>
                {notifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-blue-500/30 animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5">
                  <div className="p-4 border-b border-white/5 bg-white/5">
                    <h3 className="font-bold text-sm text-white">Recent Activity</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-sm text-gray-500 text-center">No new notifications.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition flex justify-between items-start gap-3">
                          <div>
                            <p className="text-sm text-gray-200 leading-snug">{notif.content}</p>
                            <p className="text-xs text-gray-500 mt-1.5">{new Date(notif.created_at).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => markAsRead(notif.id)} disabled={processingNotif === notif.id} className="text-xs text-blue-400 hover:text-blue-300 font-semibold whitespace-nowrap disabled:opacity-50 transition">
                            {processingNotif === notif.id ? "..." : "Mark read"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/notifications" className="block p-3 text-center text-sm text-blue-400 hover:text-blue-300 font-semibold border-t border-white/5 hover:bg-white/5 transition">
                    View All Notifications →
                  </Link>
                </div>
              )}
            </div>

            <Link href="/pricing">
              <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${plan === 'pro' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'}`}>
                {plan === 'pro' ? '⭐ Pro' : 'Upgrade'}
              </button>
            </Link>

            <Link href="/profile" className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-1.5 pr-3 transition border border-transparent hover:border-white/10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
                {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-gray-300">{userName ? userName.charAt(0).toUpperCase() : "U"}</span>}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-300">{userName || "Profile"}</span>
            </Link>

            <button onClick={handleLogout} disabled={isLoggingOut} className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-white/5 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
              {isLoggingOut ? "..." : "Sign Out"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
        {/* 🔥 FIXED: Proper JSX rendering for the welcome message */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
            Welcome back{userName ? `, ` : ''}
            {userName && <span className="text-blue-400">{userName}</span>}
            !
          </h1>
          <p className="text-gray-400 text-lg">Here is your business overview for today.</p>
        </div>

        <div className="mb-10">
          <LocationSetup />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="group relative bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <h2 className="relative text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Total Revenue</h2>
            <div className="relative text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
              {currencySymbol}{stats.revenue.toFixed(2)}
            </div>
            <p className="relative text-sm text-gray-500 mt-2">From sold items</p>
          </div>
          
          <div className="group relative bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8 hover:border-green-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <h2 className="relative text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Net Profit</h2>
            <div className={`relative text-4xl md:text-5xl font-bold bg-gradient-to-r ${stats.profit >= 0 ? 'from-green-400 to-green-200' : 'from-red-400 to-red-200'} bg-clip-text text-transparent`}>
              {currencySymbol}{stats.profit.toFixed(2)}
            </div>
            <p className="relative text-sm text-gray-500 mt-2">After costs</p>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl mb-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Subscription</h2>
              <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3">
                <span className={`text-3xl md:text-4xl font-bold ${plan === 'pro' ? 'text-white' : 'text-gray-300'}`}>
                  {plan === 'pro' ? 'Pro Seller' : 'Starter Plan'}
                </span>
                {plan === 'pro' && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20 shadow-lg shadow-blue-500/10">ACTIVE</span>}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {plan === 'pro' ? 'You have access to all premium features.' : 'Upgrade to unlock unlimited listings and AI tools.'}
              </p>
            </div>
            {plan === 'free' && (
              <Link href="/pricing" className="w-full md:w-auto">
                <button className="w-full px-8 py-3.5 bg-white text-gray-950 hover:bg-gray-200 font-bold rounded-xl transition shadow-lg shadow-white/10 flex items-center justify-center gap-2">
                  <span>Upgrade to Pro</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard href="/generate" icon="🚀" title="Create Listing" desc="Upload a photo and publish a new product." hoverColor="blue" />
          <ActionCard href="/my-listings" icon="📦" title="Manage Inventory" desc="View, edit, and copy your active listings." hoverColor="purple" />
          <ActionCard href="/marketplace" icon="🌍" title="Public Marketplace" desc="Browse items listed by the community." hoverColor="green" />
          
          <Link href="/inbox" className="block relative group">
            <div className="h-full bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:border-yellow-500/30 hover:bg-gray-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-yellow-500/5 relative overflow-hidden">
              {unreadMessagesCount > 0 && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg shadow-red-500/30 animate-pulse z-10">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">💬</div>
              <h3 className={`text-xl font-bold mb-2 transition ${unreadMessagesCount > 0 ? 'text-yellow-400' : 'text-white group-hover:text-yellow-400'}`}>My Inbox</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Read messages from interested buyers.</p>
            </div>
          </Link>

          <ActionCard href="/saved" icon="❤️" title="Saved Items" desc="View your wishlisted products." hoverColor="red" />
          <ActionCard href="/profile" icon="👤" title="My Profile" desc="Update your name and seller details." hoverColor="pink" />
          <ActionCard href="/optimizer" icon="⚡" title="Bulk Optimizer" desc="Format CSVs for Daraz, Shopify, Amazon & Etsy." hoverColor="cyan" className="sm:col-span-2 lg:col-span-1" />
          
          <Link href="/tools/background-remover" className="block sm:col-span-2 lg:col-span-1 group">
            <div className="h-full bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 hover:border-indigo-500/30 hover:bg-gray-800/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-500/20 shadow-lg shadow-green-500/10">100% FREE</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">✨</div>
              <h3 className="text-xl font-bold mb-2 text-white group-hover:text-indigo-400 transition">AI Background Remover</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Instantly remove backgrounds from listing photos to make them look professional.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

// 🔥 Reusable Premium Action Card Component
function ActionCard({ href, icon, title, desc, hoverColor, className = "" }: { 
  href: string; icon: string; title: string; desc: string; hoverColor: string; className?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-500/30 hover:shadow-blue-500/5",
    purple: "hover:border-purple-500/30 hover:shadow-purple-500/5",
    green: "hover:border-green-500/30 hover:shadow-green-500/5",
    red: "hover:border-red-500/30 hover:shadow-red-500/5",
    pink: "hover:border-pink-500/30 hover:shadow-pink-500/5",
    cyan: "hover:border-cyan-500/30 hover:shadow-cyan-500/5",
  };
  const bgMap: Record<string, string> = {
    blue: "bg-blue-500/10", purple: "bg-purple-500/10", green: "bg-green-500/10",
    red: "bg-red-500/10", pink: "bg-pink-500/10", cyan: "bg-cyan-500/10",
  };
  const textMap: Record<string, string> = {
    blue: "group-hover:text-blue-400", purple: "group-hover:text-purple-400", green: "group-hover:text-green-400",
    red: "group-hover:text-red-400", pink: "group-hover:text-pink-400", cyan: "group-hover:text-cyan-400",
  };

  return (
    <Link href={href} className={`block group ${className}`}>
      <div className={`h-full bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden ${colorMap[hoverColor] || colorMap.blue}`}>
        <div className={`w-12 h-12 rounded-2xl ${bgMap[hoverColor] || bgMap.blue} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
        <h3 className={`text-xl font-bold mb-2 text-white transition ${textMap[hoverColor] || textMap.blue}`}>{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}