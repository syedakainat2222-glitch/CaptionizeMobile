'use server';

/**
 * @fileOverview Generates subtitles automatically from a video.
 *
 * - generateSubtitles - A function that handles the automatic subtitle generation process.
 * - GenerateSubtitlesInput - The input type for the generateSubtitles function.
 * - GenerateSubtitlesOutput - The return type for the generateSubtitles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {AssemblyAI} from 'assemblyai';

const assemblyai = new AssemblyAI({
  apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY!,
});

const GenerateSubtitlesInputSchema = z.object({
  videoUrl: z.string().describe('The public URL of the video file.'),
});
export type GenerateSubtitlesInput = z.infer<typeof GenerateSubtitlesInputSchema>;

const GenerateSubtitlesOutputSchema = z.object({
  subtitles: z.string().describe('The generated subtitles in SRT format.'),
});
export type GenerateSubtitlesOutput = z.infer<typeof GenerateSubtitlesOutputSchema>;

export async function generateSubtitles(input: GenerateSubtitlesInput): Promise<GenerateSubtitlesOutput> {
  return generateSubtitlesFlow(input);
}

const generateSubtitlesFlow = ai.defineFlow(
  {
    name: 'generateSubtitlesFlow',
    inputSchema: GenerateSubtitlesInputSchema,
    outputSchema: GenerateSubtitlesOutputSchema,
  },
  async input => {
    // Transcribe the video using AssemblyAI from the provided URL
    const transcript = await assemblyai.transcripts.create({
      audio_url: input.videoUrl,
    });

    if (transcript.status === 'error' || !transcript.id) {
      throw new Error(transcript.error || 'Failed to create transcript.');
    }

    // Get subtitles in SRT format
    const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');

    return {subtitles: srt};
  }
);
