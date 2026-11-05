"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Peer, { MediaConnection } from "peerjs";

export default function GlobalCallListener() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callData, setCallData] = useState<any>(null);
  const [otherUserName, setOtherUserName] = useState("User");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [callConnection, setCallConnection] = useState<MediaConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  // 1. Handle Auth & Initialize PeerJS
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const newPeer = new Peer(session.user.id);
        newPeer.on('open', (id) => console.log("My Peer ID is: " + id));
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

  // 2. Request Camera IMMEDIATELY when call starts (Crucial for Full Screen Video)
  useEffect(() => {
    if ((callStatus === 'calling' || callStatus === 'connected' || callStatus === 'incoming') && callType === 'video' && !localStream) {
      const getCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(stream);
        } catch (err) {
          console.error("Camera access failed", err);
        }
      };
      getCamera();
    }
  }, [callStatus, callType, localStream]);

  // 3. Handle Video Elements
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // 4. Listen for Calls & Peer Connections
  useEffect(() => {
    if (!currentUser || !peer) return;

    peer.on('call', (call) => {
      if (localStream) {
        call.answer(localStream);
        call.on('stream', (userStream) => setRemoteStream(userStream));
      }
    });

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
            if (call.caller_id && localStream) {
              const conn = peer.call(call.caller_id, localStream);
              conn.on('stream', (userStream) => setRemoteStream(userStream));
              setCallConnection(conn);
            }
          } else if (call.status === "rejected" || call.status === "ended") resetCallState();
        } else if (payload.eventType === "DELETE") resetCallState();
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
        } else if (payload.eventType === "DELETE") resetCallState();
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
      await supabase.from("calls").update({ status: "accepted" }).eq("id", callData.id);
    } catch (err) {
      toast.error("Camera/Mic access denied.");
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

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (callData && currentUser) {
      const otherId = callData.caller_id === currentUser.id ? callData.receiver_id : callData.caller_id;
      supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).single().then(({ data }) => {
        if (data) {
          setOtherUserName(data.full_name || "User");
          setOtherUserAvatar(data.avatar_url);
        }
      });
    }
  }, [callData, currentUser]);

  if (callStatus === "idle" || !currentUser) return null;

  // 🎨 THE SNAPCHAT-STYLE 1000/1000 UI
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden font-sans">
      
      {/* 📹 FULL SCREEN LOCAL CAMERA (The Background) */}
      {callType === "video" && localStream ? (
        <video 
          ref={localVideoRef} 
          autoPlay muted playsInline 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie cam
        />
      ) : (
        /* Fallback for Audio Calls or Waiting for Camera */
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#0a0a0a] to-black flex items-center justify-center">
           {otherUserAvatar && <img src={otherUserAvatar} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 scale-125" />}
        </div>
      )}

      {/* 🌫️ GRADIENT OVERLAYS (So text is readable) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none" />

      {/* 📱 TOP BAR (Minimize, Name, More) */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start z-20">
        <button className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
        
        <div className="flex flex-col items-center mt-4">
          <h2 className="text-2xl font-bold tracking-tight drop-shadow-lg">{otherUserName}</h2>
          <p className="text-sm text-gray-200 drop-shadow-md mt-1 flex items-center gap-2">
            {callStatus === "connected" ? (
              <span className="text-green-400 font-mono">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}</span>
            ) : (
              <>
                <span className={`w-2 h-2 rounded-full ${callStatus === 'incoming' ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></span>
                {callStatus === "incoming" ? "Incoming Video Call..." : "Calling..."}
              </>
            )}
          </p>
        </div>

        <button className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
        </button>
      </div>

      {/* 🖼️ PIP (Remote Video or Avatar) */}
      {callType === "video" && (
        <div className="absolute top-24 right-4 w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-gray-800">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              {otherUserAvatar ? (
                <img src={otherUserAvatar} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{otherUserName.charAt(0)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🎛️ BOTTOM CONTROL BAR (Snapchat Style) */}
      <div className="absolute bottom-0 w-full p-8 z-20 flex flex-col items-center gap-6">
        
        {/* Snapchat-style Pills */}
        {callType === "video" && (
          <div className="flex gap-3 overflow-x-auto w-full justify-center pb-2">
            <button className="bg-white/20 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition">
              <span>✨</span> Touch up
            </button>
            <button className="bg-white/20 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition">
              <span>💨</span> Blur
            </button>
            <button className="bg-white/20 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition">
              <span>😊</span> Effects
            </button>
          </div>
        )}

        {/* Main Circular Buttons */}
        <div className="flex items-center justify-center gap-6 w-full">
          
          {callStatus === "incoming" ? (
            <>
              <button onClick={handleDeclineCall} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <span className="text-xs text-gray-300 font-medium">Decline</span>
              </button>
              <button onClick={handleAcceptCall} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform animate-bounce">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <span className="text-xs text-gray-300 font-medium">Accept</span>
              </button>
            </>
          ) : (
            <>
              {/* Flip Camera */}
              <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              
              {/* Mute Mic */}
              <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-red-500' : 'bg-white/20 backdrop-blur-md hover:bg-white/30'}`}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>

              {/* End Call */}
              <button onClick={handleEndCall} className="group flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}