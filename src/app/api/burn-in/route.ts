'use server';
import { burnInSubtitles } from '@/ai/flows/burn-in-subtitles';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { videoUrl, subtitles } = await request.json();

  if (!videoUrl || !subtitles) {
    return NextResponse.json(
      { error: 'Missing videoUrl or subtitles' },
      { status: 400 }
    );
  }

  try {
    const result = await burnInSubtitles({
      videoUrl,
      subtitles,
    });

    if (!result.videoWithSubtitlesUrl) {
      throw new Error('The AI flow did not return a video URL.');
    }
    
    // In a real-world scenario, we'd get a downloadable URL.
    // For this prototype, we'll return the result and let the client handle it.
    // This might be a data URI or a URL to a temporary file.
    return NextResponse.json({ videoUrl: result.videoWithSubtitlesUrl });

  } catch (error) {
    console.error('Failed to burn in subtitles:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to process video: ${errorMessage}` }, { status: 500 });
  }
}
