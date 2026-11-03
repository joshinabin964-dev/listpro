"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [fullName, setFullName] = useState("");
  
  // 🔥 NEW: Location State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setUser(session.user);
      
      // Fetch current profile
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
        // 🔥 Load saved location
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
      }
    };
    getProfile();
  }, [router]);

  // 🔥 THE UPLOAD MAGIC (Added upsert: true for safety)
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true }); // 🔥 Added upsert to prevent overwrite errors

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // 3. Update the database
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
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 🔥 NEW: GET CURRENT LOCATION
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        // Save to database
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            latitude: lat,
            longitude: lng,
            updated_at: new Date().toISOString()
          });

        if (error) {
          toast.error('Failed to save location');
        } else {
          toast.success('Location saved successfully! 📍');
        }
        setLocationLoading(false);
      },
      (error) => {
        toast.error('Unable to retrieve location: ' + error.message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
    else toast.success('Name updated!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return <div className="p-10 text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <nav className="border-b border-gray-800 bg-gray-950 p-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/dashboard" className="text-blue-400">← Back</Link>
        <h1 className="text-xl font-bold">Profile Settings</h1>
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
                <span className="text-4xl font-bold text-gray-500">
                  {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Upload Button Overlay */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-2 rounded-full shadow-lg transition disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              accept="image/*"
              onChange={uploadAvatar}
              className="hidden"
            />
          </div>
          <p className="text-sm text-gray-400">Tap the camera icon to upload a photo</p>
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

        {/* 🔥 NEW: LOCATION SECTION */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">Your Location</label>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            {latitude && longitude ? (
              <div className="space-y-2">
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Location saved & active
                </p>
                <p className="text-xs text-gray-500">Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}</p>
                <button 
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-2"
                >
                  {locationLoading ? 'Updating...' : '🔄 Update Location'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-gray-400 text-center">Enable location to show up in "Sellers Near Me"</p>
                <button 
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {locationLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  )}
                  {locationLoading ? 'Getting Location...' : 'Get Current Location'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ACCOUNT INFO */}
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 space-y-2">
          <p className="text-xs text-gray-500">Email Address</p>
          <p className="text-white font-medium">{user.email}</p>
        </div>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="w-full bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 py-4 rounded-2xl font-bold transition mt-8"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}