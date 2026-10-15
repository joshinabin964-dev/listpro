"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LocationSetup from "@/components/LocationSetup";

export default function DashboardPage() {
  const [plan, setPlan] = useState("free");
  const [stats, setStats] = useState({ revenue: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // 1. Get Profile & Stats
      const { data: profile } = await supabase.from("profiles").select("plan, country, latitude, longitude, full_name").eq("id", session.user.id).single();
      if (profile) {
        setPlan(profile.plan || "free");
        setUserName(profile.full_name);
      }

      const { data: listings } = await supabase.from("listings").select("sale_price, cost_price, status").eq("user_id", session.user.id);
      if (listings) {
        const soldItems = listings.filter(l => l.status === "Sold");
        const revenue = soldItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
        const profit = soldItems.reduce((sum, item) => sum + ((item.sale_price || 0) - (item.cost_price || 0)), 0);
        setStats({ revenue, profit });
      }

      // 2. Fetch Unread Notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (notifs) setNotifications(notifs);

      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white relative">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1>
          <div className="flex items-center gap-4">
            
            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2 relative"
              >
                🔔 Notifications
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
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
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold whitespace-nowrap"
                          >
                            Mark read
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
              <button className={`px-4 py-2 rounded-lg text-sm font-bold transition ${plan === 'pro' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                {plan === 'pro' ? '⭐ Pro Member' : 'Upgrade Plan'}
              </button>
            </Link>
            
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Welcome back{userName ? `, ${userName}` : ''}!</h1>
        <p className="text-gray-400 text-lg mb-8">Here is your business overview.</p>

        <LocationSetup />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Revenue (Sold Items)</h2>
            <div className="text-4xl font-bold text-blue-400">${stats.revenue.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Net Profit</h2>
            <div className={`text-4xl font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${stats.profit.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl text-gray-400 mb-2">Current Subscription</h2>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-bold ${plan === 'pro' ? 'text-blue-400' : 'text-gray-300'}`}>{plan === 'pro' ? 'Pro Seller' : 'Starter'}</span>
                {plan === 'pro' && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-full">ACTIVE</span>}
              </div>
            </div>
            {plan === 'free' && <Link href="/pricing"><button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/50">Upgrade to Pro</button></Link>}
          </div>
        </div>

        {/* UPDATED GRID: Now 7 cards, beautifully flowing in the grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/generate" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-blue-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">🚀</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition">Create Listing</h3>
              <p className="text-gray-400">Upload a photo and publish a new product.</p>
            </div>
          </Link>
          <Link href="/my-listings" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-purple-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">📦</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-400 transition">Manage Inventory</h3>
              <p className="text-gray-400">View, edit, and copy your active listings.</p>
            </div>
          </Link>
          <Link href="/marketplace" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-green-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">🌍</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-green-400 transition">Public Marketplace</h3>
              <p className="text-gray-400">Browse items listed by the community.</p>
            </div>
          </Link>
          <Link href="/inbox" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-yellow-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">💬</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-yellow-400 transition">My Inbox</h3>
              <p className="text-gray-400">Read messages from interested buyers.</p>
            </div>
          </Link>
          
          {/* NEW: SAVED ITEMS CARD */}
          <Link href="/saved" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-red-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">❤️</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-red-400 transition">Saved Items</h3>
              <p className="text-gray-400">View your wishlisted products.</p>
            </div>
          </Link>

          <Link href="/profile" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-pink-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">👤</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-pink-400 transition">My Profile</h3>
              <p className="text-gray-400">Update your name and seller details.</p>
            </div>
          </Link>

          <Link href="/optimizer" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-cyan-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">⚡</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-cyan-400 transition">Bulk Optimizer</h3>
              <p className="text-gray-400">Format CSVs for Daraz, Shopify, Amazon & Etsy.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}