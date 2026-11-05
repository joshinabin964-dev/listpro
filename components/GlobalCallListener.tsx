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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  // Handle Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);
    };
    getUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // Handle Camera Stream
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Listen for Calls
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(`global-calls-${currentUser.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `receiver_id=eq.${currentUser.id}` }, (payload) => {
        const call = payload.new || payload.old;
        if (!call) return;

        if (payload.eventType === "INSERT" && call.status === "ringing") {
          setCallData(call);
          setCallType(call.type);
          setCallStatus("incoming");
        } else if (payload.eventType === "UPDATE") {
          if (call.status === "accepted") {
            setCallStatus("connected");
            if (!callTimerRef.current) callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
          } else if (call.status === "rejected" || call.status === "ended") {
            resetCallState();
          }
        } else if (payload.eventType === "DELETE") {
          resetCallState();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `caller_id=eq.${currentUser.id}` }, (payload) => {
        const call = payload.new || payload.old;
        if (!call) return;

        if (payload.eventType === "INSERT" && call.status === "ringing") {
          setCallData(call);
          setCallType(call.type);
          setCallStatus("calling");
        } else if (payload.eventType === "UPDATE") {
          if (call.status === "accepted") {
            setCallStatus("connected");
            if (!callTimerRef.current) callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
          } else if (call.status === "rejected" || call.status === "ended") {
            resetCallState();
            toast.info(call.status === "rejected" ? "Call was declined." : "Call ended.");
          }
        } else if (payload.eventType === "DELETE") {
          resetCallState();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const resetCallState = () => {
    setCallStatus("idle");
    setCallDuration(0);
    setCallData(null);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const handleAcceptCall = async () => {
    if (!callData) return;
    // Request camera/mic on accept
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      
      const { error } = await supabase.from("calls").update({ status: "accepted" }).eq("id", callData.id);
      if (!error) router.push(`/chat/${callData.listing_id}?user=${callData.caller_id}`);
    } catch (err) {
      toast.error("Camera/Mic access denied. Call failed.");
      handleDeclineCall();
    }
  };

  const handleDeclineCall = async () => {
    if (!callData) return;
    await supabase.from("calls").update({ status: "rejected" }).eq("id", callData.id);
    resetCallState();
  };

  const handleEndCall = async () => {
    if (!callData) return;
    await supabase.from("calls").update({ status: "ended" }).eq("id", callData.id);
    resetCallState();
  };

  useEffect(() => {
    if (callData && currentUser) {
      const otherId = callData.caller_id === currentUser.id ? callData.receiver_id : callData.caller_id;
      supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).single().then(({ data }) => {
        if (data) setOtherUserName(data.full_name || "User");
      });
    }
  }, [callData, currentUser]);

  if (callStatus === "idle" || !currentUser) return null;

  // 🎨 PREMIUM UI RENDER
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-white overflow-hidden">
      
      {/* 📹 LIVE CAMERA BACKGROUND (If Video Call) */}
      {callType === "video" && localStream && (
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110" 
        />
      )}
      
      {/* Dark Overlay */}
      <div className={`absolute inset-0 ${callType === "video" ? "bg-gray-950/80 backdrop-blur-xl" : "bg-gradient-to-b from-gray-900 via-gray-950 to-black"}`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        
        {/* Avatar / Video Preview */}
        <div className="relative mb-8">
          {callType === "video" && localStream ? (
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl shadow-blue-500/20">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-40 h-40 rounded-full bg-gray-800 flex items-center justify-center border-4 ${callStatus === "incoming" ? "border-green-500/50 animate-pulse" : "border-blue-500/50"} shadow-2xl`}>
              <span className="text-5xl font-bold text-white">{otherUserName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          
          {/* Status Ring */}
          {callStatus === "calling" && (
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-20"></div>
          )}
        </div>

        {/* Name & Status */}
        <h2 className="text-3xl font-bold mb-2 tracking-tight">{otherUserName}</h2>
        
        {callStatus === "calling" && (
          <p className="text-gray-400 text-lg mb-12 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {callType === "audio" ? "Voice calling..." : "Video calling..."}
          </p>
        )}
        
        {callStatus === "incoming" && (
          <p className="text-gray-400 text-lg mb-12 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Incoming {callType === "audio" ? "Voice" : "Video"} Call...
          </p>
        )}

        {callStatus === "connected" && (
          <p className="text-green-400 text-2xl font-mono mb-12 tracking-widest">
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
          </p>
        )}

        {/* 🎮 MASSIVE PREMIUM BUTTONS */}
        <div className="flex gap-12 items-center justify-center w-full">
          
          {callStatus === "incoming" && (
            <button 
              onClick={handleDeclineCall} 
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:scale-110 group-hover:bg-red-600 transition-all duration-300">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">Decline</span>
            </button>
          )}

          {(callStatus === "calling" || callStatus === "connected") && (
            <button 
              onClick={handleEndCall} 
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:scale-110 group-hover:bg-red-600 transition-all duration-300">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">End</span>
            </button>
          )}

          {callStatus === "incoming" && (
            <button 
              onClick={handleAcceptCall} 
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 group-hover:bg-green-600 transition-all duration-300 animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">Accept</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}