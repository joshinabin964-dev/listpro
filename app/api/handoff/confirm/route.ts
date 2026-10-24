import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { listing_id, token } = await request.json();

    if (!listing_id || !token) {
      return NextResponse.json({ error: 'Missing listing_id or token' }, { status: 400 });
    }

    // Find the pending handoff request
    const { data: handoff, error: handoffError } = await supabaseAdmin
      .from('handoff_requests')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (handoffError || !handoff) {
      return NextResponse.json({ error: 'Invalid or already used handoff token.' }, { status: 400 });
    }

    // 1. Mark handoff as completed
    await supabaseAdmin
      .from('handoff_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', handoff.id);

    // 2. Mark listing as Sold
    await supabaseAdmin
      .from('listings')
      .update({ status: 'Sold' })
      .eq('id', listing_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Handoff confirm error:', error);
    return NextResponse.json({ error: error.message || 'Failed to confirm handoff' }, { status: 500 });
  }
}