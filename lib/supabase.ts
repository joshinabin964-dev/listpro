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

// 🚀 1. TRADITIONAL EMAIL + PASSWORD LOGIN
export const signInWithEmailPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  return { data, error };
};

// 🚀 2. TRADITIONAL SIGN UP
export const signUpWithEmailPassword = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullName, // Save their name to the profile
      },
    },
  });
  return { data, error };
};

// 🚀 3. GOOGLE LOGIN (Keep this just in case)
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://listpro-ochre.vercel.app/auth/callback',
      queryParams: { prompt: 'select_account' },
    },
  });
  return { data, error };
};