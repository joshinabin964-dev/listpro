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
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Use the normal website URL so Google doesn't throw a 400 error!
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
      emailRedirectTo: 'https://listpro-ochre.vercel.app/auth/callback',
    },
  });
  
  return { data, error };
};