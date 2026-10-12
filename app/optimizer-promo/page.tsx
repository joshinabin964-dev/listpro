import Link from "next/link";

export default function OptimizerPromoPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* NAVBAR */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/"><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1></Link>
          <div className="flex items-center gap-4">
            <Link href="/optimizer" className="text-sm font-bold text-gray-300 hover:text-white transition">App Login</Link>
            <Link href="/login">
              <button className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">
                Get 5 Free Credits
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Trusted by 500+ E-commerce Sellers
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Stop Wasting Hours <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Formatting CSVs.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your messy supplier file once. Instantly export platform-perfect listings for <span className="text-white font-bold">Amazon, eBay, Walmart, Shopify, and Etsy</span> in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition shadow-2xl shadow-blue-900/50 hover:scale-105 transform">
                Start Optimizing for Free ⚡
              </button>
            </Link>
            <Link href="#how-it-works">
              <button className="px-8 py-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-lg font-bold rounded-xl transition">
                See How It Works
              </button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">No credit card required. Get 5 free credits on signup.</p>
        </div>
      </section>

      {/* PLATFORM LOGOS */}
      <section className="py-10 border-y border-gray-900 bg-gray-950/50">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">Optimized for the World's Biggest Marketplaces</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-2xl font-bold text-white">Amazon</span>
            <span className="text-2xl font-bold text-white">eBay</span>
            <span className="text-2xl font-bold text-white">Walmart</span>
            <span className="text-2xl font-bold text-white">Shopify</span>
            <span className="text-2xl font-bold text-white">Etsy</span>
          </div>
        </div>
      </section>

      {/* PAIN POINTS / WHY US */}
      <section className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Serious Sellers Choose ListPro</h2>
            <p className="text-gray-400 text-lg">We don't use AI to guess. We use deterministic rules to guarantee perfection.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">🎯</div>
              <h3 className="text-xl font-bold mb-3">Zero AI Hallucinations</h3>
              <p className="text-gray-400">AI makes up fake specs and weird formatting. Our rule-based engine does exactly what you tell it, every single time. 100% reliable.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">️</div>
              <h3 className="text-xl font-bold mb-3">Visual Column Mapping</h3>
              <p className="text-gray-400">Supplier sent a messy CSV with weird headers? No problem. Map your columns visually in 2 seconds. Works with any file.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-green-500/50 transition group">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">⚡</div>
              <h3 className="text-xl font-bold mb-3">1-Click Bulk Upload</h3>
              <p className="text-gray-400">We automatically pass through your Image URLs, Stock Quantities, and SKUs. Export and upload directly to your store.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From Messy CSV to Live Listing in 3 Steps</h2>
          </div>
          
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <span className="text-6xl font-black text-gray-800">01</span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Upload Your Raw File</h3>
                <p className="text-gray-400">Drag and drop your supplier's CSV. Our bulletproof parser handles commas, quotes, and messy formatting instantly.</p>
              </div>
              <div className="hidden md:block text-4xl text-gray-700">→</div>
              <div className="flex-1 bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <span className="text-6xl font-black text-gray-800">02</span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Map & Configure</h3>
                <p className="text-gray-400">Select your target platform (e.g., Amazon), choose your tone, and map your columns. Save it as a preset for next time!</p>
              </div>
              <div className="hidden md:block text-4xl text-gray-700">→</div>
              <div className="flex-1 bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <span className="text-6xl font-black text-gray-800">03</span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Export & Upload</h3>
                <p className="text-gray-400">Download a perfectly formatted CSV ready for 1-click upload to your store. Watch the live progress bar as it processes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING / CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-950 to-blue-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Pay Only For What You Process.</h2>
          <p className="text-xl text-gray-400 mb-10">No bloated monthly subscriptions. Buy credits, process your files, and scale your business.</p>
          
          <div className="bg-gray-900 p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md mx-auto">
            <h3 className="text-2xl font-bold mb-2">Pay-As-You-Go</h3>
            <div className="text-5xl font-black text-blue-400 my-6">$0.10 <span className="text-lg text-gray-500 font-normal">/ listing</span></div>
            <ul className="text-left space-y-4 mb-8 text-gray-300">
              <li className="flex items-center gap-3"><span className="text-green-400">✓</span> 5 Free Credits on Signup</li>
              <li className="flex items-center gap-3"><span className="text-green-400">✓</span> All 5 Global Platforms Included</li>
              <li className="flex items-center gap-3"><span className="text-green-400">✓</span> Unlimited Saved Presets</li>
              <li className="flex items-center gap-3"><span className="text-green-400">✓</span> Visual Column Mapping</li>
            </ul>
            <Link href="/login">
              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition shadow-lg shadow-blue-900/50">
                Claim Your 5 Free Credits
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-12 px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</div>
          <p className="text-gray-500 text-sm">© 2026 ListPro. Built for serious e-commerce sellers.</p>
          <div className="flex gap-6">
            <Link href="/optimizer" className="text-sm text-gray-400 hover:text-white transition">App Login</Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition">Consumer Marketplace</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}