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

    // 1. Find the OTP code
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', cleanEmail)
      .eq('code', cleanCode)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Invalid code. Please check and try again.' }, { status: 400 });
    }

    // Check if expired
    if (new Date(otpData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Mark as used
    await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otpData.id);

    // 2. Check if user exists in Auth
    const { data: authUser } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    let userId = authUser?.id;

    // 3. Create user if they don't exist
    if (!userId) {
      // Use a very strong password to satisfy any Supabase security rules
      const strongPassword = "NabjoSecure" + Math.random().toString(36).slice(-8) + "!1A";
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: strongPassword,
        email_confirm: true, // Bypass email confirmation since we just did OTP
      });

      if (createError) {
        console.error('Supabase create user error:', createError);
        // If it fails because they already exist, we can try to proceed
        if (!createError.message.includes('already registered')) {
           return NextResponse.json({ error: 'Failed to create account. Please try Google login.' }, { status: 500 });
        }
      } else if (newUser.user) {
        userId = newUser.user.id;
        // Create their profile
        await supabaseAdmin.from('profiles').upsert({ 
          id: userId, 
          email: cleanEmail, 
          full_name: cleanEmail.split('@')[0], // Default name
          created_at: new Date().toISOString() 
        });
      }
    }

    // 4. Generate the login link
    if (!userId) {
       return NextResponse.json({ error: 'Could not find or create user.' }, { status: 500 });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: { 
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` 
      }
    });

    if (linkError) {
      console.error('Link generation error:', linkError);
      return NextResponse.json({ error: 'Failed to generate login session.' }, { status: 500 });
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