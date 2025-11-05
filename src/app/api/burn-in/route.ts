// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSubtitledVideoUrl } from '@/lib/cloudinary-service';
import fetch from 'node-fetch';
import type { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      videoPublicId, 
      subtitles, 
      videoName = 'video',
      subtitleFont = 'Arial, sans-serif',
      subtitleFontSize = 48
    } = body;

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }
    
    // 1. Generate the final video URL from our robust Cloudinary service
    const finalVideoUrl = await generateSubtitledVideoUrl(
      videoPublicId,
      subtitles,
      subtitleFont,
      subtitleFontSize
    );

    // 2. Fetch the video from Cloudinary as a stream
    const videoResponse = await fetch(finalVideoUrl);
    
    if (!videoResponse.ok || !videoResponse.body) {
      const errorBody = await videoResponse.text();
      console.error("Cloudinary response error:", errorBody);
      throw new Error(`Failed to fetch the generated video from Cloudinary. Status: ${videoResponse.status}`);
    }

    // 3. Stream the response back to the client
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'video/mp4');
    
    const cleanFilename = `${videoName.split('.')[0]}-with-subtitles.mp4`;
    responseHeaders.set(
      'Content-Disposition',
      `attachment; filename="${cleanFilename}"`
    );
    
    // Ensure the body is a readable stream for Next.js
    const readableStream = videoResponse.body as unknown as ReadableStream;
    
    return new NextResponse(readableStream, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===');
    console.error('Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to process video: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
