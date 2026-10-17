"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("plan").eq("id", session.user.id).single();
        if (data) setCurrentPlan(data.plan);
      }
    };
    checkPlan();
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    // Simulate payment success and update database
    const { error } = await supabase
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", session.user.id);

    if (error) {
      alert("Error upgrading: " + error.message);
    } else {
      alert("🎉 Welcome to Pro! You now have unlimited listings.");
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">Margin</h1>
          </Link>
          <Link href="/dashboard">
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-xl text-gray-400 mb-16">Choose the plan that fits your business. Upgrade or downgrade at any time.</p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free Plan */}
          <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <div className="text-4xl font-bold mb-6">$0 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="text-left space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✓</span> 5 Free Listings</li>
              <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✓</span> Basic Image Upload</li>
              <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✓</span> Standard Support</li>
            </ul>
            <button disabled className="w-full py-3 bg-gray-800 text-gray-500 rounded-xl font-bold cursor-not-allowed">
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gray-900 rounded-3xl p-8 border-2 border-blue-500 relative flex flex-col shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPULAR</div>
            <h3 className="text-2xl font-bold mb-2 text-blue-400">Pro Seller</h3>
            <div className="text-4xl font-bold mb-6">$9 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="text-left space-y-4 mb-8 flex-grow">
              <li className="flex items-center gap-3 text-white"><span className="text-blue-400">✓</span> Unlimited Listings</li>
              <li className="flex items-center gap-3 text-white"><span className="text-blue-400">✓</span> HD Image Uploads</li>
              <li className="flex items-center gap-3 text-white"><span className="text-blue-400">✓</span> Priority Support</li>
              <li className="flex items-center gap-3 text-white"><span className="text-blue-400">✓</span> Advanced Analytics</li>
            </ul>
            <button 
              onClick={handleUpgrade}
              disabled={loading || currentPlan === 'pro'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : (currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro')}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}