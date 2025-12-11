
'use server'
import { generate } from '@genkit-ai/ai'
import { z } from 'zod'
import { gemini10Pro } from '@genkit-ai/vertexai'

const SuggestCorrectionInputSchema = z.object({
  text: z.string(),
  language: z.string(),
})

const SuggestCorrectionOutputSchema = z.object({
  correctedText: z.string(),
})

export const suggestCorrection = async (input: z.infer<typeof SuggestCorrectionInputSchema>) => {
  const prompt = `Please correct the following text for grammar and spelling in ${input.language}:\n\n${input.text}`

  const result = await generate(
    {
      input: prompt,  // wrap prompt string inside `input` key
    },
    {
      model: gemini10Pro,
      output: { schema: SuggestCorrectionOutputSchema },
    }
  );

  return result.output();
};
