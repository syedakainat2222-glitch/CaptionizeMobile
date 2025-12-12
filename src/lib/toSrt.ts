
import { Word } from 'assemblyai';

function toTimeFormat(milliseconds: number): string {
    const date = new Date(milliseconds);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${ms}`;
}

// --- Professional Segment Generation Logic ---

function buildSegmentLines(words: { text: string }[]): string {
    const MAX_CHARS_PER_LINE = 42;
    if (!words.length) return '';
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
        if (currentLine.length === 0) {
            currentLine = word.text;
        } else if ((currentLine + ' ' + word.text).length > MAX_CHARS_PER_LINE) {
            lines.push(currentLine);
            currentLine = word.text;
        } else {
            currentLine += ' ' + word.text;
        }
    });
    lines.push(currentLine);
    return lines.join('\n');
}

function createProfessionalSegments(words: { text: string; start: number; end: number }[]): { start: number; end: number; text: string }[] {
    if (!words.length) return [];
    const PAUSE_THRESHOLD_MS = 700;
    const MAX_SEGMENT_DURATION_MS = 7000;
    const MAX_SEGMENT_CHARS = 90;
    const segments: { start: number; end: number; text: string }[] = [];
    let currentSegmentWords: { text: string; start: number; end: number }[] = [];
    for (const word of words) {
        const potentialSegmentWords = [...currentSegmentWords, word];
        const segmentStartTime = potentialSegmentWords[0].start;
        const segmentText = potentialSegmentWords.map(w => w.text).join(' ');
        const isLongPause = currentSegmentWords.length > 0 && (word.start - currentSegmentWords[currentSegmentWords.length - 1].end > PAUSE_THRESHOLD_MS);
        const isSegmentTooLong = word.end - segmentStartTime > MAX_SEGMENT_DURATION_MS;
        const isTextTooLong = segmentText.length > MAX_SEGMENT_CHARS;
        if (isLongPause || isSegmentTooLong || isTextTooLong) {
            if (currentSegmentWords.length > 0) {
                segments.push({
                    start: currentSegmentWords[0].start,
                    end: currentSegmentWords[currentSegmentWords.length - 1].end,
                    text: buildSegmentLines(currentSegmentWords),
                });
            }
            currentSegmentWords = [word];
        } else {
            currentSegmentWords.push(word);
        }
    }
    if (currentSegmentWords.length > 0) {
        segments.push({
            start: currentSegmentWords[0].start,
            end: currentSegmentWords[currentSegmentWords.length - 1].end,
            text: buildSegmentLines(currentSegmentWords),
        });
    }
    return segments;
}

export function toSrt(words: Word[]): string {
    if (!words || words.length === 0) return '';
    const segments = createProfessionalSegments(words);
    const srt = segments.map((segment, index) => {
        return `${index + 1}\n${toTimeFormat(segment.start)} --> ${toTimeFormat(segment.end)}\n${segment.text}`;
    }).join('\n\n');
    return srt;
}
