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

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up old OTPs for this email
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('email', email);

    // Store new OTP
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        email,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) throw dbError;

    // Send branded email via Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'Nabjo <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Nabjo Sign-In Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background-color: #030712; 
                color: #ffffff; 
                margin: 0; 
                padding: 0; 
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 40px 20px; 
              }
              .logo { 
                text-align: center; 
                margin-bottom: 40px; 
              }
              .logo h1 { 
                font-size: 42px; 
                background: linear-gradient(to right, #60a5fa, #a855f7); 
                -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; 
                margin: 0; 
                font-weight: 800;
                letter-spacing: -1px;
              }
              .tagline {
                text-align: center;
                color: #9ca3af;
                font-size: 14px;
                margin-top: 8px;
              }
              .content { 
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%); 
                border-radius: 20px; 
                padding: 48px 40px; 
                border: 1px solid #374151; 
                text-align: center;
              }
              .content h2 {
                margin-top: 0;
                font-size: 24px;
                color: #ffffff;
              }
              .content p {
                color: #9ca3af;
                font-size: 16px;
                line-height: 1.6;
              }
              .otp-code { 
                font-size: 56px; 
                font-weight: 800; 
                letter-spacing: 12px; 
                background: linear-gradient(to right, #3b82f6, #8b5cf6); 
                -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; 
                margin: 32px 0; 
                font-family: 'Courier New', monospace;
                padding: 20px;
                background-color: rgba(59, 130, 246, 0.1);
                border-radius: 12px;
                border: 2px dashed rgba(139, 92, 246, 0.3);
              }
              .warning {
                background: rgba(234, 179, 8, 0.1);
                border: 1px solid rgba(234, 179, 8, 0.3);
                border-radius: 12px;
                padding: 16px;
                margin-top: 24px;
                font-size: 13px;
                color: #fbbf24;
              }
              .footer { 
                text-align: center; 
                margin-top: 40px; 
                color: #6b7280; 
                font-size: 13px; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <h1>Nabjo</h1>
                <div class="tagline">The safest global marketplace</div>
              </div>
              <div class="content">
                <h2>Your Sign-In Code</h2>
                <p>Use this 6-digit code to securely sign in to your Nabjo account:</p>
                <div class="otp-code">${otpCode}</div>
                <p style="font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
                <div class="warning">
                  If you didn't request this code, you can safely ignore this email. Your account is secure.
                </div>
              </div>
              <div class="footer">
                <p>2026 Nabjo. All rights reserved.</p>
                <p>The global marketplace for everything.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}