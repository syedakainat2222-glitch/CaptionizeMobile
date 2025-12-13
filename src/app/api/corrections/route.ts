import { NextRequest, NextResponse } from 'next/server';
import { aiSuggestedCorrections } from '@/ai/flows/ai-suggested-corrections';
import { z } from 'zod';

const correctionsSchema = z.object({
  subtitleText: z.string(),
  context: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = correctionsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { subtitleText, context } = validation.data;

    const result = await aiSuggestedCorrections({
      subtitleText,
      context,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Corrections API error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}