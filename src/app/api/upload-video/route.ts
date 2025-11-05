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
    const { subtitleText, context } = await request.json();

    if (!subtitleText) {
      return NextResponse.json({ error: 'Missing subtitle text' }, { status: 400 });
    }

    const prompt = `
      Suggest a natural and grammatically correct correction for this subtitle line.
      Keep tone and timing similar.
      Context: ${context || 'none'}
      Text: "${subtitleText}"
    `;

    const result = await ai.generate.text(prompt);

    return NextResponse.json({ suggestion: result.outputText.trim() });
  } catch (err: any) {
    console.error('Correction suggestion failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}
