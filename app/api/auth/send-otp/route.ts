import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const cleanEmail = email.trim().toLowerCase();
    
    // Generate strict 6-digit code
    const otpCode = String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete old unused OTPs for this email
    await supabaseAdmin.from('otp_codes').delete().eq('email', cleanEmail).eq('used', false);

    // Insert new OTP
    const { error } = await supabaseAdmin.from('otp_codes').insert({
      email: cleanEmail,
      code: otpCode,
      expires_at: expiresAt,
      used: false
    });
    if (error) throw error;

    // Send beautiful branded email
    await resend.emails.send({
      from: 'Nabjo <onboarding@resend.dev>',
      to: [cleanEmail],
      subject: 'Your Nabjo Sign-In Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, sans-serif; background-color: #030712; color: #fff; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center; }
              .logo { font-size: 42px; font-weight: 800; background: linear-gradient(to right, #60a5fa, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
              .tagline { color: #9ca3af; font-size: 14px; margin-bottom: 40px; }
              .card { background: #111827; border: 1px solid #374151; border-radius: 20px; padding: 40px; }
              .code-box { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 48px; font-weight: 800; letter-spacing: 8px; padding: 20px; border-radius: 12px; margin: 30px 0; font-family: monospace; }
              .footer { color: #6b7280; font-size: 12px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">Nabjo</div>
              <div class="tagline">The safest global marketplace</div>
              <div class="card">
                <h2>Your Sign-In Code</h2>
                <p style="color: #9ca3af;">Use this 6-digit code to securely sign in:</p>
                <div class="code-box">${otpCode}</div>
                <p style="color: #9ca3af; font-size: 14px;">This code expires in 10 minutes.</p>
              </div>
              <div class="footer">© 2026 Nabjo. All rights reserved.</div>
            </div>
          </body>
        </html>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}