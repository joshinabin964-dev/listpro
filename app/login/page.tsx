"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  // 🆕 GOOGLE LOGIN HANDLER
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` }
        });
        if (error) throw error;
        toast.success("🎉 Account created! Please check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to Margin! 🚀");
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success("📧 Reset link sent! Check your inbox.");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-950 text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin</h1>
          <p className="text-gray-400 text-sm">
            {showForgotPassword ? "Reset your password below." : isSignUp ? "Create your account to start selling globally." : "Sign in to your Margin account."}
          </p>
        </div>
        
        {!showForgotPassword && (
          <>
            {/*  GOOGLE LOGIN BUTTON */}
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
              <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>
          </>
        )}

        {!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-400">Password</label>
                {!isSignUp && <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</button>}
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-70">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all">
              ← Back to Login
            </button>
          </form>
        )}

        {!showForgotPassword && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-2">{isSignUp ? "Already have an account?" : "Don't have an account yet?"}</p>
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 hover:text-blue-300 font-semibold text-sm transition-colors">
              {isSignUp ? "Sign In instead" : "Create a free account"}
            </button>
          </div>
        )}
      </div>
      <div className="mt-8 text-center text-gray-600 text-xs">
        <p>© {new Date().getFullYear()} Margin. The global marketplace for everything.</p>
      </div>
    </main>
  );
}