'use server';
import { z } from 'zod';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { AssemblyAI } from 'assemblyai';
import ytdl from '@distube/ytdl-core';

const ProcessYoutubeVideoInputSchema = z.object({
  youtubeUrl: z.string().url(),
  languageCode: z.string().optional(),
});
export type ProcessYoutubeVideoInput = z.infer<typeof ProcessYoutubeVideoInputSchema>;

const ProcessYoutubeVideoOutputSchema = z.object({
  videoUrl: z.string(),
  publicId: z.string(),
  subtitles: z.string(),
  videoName: z.string(),
});
export type ProcessYoutubeVideoOutput = z.infer<typeof ProcessYoutubeVideoOutputSchema>;

export async function processYoutubeVideo(input: ProcessYoutubeVideoInput): Promise<ProcessYoutubeVideoOutput> {
  // Your existing logic here, remove defineFlow wrapper
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
  const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

  if (!ytdl.validateURL(input.youtubeUrl)) {
    throw new Error('Invalid YouTube URL provided.');
  }
  
  const requestOptions = {
    headers: {
      cookie: process.env.YOUTUBE_COOKIE || '',
    },
  };
  
  const info = await ytdl.getInfo(input.youtubeUrl, { requestOptions });
  const videoName = info.videoDetails.title;
  const videoStream = ytdl(input.youtubeUrl, {
    requestOptions,
    quality: 'highestaudio',
  });

  const publicId = `captionize-youtube-${info.videoDetails.videoId}-${Date.now()}`;
  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        if (!result) return reject(new Error('Cloudinary upload failed (no result).'));
        resolve(result);
      }
    );
    videoStream.pipe(uploadStream);
  });

  if (!uploadResult.secure_url) {
    throw new Error('Cloudinary did not return a secure URL.');
  }
  const uploadedVideoUrl = uploadResult.secure_url;

  const transcriptParams: {
    audio_url: string;
    language_code?: string;
    language_detection?: boolean;
  } = {
    audio_url: uploadedVideoUrl,
    language_detection: !input.languageCode || input.languageCode === 'auto',
  };
  
  if (input.languageCode && input.languageCode !== 'auto') {
    transcriptParams.language_code = input.languageCode;
    transcriptParams.language_detection = false;
  }

  let transcript = await assemblyai.transcripts.create(transcriptParams);

  while (transcript.status !== 'completed' && transcript.status !== 'error') {
    await new Promise((r) => setTimeout(r, 3000));
    transcript = await assemblyai.transcripts.get(transcript.id);
  }

  if (transcript.status === 'error') {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  const vtt = await assemblyai.transcripts.subtitles(transcript.id, 'vtt');
  if (vtt === null || vtt === undefined) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    throw new Error('Failed to generate VTT subtitles from transcription.');
  }

  return {
    videoUrl: uploadedVideoUrl,
    publicId: publicId,
    subtitles: vtt,
    videoName: `${videoName}.mp4`,
  };
}