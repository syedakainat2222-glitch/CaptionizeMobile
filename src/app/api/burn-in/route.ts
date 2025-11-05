'use server';

import { NextResponse } from 'next/server';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing video URL' }, { status: 400 });
    }

    const prompt = `
      Analyze this video and generate subtitle captions (text and timestamps).
      Return an array of objects like:
      [
        { "time": "00:00:03", "text": "Hello everyone" },
        { "time": "00:00:07", "text": "Welcome to our channel" }
      ]
      Video URL: ${videoUrl}
    `;

    const result = await ai.generate.text(prompt);

    const parsed = (() => {
      try {
        return JSON.parse(result.outputText);
      } catch {
        return [{ time: '00:00:00', text: result.outputText }];
      }
    })();

    return NextResponse.json({ subtitles: parsed });
  } catch (err: any) {
    console.error('Subtitle generation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate subtitles' },
      { status: 500 }
    );
  }
}
