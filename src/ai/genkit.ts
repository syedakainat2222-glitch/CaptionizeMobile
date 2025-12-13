// Simple mock AI functions - no Genkit
export const ai = {
  suggestCorrections: async () => ({ suggestions: [] }),
  processVideo: async (input: any) => ({ 
    videoUrl: input.videoDataUri || 'https://example.com/mock-video.mp4',
    publicId: 'mock-id',
    subtitles: '1\n00:00:00,000 --> 00:00:05,000\nMock subtitle'
  })
};

export const aiSuggestedCorrections = async () => ({ suggestions: [] });
export const processVideo = async (input: any) => ({ 
  videoUrl: input.videoDataUri || 'https://example.com/mock-video.mp4',
  publicId: 'mock-id',
  subtitles: '1\n00:00:00,000 --> 00:00:05,000\nMock subtitle'
});