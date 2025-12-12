'use server';

import { Subtitle } from '@/lib/types';
import { AssemblyAI } from 'assemblyai';

const assemblyAiApiKey = process.env.ASSEMBLYAI_API_KEY;
if (!assemblyAiApiKey) {
  throw new Error('Missing ASSEMBLYAI_API_KEY environment variable');
}

const client = new AssemblyAI({
  apiKey: assemblyAiApiKey,
});

const formatTimestamp = (seconds: number) => {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${secs},${ms}`;
};

export async function generateSubtitles(audio_url: string, language_code?: string): Promise<Subtitle[]> {
  const config = {
    audio_url,
    punctuate: true,
    language_code,
  };

  const transcript = await client.transcripts.transcribe(config);

  if (transcript.status === 'error') {
    throw new Error(transcript.error);
  }

  if (!transcript.words) {
    return [];
  }

  const subtitles: Subtitle[] = transcript.words.map((word, index) => ({
    id: index + 1,
    startTime: formatTimestamp(word.start / 1000),
    endTime: formatTimestamp(word.end / 1000),
    text: word.text,
  }));

  return subtitles;
}
