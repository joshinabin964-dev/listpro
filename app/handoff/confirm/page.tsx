"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function HandoffConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get("listing_id");
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Verifying secure handoff...");

  useEffect(() => {
    const confirmHandoff = async () => {
      if (!listingId || !token) {
        setStatus("error");
        setMessage("Invalid handoff link.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/handoff/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listing_id: listingId, token }),
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        setStatus("success");
        setMessage("Handoff confirmed successfully! The item is now marked as Sold.");
        toast.success("✅ Handoff Verified!");
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Failed to confirm handoff. The code may have already been used.");
        toast.error("Handoff failed.");
      } finally {
        setLoading(false);
      }
    };

    confirmHandoff();
  }, [listingId, token]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Verifying secure handoff...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${status === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
        {status === "success" ? (
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        )}
      </div>
      <h1 className={`text-3xl font-bold mb-4 ${status === "success" ? "text-green-400" : "text-red-400"}`}>
        {status === "success" ? "Handoff Verified!" : "Verification Failed"}
      </h1>
      <p className="text-gray-400 max-w-md mb-8">{message}</p>
      <button 
        onClick={() => router.push("/dashboard")}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
      >
        Return to Dashboard
      </button>
    </main>
  );
}