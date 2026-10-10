"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

function EditForm() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [condition, setCondition] = useState("New");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchListing = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data, error } = await supabase.from("listings").select("*").eq("id", id).eq("user_id", session.user.id).single();

      if (error || !data) { toast.error("Listing not found."); router.push("/my-listings"); return; }

      const titleParts = data.ai_title?.split(' - ') || [data.product_name, 'New'];
      const parsedPrice = data.sale_price || 0;
      const parsedCost = data.cost_price || 0;
      const parsedDesc = data.ai_description || '';
      const parsedStatus = data.status || 'Available';

      setTitle(titleParts[0] || data.product_name);
      setCondition(titleParts[1] || 'New');
      setSalePrice(parsedPrice.toString());
      setCostPrice(parsedCost.toString());
      setStatus(parsedStatus);
      setDescription(parsedDesc);
      setCurrentImageUrl(data.image_url);
      setImagePreview(data.image_url);
      setLoading(false);
    };
    fetchListing();
  }, [id, router]);

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
    if (!title || !salePrice) { toast.error("Please fill in Title and Sale Price."); return; }
    setSaving(true);

    try {
      let finalImageUrl = currentImageUrl;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (uploadError) { toast.error("Image upload failed."); setSaving(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
        const oldFileName = currentImageUrl.split('/').pop();
        if (oldFileName && oldFileName !== fileName) await supabase.storage.from('product-images').remove([oldFileName]);
      }

      const { error: dbError } = await supabase.from("listings").update({
        product_name: title,
        image_url: finalImageUrl,
        ai_title: `${title} - ${condition}`,
        ai_description: description,
        sale_price: parseFloat(salePrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        status: status
      }).eq("id", id);

      if (dbError) { toast.error("Error updating listing."); } 
      else { toast.success("Listing updated successfully!"); router.push("/my-listings"); }
    } catch (error) { toast.error("Something went wrong."); }
    setSaving(false);
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/my-listings" className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 w-fit">← Back to My Listings</Link>
        <h1 className="text-3xl font-bold mb-2 text-blue-500">Edit Listing</h1>
        <p className="text-gray-400 mb-8">Update the details of your product.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-8 rounded-2xl border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Photo</label>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-64 bg-black rounded-xl overflow-hidden border border-gray-700 cursor-pointer group">
              <img src={imagePreview || "https://via.placeholder.com/300"} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white font-bold">Click to change photo</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Title (Required)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Sale Price ($) *</label>
              <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Cost Price ($)</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-500 text-lg" />
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
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" />
          </div>

          <div className="flex gap-4 pt-4">
            <Link href="/my-listings" className="flex-1"><button type="button" className="w-full p-4 bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold rounded-xl transition">Cancel</button></Link>
            <button type="submit" disabled={saving} className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl transition disabled:opacity-50 flex justify-center items-center gap-2">
              {saving ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</>) : (<><span>💾</span> Save Changes</>)}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>}>
      <EditForm />
    </Suspense>
  );
}