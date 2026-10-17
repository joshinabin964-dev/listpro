"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CountrySelect from './CountrySelect'; // 🆕 Import the new dropdown

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
    if (!country) { setStatus('Please select a country first.'); return; }
    setStatus('Requesting location access...');

    if (!navigator.geolocation) { setStatus('Geolocation is not supported by your browser.'); return; }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setStatus('Saving your location...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase.from('profiles').update({ country, latitude, longitude }).eq('id', user.id);
        if (error) {
          setStatus('Error saving data: ' + error.message);
        } else {
          setStatus('✅ Saved!');
          window.dispatchEvent(new Event('profileUpdated'));
          setTimeout(() => setIsHidden(true), 1500);
        }
      }
    }, (error) => {
      setStatus('Location access denied. Please allow location permissions.');
    });
  };

  if (hasCountry || isHidden) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-500">
      <h2 className="text-xl font-bold mb-4 text-white">📍 Setup Your Location</h2>
      <p className="text-gray-400 mb-4 text-sm">Select your country and allow location access to see nearby products and correct currency.</p>
      
      {/* 🆕 REPLACED BASIC INPUT WITH COUNTRY SELECT */}
      <CountrySelect 
        value={country} 
        onChange={setCountry} 
        placeholder="Start typing your country (e.g. Nepal, USA, UK)..." 
      />
      
      <button
        onClick={handleSave}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
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