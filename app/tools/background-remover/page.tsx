"use client";
import { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import Link from "next/link";

export default function BackgroundRemoverPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📱 Detect mobile to apply aggressive optimizations
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Compress image to save mobile RAM and network bandwidth
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // 768px is the sweet spot for mobile
          const MAX_DIMENSION = isMobile ? 768 : 1024; 
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_DIMENSION) {
            height = (height * MAX_DIMENSION) / width;
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = (width * MAX_DIMENSION) / height;
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Compression failed"));
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setProcessedImage(null);
    setIsProcessing(true);
    setProgress(5);
    setStatusText("Optimizing image...");

    const reader = new FileReader();
    reader.onload = (e) => setOriginalImage(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const compressedBlob = await compressImage(file);
      
      setStatusText("Downloading AI Model (This may take a moment on mobile)...");
      setProgress(15);
      
      //  THE MAGIC FIX: Force CDN and Small Model
      const blob = await removeBackground(compressedBlob, {
        model: "small", // Uses the 30MB model instead of 100MB+
        publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@latest/dist/", // 🌍 Forces Global CDN (Fixes mobile 0% hang!)
        output: { format: "image/png", quality: 0.9 },
        progress: (key: string, current: number, total: number) => {
          const percent = Math.round((current / total) * 100);
          setProgress(Math.min(95, 15 + (percent * 0.8)));
          
          if (key.includes("fetch") || key.includes("download")) {
            setStatusText(`Downloading AI Model: ${percent}%`);
          } else if (key.includes("compute")) {
            setStatusText(`Processing Image: ${percent}%`);
          }
        },
      });

      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
      setProgress(100);
      setStatusText("Done! Background removed.");
      
    } catch (err: any) {
      console.error(err);
      setError("Mobile browser blocked the AI. Try a smaller image or use Desktop.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "nabjo-cleaned-image.png";
    link.click();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            AI Background Remover
          </h1>
          <p className="text-gray-400">
            {isMobile ? "📱 Mobile Optimized - Using Lite AI Model" : "100% Free. Runs in your browser."}
          </p>
        </div>

        {!originalImage && !isProcessing && (
          <div className="border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center hover:border-blue-500 transition cursor-pointer bg-gray-900/50"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-bold mb-2">Click to Upload Image</h2>
            <p className="text-gray-500 text-sm">100% Private. No API keys. No servers.</p>
          </div>
        )}

        {isProcessing && (
          <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">{statusText}</h2>
            <div className="w-full bg-gray-800 rounded-full h-2.5 mt-4">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {originalImage && !isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">Original</h3>
              <img src={originalImage} alt="Original" className="w-full h-64 object-contain rounded-lg bg-gray-800" />
            </div>

            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                {processedImage ? "Background Removed ✨" : "Result"}
              </h3>
              <div className="w-full h-64 flex items-center justify-center rounded-lg bg-[url('https://placehold.co/400x400/202020/303030?text=Transparent+BG')] bg-cover">
                {processedImage ? (
                  <img src={processedImage} alt="Processed" className="max-h-full max-w-full object-contain" />
                ) : error ? (
                  <p className="text-red-400 text-center px-4">{error}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {processedImage && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleDownload}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition shadow-lg"
            >
              ⬇️ Download Image
            </button>
            <button 
              onClick={() => {
                setOriginalImage(null);
                setProcessedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition"
            >
              🔄 Process Another
            </button>
          </div>
        )}
      </div>
    </main>
  );
}