'use server';

import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Input validation schema
const TranslateSubtitlesInputSchema = z.object({
  subtitles: z.array(z.object({
    id: z.number(),
    startTime: z.string(),
    endTime: z.string(),
    text: z.string(),
  })),
  targetLanguage: z.string(),
});

export async function translateSubtitles(input: {
  subtitles: any[];
  targetLanguage: string;
}) {
  const validatedInput = TranslateSubtitlesInputSchema.parse(input);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Translate the following subtitles into ${validatedInput.targetLanguage}. Only return the translated text for each subtitle, in the same order, separated by a new line. Do not include timestamps or IDs.\n\n${validatedInput.subtitles.map(s => s.text).join('\n')}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const translatedTexts = response.text().split('\n');

  return validatedInput.subtitles.map((subtitle, index) => ({
    ...subtitle,
    text: translatedTexts[index] || subtitle.text,
  }));
}
