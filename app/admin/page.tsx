"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [listingsMap, setListingsMap] = useState<any>({});
  const [usersMap, setUsersMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // SECURITY: Replace with your actual admin email before launch!
      const adminEmails = ["your-email@example.com"]; 
      
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", session.user.id).single();
      
      // TEMPORARY: Allowing access for testing. Uncomment the line below for production:
      // if (!adminEmails.includes(profile?.email)) { router.push("/dashboard"); toast.error("Access Denied"); return; }

      fetchReports();
    };
    checkAdmin();
  }, [router]);

  const fetchReports = async () => {
    setLoading(true);
    const { data: reportsData } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    
    if (reportsData && reportsData.length > 0) {
      const listingIds = [...new Set(reportsData.map((r: any) => r.reported_listing_id).filter(Boolean))];
      const userIds = [...new Set(reportsData.map((r: any) => r.reported_user_id).filter(Boolean))];

      let listingsData: any[] = [];
      let usersData: any[] = [];

      if (listingIds.length > 0) {
        const { data } = await supabase.from("listings").select("id, product_name, status, image_url").in("id", listingIds);
        listingsData = data || [];
      }
      if (userIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name, is_banned").in("id", userIds);
        usersData = data || [];
      }

      const lMap: any = {};
      listingsData.forEach((l: any) => { lMap[l.id] = l; });
      
      const uMap: any = {};
      usersData.forEach((u: any) => { uMap[u.id] = u; });

      setListingsMap(lMap);
      setUsersMap(uMap);
      setReports(reportsData);
    } else {
      setReports([]);
    }
    setLoading(false);
  };

  const handleHideListing = async (listingId: string) => {
    const { error } = await supabase.from("listings").update({ status: "Hidden" }).eq("id", listingId);
    if (!error) {
      toast.success("Listing hidden successfully.");
      fetchReports();
    } else {
      toast.error("Failed to hide listing.");
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to ban this user? This is irreversible.")) return;
    const { error } = await supabase.from("profiles").update({ is_banned: true }).eq("id", userId);
    if (!error) {
      toast.success("User banned successfully.");
      fetchReports();
    } else {
      toast.error("Failed to ban user.");
    }
  };

  const handleDismissReport = async (reportId: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (!error) {
      toast.success("Report dismissed.");
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white"><p>Loading Admin Panel...</p></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard"><h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Admin Panel</h1></Link>
          <Link href="/dashboard"><button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">Back to Dashboard</button></Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Moderation Queue</h1>
        <p className="text-gray-400 text-lg mb-8">Review reports, hide malicious listings, and ban bad actors.</p>

        {reports.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800 border-dashed">
            <p className="text-2xl text-gray-400 mb-2">All clear! 🎉</p>
            <p className="text-gray-500">No pending reports to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const listing = listingsMap[report.reported_listing_id] || { product_name: "Unknown Listing", status: "Unknown" };
              const user = usersMap[report.reported_user_id] || { full_name: "Unknown User", is_banned: false };

              return (
                <div key={report.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full uppercase border border-red-500/30">
                        {report.reason}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{listing.product_name}</h3>
                    <p className="text-sm text-gray-400">Reported User: <span className="text-gray-300">{user.full_name}</span> {user.is_banned && <span className="text-red-400 font-bold ml-2">(BANNED)</span>}</p>
                    <p className="text-xs text-gray-500 mt-1">Listing Status: {listing.status}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {listing.status !== "Hidden" && listing.status !== "Sold" && (
                      <button 
                        onClick={() => handleHideListing(report.reported_listing_id)}
                        className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white border border-yellow-600/30 rounded-xl text-sm font-bold transition"
                      >
                        Hide Listing
                      </button>
                    )}
                    {!user.is_banned && (
                      <button 
                        onClick={() => handleBanUser(report.reported_user_id)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 rounded-xl text-sm font-bold transition"
                      >
                        Ban User
                      </button>
                    )}
                    <button 
                      onClick={() => handleDismissReport(report.id)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 rounded-xl text-sm font-bold transition"
                    >
                      Dismiss Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}