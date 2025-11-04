'use server';

/**
 * @fileOverview Generates subtitles automatically from a video.
 *
 * - generateSubtitles - A function that handles the automatic subtitle generation process.
 * - GenerateSubtitlesInput - The input type for the generateSubtitles function.
 * - GenerateSubtitlesOutput - The return type for the generateSubtitles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateSubtitlesInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      'A video file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // keep the single quotes, they are needed in the string
    ),
});
export type GenerateSubtitlesInput = z.infer<typeof GenerateSubtitlesInputSchema>;

const GenerateSubtitlesOutputSchema = z.object({
  subtitles: z.string().describe('The generated subtitles in SRT format.'),
});
export type GenerateSubtitlesOutput = z.infer<typeof GenerateSubtitlesOutputSchema>;

export async function generateSubtitles(input: GenerateSubtitlesInput): Promise<GenerateSubtitlesOutput> {
  return generateSubtitlesFlow(input);
}

const generateSubtitlesPrompt = ai.definePrompt({
  name: 'generateSubtitlesPrompt',
  input: {schema: GenerateSubtitlesInputSchema},
  output: {schema: GenerateSubtitlesOutputSchema},
  prompt: `You are an AI expert in generating subtitles for videos. You will receive the video content as input, and your task is to generate subtitles in SRT format.

Ensure the subtitles are properly timed and accurately reflect the spoken content in the video.

Video Content: {{media url=videoDataUri}}`,
});

const generateSubtitlesFlow = ai.defineFlow(
  {
    name: 'generateSubtitlesFlow',
    inputSchema: GenerateSubtitlesInputSchema,
    outputSchema: GenerateSubtitlesOutputSchema,
  },
  async input => {
    // Ideally, we'd convert video to audio here using a library like ffmpeg,
    // but due to the limitations of the environment, we'll assume
    // the video is already in a suitable audio format.
    //
    // const audioBuffer = await convertVideoToAudio(input.videoDataUri);

    // For now, we will just return a dummy subtitle to prove it works.
    // const subtitles = await transcribeAudio(audioBuffer);

    const {output} = await generateSubtitlesPrompt(input);

    return output!;
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

