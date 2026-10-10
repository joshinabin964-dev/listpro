"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, listings: 0, offers: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // Check if user is admin
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (!profile || !profile.is_admin) {
        alert("Access Denied: You are not an admin.");
        router.push("/dashboard");
        return;
      }

      // Fetch Stats
      const { count: userCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
      const { count: listingCount } = await supabase.from("listings").select("*", { count: 'exact', head: true });
      const { count: offerCount } = await supabase.from("offers").select("*", { count: 'exact', head: true });
      
      setStats({ users: userCount || 0, listings: listingCount || 0, offers: offerCount || 0 });

      // Fetch All Users
      const { data: allUsers } = await supabase.from("profiles").select("id, email, plan, is_admin, created_at").order("created_at", { ascending: false });
      if (allUsers) setUsers(allUsers);

      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_admin: !currentStatus }).eq("id", userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentStatus } : u));
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Verifying Admin Access...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">🔒 Secret Admin Panel</h1>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Users</h2>
            <div className="text-4xl font-bold text-blue-400">{stats.users}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Listings</h2>
            <div className="text-4xl font-bold text-purple-400">{stats.listings}</div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Offers Made</h2>
            <div className="text-4xl font-bold text-green-400">{stats.offers}</div>
          </div>
        </div>

        {/* User Management Table */}
        <h2 className="text-2xl font-bold mb-6">Registered Users</h2>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      {user.email}
                      {user.is_admin && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">ADMIN</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-400 capitalize">{user.plan || 'free'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {!user.is_admin && (
                        <button 
                          onClick={() => toggleAdmin(user.id, user.is_admin)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition"
                        >
                          Grant Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}