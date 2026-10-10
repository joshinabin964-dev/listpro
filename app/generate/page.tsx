"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [condition, setCondition] = useState("New");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !title || !salePrice) {
      toast.error("Please fill in Title, Sale Price, and upload a Photo.");
      return;
    }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first."); setLoading(false); return; }

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
      if (uploadError) { toast.error("Image upload failed."); setLoading(false); return; }

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('listings').insert({
        user_id: session.user.id,
        product_name: title,
        image_url: publicUrl,
        ai_title: `${title} - ${condition}`,
        ai_bullets: ["High Quality", "Fast Shipping", "Satisfaction Guaranteed"],
        ai_description: description,
        cost_price: parseFloat(costPrice) || 0,
        sale_price: parseFloat(salePrice) || 0,
        status: status,
        is_public: isPublic
      });

      if (dbError) {
        toast.error("Error saving listing.");
      } else {
        toast.success(isPublic ? "Published to Marketplace!" : "Saved to Drafts!");
        router.push("/my-listings");
      }
    } catch (error) {
      toast.error("Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/my-listings" className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 w-fit">← Back to My Listings</Link>
        <h1 className="text-3xl font-bold mb-2 text-blue-500">Create New Listing</h1>
        <p className="text-gray-400 mb-8">Fill in the details to track and list your product.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-8 rounded-2xl border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Photo (Required)</label>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            {!imagePreview ? (
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition">
                <span className="text-4xl mb-2"></span><span className="text-gray-400 font-medium">Click to upload photo</span>
              </div>
            ) : (
              <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden border border-gray-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); }} className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-bold">Remove</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Title (Required)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" placeholder="e.g. iPhone 13 Pro Max 128GB" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Sale Price ($) *</label>
              <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Cost Price ($)</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-500 text-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg">
                <option value="Available">Available</option>
                <option value="Sold">Sold</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg">
              <option value="New">Brand New</option>
              <option value="Used - Like New">Used - Like New</option>
              <option value="Used - Good">Used - Good</option>
              <option value="Used - Fair">Used - Fair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" placeholder="Describe your product..." />
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
            <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 bg-gray-800 border-gray-600" />
            <label htmlFor="isPublic" className="text-sm font-medium text-purple-300 cursor-pointer">Publish to Public Marketplace</label>
          </div>

          <button type="submit" disabled={loading} className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl transition disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? (<><span className="animate-spin">⚙️</span> Publishing...</>) : (<>{isPublic ? "🌍 Publish to Marketplace" : "💾 Save to Drafts"}</>)}
          </button>
        </form>
      </div>
    </main>
  );
}