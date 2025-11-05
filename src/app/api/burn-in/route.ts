'use server';
import { burnInSubtitles } from '@/ai/flows/burn-in-subtitles';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { videoPublicId, subtitles } = await request.json();

  if (!videoPublicId || !subtitles) {
    return NextResponse.json(
      { error: 'Missing videoPublicId or subtitles' },
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
    
    // Pass the final URL directly to the frontend
    return NextResponse.json({ videoUrl: result.videoWithSubtitlesUrl });

  } catch (error) {
    console.error('Failed to burn in subtitles:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to process video: ${errorMessage}` }, { status: 500 });
  }
}