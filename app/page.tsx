import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition text-sm font-medium">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition text-sm font-medium">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition">Log In</button>
            </Link>
            <Link href="/login">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/50">Get Started Free</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-block px-4 py-1.5 mb-6 bg-blue-900/30 border border-blue-500/30 rounded-full">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">The Ultimate Seller's Command Center</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Stop Losing Money on <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Your Side Hustle.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          ListPro is the all-in-one platform to track your profits, generate SEO-optimized listings, and copy-paste them to Facebook, eBay, and more in one click.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/login">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition shadow-lg shadow-blue-900/50">
              Start Selling for Free
            </button>
          </Link>
          <Link href="/login">
            <button className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold rounded-xl transition border border-gray-700">
              View Demo
            </button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Top Flippers Choose ListPro</h2>
          <p className="text-gray-400 text-lg">Everything you need to manage your inventory and maximize profit.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-blue-500/50 transition duration-300">
            <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Real-Time Profit Tracker</h3>
            <p className="text-gray-400">Stop guessing. Track your cost price, sale price, and net profit automatically. Know exactly how much your hustle is making you.</p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-purple-500/50 transition duration-300">
            <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-xl font-bold mb-3">One-Click Platform Copy</h3>
            <p className="text-gray-400">Don't rewrite descriptions. Generate perfect listings and copy them formatted specifically for Facebook Marketplace, eBay, or standard use.</p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-green-500/50 transition duration-300">
            <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Public Marketplace & Inbox</h3>
            <p className="text-gray-400">Publish to the ListPro community marketplace. Manage buyer inquiries with our built-in inbox and quick-reply templates.</p>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-800">
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-3xl border border-gray-800 p-12 text-center">
          <h2 className="text-3xl font-bold mb-8">Built for Speed and Efficiency</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">10x</div>
              <div className="text-gray-400">Faster Listing Creation</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
              <div className="text-gray-400">Profit Visibility</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">0</div>
              <div className="text-gray-400">Platform Fees</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-24 text-center border-t border-gray-800">
        <h2 className="text-4xl font-bold mb-6">Ready to Professionalize Your Hustle?</h2>
        <p className="text-xl text-gray-400 mb-10">Join thousands of sellers who track their profits and list smarter.</p>
        <Link href="/login">
          <button className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-xl transition shadow-lg shadow-blue-900/50">
            Create Your Free Account
          </button>
        </Link>
        <p className="text-gray-500 text-sm mt-4">No credit card required. Free forever for starters.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ListPro</h1>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
          <div className="text-sm text-gray-500">
            © 2026 ListPro. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}