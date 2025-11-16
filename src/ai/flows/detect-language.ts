'use server';
import { ai } from '@/ai';
import { z } from 'zod';

const DetectLanguageInputSchema = z.object({
  text: z.string().describe('The text to analyze for language detection.'),
});
export type DetectLanguageInput = z.infer<typeof DetectLanguageInputSchema>;

const DetectLanguageOutputSchema = z.object({
  language: z.string().describe('The detected language (e.g., "English", "Spanish").'),
});
export type DetectLanguageOutput = z.infer<typeof DetectLanguageOutputSchema>;

const detectLanguagePrompt = ai.definePrompt({
    name: 'detectLanguagePrompt',
    input: { schema: DetectLanguageInputSchema },
    output: { schema: DetectLanguageOutputSchema },
    prompt: `Detect the predominant language in the following text. Respond with only the name of the language and nothing else.\n\nText: \n\`\`\`\n{{{text}}}\n\`\`\`\n\nDetected Language:`,
});

const detectLanguageFlow = ai.defineFlow(
    {
        name: 'detectLanguageFlow',
        inputSchema: DetectLanguageInputSchema,
        outputSchema: DetectLanguageOutputSchema,
    },
    async (input) => {
        const { output } = await detectLanguagePrompt(input);
        if (!output?.language) {
            throw new Error("Language detection failed. The AI model did not return a language.");
        }
        return output;
    }
);

export async function detectLanguage(input: DetectLanguageInput): Promise<DetectLanguageOutput> {
    return await detectLanguageFlow(input);
}
