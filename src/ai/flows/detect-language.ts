'use server';

import { AssemblyAI } from 'assemblyai';

export async function detectLanguage(input: { videoUrl: string }) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
        throw new Error('AssemblyAI API key is not configured.');
    }
    
    try {
        const assemblyai = new AssemblyAI({ apiKey });

        const transcript = await assemblyai.transcripts.create({
            audio_url: input.videoUrl,
            language_detection: true, 
        });

        if (transcript.status === 'error') {
            throw new Error(`Language detection failed: ${transcript.error}`);
        }
        
        if (!transcript.language_code) {
            console.warn('AssemblyAI could not detect language, falling back to English.');
            return 'en_us'; 
        }

        return transcript.language_code;
    } catch (error) {
        console.error('Language detection error:', error);
        throw new Error('Failed to detect language');
    }
}