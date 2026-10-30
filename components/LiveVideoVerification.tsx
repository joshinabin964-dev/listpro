"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LiveVideoVerification({ listingId }: { listingId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [secureToken, setSecureToken] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // 🛡️ RULE #4: Check if user is on mobile
  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
    
    if (!checkMobile) {
      setError("⚠️ Video Verification is only available on Mobile devices for security.");
    }
  }, []);

  // 🛡️ RULE #1: Fetch the secure token from YOUR server
  const startVerification = async () => {
    if (!isMobile) return;

    try {
      // Get secure ID from server
      const res = await fetch('/api/generate-verification-token');
      const data = await res.json();
      setSecureToken(data.token);

      // Open camera (prefer back camera)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Could not access camera. Please allow permissions.");
    }
  };

  // 🛡️ RULE #2: Draw the Watermark (ID + Live Timestamp) on every frame
  useEffect(() => {
    if (!stream || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId: number;

    const drawWatermark = () => {
      if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the live video frame
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw the Watermark Box
        ctx!.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx!.fillRect(10, 10, 340, 75);

        // Draw the Secure Server ID
        ctx!.font = "bold 24px Arial";
        ctx!.fillStyle = "#00FF00"; // Green text
        ctx!.fillText(`NABJO ID: ${secureToken}`, 20, 42);

        // Draw the LIVE Timestamp (Updates every frame)
        ctx!.font = "18px Arial";
        ctx!.fillStyle = "#FFFFFF";
        const currentTime = new Date().toLocaleTimeString();
        ctx!.fillText(`LIVE: ${currentTime}`, 20, 68);
      }
      animationId = requestAnimationFrame(drawWatermark);
    };

    drawWatermark();
    return () => cancelAnimationFrame(animationId);
  }, [stream, secureToken]);

  // Capture the watermarked image and upload to Supabase
  const captureAndUploadProof = async () => {
    if (!canvasRef.current) return;
    setUploading(true);
    
    try {
      // Convert canvas to image blob
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const fileName = `verification_${listingId}_${secureToken}.png`;
      const { error } = await supabase.storage
        .from('verifications')
        .upload(fileName, blob, { contentType: 'image/png' });

      if (error) throw error;
      
      toast.success("🛡️ Verification proof saved securely!");
    } catch (err: any) {
      toast.error("Failed to save proof: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isMobile) {
    return <div className="p-4 bg-red-900/20 text-red-400 rounded-lg border border-red-800">{error}</div>;
  }

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 mb-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        🛡️ Live Video Verification
      </h3>
      
      {!stream ? (
        <button 
          onClick={startVerification}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
        >
          📷 Start Camera Verification
        </button>
      ) : (
        <div className="relative">
          {/* Hidden video element (we only show the canvas) */}
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
          
          {/* The Canvas shows the video WITH the watermark burned in */}
          <canvas ref={canvasRef} className="w-full rounded-lg bg-black border border-gray-700" />
          
          <button 
            onClick={captureAndUploadProof}
            disabled={uploading}
            className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            {uploading ? "Saving..." : "📸 Capture & Save Verified Proof"}
          </button>
        </div>
      )}
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
}