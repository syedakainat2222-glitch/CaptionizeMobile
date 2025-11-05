// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSubtitledVideoUrl } from '@/lib/cloudinary-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { videoPublicId, subtitles, videoName, subtitleFont } = await request.json();

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters: videoPublicId and subtitles are required.' },
        { status: 400 }
      );
    }
    
    // 1. Delegate the complex Cloudinary logic to the dedicated service.
    // This gets a short, valid URL using the VTT file overlay method.
    const finalVideoUrl = await generateSubtitledVideoUrl(videoPublicId, subtitles, subtitleFont);

    // 2. Fetch the final video on the server.
    // This acts as a proxy, ensuring the client doesn't deal with CORS or complex fetching.
    const videoResponse = await fetch(finalVideoUrl);
    
    if (!videoResponse.ok) {
        // If Cloudinary returns an error (e.g., 404, 400), this will now be caught properly.
        throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
    }

    // 3. Get the video data as a ReadableStream.
    const videoStream = videoResponse.body;

    if (!videoStream) {
        throw new Error('Could not get video stream from Cloudinary response.');
    }

    // Sanitize the base name and create a clean filename.
    const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
    const filename = `${baseName}-with-subtitles.mp4`;
    
    // 4. Return a streaming response to the client for download.
    // This correctly streams the binary data of the video and sets the correct filename.
    return new NextResponse(videoStream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
