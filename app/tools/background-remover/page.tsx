'use client';

import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import Link from 'next/link';

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setProcessedImage(null); 
      setError(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);

    try {
      // The magic happens here. It downloads the model on first run.
      const blob = await removeBackground(file);
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
    } catch (err) {
      console.error(err);
      setError("Failed to process image. Please try a standard JPG or PNG.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const a = document.createElement('a');
    a.href = processedImage;
    a.download = 'nabjo-clean-bg.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-block transition">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            AI Background Remover
          </h1>
          <p className="text-gray-400">100% Free. Runs securely in your browser. No data sent to servers.</p>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">1. Upload Image</h2>
            {preview ? (
              <div className="relative w-full h-64 flex items-center justify-center bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-64 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500">
                <span className="text-4xl mb-2">📁</span>
                <p className="text-sm">No image selected</p>
              </div>
            )}
            
            <label className="mt-4 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition w-full text-center">
              Choose File
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Result Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">2. Result</h2>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 text-sm animate-pulse">AI is working... (First time takes ~10s)</p>
              </div>
            ) : processedImage ? (
              <div className="relative w-full h-64 flex items-center justify-center rounded-lg overflow-hidden border border-gray-700" 
                   style={{ backgroundImage: 'linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                <img src={processedImage} alt="Processed" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-64 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500">
                <span className="text-4xl mb-2">✨</span>
                <p className="text-sm">Result will appear here</p>
              </div>
            )}

            {processedImage && (
              <button 
                onClick={handleDownload}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition w-full"
              >
                ⬇️ Download Image
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        {file && !loading && !processedImage && (
          <button 
            onClick={handleRemoveBackground}
            className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-blue-900/50"
          >
             Remove Background (100% Free)
          </button>
        )}

        {error && (
          <div className="mt-6 bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-xl text-center">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}