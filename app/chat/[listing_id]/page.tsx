"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "👎"];

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
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  
  // 🔥 CALLING STATES
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const interval = setInterval(() => { setMessages(prev => [...prev]); }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. LIVE REALTIME LISTENER (Messages + Calls)
  useEffect(() => {
    if (!currentUser || !listing_id) return;
    
    const channel = supabase.channel(`chat-room-${listing_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `listing_id=eq.${listing_id}` }, (payload) => {
        setMessages((prev) => {
          if (payload.eventType === 'DELETE') return prev.filter(msg => msg.id !== payload.old.id);
          const newMsg = payload.new;
          if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === otherUserId) ||
              (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser.id)) {
            if (payload.eventType === 'UPDATE') return prev.map(msg => msg.id === newMsg.id ? { ...msg, ...newMsg } : msg);
            if (prev.find(msg => msg.id === newMsg.id || msg.tempId === newMsg.id)) return prev;
            return [...prev, { ...newMsg, tempId: newMsg.id }];
          }
          return prev;
        });
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.user_id === otherUserId) setIsOtherUserTyping(payload.is_typing);
      })
      // 🔥 LISTEN FOR CALLS
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `listing_id=eq.${listing_id}` }, (payload) => {
        const call = payload.new || payload.old;
        if (!call) return;

        if (payload.eventType === 'INSERT') {
          if (call.receiver_id === currentUser.id && call.status === 'ringing') {
            setCallType(call.type);
            setCallStatus('incoming');
            toast.success(`Incoming ${call.type} call from ${otherUser?.full_name || 'User'}!`);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (call.caller_id === currentUser.id || call.receiver_id === currentUser.id) {
            if (call.status === 'accepted') {
              setCallStatus('connected');
              if (!callTimerRef.current) {
                callTimerRef.current = setInterval(() => {
                  setCallDuration(prev => prev + 1);
                }, 1000);
              }
            } else if (call.status === 'rejected' || call.status === 'ended') {
              setCallStatus('idle');
              setCallDuration(0);
              if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
              }
              if (call.status === 'rejected') toast.info("Call was declined.");
              else toast.info("Call ended.");
            }
          }
        } else if (payload.eventType === 'DELETE') {
          setCallStatus('idle');
          setCallDuration(0);
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, listing_id, otherUserId, otherUser?.full_name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) setShowMoreMenu(false);
      if (!event.target || !(event.target as Element).closest('.reaction-menu, .message-menu')) {
        setActiveReactionMenu(null);
        setActiveMessageMenu(null);
      }
    };
    if (showMoreMenu || activeReactionMenu || activeMessageMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu, activeReactionMenu, activeMessageMenu]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOtherUserTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const channel = supabase.channel(`chat-room-${listing_id}`);
    channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id, is_typing: true } });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id, is_typing: false } });
    }, 2000);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const msg = messages.find(m => m.id === messageId);
    const currentReactions = msg?.reactions || {};
    const newReactions = { ...currentReactions };
    if (newReactions[currentUser.id] === emoji) delete newReactions[currentUser.id];
    else newReactions[currentUser.id] = emoji;
    await supabase.from("messages").update({ reactions: newReactions }).eq("id", messageId);
    setActiveReactionMenu(null);
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editText.trim()) return;
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: editText.trim(), edited_at: new Date().toISOString() } : m));
    setEditingMessageId(null);
    setEditText("");
    await supabase.from("messages").update({ content: editText.trim(), edited_at: new Date().toISOString() }).eq("id", msgId);
    toast.success("Message edited");
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setActiveMessageMenu(null);
    await supabase.from("messages").delete().eq("id", msgId);
    toast.success("Message deleted for everyone");
  };

  // 🔥 CALL FUNCTIONS
  const startCall = async (type: 'audio' | 'video') => {
    setCallType(type);
    setCallStatus('calling');
    const loadingToast = toast.loading(`Initiating ${type} call...`);
    
    const { error } = await supabase.from('calls').insert({
      caller_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id,
      type,
      status: 'ringing'
    });
    
    toast.dismiss(loadingToast);
    if (error) {
      toast.error("Failed to start call");
      setCallStatus('idle');
    } else {
      toast.success("Calling...");
    }
  };

  const handleAcceptCall = async () => {
    const { error } = await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('receiver_id', currentUser.id)
      .eq('status', 'ringing')
      .eq('listing_id', listing_id);
    
    if (!error) {
      setCallStatus('connected');
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
      toast.success("Call connected!");
    }
  };

  const handleDeclineCall = async () => {
    await supabase
      .from('calls')
      .update({ status: 'rejected' })
      .eq('receiver_id', currentUser.id)
      .eq('status', 'ringing')
      .eq('listing_id', listing_id);
    setCallStatus('idle');
  };

  const handleEndCall = async () => {
    // 🔥 FIX: Use .neq instead of .in for bulletproof real-time updates
    await supabase
      .from('calls')
      .update({ status: 'ended' })
      .eq('listing_id', listing_id)
      .neq('status', 'ended');
    
    setCallStatus('idle');
    setCallDuration(0);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    toast.info("Call ended.");
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type)) { toast.error("Invalid file type"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File size must be less than 50MB"); return; }
    await sendMediaMessage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMediaMessage = async (file: File) => {
    if (!currentUser || !otherUserId) return;
    setIsUploadingMedia(true);
    const tempId = `temp-media-${Date.now()}`;
    const isVideo = file.type.startsWith('video/');
    const disappearsAt = disappearingEnabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const replyData = replyTo ? { id: replyTo.id, content: replyTo.content, sender_name: replyTo.sender_name } : null;
    
    setMessages((prev) => [...prev, { tempId, listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: isVideo ? "🎥 Video" : "📷 Photo", media_url: "loading", media_type: isVideo ? 'video' : 'image', is_read: false, created_at: new Date().toISOString(), disappears_at: disappearsAt, reply_to: replyData, isFailed: false }]);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("chat-media").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(fileName);
      await supabase.from("messages").insert({ listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: isVideo ? "🎥 Video" : "📷 Photo", media_url: publicUrl, media_type: isVideo ? 'video' : 'image', is_read: false, disappears_at: disappearsAt, reply_to: replyData });
      setMessages((prev) => prev.filter(m => m.tempId !== tempId));
      setReplyTo(null);
    } catch (error: any) {
      toast.error("Failed to send media.");
      setMessages((prev) => prev.map(m => m.tempId === tempId ? { ...m, isFailed: true } : m));
    } finally { setIsUploadingMedia(false); }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await sendAudioMessage(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        setIsRecording(true);
        let seconds = 0;
        recordingTimerRef.current = setInterval(() => { seconds += 1; setRecordingTime(seconds); }, 1000);
      } catch (error) { toast.error("Microphone access required."); }
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!currentUser || !otherUserId) return;
    setSending(true);
    const tempId = `temp-audio-${Date.now()}`;
    const disappearsAt = disappearingEnabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const replyData = replyTo ? { id: replyTo.id, content: replyTo.content, sender_name: replyTo.sender_name } : null;
    
    setMessages((prev) => [...prev, { tempId, listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: "🎤 Voice Message", audio_url: "loading", is_read: false, created_at: new Date().toISOString(), disappears_at: disappearsAt, reply_to: replyData, isFailed: false }]);
    try {
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from("chat-audios").upload(fileName, audioBlob, { contentType: "audio/webm" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat-audios").getPublicUrl(fileName);
      await supabase.from("messages").insert({ listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: "🎤 Voice Message", audio_url: publicUrl, is_read: false, disappears_at: disappearsAt, reply_to: replyData });
      setMessages((prev) => prev.filter(m => m.tempId !== tempId));
      setReplyTo(null);
    } catch (error: any) {
      toast.error("Failed to send voice message.");
      setMessages((prev) => prev.map(m => m.tempId === tempId ? { ...m, isFailed: true } : m));
    } finally { setSending(false); }
  };

  const handleSendMessage = async (retryMsg?: any) => {
    const contentToSend = retryMsg ? retryMsg.content : newMessage.trim();
    if (!contentToSend || !currentUser || !otherUserId || sending) return;
    setSending(true);
    const tempId = retryMsg ? retryMsg.tempId : `temp-${Date.now()}`; 
    const disappearsAt = disappearingEnabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const replyData = replyTo ? { id: replyTo.id, content: replyTo.content, sender_name: replyTo.sender_name } : null;
    
    if (!retryMsg) {
      setMessages((prev) => [...prev, { tempId, listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: contentToSend, is_read: false, created_at: new Date().toISOString(), disappears_at: disappearsAt, reply_to: replyData, isFailed: false }]);
      setNewMessage("");
      setReplyTo(null);
    } else {
      setMessages((prev) => prev.map(m => m.tempId === tempId ? {...m, isFailed: false} : m));
    }
    try {
      await supabase.from("messages").insert({ listing_id, sender_id: currentUser.id, receiver_id: otherUserId, content: contentToSend, is_read: false, disappears_at: disappearsAt, reply_to: replyData });
      setMessages((prev) => prev.filter(m => m.tempId !== tempId));
    } catch (error: any) { 
      toast.error("Failed to send. Tap to retry.");
      setMessages((prev) => prev.map(m => m.tempId === tempId ? {...m, isFailed: true} : m));
    } finally { setSending(false); }
  };

  const handleBlock = () => { toast.error("User blocked."); setShowMoreMenu(false); };
  const handleReport = () => { toast.success("User reported."); setShowMoreMenu(false); };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;
  if (!otherUserId) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white"><div className="text-center"><p className="text-xl font-bold mb-4">No conversation selected</p><Link href="/inbox" className="text-blue-400">← Go to Inbox</Link></div></div>;

  const isActiveNow = otherUser?.last_seen && (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < (5 * 60 * 1000);
  const statusText = isActiveNow ? "Active now" : otherUser?.last_seen ? `Last seen ${new Date(otherUser.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Offline";
  const validMessages = messages.filter(msg => !msg.disappears_at || new Date(msg.disappears_at) > new Date());

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">
      <input type="file" ref={fileInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />

      <nav className="border-b border-gray-800 bg-gray-950 p-3 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <Link href="/inbox" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">← Back</Link>
        
        <div className="flex items-center gap-4">
          <Link href={`/profile/${otherUserId}`} className="flex items-center gap-3 relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600 group-hover:ring-2 ring-blue-500/50 transition">
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-gray-300">{otherUser?.full_name?.charAt(0) || "U"}</span>}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white leading-tight group-hover:text-blue-400 transition">{otherUser?.full_name || "User"}</span>
              <span className={`text-[10px] ${isActiveNow ? 'text-green-400' : 'text-gray-400'}`}>{statusText}</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-green-400" title="Voice Call">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            </button>
            <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-green-400" title="Video Call">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
            </button>
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
            </button>
          </div>

          {showMoreMenu && (
            <div className="absolute right-4 top-16 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <button onClick={handleReport} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition">Report User</button>
              <button onClick={handleBlock} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition border-t border-gray-800">Block User</button>
            </div>
          )}
        </div>
      </nav>

      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Disappearing Messages</span>
            {disappearingEnabled && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">24h</span>}
        </div>
        <button onClick={() => setDisappearingEnabled(!disappearingEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${disappearingEnabled ? 'bg-green-500' : 'bg-gray-700'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${disappearingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {listingDetails && (
        <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
            {listingDetails.displayImage ? <img src={listingDetails.displayImage} alt="Item" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">📦</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{listingDetails.displayName}</p>
            <p className="text-xs text-blue-400">{listingDetails.displayPrice}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {validMessages.length === 0 && messages.length === 0 && (
          <div className="mx-4 mt-2 bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <p className="text-xs text-yellow-200 leading-relaxed"><strong>Safety Reminder:</strong> Meet in public places and check the live video before you pay. Never send money in advance.</p>
          </div>
        )}
        {validMessages.length === 0 && messages.length === 0 && <div className="text-center text-gray-500 mt-10"><p>No messages yet.</p><p className="text-sm mt-2">Say hello! 👋</p></div>}

        {validMessages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          const userReaction = msg.reactions?.[currentUser.id];
          const otherUserReaction = msg.reactions?.[otherUserId];
          const isEditing = editingMessageId === msg.id;
          
          return (
            <div key={msg.id || msg.tempId} className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isMine && (
                <Link href={`/profile/${otherUserId}`} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600 flex-shrink-0 mb-1 hover:opacity-80 transition">
                  {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-300">{otherUser?.full_name?.charAt(0) || "U"}</span>}
                </Link>
              )}
              
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col relative group`}>
                {activeReactionMenu === msg.id && (
                  <div className={`reaction-menu absolute top-full ${isMine ? 'right-0' : 'left-0'} mt-1 bg-gray-800 border border-gray-700 rounded-full p-1.5 flex gap-1 shadow-xl z-20`}>
                    {EMOJI_OPTIONS.map(emoji => (
                      <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="text-xl hover:scale-125 transition transform p-1">{emoji}</button>
                    ))}
                  </div>
                )}

                {!isEditing && (
                    <button onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id); }} className={`message-menu absolute -top-2 ${isMine ? '-right-2' : '-left-2'} w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md border border-gray-600 z-10`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
                    </button>
                )}

                {activeMessageMenu === msg.id && (
                    <div className={`message-menu absolute top-8 ${isMine ? 'right-0' : 'left-0'} bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden min-w-[140px]`}>
                        <button onClick={() => { setReplyTo({ id: msg.id, content: msg.content, sender_name: isMine ? 'You' : (otherUser?.full_name || 'User') }); setActiveMessageMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 flex items-center gap-2">↩️ Reply</button>
                        {isMine && !msg.media_url && !msg.audio_url && <button onClick={() => { setEditingMessageId(msg.id); setEditText(msg.content); setActiveMessageMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center gap-2 border-t border-gray-700">✏️ Edit</button>}
                        {isMine && <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2 border-t border-gray-700">🗑️ Delete</button>}
                    </div>
                )}

                <div className={`px-4 py-2 rounded-2xl transition relative ${isMine ? "bg-blue-600 rounded-br-none" : "bg-gray-800 rounded-bl-none"} ${msg.disappears_at ? 'border border-orange-500/30' : ''}`}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <input value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" autoFocus />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setEditingMessageId(null); setEditText(""); }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                            <button onClick={() => handleEditMessage(msg.id)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded">Save</button>
                        </div>
                    </div>
                  ) : (
                    <>
                      {msg.reply_to && (
                        <div className="bg-black/20 border-l-2 border-blue-400 pl-2 mb-2 rounded text-xs text-gray-200">
                          <p className="font-bold text-blue-300 text-[10px]">{msg.reply_to.sender_name}</p>
                          <p className="truncate opacity-90">{msg.reply_to.content}</p>
                        </div>
                      )}
                      {msg.disappears_at && <div className="absolute -top-3 right-0 text-[10px] text-orange-400 flex items-center gap-1"><span>🔥</span> Disappears</div>}
                      {msg.media_url && msg.media_url !== "loading" ? (
                        msg.media_type === 'image' ? <img src={msg.media_url} alt="Shared" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} /> : <video controls src={msg.media_url} className="max-w-full rounded-lg max-h-[300px]" />
                      ) : msg.media_url === "loading" ? <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Uploading...</div>
                      : msg.audio_url && msg.audio_url !== "loading" ? <audio controls src={msg.audio_url} className="max-w-[200px] h-8" />
                      : msg.audio_url === "loading" ? <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Sending voice...</div>
                      : <p className="text-sm break-words">{msg.content}</p>}
                    </>
                  )}
                </div>
                
                {(userReaction || otherUserReaction) && (
                  <div className={`flex gap-1 mt-1 ${isMine ? 'self-end' : 'self-start'}`}>
                    {userReaction && <span className="bg-blue-600/20 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full">{userReaction}</span>}
                    {otherUserReaction && otherUserReaction !== userReaction && <span className="bg-gray-700/50 border border-gray-600 text-xs px-2 py-0.5 rounded-full">{otherUserReaction}</span>}
                  </div>
                )}

                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.edited_at && <span className="text-[9px] italic opacity-70">(edited)</span>}
                    {isMine && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-400"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {isOtherUserTyping && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600 flex-shrink-0 mb-1">
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-300">{otherUser?.full_name?.charAt(0) || "U"}</span>}
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-gray-400 ml-2">{otherUser?.full_name || 'User'} is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="bg-gray-900 border-l-4 border-blue-500 p-3 mx-3 mb-2 rounded-r-lg flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-400 font-bold mb-1">Replying to {replyTo.sender_name}</p>
            <p className="text-sm text-gray-300 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="border-t border-gray-800 p-3 flex gap-2 bg-gray-950 pb-6 items-center">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-full px-4 py-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-red-400 font-mono text-sm">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
            <span className="text-xs text-gray-400 flex-1 text-right">Tap mic to stop</span>
          </div>
        ) : (
          <input value={newMessage} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition" disabled={sending || isUploadingMedia} />
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || isUploadingMedia || isRecording} className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition disabled:opacity-50" title="Send photo/video">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
        </button>
        <button type="button" onClick={toggleRecording} disabled={sending || isUploadingMedia} className={`w-12 h-12 rounded-full flex items-center justify-center transition disabled:opacity-50 ${isRecording ? "bg-red-600 animate-pulse" : "bg-gray-800 hover:bg-gray-700"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
        </button>
        {!isRecording && (
          <button type="button" onClick={(e) => { e.preventDefault(); handleSendMessage(); }} disabled={sending || isUploadingMedia || !newMessage.trim()} className="bg-blue-600 hover:bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-gray-800 transition">
            {sending || isUploadingMedia ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          </button>
        )}
      </div>

      {/* 🔥 CALLING OVERLAYS */}
      {callStatus === 'calling' && (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 animate-pulse border-4 border-blue-500/30">
            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full rounded-full object-cover" /> : <span className="text-3xl font-bold">{otherUser?.full_name?.charAt(0) || "U"}</span>}
          </div>
          <h2 className="text-2xl font-bold mb-2">{otherUser?.full_name || "User"}</h2>
          <p className="text-gray-400 mb-12">{callType === 'audio' ? 'Voice calling...' : 'Video calling...'}</p>
          <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition shadow-lg shadow-red-900/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
          </button>
        </div>
      )}

      {callStatus === 'incoming' && (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-300">
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 animate-bounce border-4 border-green-500/30">
            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full rounded-full object-cover" /> : <span className="text-3xl font-bold">{otherUser?.full_name?.charAt(0) || "U"}</span>}
          </div>
          <h2 className="text-2xl font-bold mb-2">{otherUser?.full_name || "User"}</h2>
          <p className="text-gray-400 mb-12">Incoming {callType === 'audio' ? 'Voice' : 'Video'} Call...</p>
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

      {callStatus === 'connected' && (
        <div className={`fixed inset-0 z-[100] ${callType === 'video' ? 'bg-gray-900' : 'bg-gray-950'} flex flex-col items-center justify-center text-white animate-in fade-in duration-300`}>
          {callType === 'video' && (
             <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="text-6xl opacity-20">📹</span>
                <p className="absolute bottom-10 text-gray-400 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Video stream placeholder</p>
             </div>
          )}
          <div className={`relative z-10 w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 border-4 border-green-500 ${callType === 'video' ? 'w-32 h-32' : ''}`}>
             {otherUser?.avatar_url ? <img src={otherUser.avatar_url} className="w-full h-full rounded-full object-cover" /> : <span className="text-3xl font-bold">{otherUser?.full_name?.charAt(0) || "U"}</span>}
          </div>
          <h2 className="text-2xl font-bold mb-2 relative z-10">{otherUser?.full_name || "User"}</h2>
          <p className="text-green-400 mb-12 relative z-10 font-mono text-lg">
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </p>
          <button onClick={handleEndCall} className="relative z-10 w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition shadow-lg shadow-red-900/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
          </button>
        </div>
      )}

    </main>
  );
}