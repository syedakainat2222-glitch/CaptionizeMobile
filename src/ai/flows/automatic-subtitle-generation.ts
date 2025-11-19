'use server';

import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';

const POLLING_INTERVAL = 3000; // 3 seconds
const TIMEOUT = 180000; // 3 minutes

// Input validation schema
const AutomaticSubtitleInputSchema = z.object({
    videoUrl: z.string().describe('The public URL of the video file.'),
    languageCode: z.string().optional().describe('The language of the video.'),
});

export async function automaticSubtitleGeneration(input: { 
    videoUrl: string; 
    languageCode?: string;
}) {
    // Validate input
    const validatedInput = AutomaticSubtitleInputSchema.parse(input);
    
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
        throw new Error('AssemblyAI API key is not configured. Please add ASSEMBLYAI_API_KEY to your environment variables.');
    }
    
    const assemblyai = new AssemblyAI({ apiKey });

    try {
        let transcript = await assemblyai.transcripts.create({
            audio_url: validatedInput.videoUrl,
            language_code: validatedInput.languageCode as any,
        });

        const startTime = Date.now();
        while (true) {
            if (Date.now() - startTime > TIMEOUT) {
                throw new Error('Transcription timed out.');
            }

            transcript = await assemblyai.transcripts.get(transcript.id);

            if (transcript.status === 'completed') {
                const srt = await assemblyai.transcripts.subtitles(transcript.id, 'srt');
                return srt;
            } else if (transcript.status === 'error') { // Fixed: changed 'failed' to 'error'
                throw new Error(`Transcription failed: ${transcript.error}`);
            }

            await new Promise(res => setTimeout(res, POLLING_INTERVAL));
        }
    } catch (error) {
        console.error('Automatic subtitle generation error:', error);
        throw new Error(`Failed to generate subtitles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}