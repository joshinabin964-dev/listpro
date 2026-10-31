import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 1. Get your Supabase URL and Key from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. Create the Supabase Client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce', // Best for mobile and web OAuth
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 3. Helper Function for Google Login
// We use your normal Vercel URL here so Google doesn't throw a 400 error!
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // This tells Google to send the user back to your website after login
      redirectTo: 'https://listpro-ochre.vercel.app/auth/callback', 
    },
  });
  
  return { data, error };
};

// 4. Helper Function for Email Login (Magic Link)
export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      // This tells Supabase where to send the user after they click the email link
      emailRedirectTo: 'https://listpro-ochre.vercel.app/auth/callback',
    },
  });
  
  return { data, error };
};