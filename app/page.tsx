import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1>
          <div className="flex items-center gap-4">
            <Link href="/login"><button className="px-4 py-2 text-gray-300 hover:text-white text-sm font-bold transition">Log In</button></Link>
            <Link href="/login"><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">Get Started</button></Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-4 py-1.5 mb-6 bg-gray-800/50 border border-gray-700 rounded-full text-sm font-medium text-blue-400">
            🚀 The Ultimate Seller's Command Center
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Stop Selling Blind. <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Start Selling Smart.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Track your profits, generate professional listings in seconds, and connect with local buyers. ListPro is the modern marketplace for serious flippers.
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

      {/* Features Grid */}
      <section className="py-24 bg-gray-900/30 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Top Sellers Choose ListPro</h2>
            <p className="text-gray-400 text-lg">Built for speed, trust, and maximum profit.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📍</div>
              <h3 className="text-xl font-bold mb-3 text-white">Local GPS Matching</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Buyers only see items within 50 miles. No more wasted time on items across the country.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📸</div>
              <h3 className="text-xl font-bold mb-3 text-white">Multi-Photo Uploads</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Show up to 5 high-quality angles per item. Build instant trust with your buyers.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-green-500/50 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">💰</div>
              <h3 className="text-xl font-bold mb-3 text-white">Make an Offer</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Built-in negotiation. Buyers can send offers, and you can Accept or Decline with one click.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-yellow-500/50 transition group">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🔔</div>
              <h3 className="text-xl font-bold mb-3 text-white">Real-Time Alerts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Never miss a sale. Get instant in-app notifications when someone messages you or makes an offer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to upgrade your selling game?</h2>
          <p className="text-xl text-gray-400 mb-10">Join hundreds of smart sellers tracking profits and closing deals faster.</p>
          <Link href="/login">
            <button className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl transition shadow-2xl shadow-purple-900/50">
              Create Your Free Account
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} ListPro. Built for serious sellers.</p>
      </footer>
    </main>
  );
}