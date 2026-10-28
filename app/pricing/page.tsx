"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("plan, credits").eq("id", session.user.id).single();
        if (data) {
          setCurrentPlan(data.plan || "free");
        }
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

    // 🚀 UPGRADE TO PRO & GRANT 50 BULK OPTIMIZER CREDITS
    const { error } = await supabase
      .from("profiles")
      .update({ 
        plan: "pro",
        credits: 50 // Grants the 50 credits for the Bulk Optimizer
      })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Error upgrading: " + error.message);
    } else {
      toast.success(" Welcome to Pro! You now have unlimited listings, AI tools, Export features, and 50 Bulk Optimizer credits.");
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link href="/dashboard">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">Nabjo</h1>
          </Link>
          <Link href="/dashboard">
            <button className="px-3 md:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs md:text-sm transition">Back to Dashboard</button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">Simple, transparent pricing</h1>
        <p className="text-base md:text-xl text-gray-400 mb-12 md:mb-16 max-w-2xl mx-auto">
          Choose the plan that fits your business. Upgrade or downgrade at any time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          
          {/* Free Plan */}
          <div className="bg-gray-900 rounded-3xl p-6 md:p-8 border border-gray-800 flex flex-col hover:border-gray-700 transition duration-300">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <div className="text-4xl font-bold mb-6">$0 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="text-left space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>3 Free Listings</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>5 Bulk Optimizer Credits</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Basic Share Link Export</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Standard Image Uploads</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Community Support</span>
              </li>
            </ul>
            <button disabled className="w-full py-3 bg-gray-800 text-gray-500 rounded-xl font-bold cursor-not-allowed text-sm md:text-base">
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gray-900 rounded-3xl p-6 md:p-8 border-2 border-blue-500 relative flex flex-col shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-300">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-2xl">MOST POPULAR</div>
            <h3 className="text-2xl font-bold mb-2 text-blue-400">Pro Seller</h3>
            <div className="text-4xl font-bold mb-6">$9 <span className="text-lg text-gray-500 font-normal">/month</span></div>
            <ul className="text-left space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Unlimited Listings</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>50 Bulk Optimizer Credits / month</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>📤 Cross-Platform Export (IG, Shopify, CSV)</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>✨ AI Title & Description Polish</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Unlimited Bumps & Pins</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Advanced Analytics & Insights</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Video Proof Uploads</span>
              </li>
            </ul>
            <button 
              onClick={handleUpgrade}
              disabled={loading || currentPlan === 'pro'}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'
              )}
            </button>
          </div>

        </div>

        {/* Trust Badge */}
        <div className="mt-12 md:mt-16 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span>Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>24/7 Priority Support</span>
          </div>
        </div>
      </div>
    </main>
  );
}