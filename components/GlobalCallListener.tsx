"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Peer, { MediaConnection } from "peerjs"; // 🔥 Import PeerJS

export default function GlobalCallListener() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callData, setCallData] = useState<any>(null);
  const [otherUserName, setOtherUserName] = useState("User");
  
  // 🔥 VIDEO STREAM STATES
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [currentPeerId, setCurrentPeerId] = useState<string | null>(null);
  const [callConnection, setCallConnection] = useState<MediaConnection | null>(null);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  // Handle Auth & Initialize PeerJS
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        // Initialize PeerJS with user ID as the peer ID
        const newPeer = new Peer(session.user.id);
        newPeer.on('open', (id) => {
          console.log("My Peer ID is: " + id);
          setCurrentPeerId(id);
        });
        setPeer(newPeer);
      }
    };
    getUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => { 
      if (peer) peer.destroy();
      authListener.subscription.unsubscribe(); 
    };
  }, []);

  // Handle Video Elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Listen for Calls & Peer Connections
  useEffect(() => {
    if (!currentUser || !peer) return;

    // 1. Listen for incoming Peer connections (Video Stream)
    peer.on('call', (call) => {
      console.log(" Incoming Peer Call");
      if (localStream) {
        call.answer(localStream); // Answer with our stream
        call.on('stream', (userStream) => {
          console.log(" Received remote stream");
          setRemoteStream(userStream);
        });
      }
    });

    // 2. Listen for Supabase Call Signaling
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
            // Initiate Peer Connection to Caller
            if (call.caller_id && localStream) {
              const conn = peer.call(call.caller_id, localStream);
              conn.on('stream', (userStream) => {
                setRemoteStream(userStream);
              });
              setCallConnection(conn);
            }
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
  }, [currentUser, peer, localStream]);

  const resetCallState = () => {
    setCallStatus("idle");
    setCallDuration(0);
    setCallData(null);
    setRemoteStream(null);
    if (callConnection) callConnection.close();
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      
      const { error } = await supabase.from("calls").update({ status: "accepted" }).eq("id", callData.id);
      if (!error) {
        // We stay on the call screen, no router push needed
      }
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

  // 🎨 PREMIUM UI RENDER WITH REAL VIDEO
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-white overflow-hidden bg-black">
      
      {/* 📹 REMOTE VIDEO (Full Screen Background) */}
      {callType === "video" && remoteStream && (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover" 
        />
      )}
      
      {/*  LOCAL VIDEO (Picture-in-Picture) */}
      {callType === "video" && localStream && (
        <video 
          ref={localVideoRef} 
          autoPlay 
          muted 
          playsInline 
          className="absolute top-24 right-4 w-32 h-48 md:w-48 md:h-64 object-cover rounded-2xl border-2 border-white/20 shadow-2xl z-20"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
      )}

      {/* Dark Overlay (Only if no video yet) */}
      {!remoteStream && (
        <div className={`absolute inset-0 ${callType === "video" ? "bg-gray-950/80 backdrop-blur-xl" : "bg-gradient-to-b from-gray-900 via-gray-950 to-black"}`} />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        
        {/* Avatar / Loading State */}
        {!localStream && (
          <div className={`w-40 h-40 rounded-full bg-gray-800 flex items-center justify-center border-4 ${callStatus === "incoming" ? "border-green-500/50 animate-pulse" : "border-blue-500/50"} shadow-2xl mb-8`}>
            <span className="text-5xl font-bold text-white">{otherUserName.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Name & Status */}
        <h2 className="text-3xl font-bold mb-2 tracking-tight drop-shadow-lg">{otherUserName}</h2>
        
        {callStatus === "calling" && (
          <p className="text-gray-300 text-lg mb-12 flex items-center gap-2 drop-shadow-md">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {callType === "audio" ? "Voice calling..." : "Video calling..."}
          </p>
        )}
        
        {callStatus === "incoming" && (
          <p className="text-gray-300 text-lg mb-12 flex items-center gap-2 drop-shadow-md">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Incoming {callType === "audio" ? "Voice" : "Video"} Call...
          </p>
        )}

        {callStatus === "connected" && (
          <p className="text-green-400 text-2xl font-mono mb-12 tracking-widest drop-shadow-md">
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
          </p>
        )}

        {/* 🎮 FLOATING CONTROLS (Glassmorphic) */}
        <div className="absolute bottom-12 flex gap-6 items-center justify-center w-full">
          
          {callStatus === "incoming" && (
            <>
              <button onClick={handleDeclineCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 hover:scale-110 transition-all">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
              <button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/50 hover:scale-110 transition-all animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
            </>
          )}

          {(callStatus === "calling" || callStatus === "connected") && (
            <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 hover:scale-110 transition-all">
              <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}