"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Profile States
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setUser(session.user);
      
      // Fetch profile data
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone_number, country, avatar_url, latitude, longitude")
        .eq("id", session.user.id)
        .single();
        
      if (data) {
        setFullName(data.full_name || "");
        setPhoneNumber(data.phone_number || "");
        setCountry(data.country || "");
        setAvatarUrl(data.avatar_url || "");
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
      }
    };
    getProfile();
  }, [router]);

  // 🔥 AVATAR UPLOAD
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);

      // Save avatar URL to DB
      await supabase.from('profiles').upsert({ 
        id: user.id, 
        avatar_url: publicUrl
      });
      
      toast.success('Profile picture updated! 📸');
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 🔥 SAVE NAME, PHONE, COUNTRY
  const saveDetails = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      full_name: fullName,
      phone_number: phoneNumber,
      country: country
    });
    
    if (error) toast.error('Failed to save details: ' + error.message);
    else toast.success('Profile details saved! ✅');
    setSaving(false);
  };

  // 🔥 GET CURRENT LOCATION
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

        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          latitude: lat,
          longitude: lng
        });

        if (error) {
          console.error("Location save error:", error);
          toast.error('Failed to save location: ' + error.message);
        } else {
          toast.success('Location saved successfully! 📍');
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error('Unable to retrieve location: ' + error.message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return <div className="p-10 text-white text-center">Loading profile...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      <nav className="border-b border-gray-800 bg-gray-950 p-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/dashboard" className="text-blue-400">← Back</Link>
        <h1 className="text-xl font-bold">Profile Settings</h1>
        <div className="w-10"></div>
      </nav>

      <div className="max-w-md mx-auto p-6 space-y-8">
        
        {/* AVATAR UPLOAD */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center overflow-hidden shadow-2xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-gray-500">
                  {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
          </div>
          <p className="text-sm text-gray-400">Tap the camera icon to upload a photo</p>
        </div>

        {/* DETAILS FORM (Name, Phone, Country) */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-400">Personal Details</label>
          
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition"
          />
          
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Mobile Number"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition"
          />
          
          {/* ✅ FIXED: Removed "Nepal" example */}
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition"
          />

          <button 
            onClick={saveDetails}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>

        {/* LOCATION SECTION */}
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
                  Location active
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
          <p className="text-white font-medium break-all">{user.email}</p>
        </div>

        {/* LOGOUT */}
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