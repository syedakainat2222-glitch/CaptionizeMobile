'use server';

import { flow } from '@genkit-ai/core';
import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';

export const automaticSubtitleGeneration = flow(
  {
    name: 'automaticSubtitleGeneration',
    inputSchema: z.object({
      videoUrl: z.string().describe('The public URL of the video file.'),
      languageCode: z.string().optional().describe('The language of the video.'),
    }),
    outputSchema: z.string().describe('The generated subtitles in SRT format.'),
  },
  async (input) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error('AssemblyAI API key is not configured. Please add ASSEMBLYAI_API_KEY to your environment variables.');
    }
    const assemblyai = new AssemblyAI({ apiKey });

    const transcript = await assemblyai.transcripts.create({
      audio_url: input.videoUrl,
      language_code: input.languageCode as any,
    });

    if (transcript.status === 'error' || !transcript.id) {
      throw new Error(transcript.error || 'Failed to create transcript.');
    }

    const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');
    return srt;
  }
);
