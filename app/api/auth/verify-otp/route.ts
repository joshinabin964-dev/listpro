import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    
    // Clean inputs
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    // Find the latest unused OTP that matches exactly
    const { data, error } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', cleanEmail)
      .eq('code', cleanCode)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid code. Please check and try again.' }, { status: 400 });
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Mark as used
    await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', data.id);

    // Check if user exists by querying auth.users table directly
    const { data: userData } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (!userData) {
      // Create new user
      const randomPass = Math.random().toString(36).slice(-16);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: randomPass,
        email_confirm: true
      });

      if (createError) {
        console.error('Create user error:', createError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      // Create profile for new user
      if (newUser.user) {
        await supabaseAdmin.from('profiles').upsert({ 
          id: newUser.user.id, 
          email: cleanEmail, 
          created_at: new Date().toISOString() 
        });
      }
    }

    // Generate magic link to log them in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: { 
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` 
      }
    });

    if (linkError) {
      console.error('Link error:', linkError);
      return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      redirectUrl: linkData.properties.action_link 
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}