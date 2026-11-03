"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setUser(session.user);
      
      // Fetch current profile
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();
        
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    getProfile();
  }, [router]);

  // 🔥 THE AVATAR UPLOAD MAGIC
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Please select an image.');
      }

      const file = event.target.files[0];
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image must be less than 2MB.');
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // 3. Update the database profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          avatar_url: publicUrl,
          full_name: fullName,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;
      
      toast.success('Profile picture updated! 📸');
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || 'Failed to upload image. Check storage setup.');
    } finally {
      setUploading(false);
    }
  };

  const updateName = async () => {
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        full_name: fullName,
        updated_at: new Date().toISOString()
      });
      
    if (error) toast.error('Failed to update name');
    else toast.success('Name updated successfully!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      Loading profile...
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 font-medium">← Back</Link>
        <h1 className="text-lg font-bold">Profile Settings</h1>
        <div className="w-10"></div>
      </nav>

      <div className="max-w-md mx-auto p-6 space-y-8">
        
        {/* 🔥 AVATAR UPLOAD SECTION */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center overflow-hidden shadow-2xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-gray-400">
                  {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
            
            {/* Upload Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-2.5 rounded-full shadow-lg border-2 border-gray-950 transition disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              )}
            </button>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={uploadAvatar}
              className="hidden"
            />
          </div>
          <p className="text-sm text-gray-400">Tap the camera icon to change photo</p>
        </div>

        {/* NAME EDIT SECTION */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition"
            />
            <button 
              onClick={updateName}
              className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold transition"
            >
              Save
            </button>
          </div>
        </div>

        {/* ACCOUNT INFO */}
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-2">
          <p className="text-xs text-gray-500">Email Address</p>
          <p className="text-white font-medium break-all">{user.email}</p>
        </div>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="w-full bg-red-900/20 border border-red-900/50 text-red-400 hover:bg-red-900/40 py-4 rounded-2xl font-bold transition mt-8"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}