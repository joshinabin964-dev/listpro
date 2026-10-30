"use client";
import { useState, useRef } from "react";
import Link from "next/link";

export default function BackgroundRemoverPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📱 Detect if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Compress image before sending to save upload time
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIMENSION = 1024; 
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
    setProgress(10);
    setStatusText("Preparing image...");

    const reader = new FileReader();
    reader.onload = (e) => setOriginalImage(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const compressedBlob = await compressImage(file);
      
      // 🚀 MOBILE USERS: Automatically use the Server API
      if (isMobile) {
        setStatusText("Uploading to server (Mobile optimized)...");
        setProgress(30);
        
        const formData = new FormData();
        formData.append('image', compressedBlob, 'image.jpg');
        
        const response = await fetch('/api/remove-background', {
          method: 'POST',
          body: formData,
        });
        
        setProgress(70);
        
        if (!response.ok) {
          throw new Error('Server processing failed');
        }
        
        const data = await response.json();
        setProgress(100);
        setProcessedImage(data.image);
        setStatusText("Done! Processed on server.");
        
      } else {
        // DESKTOP USERS: Try client-side first
        setStatusText("Loading AI model in browser...");
        setProgress(20);
        
        try {
          const { removeBackground } = await import("@imgly/background-removal");
          
          setStatusText("Processing with AI...");
          setProgress(40);
          
          const blob = await removeBackground(compressedBlob, {
            model: "small",
            output: { format: "image/png", quality: 0.9 },
            progress: (key: string, current: number, total: number) => {
              const percent = Math.round((current / total) * 100);
              setProgress(Math.min(90, 40 + percent / 2));
            },
          });
          
          const url = URL.createObjectURL(blob);
          setProcessedImage(url);
          setProgress(100);
          setStatusText("Done!");
          
        } catch (clientError) {
          console.error("Client-side failed, falling back to server:", clientError);
          setStatusText("Browser failed. Switching to server...");
          
          // Fallback to server if desktop browser fails
          const formData = new FormData();
          formData.append('image', compressedBlob, 'image.jpg');
          
          const response = await fetch('/api/remove-background', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('All methods failed');
          
          const data = await response.json();
          setProcessedImage(data.image);
          setStatusText("Done! (Server fallback)");
        }
      }
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to process image. Try a smaller file.");
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
            {isMobile ? "📱 Mobile detected - Using fast server processing" : "100% Free. Runs in your browser."}
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
            <p className="text-gray-500 text-sm">Mobile users: Images processed on our fast servers</p>
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