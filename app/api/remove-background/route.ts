import { NextRequest, NextResponse } from 'next/server';
import { removeBackground } from "@imgly/background-removal";

export const runtime = 'nodejs'; // Force Node.js runtime for WASM support

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert the file to a Buffer for Node.js processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run the AI on the server (Unlimited RAM!)
    const blob = await removeBackground(buffer, {
      model: "small", // Use small model for faster server processing
      output: { format: "image/png", quality: 0.9 },
    });

    // Convert the result back to a Base64 string to send to the frontend
    const resultArrayBuffer = await blob.arrayBuffer();
    const base64Image = Buffer.from(resultArrayBuffer).toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      image: `data:image/png;base64,${base64Image}` 
    });

  } catch (error: any) {
    console.error('Server-side removal error:', error);
    return NextResponse.json({ 
      error: 'Failed to process image on server',
      details: error.message 
    }, { status: 500 });
  }
}