import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { listing_id, bid_amount } = await request.json();

    // 1. Check if user is logged in
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to bid.' }, { status: 401 });
    }

    // 2. Get the listing details
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    // 3. Validate Auction Rules
    if (listing.listing_type !== 'auction') {
      return NextResponse.json({ error: 'This is not an auction.' }, { status: 400 });
    }
    if (new Date(listing.auction_end_time) < new Date()) {
      return NextResponse.json({ error: 'This auction has ended.' }, { status: 400 });
    }
    if (listing.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot bid on your own item.' }, { status: 400 });
    }

    // Determine the minimum bid required
    const minimum_bid = listing.current_bid ? listing.current_bid + 1 : listing.starting_price;

    if (bid_amount < minimum_bid) {
      return NextResponse.json({ error: `Bid must be at least ${minimum_bid}.` }, { status: 400 });
    }

    // 4. Record the bid
    const { error: bidError } = await supabaseAdmin.from('bids').insert({
      listing_id,
      bidder_id: user.id,
      amount: bid_amount
    });

    if (bidError) throw bidError;

    // 5. Update the listing with the new current bid
    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({ 
        current_bid: bid_amount, 
        winning_bidder_id: user.id 
      })
      .eq('id', listing_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, new_bid: bid_amount });

  } catch (error: any) {
    console.error('Bid error:', error);
    return NextResponse.json({ error: error.message || 'Failed to place bid' }, { status: 500 });
  }
}