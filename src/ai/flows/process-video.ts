'use server';

export async function processVideo(input: { videoUrl: string }) {
  // Mock implementation for now
  console.log('Process video called with:', input.videoUrl);
  return { result: 'processed' };
}
