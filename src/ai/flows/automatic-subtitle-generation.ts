'use server';

import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';

const AutomaticSubtitleInputSchema = z.object({
    videoUrl: z.string().describe('The public URL of the video file.'),
    languageCode: z.string().optional().describe('The language of the video.'),
    webhookUrl: z.string().url().optional().describe('The webhook URL to notify upon completion.'),
});

export async function automaticSubtitleGeneration(input: {
    videoUrl: string;
    languageCode?: string;
    webhookUrl?: string;
}) {
    const validatedInput = AutomaticSubtitleInputSchema.parse(input);
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error('AssemblyAI API key is not configured.');

    const assemblyai = new AssemblyAI({ apiKey });

    try {
        const transcript = await assemblyai.transcripts.create({
            audio_url: validatedInput.videoUrl,
            language_code: validatedInput.languageCode as any,
            webhook_url: validatedInput.webhookUrl,
        });

        return transcript;

    } catch (error) {
        console.error('Automatic subtitle generation error:', error);
        throw new Error(`Failed to start subtitle generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
