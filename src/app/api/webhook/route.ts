'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';
import { toSrt } from '@/lib/toSrt';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';


const webhookPayloadSchema = z.object({
    transcript_id: z.string(),
    status: z.string(), // e.g., 'completed', 'error'
});

async function getTranscriptAndSave(transcriptId: string, videoId: string) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error('AssemblyAI API key is not configured.');

    const assemblyai = new AssemblyAI({ apiKey });
    const transcript = await assemblyai.transcripts.get(transcriptId);

    if (transcript.status !== 'completed' || !transcript.words) {
        console.log(`Transcript ${transcriptId} is not ready or has no words.`);
        // Optionally, update the video status to 'error'
        const videoDocRef = doc(db, 'videos', videoId);
        await updateDoc(videoDocRef, {
            status: 'error',
            error: `Transcription failed or produced no words. Status: ${transcript.status}`
        });
        return;
    }

    const srt = toSrt(transcript.words);
    
    // Update the video document in Firestore
    const videoDocRef = doc(db, 'videos', videoId);
    await updateDoc(videoDocRef, {
        subtitles: srt,
        status: 'completed',
    });

    console.log(`Saved SRT for video: ${videoId}`);
}

export async function POST(req: NextRequest) {
    try {
        // Extract video_id from the query parameters
        const videoId = req.nextUrl.searchParams.get('video_id');
        if (!videoId) {
            return NextResponse.json({ error: 'video_id query parameter is missing' }, { status: 400 });
        }
        
        const payload = await req.json();

        // Security: It is critical to verify the webhook comes from AssemblyAI.
        // We will add this logic in a future step.

        const validation = webhookPayloadSchema.safeParse(payload);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { transcript_id, status } = validation.data;

        if (status === 'completed') {
            await getTranscriptAndSave(transcript_id, videoId);
        } else if (status === 'error') {
            console.error(`Webhook received error for transcript ${transcript_id}:`, payload);
            // Update the video document to reflect the error
            const videoDocRef = doc(db, 'videos', videoId);
            await updateDoc(videoDocRef, {
                status: 'error',
                error: (payload as any).error || 'Transcription failed.'
            });
        } else {
            console.log(`Webhook received for transcript ${transcript_id} with status: ${status}`);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
