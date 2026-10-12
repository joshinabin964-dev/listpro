"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function OptimizerPage() {
  const [credits, setCredits] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("daraz");
  const [tone, setTone] = useState("professional");
  const [keywords, setKeywords] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", session.user.id).single();
      if (profile) setCredits(profile.credits || 0);
    };
    checkUser();
  }, [router]);

  // Simple inline CSV parser (no external libraries needed)
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = currentline[index] || "";
      });
      data.push(obj);
    }
    return { headers, data };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setProcessedData([]); // Reset previous data
    }
  };

  const handleProcess = async () => {
    if (!file) { toast.error("Please upload a CSV file first."); return; }
    if (credits < 1) { toast.error("Insufficient credits! Please top up."); router.push("/pricing"); return; }

    setIsProcessing(true);
    toast.loading("Processing your listings...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Read and parse the file
      const text = await file.text();
      const { data: rawData } = parseCSV(text);

      // 2. Apply Rule-Based Formatting (NO AI)
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k !== "");
      const formattedData = rawData.map((row: any, index: number) => {
        const baseName = row['Product Name'] || row['name'] || row['title'] || "Unknown Product";
        const baseDesc = row['Description'] || row['description'] || "High quality product.";
        
        let formattedTitle = baseName;
        let formattedDesc = baseDesc;

        // Apply Tone Rules
        if (tone === "urgent") {
          formattedTitle = `🔥 HOT DEAL: ${baseName}`;
          formattedDesc = `⚠️ LIMITED STOCK! ${baseDesc} Hurry, grab this deal before it's gone!`;
        } else if (tone === "minimalist") {
          formattedTitle = baseName.split(' ').slice(0, 6).join(' '); // Max 6 words
          formattedDesc = baseDesc.split('.').slice(0, 2).join('.') + '.'; // Max 2 sentences
        }

        // Apply Platform-Specific Rules
        if (platform === "daraz") {
          formattedTitle = `${formattedTitle} | ${keywordList.slice(0, 3).join(' ')}`.substring(0, 120);
          return { 
            name: formattedTitle, 
            short_description: formattedDesc.substring(0, 500),
            brand: row['brand'] || "Generic",
            sku: row['sku'] || `SKU-${index}`,
            price: row['price'] || "0"
          };
        } else if (platform === "shopify") {
          return {
            Handle: baseName.toLowerCase().replace(/\s+/g, '-'),
            Title: formattedTitle.substring(0, 255),
            "Body (HTML)": `<p>${formattedDesc}</p>`,
            Vendor: row['vendor'] || "My Store",
            Type: row['type'] || "General",
            Tags: keywordList.join(', ')
          };
        } else if (platform === "amazon") {
          formattedTitle = `${formattedTitle} - Premium Quality | ${keywordList.slice(0, 5).join(', ')}`.substring(0, 200);
          return {
            "item-name": formattedTitle,
            "bullet-point-1": `✅ ${formattedDesc.split('.')[0]}.`,
            "bullet-point-2": `✅ High-quality materials and durable construction.`,
            "price": row['price'] || "0.00"
          };
        } else {
          // Etsy / Default
          return {
            Title: formattedTitle.substring(0, 140),
            Description: formattedDesc,
            Tags: keywordList.slice(0, 13).join(', '), // Etsy max 13 tags
            Price: row['price'] || "0.00"
          };
        }
      });

      // 3. Deduct Credit & Log Transaction
      const newCredits = credits - 1;
      await supabase.from("profiles").update({ credits: newCredits }).eq("id", session.user.id);
      await supabase.from("credit_transactions").insert({
        user_id: session.user.id,
        amount: -1,
        action: `Processed ${formattedData.length} items for ${platform}`
      });

      setCredits(newCredits);
      setProcessedData(formattedData);
      toast.dismiss();
      toast.success(`Successfully processed ${formattedData.length} items! 1 credit used.`);

    } catch (error) {
      toast.dismiss();
      toast.error("Failed to process file. Check CSV format.");
      console.error(error);
    }
    setIsProcessing(false);
  };

  const handleExport = () => {
    if (processedData.length === 0) return;
    const headers = Object.keys(processedData[0]);
    const csvContent = [
      headers.join(','),
      ...processedData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `optimized_${platform}_listings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV downloaded successfully!");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro Optimizer</h1></Link>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 font-bold flex items-center gap-2">
              ⚡ {credits} Credits
            </div>
            <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Back to Dashboard</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bulk Listing Optimizer</h1>
          <p className="text-gray-400 text-lg">Upload your raw CSV. Get platform-perfect listings in seconds. No AI, just pure, rule-based precision.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* 1. Upload */}
          <div className="md:col-span-1 bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-white">1. Upload CSV</h3>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition">
              <span className="text-3xl mb-2">📁</span>
              <span className="text-gray-400 text-sm font-medium text-center px-4">{file ? file.name : "Click to upload .csv"}</span>
            </div>
          </div>

          {/* 2. Settings */}
          <div className="md:col-span-2 bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="text-lg font-bold mb-2 text-white">2. Optimization Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                <option value="daraz">Daraz (Short titles, specific columns)</option>
                <option value="shopify">Shopify (HTML body, handles, tags)</option>
                <option value="amazon">Amazon (200 char titles, bullet points)</option>
                <option value="etsy">Etsy (140 char titles, 13 tags max)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Brand Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                  <option value="professional">Professional (Clean, formal)</option>
                  <option value="urgent">Urgent (Emojis, "Hot Deal", scarcity)</option>
                  <option value="minimalist">Minimalist (Short, punchy, under 50 chars)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">SEO Keywords (comma separated)</label>
                <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. wireless, waterproof, 2024" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <button onClick={handleProcess} disabled={isProcessing || !file} className="w-full mt-4 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
              {isProcessing ? "⚙️ Processing..." : `⚡ Process & Deduct 1 Credit`}
            </button>
          </div>
        </div>

        {/* 3. Results */}
        {processedData.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">3. Preview & Export ({processedData.length} items)</h3>
              <button onClick={handleExport} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition flex items-center gap-2">
                📥 Export {platform.toUpperCase()} CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-800 text-gray-400 uppercase text-xs sticky top-0">
                  <tr>
                    {Object.keys(processedData[0]).map((header, i) => (
                      <th key={i} className="px-6 py-3 whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {processedData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-800/50">
                      {Object.values(row).map((cell: any, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-3 text-gray-300 max-w-xs truncate" title={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {processedData.length > 5 && (
                <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-800">
                  Showing first 5 of {processedData.length} rows. Export to see all.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}