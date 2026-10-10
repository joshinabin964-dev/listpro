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
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("plan, country, latitude, longitude").eq("id", session.user.id).single();
      if (profile) setPlan(profile.plan || "free");

      // Calculate Profit Stats
      const { data: listings } = await supabase.from("listings").select("sale_price, cost_price, status").eq("user_id", session.user.id);
      if (listings) {
        const soldItems = listings.filter(l => l.status === "Sold");
        const revenue = soldItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
        const profit = soldItems.reduce((sum, item) => sum + ((item.sale_price || 0) - (item.cost_price || 0)), 0);
        setStats({ revenue, profit });
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1>
          <div className="flex items-center gap-4">
            {/* FIXED: Added the Bell Icon here! */}
            <Link href="/inquiries">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2">
                🔔 Notifications
              </button>
            </Link>
            
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
        <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
        <p className="text-gray-400 text-lg mb-8">Here is your business overview.</p>

        {/* Location Setup Component */}
        <LocationSetup />

        {/* Profit Tracker Cards */}
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

        <div className="grid md:grid-cols-2 gap-6">
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
          <Link href="/inquiries" className="block">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-yellow-500 transition cursor-pointer group">
              <span className="text-4xl mb-4 block">📥</span>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-yellow-400 transition">My Inbox</h3>
              <p className="text-gray-400">Read messages from interested buyers.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}