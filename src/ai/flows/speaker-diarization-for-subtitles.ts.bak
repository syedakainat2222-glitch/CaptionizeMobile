'use server';

/**
 * @fileOverview Implements speaker diarization for automatic subtitle generation.
 *
 * This flow takes video data as input and generates subtitles, identifying different
 * speakers to improve readability and clarity.
 *
 * @exports {function} generateSubtitlesWithSpeakerDiarization - The main function to generate subtitles with speaker diarization.
 * @exports {type} GenerateSubtitlesInput - The input type for the generateSubtitlesWithSpeakerDiarization function.
 * @exports {type} GenerateSubtitlesOutput - The output type for the generateSubtitlesWithSpeakerDiarization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import wav from 'wav';

const GenerateSubtitlesInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      'Video file as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected the expected format
    ),
});
export type GenerateSubtitlesInput = z.infer<typeof GenerateSubtitlesInputSchema>;

const GenerateSubtitlesOutputSchema = z.object({
  subtitles: z.string().describe('Subtitles in SRT format with speaker diarization.'),
});
export type GenerateSubtitlesOutput = z.infer<typeof GenerateSubtitlesOutputSchema>;

// This function serves as the entry point for generating subtitles with speaker diarization.
export async function generateSubtitlesWithSpeakerDiarization(
  input: GenerateSubtitlesInput
): Promise<GenerateSubtitlesOutput> {
  return speakerDiarizationFlow(input);
}

const speakerDiarizationPrompt = ai.definePrompt({
  name: 'speakerDiarizationPrompt',
  input: {schema: GenerateSubtitlesInputSchema},
  output: {schema: GenerateSubtitlesOutputSchema},
  prompt: `You are an AI expert in generating subtitles for videos, including speaker diarization. Given a video, transcribe the audio and generate subtitles in SRT format. Identify different speakers and indicate them in the subtitles.

Video: {{media url=videoDataUri}}

Output the subtitles in SRT format with speaker diarization. For example:

1
00:00:00,000 --> 00:00:05,000
Speaker A: Hello, how are you?

2
00:00:05,000 --> 00:00:10,000
Speaker B: I am doing well, thank you. And you?

3
00:00:10,000 --> 00:00:15,000
Speaker A: I am also doing well. Let's discuss the project.

Ensure that the subtitles are accurate, well-timed, and clearly indicate which speaker is talking.`, // Added more detailed instructions
});

const speakerDiarizationFlow = ai.defineFlow(
  {
    name: 'speakerDiarizationFlow',
    inputSchema: GenerateSubtitlesInputSchema,
    outputSchema: GenerateSubtitlesOutputSchema,
  },
  async input => {
    const {output} = await speakerDiarizationPrompt(input);
    return output!;
  }
);
