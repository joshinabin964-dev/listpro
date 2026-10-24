import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nabjo</h1>
          <div className="flex items-center gap-4">
            <Link href="/login"><button className="px-4 py-2 text-gray-300 hover:text-white text-sm font-bold transition hidden sm:block">Log In</button></Link>
            <Link href="/login"><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">Get Started</button></Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-4 py-1.5 mb-6 bg-gray-800/50 border border-gray-700 rounded-full text-sm font-medium text-blue-400">
            🛡️ The World's First Scam-Proof Marketplace
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Stop Selling Blind. <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Start Selling Smart.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            From AI-powered price gauges to QR-code verified handoffs, Nabjo gives you the tools to sell safely, negotiate fairly, and scale your inventory like a pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition shadow-xl shadow-blue-900/50">
                Start Selling for Free
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold rounded-xl transition border border-gray-700">
                Browse Marketplace
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* SAFETY FEATURES SECTION */}
      <section className="py-24 bg-gray-900/30 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Unmatched Safety & Trust</h2>
            <p className="text-gray-400 text-lg">We built features that Facebook Marketplace and eBay simply don't have.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Safe Handoff QR */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-green-500/50 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🛡️</div>
              <h3 className="text-xl font-bold mb-3 text-white">Safe Handoff QR Codes</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Meet in person? Generate a secure QR code. Scanning it instantly marks the item as SOLD and verifies both accounts. Zero scams.</p>
            </div>

            {/* Live Capture */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-red-500/50 transition group">
              <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📹</div>
              <h3 className="text-xl font-bold mb-3 text-white">Nabjo Live Capture</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Listings require live video with burned-in watermarks. No more stolen photos or fake listings.</p>
            </div>

            {/* Chat Scam Shield */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-yellow-500/50 transition group">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🤖</div>
              <h3 className="text-xl font-bold mb-3 text-white">AI Chat Scam Shield</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Our system automatically blocks messages mentioning WhatsApp, Zelle, or CashApp. Keep transactions safe on-platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* POWER SELLER TOOLS SECTION */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tools for Serious Sellers</h2>
            <p className="text-gray-400 text-lg">Scale your business with enterprise-grade features.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Bulk Optimizer */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-orange-500/50 transition group">
              <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition"></div>
              <h3 className="text-xl font-bold mb-3 text-white">Bulk Listing Optimizer</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Format CSVs for Daraz, Shopify, Amazon & Etsy. Upload and optimize dozens of items in seconds.</p>
            </div>

            {/* Live Auctions */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-pink-500/50 transition group">
              <div className="w-14 h-14 bg-pink-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🔨</div>
              <h3 className="text-xl font-bold mb-3 text-white">Live Auctions & Bidding</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Let buyers compete for your items. Drive up prices naturally with real-time bidding wars.</p>
            </div>

            {/* AI Price Gauge */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-cyan-500/50 transition group">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📊</div>
              <h3 className="text-xl font-bold mb-3 text-white">AI Fair Price Gauge</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Never underprice again. Our AI analyzes market data to suggest the perfect selling price.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MANAGEMENT & COMMUNITY SECTION */}
      <section className="py-24 bg-gray-900/30 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Control</h2>
            <p className="text-gray-400 text-lg">Everything you need to manage your marketplace presence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition">
              <div className="text-2xl mb-4"></div>
              <h3 className="text-lg font-bold mb-2">Unified Inbox</h3>
              <p className="text-gray-400 text-xs">Manage all buyer messages in one place. Never miss a sale.</p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition">
              <div className="text-2xl mb-4"></div>
              <h3 className="text-lg font-bold mb-2">24-Hour Reserve</h3>
              <p className="text-gray-400 text-xs">Lock items for serious buyers. Stop sellers from flaking.</p>
            </div>

            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition">
              <div className="text-2xl mb-4">❤️</div>
              <h3 className="text-lg font-bold mb-2">Saved Items</h3>
              <p className="text-gray-400 text-xs">Track deals you love. Get notified when prices drop.</p>
            </div>

            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition">
              <div className="text-2xl mb-4"></div>
              <h3 className="text-lg font-bold mb-2">Verified Profiles</h3>
              <p className="text-gray-400 text-xs">Build trust with portable reputation badges.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 to-blue-950/20 -z-10"></div>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to upgrade your selling game?</h2>
          <p className="text-xl text-gray-400 mb-10">Join the safest, smartest marketplace on the internet. No fees. No scams. Just sales.</p>
          <Link href="/login">
            <button className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl transition shadow-2xl shadow-purple-900/50 transform hover:scale-105">
              Create Your Free Account
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Nabjo. Built for serious sellers.</p>
      </footer>
    </main>
  );
}