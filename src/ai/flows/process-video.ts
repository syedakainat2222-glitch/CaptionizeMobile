'use server';
export async function processVideo(input: any) {
  return {
    videoUrl: input.videoDataUri || 'https://example.com/mock-video.mp4',
    publicId: 'mock-id-' + Date.now(),
    subtitles: '1\n00:00:00,000 --> 00:00:05,000\nMock subtitle\n\n2\n00:00:05,000 --> 00:00:10,000\nMock subtitle 2'
  };
}
