import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    // 1. Generate a secure, random 8-character ID on the server
    const secureToken = uuidv4().split('-')[0].toUpperCase(); 
    
    // 2. Get the exact server time (scammers can't fake this)
    const serverTimestamp = new Date().toISOString();

    return NextResponse.json({ 
      token: secureToken, 
      timestamp: serverTimestamp 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}