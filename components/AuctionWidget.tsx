"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AuctionWidgetProps {
  listingId: string;
  currentBid: number | null;
  startingPrice: number;
  endTime: string;
  sellerId: string;
}

export default function AuctionWidget({ listingId, currentBid, startingPrice, endTime, sellerId }: AuctionWidgetProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [highestBid, setHighestBid] = useState(currentBid || startingPrice);

  // 1. Live Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft("AUCTION ENDED");
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  // 2. Real-Time Bid Updates
  useEffect(() => {
    const channel = supabase
      .channel(`auction:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings', filter: `id=eq.${listingId}` },
        (payload) => {
          if (payload.new.current_bid) {
            setHighestBid(payload.new.current_bid);
            toast.success('New bid placed!');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listingId]);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount) return;
    setIsBidding(true);

    try {
      const res = await fetch('/api/auctions/place-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, bid_amount: parseFloat(bidAmount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Bid placed successfully!');
      setBidAmount('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsBidding(false);
    }
  };

  const minimumBid = highestBid + 1;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h3 className="text-xl font-bold text-white">Live Auction</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Current Highest Bid</p>
          <p className="text-2xl font-bold text-green-400">Rs. {highestBid}</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Time Remaining</p>
          <p className={`text-2xl font-bold font-mono ${timeLeft === "AUCTION ENDED" ? 'text-red-500' : 'text-blue-400'}`}>
            {timeLeft}
          </p>
        </div>
      </div>

      {timeLeft !== "AUCTION ENDED" && (
        <form onSubmit={handleBid} className="flex gap-3">
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={`Min bid: Rs. ${minimumBid}`}
            min={minimumBid}
            required
            className="flex-1 p-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isBidding}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition disabled:opacity-50"
          >
            {isBidding ? 'Placing...' : 'Place Bid'}
          </button>
        </form>
      )}
    </div>
  );
}