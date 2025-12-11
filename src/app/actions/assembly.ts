'use server';

import { AssemblyAI } from 'assemblyai';
import { Subtitle, parse } from 'subtitle';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
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

  const srt = await client.transcripts.export(transcript.id, 'srt');

  if (!srt) {
    throw new Error('Failed to export SRT');
  }

  const subtitles = parse(srt);

  return subtitles as Subtitle[];
}
