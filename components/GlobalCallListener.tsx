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

  // Handle Video Elements
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Listen for Calls & Peer Connections
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
          } else if (call.status === "rejected" || call.status === "ended") {
            resetCallState();
          }
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

  // 🎨 THE ULTIMATE PREMIUM UI
  return (
    <div className="fixed inset-0 z-[100] flex flex-col text-white overflow-hidden bg-black">
      
      {/* 📹 REMOTE VIDEO (Full Screen Background) */}
      {callType === "video" && remoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      
      {/*  LOCAL VIDEO (Picture-in-Picture) */}
      {callType === "video" && localStream && (
        <video 
          ref={localVideoRef} 
          autoPlay muted playsInline 
          className="absolute top-20 right-4 w-28 h-40 md:w-36 md:h-52 object-cover rounded-2xl border-2 border-white/20 shadow-2xl z-30 bg-gray-800"
          style={{ transform: 'scaleX(-1)' }}
        />
      )}

      {/* 🌌 BEAUTIFUL BACKGROUND (When no video yet) */}
      {!remoteStream && (
        <div className="absolute inset-0 z-0">
          {/* Blurred Avatar Background */}
          {otherUserAvatar && (
            <img src={otherUserAvatar} className="w-full h-full object-cover blur-3xl opacity-30 scale-125" />
          )}
          {/* Dark Gradient Overlay */}
          <div className={`absolute inset-0 ${callType === "video" ? "bg-gray-950/90 backdrop-blur-xl" : "bg-gradient-to-b from-gray-900 via-[#0a0a0a] to-black"}`} />
        </div>
      )}

      {/* 📱 MAIN CONTENT LAYOUT (Flex between ensures no overlap!) */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full pt-24 pb-16 px-6">
        
        {/* TOP SECTION: Avatar, Name, Status */}
        <div className="flex flex-col items-center w-full">
          
          {/* Glowing Avatar */}
          <div className="relative mb-8">
            {callStatus === "calling" && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-30"></div>
            )}
            {callStatus === "incoming" && (
              <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-30"></div>
            )}
            
            {otherUserAvatar ? (
              <img src={otherUserAvatar} className="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-2xl" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center border-4 border-white/10 shadow-2xl">
                <span className="text-4xl font-bold text-white">{otherUserName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg mb-3">{otherUserName}</h2>
          
          {/* Status Text */}
          {callStatus === "calling" && (
            <p className="text-gray-400 text-lg flex items-center gap-2 drop-shadow-md">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              {callType === "audio" ? "Voice calling..." : "Video calling..."}
            </p>
          )}
          
          {callStatus === "incoming" && (
            <p className="text-gray-400 text-lg flex items-center gap-2 drop-shadow-md">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Incoming {callType === "audio" ? "Voice" : "Video"} Call...
            </p>
          )}

          {callStatus === "connected" && (
            <p className="text-green-400 text-xl font-mono tracking-widest drop-shadow-md">
              {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
            </p>
          )}
        </div>

        {/* BOTTOM SECTION: Floating Controls (Never overlaps!) */}
        <div className="flex gap-8 items-center justify-center w-full mt-auto">
          
          {callStatus === "incoming" && (
            <>
              <button onClick={handleDeclineCall} className="group flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <span className="text-xs text-gray-400 font-medium">Decline</span>
              </button>
              
              <button onClick={handleAcceptCall} className="group flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40 group-hover:scale-110 transition-transform animate-bounce">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <span className="text-xs text-gray-400 font-medium">Accept</span>
              </button>
            </>
          )}

          {(callStatus === "calling" || callStatus === "connected") && (
            <button onClick={handleEndCall} className="group flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">End Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}