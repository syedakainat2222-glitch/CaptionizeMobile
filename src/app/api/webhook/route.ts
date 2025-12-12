'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';
import { toSrt } from '@/lib/toSrt';

const webhookPayloadSchema = z.object({
    transcript_id: z.string(),
    status: z.string(), // e.g., 'completed', 'error'
});

async function getTranscriptAndSave(transcriptId: string) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error('AssemblyAI API key is not configured.');

    const assemblyai = new AssemblyAI({ apiKey });
    const transcript = await assemblyai.transcripts.get(transcriptId);

    if (transcript.status !== 'completed' || !transcript.words) {
        console.log(`Transcript ${transcriptId} is not ready or has no words.`);
        return;
    }

    const srt = toSrt(transcript.words);
    
    // For now, we will log the SRT to the console. We will add database logic here later.
    console.log('Generated SRT:', srt);
    console.log(`Saved SRT for transcript: ${transcriptId}`);

    // Example of what we WILL do next:
    // await db.collection('videos').doc(transcript.id).update({ subtitles: srt, status: 'completed' });
}

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // Security: It is critical to verify the webhook comes from AssemblyAI.
        // We will add this logic in a future step.

        const validation = webhookPayloadSchema.safeParse(payload);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { transcript_id, status } = validation.data;

        if (status === 'completed') {
            await getTranscriptAndSave(transcript_id);
        } else {
            console.log(`Webhook received for transcript ${transcript_id} with status: ${status}`);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
