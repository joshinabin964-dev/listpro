"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Bouncer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const checkBanStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", session.user.id)
          .single();

        if (profile?.is_banned) {
          // 1. Nuke their session immediately
          await supabase.auth.signOut();
          // 2. Show the ban message
          toast.error("🚫 Your account has been banned for violating community guidelines.");
          // 3. Kick them to the login page
          router.push("/login");
          return;
        }
      }
      setIsChecked(true);
    };

    checkBanStatus();

    // Listen for real-time auth changes (catches them if they get banned while the app is open)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", session.user.id)
          .single();
          
        if (profile?.is_banned) {
          await supabase.auth.signOut();
          toast.error("🚫 Your account has been banned.");
          router.push("/login");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Show a sleek loading screen while we verify they are allowed in
  if (!isChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-400 font-medium animate-pulse">Verifying account...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}