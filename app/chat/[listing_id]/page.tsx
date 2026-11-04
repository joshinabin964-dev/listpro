"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ChatRoomPage() {
  const { listing_id } = useParams();
  const searchParams = useSearchParams();
  const otherUserId = searchParams.get("user");
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [listingDetails, setListingDetails] = useState<any>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // 🔥 NEW: Voice Message States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. INITIAL LOAD
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setCurrentUser(session.user);
      
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id);

      if (otherUserId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, last_seen")
          .eq("id", otherUserId)
          .single();
        if (profileData) setOtherUser(profileData);
      }

      const { data: listing } = await supabase
        .from("listings")
        .select("product_name, title, name, price, image_url, image")
        .eq("id", listing_id)
        .single();
      
      if (listing) {
        setListingDetails({
          displayName: listing.product_name || listing.title || listing.name || "Item",
          displayPrice: listing.price ? `$${listing.price}` : "Price not set",
          displayImage: listing.image_url || listing.image || null
        });
      }

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", listing_id)
        .order("created_at", { ascending: true });
      
      if (data) {
        const filtered = data.filter(m => 
          (m.sender_id === session.user.id && m.receiver_id === otherUserId) ||
          (m.sender_id === otherUserId && m.receiver_id === session.user.id)
        );
        
        const mappedMessages = filtered.map(m => ({ ...m, tempId: m.id }));
        setMessages(mappedMessages);

        const unreadMessageIds = filtered
          .filter(m => m.receiver_id === session.user.id && !m.is_read)
          .map(m => m.id);
          
        if (unreadMessageIds.length > 0) {
          await supabase.from("messages").update({ is_read: true }).in("id", unreadMessageIds);
        }
      }
      setLoading(false);
    };
    initChat();
  }, [listing_id, otherUserId, router]);

  // 2. LIVE REALTIME LISTENER
  useEffect(() => {
    if (!currentUser || !listing_id || !otherUserId) return;
    
    const channel = supabase
      .channel(`room-${listing_id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `listing_id=eq.${listing_id}` 
      }, (payload) => {
        const newMsg = payload.new;
        if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser.id)) {
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id || m.tempId === newMsg.id)) return prev;
            return [...prev, { ...newMsg, tempId: newMsg.id }];
          });
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, listing_id, otherUserId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  // 🔥 NEW: Toggle Voice Recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await sendAudioMessage(audioBlob);
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        
        // Start timer
        let seconds = 0;
        recordingTimerRef.current = setInterval(() => {
          seconds += 1;
          setRecordingTime(seconds);
        }, 1000);

      } catch (error) {
        console.error("Mic permission denied or error:", error);
        toast.error("Microphone access is required to record voice messages.");
      }
    }
  };

  // 🔥 NEW: Send Audio Message
  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!currentUser || !otherUserId) return;
    setSending(true);
    const tempId = `temp-audio-${Date.now()}`;
    const tempMsg = {
      tempId,
      listing_id,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      content: "🎤 Voice Message",
      audio_url: "loading", // Placeholder
      is_read: false,
      created_at: new Date().toISOString(),
      isFailed: false
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-audios")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("chat-audios")
        .getPublicUrl(fileName);

      // 3. Insert into database
      const { error: dbError } = await supabase.from("messages").insert({
        listing_id,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        content: "🎤 Voice Message",
        audio_url: publicUrl,
        is_read: false
      });

      if (dbError) throw dbError;

      // Remove temp message
      setMessages((prev) => prev.filter(m => m.tempId !== tempId));
    } catch (error: any) {
      console.error("Audio send error:", error);
      toast.error("Failed to send voice message.");
      setMessages((prev) => prev.map(m => m.tempId === tempId ? { ...m, isFailed: true } : m));
    } finally {
      setSending(false);
    }
  };

  // Text message send
  const handleSendMessage = async (retryMsg?: any) => {
    const contentToSend = retryMsg ? retryMsg.content : newMessage.trim();
    if (!contentToSend || !currentUser || !otherUserId || sending) return;
    
    setSending(true);
    const tempId = retryMsg ? retryMsg.tempId : `temp-${Date.now()}`; 
    
    if (!retryMsg) {
      const tempMsg = {
        tempId,
        listing_id, 
        sender_id: currentUser.id, 
        receiver_id: otherUserId, 
        content: contentToSend, 
        is_read: false,
        created_at: new Date().toISOString(),
        isFailed: false
      };
      setMessages((prev) => [...prev, tempMsg]);
      setNewMessage("");
    } else {
      setMessages((prev) => prev.map(m => m.tempId === tempId ? {...m, isFailed: false} : m));
    }
    
    try {
      const { error } = await supabase.from("messages").insert({
        listing_id, 
        sender_id: currentUser.id, 
        receiver_id: otherUserId, 
        content: contentToSend, 
        is_read: false
      });
      if (error) throw error;
      setMessages((prev) => prev.filter(m => m.tempId !== tempId));
    } catch (error: any) { 
      console.error("Send error:", error);
      toast.error("Failed to send. Tap message to retry.");
      setMessages((prev) => prev.map(m => m.tempId === tempId ? {...m, isFailed: true} : m));
    } finally { 
      setSending(false); 
    }
  };

  const handleBlock = () => {
    toast.error("User blocked.");
    setShowMoreMenu(false);
  };
  
  const handleReport = () => {
    toast.success("User reported to safety team.");
    setShowMoreMenu(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;

  if (!otherUserId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">No conversation selected</p>
          <Link href="/inbox" className="text-blue-400 hover:text-blue-300">← Go to Inbox</Link>
        </div>
      </div>
    );
  }

  const isActiveNow = otherUser?.last_seen && (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < (5 * 60 * 1000);
  const statusText = isActiveNow ? "Active now" : otherUser?.last_seen ? `Last seen ${new Date(otherUser.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline";

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950 p-3 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <Link href="/inbox" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
          ← Back
        </Link>
        
        <div className="flex items-center gap-3 relative" ref={moreMenuRef}>
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-gray-300">{otherUser?.full_name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white leading-tight">{otherUser?.full_name || "User"}</span>
            <span className={`text-[10px] ${isActiveNow ? 'text-green-400' : 'text-gray-400'}`}>{statusText}</span>
          </div>
          
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="ml-2 p-2 hover:bg-gray-800 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-12 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <button onClick={handleReport} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition flex items-center gap-2">
                Report User
              </button>
              <button onClick={handleBlock} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition flex items-center gap-2 border-t border-gray-800">
                Block User
              </button>
            </div>
          )}
        </div>
      </nav>

      {listingDetails && (
        <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
            {listingDetails.displayImage ? (
              <img src={listingDetails.displayImage} alt="Item" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{listingDetails.displayName}</p>
            <p className="text-xs text-blue-400">{listingDetails.displayPrice}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="mx-4 mt-2 bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <p className="text-xs text-yellow-200 leading-relaxed">
              <strong>Safety Reminder:</strong> Meet in public places and check the live video before you pay. Never send money in advance.
            </p>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>No messages yet.</p>
            <p className="text-sm mt-2">Say hello! 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id || msg.tempId} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                <div 
                  onClick={msg.isFailed ? () => handleSendMessage(msg) : undefined}
                  className={`px-4 py-2 rounded-2xl transition ${
                    isMine ? "bg-blue-600 rounded-br-none" : "bg-gray-800 rounded-bl-none"
                  } ${msg.isFailed ? 'opacity-80 border border-red-500/50 cursor-pointer hover:opacity-100' : ''}`}
                >
                  {/* 🔥 NEW: Render Audio Player if audio_url exists */}
                  {msg.audio_url && msg.audio_url !== "loading" ? (
                    <audio controls src={msg.audio_url} className="max-w-[200px] h-8" />
                  ) : msg.audio_url === "loading" ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending voice message...
                    </div>
                  ) : (
                    <p className="text-sm break-words">{msg.content}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mt-1 px-1">
                  {msg.isFailed ? (
                    <span className="text-[10px] text-red-400 font-medium flex items-center gap-1 cursor-pointer hover:text-red-300" onClick={() => handleSendMessage(msg)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Failed, tap to retry
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMine && !msg.isFailed && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-400">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="border-t border-gray-800 p-3 flex gap-2 bg-gray-950 pb-6 items-center">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-full px-4 py-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-red-400 font-mono text-sm">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-400 flex-1 text-right">Tap mic to stop & send</span>
          </div>
        ) : (
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
            disabled={sending}
          />
        )}
        
        {/* 🔥 NEW: Microphone Button */}
        <button 
          type="button"
          onClick={toggleRecording}
          disabled={sending}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition disabled:opacity-50 ${
            isRecording ? "bg-red-600 hover:bg-red-500 animate-pulse" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Send Button (Only show when not recording and has text) */}
        {!isRecording && (
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); handleSendMessage(); }}
            disabled={sending || !newMessage.trim()} 
            className="bg-blue-600 hover:bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-gray-800 transition"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        )}
      </div>
    </main>
  );
}