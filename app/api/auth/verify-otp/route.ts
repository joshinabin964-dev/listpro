import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    // Find the OTP code
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Check if expired
    if (new Date(otpData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // Mark as used
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpData.id);

    // Check if user exists, if not create them
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (!existingUser.user) {
      // Create new user with a random password
      const randomPassword = Math.random().toString(36).slice(-16);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
      });

      if (createError) throw createError;

      // Create profile for new user
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: email,
          created_at: new Date().toISOString(),
        });
    }

    // Generate a magic link for the user to sign in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
      },
    });

    if (signInError) throw signInError;

    return NextResponse.json({ 
      success: true, 
      redirectUrl: signInData.properties.action_link 
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}