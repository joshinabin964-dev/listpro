"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error("Google login failed: " + error.message);
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return toast.error("Please enter a valid email.");
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) throw error;
      
      toast.success("Sign-in link sent! Check your inbox.");
      setLinkSent(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to send link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-950 text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1>
          <p className="text-gray-400 text-sm">
            {linkSent ? "Check your email and click the link to login." : "Sign in securely to the safest marketplace."}
          </p>
        </div>
        
        <button onClick={handleGoogleLogin} disabled={loading} className="w-full p-3.5 bg-white text-gray-900 font-bold rounded-xl transition-all hover:bg-gray-100 flex items-center justify-center gap-3 mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-xs">OR SECURE EMAIL LOGIN</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {!linkSent ? (
          <form onSubmit={handleMagicLink} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all text-base" placeholder="you@example.com" />
              <p className="text-xs text-gray-500 mt-2">We will send a secure sign-in link. One click to login!</p>
            </div>
            <button type="submit" disabled={loading} className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-70">
              {loading ? "Sending Link..." : "Send Sign-In Link"}
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white">Check your inbox!</h3>
            <p className="text-gray-400 text-sm">We sent a sign-in link to <span className="text-white font-bold">{email}</span>. Click it to log in instantly.</p>
            <p className="text-xs text-gray-500">Didn't get it? Check your spam folder.</p>
            <button onClick={() => { setLinkSent(false); setEmail(""); }} className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all text-sm mt-4">
              ← Use a different email
            </button>
          </div>
        )}
      </div>
    </main>
  );
}