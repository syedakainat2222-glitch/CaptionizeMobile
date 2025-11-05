'use server';
import { burnInSubtitles, type Subtitle } from '@/ai/flows/burn-in-subtitles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoPublicId = searchParams.get('videoPublicId');
  const subtitlesParam = searchParams.get('subtitles');
  const videoName = searchParams.get('videoName') || 'video';

  if (!videoPublicId || !subtitlesParam) {
    return NextResponse.json(
      { error: 'Missing videoPublicId or subtitles' },
      { status: 400 }
    );
  }

  let subtitles: Subtitle[];
  try {
    subtitles = JSON.parse(subtitlesParam);
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid subtitles format' },
      { status: 400 }
    );
  }

  try {
    const result = await burnInSubtitles({
      videoPublicId,
      subtitles,
    });

    if (!result || !result.videoWithSubtitlesUrl) {
      throw new Error('The video processing flow did not return a URL.');
    }

    // Fetch the video from the Cloudinary URL
    const videoResponse = await fetch(result.videoWithSubtitlesUrl);

    if (!videoResponse.ok || !videoResponse.body) {
      throw new Error(
        `Failed to fetch processed video from Cloudinary: ${videoResponse.statusText}`
      );
    }

    const processedFilename = `${videoName.split('.')[0]}-with-subtitles.mp4`;

    // Stream the video back to the client
    return new NextResponse(videoResponse.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${processedFilename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to burn in subtitles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
