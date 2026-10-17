"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reports" | "users">("reports");
  
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setCurrentUser(session.user);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchData = async () => {
    // Fetch Reports with joined data
    const { data: reportsData } = await supabase
      .from("reports")
      .select(`
        id, reason, status, created_at,
        listing:listings!reported_listing_id (id, product_name, image_url),
        reporter:profiles!reporter_id (full_name),
        reported_user:profiles!reported_user_id (id, full_name, is_verified)
      `)
      .order("created_at", { ascending: false });

    if (reportsData) setReports(reportsData);

    // Fetch Users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, full_name, country, plan, is_verified")
      .order("created_at", { ascending: false });

    if (usersData) setUsers(usersData);
  };

  const handleDeleteListing = async (reportId: string, listingId: string) => {
    if (!confirm("Are you sure? This will permanently delete the listing and mark the report as resolved.")) return;
    setProcessingId(reportId);
    
    // 1. Delete listing
    await supabase.from("listings").delete().eq("id", listingId);
    // 2. Mark report as resolved
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    
    toast.success("Listing deleted and report resolved.");
    fetchData();
    setProcessingId(null);
  };

  const handleDismissReport = async (reportId: string) => {
    setProcessingId(reportId);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Report dismissed.");
    fetchData();
    setProcessingId(null);
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    setProcessingId(userId);
    const newStatus = !currentStatus;
    await supabase.from("profiles").update({ is_verified: newStatus }).eq("id", userId);
    toast.success(newStatus ? "User verified! ✅" : "Verification removed.");
    fetchData();
    setProcessingId(null);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading Admin Dashboard...</p></main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Margin Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Safety & Moderation Dashboard</p>
          </div>
          <Link href="/marketplace">
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">← Back to App</button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button 
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-3 text-sm font-bold transition border-b-2 ${activeTab === "reports" ? "border-red-500 text-red-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            🚩 Reported Listings ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-sm font-bold transition border-b-2 ${activeTab === "users" ? "border-green-500 text-green-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            ✅ User Management
          </button>
        </div>

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {reports.filter(r => r.status === 'pending').length === 0 ? (
              <div className="p-12 text-center bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
                <p className="text-gray-400 text-lg">🎉 No pending reports. The community is safe!</p>
              </div>
            ) : (
              reports.filter(r => r.status === 'pending').map((report) => (
                <div key={report.id} className="bg-gray-900 p-6 rounded-2xl border border-red-500/20 flex flex-col md:flex-row gap-6 items-start">
                  {report.listing?.image_url && (
                    <img src={report.listing.image_url} alt="Reported" className="w-24 h-24 object-cover rounded-xl border border-gray-700" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded uppercase">{report.reason}</span>
                      <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{report.listing?.product_name || "Deleted Listing"}</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Reported by: <span className="text-gray-300">{report.reporter?.full_name || "Unknown"}</span> • 
                      Seller: <span className="text-gray-300">{report.reported_user?.full_name || "Unknown"}</span>
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleDeleteListing(report.id, report.listing?.id)} 
                        disabled={processingId === report.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white text-sm font-bold rounded-lg transition"
                      >
                        {processingId === report.id ? "..." : "🗑️ Delete Listing & Resolve"}
                      </button>
                      <button 
                        onClick={() => handleDismissReport(report.id)} 
                        disabled={processingId === report.id}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-lg transition"
                      >
                        Dismiss (False Alarm)
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Resolved Reports History (Collapsed by default visually, but shown for context) */}
            {reports.filter(r => r.status === 'resolved').length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Recently Resolved</h3>
                <div className="space-y-2 opacity-50">
                  {reports.filter(r => r.status === 'resolved').slice(0, 3).map((report) => (
                    <div key={report.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                      <span className="text-sm text-gray-400">{report.listing?.product_name || "Deleted"}</span>
                      <span className="text-xs text-green-400 font-bold">✅ Resolved</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{user.full_name || "Anonymous"}</div>
                      <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4 text-gray-300">{user.country || "Unknown"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.plan === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                        {user.plan?.toUpperCase() || "FREE"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleToggleVerify(user.id, user.is_verified)}
                        disabled={processingId === user.id}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition border ${
                          user.is_verified 
                            ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" 
                            : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
                        }`}
                      >
                        {processingId === user.id ? "..." : (user.is_verified ? "✅ Verified (Click to Remove)" : "Mark as Verified")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}