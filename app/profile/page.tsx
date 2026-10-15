"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    country: "",
    phone: "",
    bio: ""
  });
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, country, phone, bio")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setFormData({
          full_name: data.full_name || "",
          country: data.country || "",
          phone: data.phone || "",
          bio: data.bio || ""
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name.trim(),
        country: formData.country.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim()
      })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Failed to save profile: " + error.message);
    } else {
      toast.success("Profile updated successfully! 🎉");
      router.refresh(); 
    }
    setSaving(false);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading Profile...</p></main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">My Profile</h1>
          <Link href="/dashboard">
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Seller Information</h2>
          <p className="text-gray-400 mb-8 text-sm">This information will be displayed on your public listings to build trust with buyers.</p>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Full Name / Store Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 transition"
                placeholder="e.g. John Doe or Tech Store"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Country *</label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 transition"
                placeholder="e.g. Nepal, USA, UK, India, Australia..."
              />
              <p className="text-xs text-gray-500 mt-1">This determines the currency symbol shown on your listings.</p>
            </div>

            {/* Phone Number - GLOBAL FORMAT */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number (Optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 transition"
                placeholder="e.g. +1 234 567 8900 or +44 20 1234 5678"
              />
              <p className="text-xs text-gray-500 mt-1">Include your country code (e.g. +1, +44, +91, +977)</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Seller Bio (Optional)</label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 transition resize-none"
                placeholder="Tell buyers a little about yourself or your store..."
              />
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full p-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl transition disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">️</span> Saving...
                  </>
                ) : (
                  "💾 Save Profile"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}