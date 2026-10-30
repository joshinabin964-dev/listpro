"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CountrySelect from './CountrySelect';

export default function LocationSetup() {
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [hasCountry, setHasCountry] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('country').eq('id', user.id).single();
        if (profile?.country) setHasCountry(true);
      }
    };
    checkProfile();
  }, []);

  const handleSave = async () => {
    if (!country) { 
      setStatus('Please select a country first.'); 
      return; 
    }
    
    setStatus('Requesting location access...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { 
      setStatus('Error: User not found.'); 
      return; 
    }

    let lat = null;
    let lon = null;

    // Try to get GPS, but with a 5-second timeout so it NEVER hangs forever
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000, // 5 second max wait
            maximumAge: 0
          });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } catch (error) {
        // GPS failed, denied, or timed out. THAT IS OK. We still save the country.
        console.log("Location access denied or timed out. Saving country only.");
      }
    }

    setStatus('Saving your profile...');
    
    // THIS RUNS NO MATTER WHAT. Country is always saved.
    const { error } = await supabase
      .from('profiles')
      .update({ 
        country, 
        latitude: lat, 
        longitude: lon 
      })
      .eq('id', user.id);

    if (error) {
      setStatus('Error saving data: ' + error.message);
    } else {
      setStatus('✅ Saved! Currency updated.');
      window.dispatchEvent(new Event('profileUpdated'));
      setTimeout(() => setIsHidden(true), 1500);
    }
  };

  if (hasCountry || isHidden) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-500">
      <h2 className="text-xl font-bold mb-4 text-white">📍 Setup Your Location</h2>
      <p className="text-gray-400 mb-4 text-sm">Select your country to see the correct currency. (GPS is optional)</p>
      
      <CountrySelect 
        value={country} 
        onChange={setCountry} 
        placeholder="Start typing your country (e.g. Nepal, USA, UK)..." 
      />
      
      <button
        onClick={handleSave}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
        disabled={status.includes('Saving')}
      >
        Save My Location
      </button>
      
      {status && (
        <p className={`mt-4 text-sm font-bold ${status.includes('Saved') ? 'text-green-400' : 'text-yellow-400'}`}>
          {status}
        </p>
      )}
    </div>
  );
}