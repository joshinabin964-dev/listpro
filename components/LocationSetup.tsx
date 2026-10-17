"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LocationSetup() {
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [hasCountry, setHasCountry] = useState(false);

  // 🕵️ Check if user already has a location on load
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .single();
        
        // If they already have a country, hide this component completely!
        if (profile?.country) {
          setHasCountry(true);
        }
      }
    };
    checkProfile();
  }, []);

  const handleSave = async () => {
    if (!country) {
      setStatus('Please enter a country first.');
      return;
    }

    setStatus('Requesting location access...');

    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setStatus('Saving your location...');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ country, latitude, longitude })
          .eq('id', user.id);

        if (error) {
          setStatus('Error saving data: ' + error.message);
        } else {
          setStatus('✅ Saved!');
          
          // 🚀 Tell Dashboard to refresh currency/stats instantly
          window.dispatchEvent(new Event('profileUpdated'));
          
          //  Vanish after 1.5 seconds
          setTimeout(() => {
            setIsHidden(true);
          }, 1500);
        }
      }
    }, (error) => {
      setStatus('Location access denied. Please allow location permissions.');
    });
  };

  // If they already have a country OR we just saved it, render NOTHING.
  if (hasCountry || isHidden) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-500">
      <h2 className="text-xl font-bold mb-4 text-white">📍 Setup Your Location</h2>
      <p className="text-gray-400 mb-4 text-sm">Enter your country and allow location access to see nearby products and correct currency.</p>
      
      <input
        type="text"
        placeholder="Enter your country (e.g., USA, UK, India, Nepal)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full p-3 rounded bg-gray-900 text-white border border-gray-600 mb-4 focus:outline-none focus:border-blue-500 transition"
      />
      
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
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