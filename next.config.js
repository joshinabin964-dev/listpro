/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // This wildcard automatically allows ALL Supabase project URLs! 
        // You don't need to paste your specific ID.
        hostname: '*.supabase.co', 
        
        // If you ever want to be specific, you would replace '*.supabase.co' 
        // with your exact hostname, like this:
        // hostname: 'qceaajozjqzayfwoemht.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // For fallback images
      },
    ],
  },
};

export default nextConfig;