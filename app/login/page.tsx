"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error("Google login failed: " + error.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(" 6-digit code sent to your email!");
      setOtpSent(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("🎉 Verified! Redirecting to Nabjo...");
      // Redirect to the magic link to complete sign-in
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-950 text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1>
          <p className="text-gray-400 text-sm">
            {otpSent 
              ? "Enter the 6-digit code sent to your email." 
              : "Sign in securely to the safest marketplace."}
          </p>
        </div>
        
        {/* GOOGLE LOGIN BUTTON */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full p-3.5 bg-white text-gray-900 font-bold rounded-xl transition-all hover:bg-gray-100 flex items-center justify-center gap-3 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-xs">OR SECURE EMAIL OTP</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all text-base" 
                placeholder="you@example.com" 
              />
              <p className="text-xs text-gray-500 mt-2">We'll send a secure 6-digit code to this email.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? "Sending Code..." : "Send 6-Digit Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Enter 6-Digit Code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                required 
                maxLength={6}
                className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500 transition-all" 
                placeholder="000000" 
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Check your inbox (and spam folder).</p>
            </div>
            <button type="submit" disabled={verifying} className="w-full p-3.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {verifying ? "Verifying..." : "Verify & Login"}
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all text-sm">
              ← Use a different email
            </button>
          </form>
        )}
      </div>
      <div className="mt-8 text-center text-gray-600 text-xs">
        <p>© {new Date().getFullYear()} Nabjo. The safest global marketplace.</p>
      </div>
    </main>
  );
}