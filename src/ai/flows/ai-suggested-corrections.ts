'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting corrections and improvements to subtitles.
 *
 * The flow takes the original subtitle text and the surrounding context as input, and returns suggested corrections.
 *
 * @interface AISuggestedCorrectionsInput - Input type for the aiSuggestedCorrections function.
 * @interface AISuggestedCorrectionsOutput - Output type for the aiSuggestedCorrections function.
 * @function aiSuggestedCorrections - The main function to trigger the subtitle correction suggestions flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISuggestedCorrectionsInputSchema = z.object({
  subtitleText: z.string().describe('The text of the subtitle to be corrected.'),
  context: z
    .string()
    .describe(
      'The surrounding context of the subtitle, including previous and subsequent subtitles.'
    ),
});
export type AISuggestedCorrectionsInput = z.infer<typeof AISuggestedCorrectionsInputSchema>;

const AISuggestedCorrectionsOutputSchema = z.object({
  suggestedCorrection: z
    .string()
    .describe('The AI-suggested correction for the subtitle text.'),
  explanation: z
    .string()
    .describe('An explanation of why the AI suggested this correction.'),
});
export type AISuggestedCorrectionsOutput = z.infer<typeof AISuggestedCorrectionsOutputSchema>;

export async function aiSuggestedCorrections(
  input: AISuggestedCorrectionsInput
): Promise<AISuggestedCorrectionsOutput> {
  return aiSuggestedCorrectionsFlow(input);
}

const aiSuggestedCorrectionsPrompt = ai.definePrompt({
  name: 'aiSuggestedCorrectionsPrompt',
  input: {schema: AISuggestedCorrectionsInputSchema},
  output: {schema: AISuggestedCorrectionsOutputSchema},
  prompt: `You are an AI subtitle editor. You will suggest corrections and improvements to the subtitle text based on the surrounding context.

Subtitle Text: {{{subtitleText}}}
Context: {{{context}}}

Suggest a correction to the subtitle text and explain why you suggested this correction.

Correction: {{suggestedCorrection}}
Explanation: {{explanation}}`,
});

const aiSuggestedCorrectionsFlow = ai.defineFlow(
  {
    name: 'aiSuggestedCorrectionsFlow',
    inputSchema: AISuggestedCorrectionsInputSchema,
    outputSchema: AISuggestedCorrectionsOutputSchema,
  },
  async input => {
    const {output} = await aiSuggestedCorrectionsPrompt(input);
    return output!;
  }
);
