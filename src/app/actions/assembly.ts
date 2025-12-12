'use server';

import { AssemblyAI } from 'assemblyai';
import { parse } from 'subtitle';
import type { Subtitle } from '../../lib/srt';
import { streamToArray } from '../../lib/utils';
import { Readable } from 'stream';

const apiKey = process.env.ASSEMBLYAI_API_KEY;
if (!apiKey) {
  throw new Error('ASSEMBLYAI_API_KEY environment variable is not set');
}

const client = new AssemblyAI({
  apiKey,
});

export async function generateSubtitles(audio_url: string, language_code?: string): Promise<Subtitle[]> {
  const config = {
    audio_url,
    language_code,
    speaker_labels: true,
  };

  const transcript = await client.transcripts.transcribe(config);

  if (transcript.status === 'error') {
    throw new Error(transcript.error);
  }

  const srt = await client.transcripts.subtitles(transcript.id, 'srt');

  if (!srt) {
    throw new Error('Failed to export SRT');
  }

  const readable = new Readable();
  readable.push(srt);
  readable.push(null);

  const subtitlesStream = readable.pipe(parse());
  const subtitles = await streamToArray<Subtitle>(subtitlesStream);

  return subtitles;
}
