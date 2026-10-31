import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://listpro-ochre.vercel.app/auth/callback',
    },
  });
  return { data, error };
};

export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      // 🚀 Custom app scheme so Android opens the app, not Chrome!
      emailRedirectTo: 'com.nabjo.app://login-callback', 
    },
  });
  return { data, error };
};