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
    // 1. Upload to Cloudinary
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

    // 2. Generate Subtitles with AssemblyAI
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error('AssemblyAI API key is not configured. Please add ASSEMBLYAI_API_KEY to your environment variables.');
    }
    const assemblyai = new AssemblyAI({ apiKey });
    
    const transcript = await assemblyai.transcripts.create({
      audio_url: videoUrl,
    });

    if (transcript.status === 'error' || !transcript.id) {
      throw new Error(transcript.error || 'Failed to create transcript with AssemblyAI.');
    }
    
    const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');
    
    if (!srt) {
        throw new Error('Failed to generate SRT subtitles from transcript.');
    }

    // 3. Return all results
    return {
      videoUrl: videoUrl,
      publicId: uploadResult.public_id,
      subtitles: srt,
    };
  }
);
