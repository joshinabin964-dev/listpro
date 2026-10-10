"use client";
import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster 
      position="bottom-right" 
      toastOptions={{
        style: {
          background: '#1f2937', // Dark gray background
          color: '#fff',
          border: '1px solid #374151',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600'
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
      }} 
    />
  );
}