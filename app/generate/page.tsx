a"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

// THE GLOBAL CURRENCY MAP (100+ Countries)
const currencyMap: Record<string, { symbol: string; code: string }> = {
  "USA": { symbol: "$", code: "USD" }, "United States": { symbol: "$", code: "USD" },
  "UK": { symbol: "£", code: "GBP" }, "United Kingdom": { symbol: "£", code: "GBP" },
  "Canada": { symbol: "C$", code: "CAD" }, "Australia": { symbol: "A$", code: "AUD" },
  "New Zealand": { symbol: "NZ$", code: "NZD" }, "China": { symbol: "¥", code: "CNY" },
  "Japan": { symbol: "¥", code: "JPY" }, "South Korea": { symbol: "₩", code: "KRW" },
  "Nepal": { symbol: "Rs.", code: "NPR" }, "India": { symbol: "₹", code: "INR" },
  "Pakistan": { symbol: "Rs.", code: "PKR" }, "Bangladesh": { symbol: "৳", code: "BDT" },
  "Sri Lanka": { symbol: "Rs.", code: "LKR" }, "Afghanistan": { symbol: "؋", code: "AFN" },
  "Singapore": { symbol: "S$", code: "SGD" }, "Malaysia": { symbol: "RM", code: "MYR" },
  "Indonesia": { symbol: "Rp", code: "IDR" }, "Thailand": { symbol: "฿", code: "THB" },
  "Vietnam": { symbol: "₫", code: "VND" }, "Philippines": { symbol: "₱", code: "PHP" },
  "Myanmar": { symbol: "K", code: "MMK" }, "Cambodia": { symbol: "៛", code: "KHR" },
  "Laos": { symbol: "₭", code: "LAK" }, "Mongolia": { symbol: "₮", code: "MNT" },
  "Papua New Guinea": { symbol: "K", code: "PGK" }, "Fiji": { symbol: "FJ$", code: "FJD" },
  "UAE": { symbol: "د.إ", code: "AED" }, "Saudi Arabia": { symbol: "﷼", code: "SAR" },
  "Qatar": { symbol: "﷼", code: "QAR" }, "Kuwait": { symbol: "د.ك", code: "KWD" },
  "Oman": { symbol: "﷼", code: "OMR" }, "Bahrain": { symbol: ".د.ب", code: "BHD" },
  "Israel": { symbol: "₪", code: "ILS" }, "Turkey": { symbol: "₺", code: "TRY" },
  "Egypt": { symbol: "£", code: "EGP" }, "Morocco": { symbol: "د.م.", code: "MAD" },
  "Algeria": { symbol: "د.ج", code: "DZD" }, "Tunisia": { symbol: "د.ت", code: "TND" },
  "Jordan": { symbol: "د.ا", code: "JOD" }, "Lebanon": { symbol: "ل.ل", code: "LBP" },
  "Iraq": { symbol: "ع.د", code: "IQD" }, "Iran": { symbol: "﷼", code: "IRR" },
  "South Africa": { symbol: "R", code: "ZAR" }, "Nigeria": { symbol: "₦", code: "NGN" },
  "Kenya": { symbol: "KSh", code: "KES" }, "Ghana": { symbol: "₵", code: "GHS" },
  "Ethiopia": { symbol: "Br", code: "ETB" }, "Tanzania": { symbol: "TSh", code: "TZS" },
  "Uganda": { symbol: "USh", code: "UGX" }, "Rwanda": { symbol: "RF", code: "RWF" },
  "Senegal": { symbol: "CFA", code: "XOF" }, "Cameroon": { symbol: "FCFA", code: "XAF" },
  "Ivory Coast": { symbol: "CFA", code: "XOF" }, "Madagascar": { symbol: "Ar", code: "MGA" },
  "Switzerland": { symbol: "CHF", code: "CHF" }, "Sweden": { symbol: "kr", code: "SEK" },
  "Norway": { symbol: "kr", code: "NOK" }, "Denmark": { symbol: "kr", code: "DKK" },
  "Poland": { symbol: "zł", code: "PLN" }, "Russia": { symbol: "₽", code: "RUB" },
  "Ukraine": { symbol: "₴", code: "UAH" }, "Romania": { symbol: "lei", code: "RON" },
  "Bulgaria": { symbol: "лв", code: "BGN" }, "Hungary": { symbol: "Ft", code: "HUF" },
  "Czech Republic": { symbol: "Kč", code: "CZK" }, "Serbia": { symbol: "din", code: "RSD" },
  "Iceland": { symbol: "kr", code: "ISK" },
  "Germany": { symbol: "€", code: "EUR" }, "France": { symbol: "€", code: "EUR" },
  "Italy": { symbol: "€", code: "EUR" }, "Spain": { symbol: "€", code: "EUR" },
  "Netherlands": { symbol: "€", code: "EUR" }, "Belgium": { symbol: "€", code: "EUR" },
  "Austria": { symbol: "€", code: "EUR" }, "Portugal": { symbol: "€", code: "EUR" },
  "Greece": { symbol: "€", code: "EUR" }, "Finland": { symbol: "€", code: "EUR" },
  "Kazakhstan": { symbol: "₸", code: "KZT" }, "Uzbekistan": { symbol: "лв", code: "UZS" },
  "Azerbaijan": { symbol: "₼", code: "AZN" }, "Georgia": { symbol: "₾", code: "GEL" },
  "Armenia": { symbol: "֏", code: "AMD" },
  "Brazil": { symbol: "R$", code: "BRL" }, "Argentina": { symbol: "$", code: "ARS" },
  "Mexico": { symbol: "$", code: "MXN" }, "Colombia": { symbol: "$", code: "COP" },
  "Chile": { symbol: "$", code: "CLP" }, "Peru": { symbol: "S/.", code: "PEN" },
  "Venezuela": { symbol: "Bs.", code: "VES" }, "Bolivia": { symbol: "Bs.", code: "BOB" },
  "Paraguay": { symbol: "₲", code: "PYG" }, "Uruguay": { symbol: "$U", code: "UYU" },
  "Ecuador": { symbol: "$", code: "USD" }, "Dominican Republic": { symbol: "RD$", code: "DOP" },
  "Jamaica": { symbol: "J$", code: "JMD" }, "Trinidad and Tobago": { symbol: "TT$", code: "TTD" },
  "default": { symbol: "$", code: "USD" }
};

export default function GeneratePage() {
  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [condition, setCondition] = useState("New");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(currencyMap["default"]); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const getUserCurrency = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("country").eq("id", session.user.id).single();
        if (profile && profile.country) {
          const userCountry = profile.country.trim().toLowerCase();
          const matchedKey = Object.keys(currencyMap).find(key => key.toLowerCase() === userCountry);
          if (matchedKey) setCurrency(currencyMap[matchedKey]);
        }
      }
    };
    getUserCurrency();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const remainingSlots = 5 - imageFiles.length;
      if (remainingSlots <= 0) { toast.error("Max 5 photos!"); return; }
      const selectedFiles = files.slice(0, remainingSlots);
      const newPreviews = selectedFiles.map(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        return new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); });
      });
      Promise.all(newPreviews).then(newPreviewsResult => {
        setImageFiles(prev => [...prev, ...selectedFiles]);
        setImagePreviews(prev => [...prev, ...newPreviewsResult]);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageFiles.length === 0 || !title || !salePrice) {
      toast.error("Please fill in Title, Sale Price, and upload a Photo.");
      return;
    }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first."); setLoading(false); return; }

      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", session.user.id).single();
      const { count } = await supabase.from("listings").select("*", { count: 'exact', head: true }).eq("user_id", session.user.id).eq("status", "Available");
      
      if (profile?.plan === 'free' && (count || 0) >= 3) {
        toast.error("🚫 Free Plan Limit Reached! Upgrade to Pro for unlimited listings.");
        setLoading(false);
        router.push("/pricing");
        return;
      }

      const { data: userLoc } = await supabase.from("profiles").select("latitude, longitude, country").eq("id", session.user.id).single();
      const userLat = userLoc?.latitude || null;
      const userLng = userLoc?.longitude || null;

      const publicUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
        if (uploadError) { toast.error("Image upload failed."); setLoading(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        publicUrls.push(publicUrl);
      }

      // Ensure status matches visibility
      const finalStatus = isPublic ? "Available" : "Draft";

      const { error: dbError } = await supabase.from('listings').insert({
        user_id: session.user.id, 
        product_name: title, 
        image_url: publicUrls[0], 
        image_urls: publicUrls,
        ai_title: `${title} - ${condition}`, 
        ai_bullets: ["High Quality", "Fast Shipping", "Satisfaction Guaranteed"],
        ai_description: description, 
        cost_price: parseFloat(costPrice) || 0, 
        sale_price: parseFloat(salePrice) || 0,
        status: finalStatus, 
        is_public: isPublic, 
        latitude: userLat, 
        longitude: userLng, 
        is_pinned: false,
        currency_code: currency.code 
      });

      if (dbError) { 
        toast.error("Error saving listing: " + dbError.message); 
      } else { 
        // EXPLICIT SUCCESS POPUPS
        if (isPublic) {
          toast.success("🌍 Published to Public Marketplace!");
        } else {
          toast.success("💾 Saved to Drafts successfully!");
        }
        
        // 1.5 SECOND DELAY SO THE USER ACTUALLY SEES THE POPUP BEFORE REDIRECT
        setTimeout(() => {
          router.push("/my-listings");
        }, 1500);
      }
    } catch (error: any) { 
      toast.error("Something went wrong: " + error.message); 
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/my-listings" className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 w-fit">← Back</Link>
        <h1 className="text-3xl font-bold mb-2 text-blue-500">Create New Listing</h1>
        <p className="text-gray-400 mb-8">List your product in <span className="text-white font-bold">{currency.code}</span> ({currency.symbol}).</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-8 rounded-2xl border border-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Photos (Up to 5)</label>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
            {imagePreviews.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition">
                <span className="text-4xl mb-2">📷</span><span className="text-gray-400 font-medium">Click to upload photos</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-full h-32 bg-black rounded-xl overflow-hidden border border-gray-700">
                      <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-contain" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-bold">X</button>
                    </div>
                  ))}
                </div>
                {imageFiles.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-blue-500 hover:text-white transition">+ Add More Photos</button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Product Title (Required)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" placeholder="e.g. iPhone 13 Pro Max" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Sale Price ({currency.symbol}) *</label>
              <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Cost Price ({currency.symbol})</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-500 text-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg">
                <option value="Available">Available</option><option value="Sold">Sold</option><option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-lg">
              <option value="New">Brand New</option><option value="Used - Like New">Used - Like New</option><option value="Used - Good">Used - Good</option><option value="Used - Fair">Used - Fair</option>
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
            {loading ? (<><span className="animate-spin">⚙️</span> Processing...</>) : (<>{isPublic ? "🌍 Publish to Marketplace" : "💾 Save to Drafts"}</>)}
          </button>
        </form>
      </div>
    </main>
  );
}