"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function GlobalCallListener() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callData, setCallData] = useState<any>(null);
  const [otherUserName, setOtherUserName] = useState("User");
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ GlobalCallListener: User authenticated:", session.user.id);
        setCurrentUser(session.user);
      } else {
        console.log("⚠️ GlobalCallListener: No user session");
      }
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      console.log("⏳ GlobalCallListener: Waiting for user to load...");
      return;
    }

    console.log("📡 GlobalCallListener: Subscribing to calls for receiver_id =", currentUser.id);

    const channel = supabase.channel(`global-calls-${currentUser.id}`)
      // Listen for calls RECEIVED by the current user
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `receiver_id=eq.${currentUser.id}` }, (payload) => {
        console.log("🔔 CALL EVENT TRIGGERED!", payload);
        const call = payload.new || payload.old;
        if (!call) return;

        if (payload.eventType === "INSERT" && call.status === "ringing") {
          console.log("✅ MATCH! Setting state to incoming");
          setCallData(call);
          setCallType(call.type);
          setCallStatus("incoming");
          toast.success(`📞 Incoming ${call.type} call!`);
        } else if (payload.eventType === "UPDATE") {
          if (call.status === "accepted") {
            setCallStatus("connected");
            if (!callTimerRef.current) {
              callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
            }
            toast.success("Call connected!");
          } else if (call.status === "rejected" || call.status === "ended") {
            resetCallState();
            toast.info(call.status === "rejected" ? "Call was declined." : "Call ended.");
          }
        } else if (payload.eventType === "DELETE") {
          resetCallState();
        }
      })
      .subscribe((status) => {
        console.log("📡 Subscription Status:", status);
      });

    return () => { 
      console.log("🛑 GlobalCallListener: Unsubscribing");
      supabase.removeChannel(channel); 
    };
  }, [currentUser]);

  const resetCallState = () => {
    setCallStatus("idle");
    setCallDuration(0);
    setCallData(null);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const handleAcceptCall = async () => {
    if (!callData) return;
    console.log("📞 Accepting call:", callData.id);
    const { error } = await supabase.from("calls").update({ status: "accepted" }).eq("id", callData.id);
    if (!error) {
      router.push(`/chat/${callData.listing_id}?user=${callData.caller_id}`);
    } else {
      console.error("Failed to accept call:", error);
    }
  };

  const handleDeclineCall = async () => {
    if (!callData) return;
    console.log("📞 Declining call:", callData.id);
    await supabase.from("calls").update({ status: "rejected" }).eq("id", callData.id);
    resetCallState();
  };

  const handleEndCall = async () => {
    if (!callData) return;
    console.log("📞 Ending call:", callData.id);
    await supabase.from("calls").update({ status: "ended" }).eq("id", callData.id);
    resetCallState();
    toast.info("Call ended.");
  };

  // Fetch the other user's name when a call is active
  useEffect(() => {
    if (callData && currentUser) {
      const otherId = callData.caller_id === currentUser.id ? callData.receiver_id : callData.caller_id;
      supabase.from("profiles").select("full_name").eq("id", otherId).single().then(({ data }) => {
        if (data) setOtherUserName(data.full_name || "User");
      });
    }
  }, [callData, currentUser]);

  if (callStatus === "idle" || !currentUser) return null;

  return (
    <>
      {callStatus === "calling" && (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 animate-pulse border-4 border-blue-500/30">
            <span className="text-3xl font-bold">{otherUserName.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{otherUserName}</h2>
          <p className="text-gray-400 mb-12">{callType === "audio" ? "Voice calling..." : "Video calling..."}</p>
          <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition shadow-lg shadow-red-900/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
          </button>
        </div>
      )}

      {callStatus === "incoming" && (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-300">
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 animate-bounce border-4 border-green-500/30">
            <span className="text-3xl font-bold">{otherUserName.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{otherUserName}</h2>
          <p className="text-gray-400 mb-12">Incoming {callType === "audio" ? "Voice" : "Video"} Call...</p>
          <div className="flex gap-8">
            <button onClick={handleDeclineCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition shadow-lg shadow-red-900/50">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
            </button>
            <button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-500 transition shadow-lg shadow-green-900/50">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </button>
          </div>
        </div>
      )}

      {callStatus === "connected" && (
        <div className={`fixed inset-0 z-[100] ${callType === "video" ? "bg-gray-900" : "bg-gray-950"} flex flex-col items-center justify-center text-white animate-in fade-in duration-300`}>
          {callType === "video" && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-6xl opacity-20">📹</span>
              <p className="absolute bottom-10 text-gray-400 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Video stream placeholder</p>
            </div>
          )}
          <div className={`relative z-10 w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 border-4 border-green-500 ${callType === "video" ? "w-32 h-32" : ""}`}>
            <span className="text-3xl font-bold">{otherUserName.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 relative z-10">{otherUserName}</h2>
          <p className="text-green-400 mb-12 relative z-10 font-mono text-lg">
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
          </p>
          <button onClick={handleEndCall} className="relative z-10 w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition shadow-lg shadow-red-900/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
          </button>
        </div>
      )}
    </>
  );
}