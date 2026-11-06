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

      const { data: { session } } = await supabase.auth.getSession();
      const { error: updateError } = await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        avatar_url: publicUrl
      });

      if (updateError) throw updateError;
      toast.success('Profile picture updated! 📸');
    } catch (error: any) {
      console.error("Avatar Upload Error:", error);
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 🔥 SAVE NAME, PHONE, COUNTRY + LOCATION
  const saveDetails = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('profiles').upsert({ 
      id: session.user.id, 
      full_name: fullName,
      phone_number: phoneNumber,
      country: country,
      latitude: latitude,
      longitude: longitude
    });
    
    if (error) {
      console.error("Profile Save Error:", error);
      toast.error('Failed to save details: ' + error.message);
      setSaving(false);
    } else {
      // 🔥 Show success message
      toast.success('Profile saved successfully! Redirecting... ✅');
      
      //  Wait 1.5 seconds then redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }
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

        toast.success('Location captured! Click Save to update. 📍');
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

  if (!user) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium animate-pulse">Loading Profile...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden pb-20">
      {/* 🌌 Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🧭 Premium Nav */}
      <nav className="border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 border border-white/5 group-hover:border-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </div>
            <span className="font-medium hidden sm:inline">Back to Dashboard</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 relative z-10 space-y-8">
        
        {/*  Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gray-900 border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl shadow-blue-500/10 group-hover:border-blue-500/50 transition-all duration-300">
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
              className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-3 rounded-full shadow-lg shadow-blue-600/30 border-4 border-gray-950 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Tap the camera icon to update your photo</p>
        </div>

        {/* 📝 Personal Details Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white">Personal Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Full Name" 
                className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3.5 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <svg className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            
            <div className="relative">
              <input 
                type="tel" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                placeholder="Mobile Number" 
                className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3.5 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <svg className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                value={country} 
                onChange={(e) => setCountry(e.target.value)} 
                placeholder="Country" 
                className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3.5 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <svg className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>

        {/* 🔥 MOVED: Location Card NOW BEFORE SAVE BUTTON */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white">Your Location</h2>
          </div>

          {latitude && longitude ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Location Active
              </div>
              <p className="text-sm text-gray-400 font-mono bg-gray-950/50 p-3 rounded-lg border border-white/5">
                Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
              </p>
              <button 
                onClick={getCurrentLocation} 
                disabled={locationLoading} 
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {locationLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                )}
                {locationLoading ? 'Updating...' : 'Update Location'}
              </button>
            </div>
          ) : (
            <div className="bg-gray-950/50 border border-white/5 rounded-2xl p-6 text-center space-y-4">
              <p className="text-sm text-gray-400">Enable location to show up in "Sellers Near Me" and improve your marketplace experience.</p>
              <button 
                onClick={getCurrentLocation} 
                disabled={locationLoading} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {locationLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
                {locationLoading ? 'Getting Location...' : 'Get Current Location'}
              </button>
            </div>
          )}
        </div>

        {/* 🔥 SAVE BUTTON - NOW AT THE BOTTOM */}
        <button 
          onClick={saveDetails} 
          disabled={saving} 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {saving ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Save & Continue
            </>
          )}
        </button>

        {/* 📧 Account Info Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white">Account Info</h2>
          </div>
          <div className="bg-gray-950/50 rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Email Address</p>
            <p className="text-white font-medium break-all">{user.email}</p>
          </div>
        </div>

        {/* 🚪 Logout Button */}
        <button 
          onClick={handleLogout} 
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>

      </div>
    </main>
  );
}