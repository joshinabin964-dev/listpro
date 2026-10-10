"use client";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LocationSetup() {
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    if (!country) {
      setStatus('Please enter a country first.');
      return;
    }

    setStatus('Requesting location access...');
    const supabase = createClient();

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
          setStatus('Error saving data.');
        } else {
          setStatus('Success! Your location is saved.');
        }
      }
    }, (error) => {
      setStatus('Location access denied. Please allow location permissions.');
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-white"> Setup Your Location</h2>
      <p className="text-gray-400 mb-4 text-sm">Enter your country and allow location access to see nearby products.</p>
      
      <input
        type="text"
        placeholder="Enter your country (e.g., USA, UK, India)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full p-3 rounded bg-gray-900 text-white border border-gray-600 mb-4"
      />
      
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
      >
        Save My Location
      </button>
      
      {status && <p className="mt-4 text-sm text-yellow-400">{status}</p>}
    </div>
  );
}