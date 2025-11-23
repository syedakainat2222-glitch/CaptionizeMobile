// src/app/api/vtt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { formatVtt, type Subtitle } from '@/lib/srt';
import { z } from 'zod';

const subtitleSchema = z.array(z.object({
  id: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  text: z.string(),
}));

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subtitlesParam = searchParams.get('subtitles');

    if (!subtitlesParam) {
      return new NextResponse('Missing subtitles data', { status: 400 });
    }

    let subtitles: Subtitle[];
    try {
      const parsed = JSON.parse(subtitlesParam);
      const validation = subtitleSchema.safeParse(parsed);
      if (!validation.success) {
        throw new Error(`Invalid subtitle format: ${validation.error.message}`);
      }
      subtitles = validation.data;
    } catch (e) {
      return new NextResponse('Invalid JSON in subtitles parameter', { status: 400 });
    }

    const vttContent = formatVtt(subtitles);

    return new NextResponse(vttContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('VTT generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(`Failed to generate VTT file: ${errorMessage}`, { status: 500 });
  }
}
