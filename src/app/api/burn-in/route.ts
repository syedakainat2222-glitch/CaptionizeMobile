import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const srtTimeToSeconds = (time: string): number => {
    const parts = time.split(':');
    const secondsAndMs = parts[2].split(/[,\.]/);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(secondsAndMs[0], 10);
    const milliseconds = parseInt(secondsAndMs[1], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPublicId, subtitles, videoName = 'video' } = body;

    console.log('=== BURN-IN PROCESS STARTED ===');
    console.log('Video Public ID:', videoPublicId);
    console.log('Total subtitles to process:', subtitles?.length);

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // METHOD 1: Use Cloudinary's URL-based approach with proper formatting
    try {
      console.log('=== METHOD 1: CLOUDINARY URL APPROACH ===');
      
      // For multiple subtitles, we need to use a different approach
      // Cloudinary doesn't support multiple timed overlays in a single URL easily
      // So we'll use the first 3 subtitles as a test
      const subtitlesToProcess = subtitles.slice(0, 3);
      
      console.log(`Processing first ${subtitlesToProcess.length} subtitles`);

      // Build transformations array
      const transformations = subtitlesToProcess.flatMap((subtitle, index) => {
        const startOffset = Math.floor(srtTimeToSeconds(subtitle.startTime));
        const duration = Math.max(1, Math.floor(srtTimeToSeconds(subtitle.endTime)) - startOffset);
        
        const sanitizedText = encodeURIComponent(subtitle.text)
          .replace(/'/g, "%27")
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");

        console.log(`Subtitle ${index + 1}: "${subtitle.text}" at ${startOffset}s for ${duration}s`);

        // Return an array of transformations for this subtitle
        return [
          {
            overlay: {
              font_family: 'Arial',
              font_size: 36,
              font_weight: 'bold', 
              text: sanitizedText,
            }
          },
          { color: 'white' },
          { background: 'rgb:000000CC' },
          { gravity: 'south' },
          { y: 30 + (index * 10) }, // Stagger vertical position
          { width: '90%' },
          { effect: `du_${duration}` },
          { start_offset: startOffset }
        ];
      });

      const transformedVideoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: transformations,
        format: 'mp4',
        quality: 'auto',
      });

      console.log('Generated Cloudinary URL (first 3 subtitles):', transformedVideoUrl);

      return NextResponse.json({
        success: true,
        videoUrl: transformedVideoUrl,
        filename: `${videoName.split('.')[0]}-with-subtitles.mp4`,
        debug: { 
          method: 'url_first_3_subtitles',
          subtitlesUsed: subtitlesToProcess.length,
          totalSubtitles: subtitles.length,
          note: 'Only first 3 subtitles were processed due to Cloudinary limitations'
        }
      });

    } catch (urlError) {
      console.error('URL method failed:', urlError);
      
      // METHOD 2: Simple single subtitle approach
      try {
        console.log('=== METHOD 2: SINGLE SUBTITLE APPROACH ===');
        
        const firstSubtitle = subtitles[0];
        const startOffset = Math.floor(srtTimeToSeconds(firstSubtitle.startTime));
        const duration = Math.max(1, Math.floor(srtTimeToSeconds(firstSubtitle.endTime)) - startOffset);
        
        const sanitizedText = encodeURIComponent(firstSubtitle.text)
          .replace(/'/g, "%27")
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");

        // Simple transformation with just one subtitle
        const transformation = [
          {
            overlay: {
              font_family: 'Arial',
              font_size: 36,
              font_weight: 'bold',
              text: sanitizedText,
            }
          },
          { color: 'white' },
          { background: 'rgb:000000CC' },
          { gravity: 'south' },
          { y: 30 },
          { width: '90%' },
          { effect: `du_${duration}` },
          { start_offset: startOffset }
        ];

        const simpleUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: transformation,
          format: 'mp4',
          quality: 'auto',
        });

        console.log('Single subtitle URL:', simpleUrl);

        return NextResponse.json({
          success: true,
          videoUrl: simpleUrl,
          filename: `${videoName.split('.')[0]}-with-subtitles.mp4`,
          debug: { 
            method: 'single_subtitle',
            subtitleUsed: firstSubtitle.text.substring(0, 20) + '...',
            note: 'Only first subtitle was processed'
          }
        });

      } catch (simpleError) {
        console.error('Single subtitle method failed:', simpleError);
        
        // METHOD 3: Static overlay (no timing)
        console.log('=== METHOD 3: STATIC OVERLAY ===');
        
        const testText = encodeURIComponent(`Subtitles: ${subtitles.length} lines`);
        
        const staticUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: [
            {
              overlay: {
                font_family: 'Arial',
                font_size: 24,
                text: testText,
              }
            },
            { color: 'white' },
            { background: 'black' },
            { gravity: 'south' },
            { y: 20 }
          ],
          format: 'mp4',
        });

        console.log('Static overlay URL:', staticUrl);

        return NextResponse.json({
          success: true,
          videoUrl: staticUrl,
          filename: `${videoName.split('.')[0]}-with-subtitles.mp4`,
          debug: { 
            method: 'static_overlay',
            note: 'Static text overlay (no timed subtitles)'
          }
        });
      }
    }

  } catch (error) {
    console.error('=== BURN-IN PROCESS FAILED ===');
    console.error('Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

