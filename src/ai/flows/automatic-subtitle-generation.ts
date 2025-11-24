'use server';

import { z } from 'zod';
import { AssemblyAI } from 'assemblyai';

const POLLING_INTERVAL = 3000; // 3 seconds
const TIMEOUT = 180000; // 3 minutes

const AutomaticSubtitleInputSchema = z.object({
    videoUrl: z.string().describe('The public URL of the video file.'),
    languageCode: z.string().optional().describe('The language of the video.'),
});

const toSrtTime = (ms: number): string => {
    const date = new Date(ms);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

// --- NEW ROBUST MULTI-CONDITION SEGMENTATION LOGIC ---

function buildSegmentLines(words: { text: string }[]): string {
    const MAX_CHARS_PER_LINE = 42;
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length === 0) {
            currentLine = word.text;
        } else if ((currentLine + ' ' + word.text).length > MAX_CHARS_PER_LINE) {
            lines.push(currentLine);
            currentLine = word.text;
        } else {
            currentLine += ' ' + word.text;
        }
    }
    lines.push(currentLine);
    return lines.join('\n');
}

function createProfessionalSegments(words: { text: string; start: number; end: number }[]): { start: number; end: number; text: string }[] {
    if (!words.length) return [];

    const PAUSE_THRESHOLD_MS = 700;
    const MAX_SEGMENT_DURATION_MS = 7000; // 7 seconds

    const segments = [];
    let currentSegmentWords = [];

    for (const word of words) {
        if (currentSegmentWords.length === 0) {
            currentSegmentWords.push(word);
            continue;
        }

        const lastWordInSegment = currentSegmentWords[currentSegmentWords.length - 1];
        const segmentStartTime = currentSegmentWords[0].start;

        // --- Break Conditions ---
        const isLongPause = word.start - lastWordInSegment.end > PAUSE_THRESHOLD_MS;
        const isSegmentTooLong = word.end - segmentStartTime > MAX_SEGMENT_DURATION_MS;

        if (isLongPause || isSegmentTooLong) {
            segments.push({
                start: segmentStartTime,
                end: lastWordInSegment.end,
                text: buildSegmentLines(currentSegmentWords),
            });
            currentSegmentWords = [word]; // Start new segment
        } else {
            currentSegmentWords.push(word);
        }
    }

    // Add the final segment
    if (currentSegmentWords.length > 0) {
        const lastWordInSegment = currentSegmentWords[currentSegmentWords.length - 1];
        const segmentStartTime = currentSegmentWords[0].start;
        segments.push({
            start: segmentStartTime,
            end: lastWordInSegment.end,
            text: buildSegmentLines(currentSegmentWords),
        });
    }

    return segments;
}

export async function automaticSubtitleGeneration(input: { 
    videoUrl: string; 
    languageCode?: string;
}) {
    const validatedInput = AutomaticSubtitleInputSchema.parse(input);
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error('AssemblyAI API key is not configured.');
    
    const assemblyai = new AssemblyAI({ apiKey });

    try {
        let transcript = await assemblyai.transcripts.create({
            audio_url: validatedInput.videoUrl,
            language_code: validatedInput.languageCode as any,
        });

        const startTime = Date.now();
        while (true) {
            if (Date.now() - startTime > TIMEOUT) throw new Error('Transcription timed out.');

            transcript = await assemblyai.transcripts.get(transcript.id);

            if (transcript.status === 'completed') {
                if (!transcript.words || transcript.words.length === 0) return '';

                const segments = createProfessionalSegments(transcript.words);

                const srt = segments.map((segment, index) => {
                    return `${index + 1}\n${toSrtTime(segment.start)} --> ${toSrtTime(segment.end)}\n${segment.text}`;
                }).join('\n\n');

                return srt;

            } else if (transcript.status === 'error') {
                throw new Error(`Transcription failed: ${transcript.error}`);
            }

            await new Promise(res => setTimeout(res, POLLING_INTERVAL));
        }
    } catch (error) {
        console.error('Automatic subtitle generation error:', error);
        throw new Error(`Failed to generate subtitles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}