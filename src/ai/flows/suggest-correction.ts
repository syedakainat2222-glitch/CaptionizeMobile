'use server';

import { generate } from '@genkit-ai/ai';
import { z } from 'zod';
import { gemini10Pro } from '@genkit-ai/vertexai';

const SuggestCorrectionInputSchema = z.object({
  text: z.string(),
  language: z.string(),
});

const SuggestCorrectionOutputSchema = z.object({
  corrected: z.string(),
});

export async function suggestCorrection(
  input: z.infer<typeof SuggestCorrectionInputSchema>
): Promise<z.infer<typeof SuggestCorrectionOutputSchema>> {
  
  const prompt = `
Correct the following text for grammar and spelling in ${input.language}.
Return only JSON: {"corrected": "<corrected text>"}

Text:
"${input.text}"
`;

  const result = await generate({
    model: gemini10Pro,
    prompt,
    output: { schema: SuggestCorrectionOutputSchema }
  });

  return result.output();
}
