import { NextRequest, NextResponse } from 'next/server';
import { processVideo } from '@/ai/flows/process-video';
import { z } from 'zod';

const processVideoSchema = z.object({
  cloudinaryPublicId: z.string(),
  languageCode: z.string().optional(),
  videoId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = processVideoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { cloudinaryPublicId, languageCode, videoId } = validation.data;

    const result = await processVideo({
      cloudinaryPublicId,
      languageCode,
      videoId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Process video API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
