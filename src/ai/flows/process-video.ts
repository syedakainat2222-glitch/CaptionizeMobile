'use server';
/**
 * @fileOverview This file defines a Genkit flow for processing a video.
 * It uploads the video to Cloudinary and generates subtitles using AssemblyAI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';
import { AssemblyAI } from 'assemblyai';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ProcessVideoInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      'A video file as a data URI, including MIME type and Base64 encoding.'
    ),
});
export type ProcessVideoInput = z.infer<typeof ProcessVideoInputSchema>;

const ProcessVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The public URL of the video in Cloudinary.'),
  publicId: z
    .string()
    .describe('The public ID of the video in Cloudinary.'),
  subtitles: z.string().describe('The generated subtitles in SRT format.'),
});
export type ProcessVideoOutput = z.infer<typeof ProcessVideoOutputSchema>;

export async function processVideo(
  input: ProcessVideoInput
): Promise<ProcessVideoOutput> {
  return processVideoFlow(input);
}

const processVideoFlow = ai.defineFlow(
  {
    name: 'processVideoFlow',
    inputSchema: ProcessVideoInputSchema,
    outputSchema: ProcessVideoOutputSchema,
  },
  async ({ videoDataUri }) => {
    // 1. Verify all environment variables are present
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary Cloud Name is not configured. Please add CLOUDINARY_CLOUD_NAME to your environment variables.');
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      throw new Error('Cloudinary API Key is not configured. Please add CLOUDINARY_API_KEY to your environment variables.');
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary API Secret is not configured. Please add CLOUDINARY_API_SECRET to your environment variables.');
    }
    const assemblyaiApiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyaiApiKey) {
      throw new Error('AssemblyAI API key is not configured. Please add ASSEMBLYAI_API_KEY to your environment variables.');
    }

    // 2. Upload to Cloudinary
    const public_id = `captionize-video-${Date.now()}`;
    const uploadResult = await cloudinary.uploader.upload(videoDataUri, {
      resource_type: 'video',
      public_id: public_id,
      overwrite: true,
    });

    if (!uploadResult || !uploadResult.secure_url) {
        throw new Error('Failed to upload video to Cloudinary.');
    }

    const videoUrl = uploadResult.secure_url;

    // 3. Generate Subtitles with AssemblyAI
    const assemblyai = new AssemblyAI({ apiKey: assemblyaiApiKey });
    
    const transcript = await assemblyai.transcripts.create({
      audio_url: videoUrl,
      language_detection: true, // Enable automatic language detection
    });

    if (transcript.status === 'error' || !transcript.id) {
      throw new Error(transcript.error || 'Failed to create transcript with AssemblyAI.');
    }
    
    const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');
    
    if (!srt) {
        throw new Error('Failed to generate SRT subtitles from transcript.');
    }

    // 4. Return all results
    return {
      videoUrl: videoUrl,
      publicId: uploadResult.public_id,
      subtitles: srt,
    };
  }
);
