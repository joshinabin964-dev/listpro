"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function OptimizerPage() {
  const [credits, setCredits] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    productName: "", description: "", price: "", brand: "", sku: ""
  });
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

  // BULLETPROOF CSV PARSER
  const parseCSV = (text: string) => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (inQuotes) {
        if (char === '"' && nextChar === '"') { cell += '"'; i++; } 
        else if (char === '"') { inQuotes = false; } 
        else { cell += char; }
      } else {
        if (char === '"') { inQuotes = true; } 
        else if (char === ',') { row.push(cell.trim()); cell = ''; } 
        else if (char === '\n' || char === '\r') {
          row.push(cell.trim());
          if (row.length > 0 && !(row.length === 1 && row[0] === '')) result.push(row);
          row = []; cell = '';
          if (char === '\r' && nextChar === '\n') i++;
        } else { cell += char; }
      }
    }
    if (cell !== '' || row.length > 0) { row.push(cell.trim()); result.push(row); }
    if (result.length === 0) return { headers: [], data: [] };
    const headers = result[0];
    const data = result.slice(1).map(r => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ''; });
      return obj;
    });
    return { headers, data };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setProcessedData([]);
      
      // Read headers immediately to populate mapping dropdowns
      uploadedFile.text().then(text => {
        const { headers } = parseCSV(text);
        setCsvHeaders(headers);
        
        // Auto-guess mappings to save the user time
        const guess = (keywords: string[]) => headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || "";
        setColumnMapping({
          productName: guess(['name', 'title', 'product']),
          description: guess(['desc', 'description']),
          price: guess(['price', 'cost', 'mrp']),
          brand: guess(['brand', 'vendor', 'manufacturer']),
          sku: guess(['sku', 'code', 'id'])
        });
      });
    }
  };

  const handleProcess = async () => {
    if (!file) { toast.error("Please upload a CSV file first."); return; }
    if (!columnMapping.productName) { toast.error("Please map the 'Product Name' column."); return; }
    if (credits < 1) { toast.error("Insufficient credits! Please top up."); router.push("/pricing"); return; }

    setIsProcessing(true);
    toast.loading("Processing your listings...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const text = await file.text();
      const { data: rawData } = parseCSV(text);
      if (rawData.length === 0) { toast.error("CSV file is empty."); setIsProcessing(false); toast.dismiss(); return; }

      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k !== "");
      
      const formattedData = rawData.map((row: any, index: number) => {
        // USE MAPPED COLUMNS!
        const baseName = row[columnMapping.productName] || "Unknown Product";
        const baseDesc = row[columnMapping.description] || "High quality product.";
        const basePrice = row[columnMapping.price] || "0";
        const baseBrand = row[columnMapping.brand] || "Generic";
        const baseSku = row[columnMapping.sku] || `SKU-${index}`;

        let formattedTitle = baseName;
        let formattedDesc = baseDesc;

        if (tone === "urgent") {
          formattedTitle = ` HOT DEAL: ${baseName}`;
          formattedDesc = `⚠️ LIMITED STOCK! ${baseDesc} Hurry, grab this deal before it's gone!`;
        } else if (tone === "minimalist") {
          formattedTitle = baseName.split(' ').slice(0, 6).join(' ');
          formattedDesc = baseDesc.split('.').slice(0, 2).join('.') + '.';
        }

        if (platform === "daraz") {
          formattedTitle = `${formattedTitle} | ${keywordList.slice(0, 3).join(' ')}`.substring(0, 120);
          return { name: formattedTitle, short_description: formattedDesc.substring(0, 500), brand: baseBrand, sku: baseSku, price: basePrice };
        } else if (platform === "shopify") {
          return { Handle: baseName.toLowerCase().replace(/\s+/g, '-'), Title: formattedTitle.substring(0, 255), "Body (HTML)": `<p>${formattedDesc}</p>`, Vendor: baseBrand, Type: "General", Tags: keywordList.join(', ') };
        } else if (platform === "amazon") {
          formattedTitle = `${formattedTitle} - Premium Quality | ${keywordList.slice(0, 5).join(', ')}`.substring(0, 200);
          return { "item-name": formattedTitle, "bullet-point-1": `✅ ${formattedDesc.split('.')[0]}.`, "bullet-point-2": `✅ High-quality materials and durable construction.`, price: basePrice };
        } else {
          return { Title: formattedTitle.substring(0, 140), Description: formattedDesc, Tags: keywordList.slice(0, 13).join(', '), Price: basePrice };
        }
      });

      const newCredits = credits - 1;
      await supabase.from("profiles").update({ credits: newCredits }).eq("id", session.user.id);
      await supabase.from("credit_transactions").insert({ user_id: session.user.id, amount: -1, action: `Processed ${formattedData.length} items for ${platform}` });

      setCredits(newCredits);
      setProcessedData(formattedData);
      toast.dismiss();
      toast.success(`Successfully processed ${formattedData.length} items! 1 credit used.`);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to process file.");
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
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 font-bold flex items-center gap-2">⚡ {credits} Credits</div>
            <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Back to Dashboard</button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bulk Listing Optimizer</h1>
          <p className="text-gray-400 text-lg">Upload your raw CSV. Map your columns. Get platform-perfect listings in seconds.</p>
        </div>

        <div className="space-y-6">
          {/* 1. Upload */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-white">1. Upload CSV</h3>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition">
              <span className="text-3xl mb-2">📁</span>
              <span className="text-gray-400 text-sm font-medium">{file ? file.name : "Click to upload .csv"}</span>
            </div>
          </div>

          {/* 2. Map Columns (NEW!) */}
          {csvHeaders.length > 0 && (
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <h3 className="text-lg font-bold mb-4 text-white">2. Map Your Columns</h3>
              <p className="text-sm text-gray-400 mb-4">Tell us which columns in your CSV match our required fields.</p>
              <div className="grid md:grid-cols-3 gap-4">
                {['productName', 'description', 'price', 'brand', 'sku'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-400 mb-2 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()} *</label>
                    <select 
                      value={columnMapping[field]} 
                      onChange={(e) => setColumnMapping({...columnMapping, [field]: e.target.value})}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Settings */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-white">3. Optimization Settings</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Target Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                  <option value="daraz">Daraz</option><option value="shopify">Shopify</option><option value="amazon">Amazon</option><option value="etsy">Etsy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Brand Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                  <option value="professional">Professional</option><option value="urgent">Urgent</option><option value="minimalist">Minimalist</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">SEO Keywords</label>
                <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="wireless, waterproof" className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <button onClick={handleProcess} disabled={isProcessing || !file} className="w-full p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
              {isProcessing ? "⚙️ Processing..." : `⚡ Process & Deduct 1 Credit`}
            </button>
          </div>

          {/* 4. Results */}
          {processedData.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">4. Preview & Export ({processedData.length} items)</h3>
                <button onClick={handleExport} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition flex items-center gap-2"> Export {platform.toUpperCase()} CSV</button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-800 text-gray-400 uppercase text-xs sticky top-0">
                    <tr>{Object.keys(processedData[0]).map((header, i) => <th key={i} className="px-6 py-3 whitespace-nowrap">{header}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {processedData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-800/50">
                        {Object.values(row).map((cell: any, cellIndex) => <td key={cellIndex} className="px-6 py-3 text-gray-300 max-w-xs truncate" title={cell}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}