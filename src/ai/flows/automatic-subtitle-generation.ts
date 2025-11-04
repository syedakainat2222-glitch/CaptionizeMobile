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
import {v2 as cloudinary} from 'cloudinary';
import {AssemblyAI} from 'assemblyai';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

const GenerateSubtitlesInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
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
    // Upload the video to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(input.videoDataUri, {
      resource_type: 'video',
    });

    // Transcribe the video using AssemblyAI
    const transcript = await assemblyai.transcripts.create({
      audio_url: uploadResult.secure_url,
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }
    
    if(!transcript.id) {
        throw new Error('No transcript ID returned from AssemblyAI');
    }

    // Get subtitles in SRT format
    const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');

    return {subtitles: srt};
  }
);
