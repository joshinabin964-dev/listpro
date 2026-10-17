"use client";
import { useState, useRef, useEffect } from 'react';

// A clean list of major countries for the dropdown
const countryList = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Bolivia", "Brazil", "Brunei", "Bulgaria",
  "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France",
  "Germany", "Ghana", "Greece", "Guatemala",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait",
  "Laos", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
  "Madagascar", "Malaysia", "Maldives", "Mali", "Malta", "Mexico", "Mongolia", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "North Korea", "Norway",
  "Oman",
  "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Turkmenistan",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CountrySelect({ value, onChange, placeholder = "Select your country..." }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value); // Reset to saved value if they click away without selecting
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredCountries = countryList.filter(country => 
    country.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (country: string) => {
    onChange(country);
    setSearch(country);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          onChange(e.target.value); // Allow manual typing but filter it
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-pink-500 transition"
      />
      
      {isOpen && search.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => handleSelect(country)}
                className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition border-b border-gray-700/50 last:border-0"
              >
                {country}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No countries found.</div>
          )}
        </div>
      )}
    </div>
  );
}