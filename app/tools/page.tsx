'use client';

import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';

export default function BackgroundRemoverTool() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!image) return;
    setLoading(true);
    try {
      // This runs entirely in the browser! $0 cost to you.
      const blob = await removeBackground(image);
      const url = URL.createObjectURL(blob);
      setResult(url);
    } catch (error) {
      console.error("Error removing background:", error);
      alert("Failed to remove background. Please try a clearer image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ✨ Free AI Background Remover
          </h1>
          <p className="text-gray-400 text-lg">
            Make your marketplace listings look professional. 100% free, runs securely in your browser.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">1. Upload Image</h2>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {preview && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">Original:</p>
                <img src={preview} alt="Original" className="w-full h-64 object-contain bg-gray-800 rounded-lg border border-gray-700" />
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold mb-4">2. Result</h2>
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">AI is working its magic...</p>
                <p className="text-xs text-gray-600 mt-2">(First time may take 10-15s to load the model)</p>
              </div>
            ) : result ? (
              <div className="w-full">
                <p className="text-sm text-gray-500 mb-2">Background Removed:</p>
                {/* Checkerboard pattern to show transparency */}
                <img src={result} alt="Result" className="w-full h-64 object-contain rounded-lg border border-gray-700" style={{ backgroundImage: 'linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
                <a 
                  href={result} 
                  download="nabjo-professional-listing.png"
                  className="mt-6 block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg"
                >
                  ⬇️ Download Image
                </a>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                <p>Upload an image and click the button below</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {image && !result && !loading && (
          <button 
            onClick={handleRemoveBackground}
            className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition shadow-lg shadow-blue-500/20"
          >
            ✨ Remove Background (100% Free)
          </button>
        )}
        
        <div className="mt-8 text-center">
            <a href="/" className="text-blue-400 hover:text-blue-300 underline">← Back to Nabjo Marketplace</a>
        </div>
      </div>
    </main>
  );
}