
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to convert SRT time to seconds.
const srtTimeToSeconds = (time: string): number => {
    const parts = time.split(':');
    const secondsAndMs = parts[2].split(',');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(secondsAndMs[0], 10);
    const milliseconds = parseInt(secondsAndMs[1], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId,
      subtitles,
      videoName = 'video',
    } = body;

    if (!videoPublicId || !subtitles) {
      return NextResponse.json(
        { error: 'Missing videoPublicId or subtitles' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: 'Invalid subtitles format' },
        { status: 400 }
      );
    }

    // Create an array of transformation objects for each subtitle
    const subtitleOverlays = subtitles.map(subtitle => {
        const startOffset = srtTimeToSeconds(subtitle.startTime).toFixed(2);
        const endOffset = srtTimeToSeconds(subtitle.endTime).toFixed(2);

        // Sanitize text for Cloudinary overlay.
        // See: https://support.cloudinary.com/hc/en-us/articles/202521512-How-to-add-a-text-overlay-on-an-image
        const sanitizedText = subtitle.text
            .replace(/,/g, '%2C')
            .replace(/\//g, '%2F')
            .replace(/\?/g, '%3F')
            .replace(/&/g, '%26')
            .replace(/#/g, '%23')
            .replace(/\\/g, '%5C')
            .replace(/%/g, '%25')
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');

        return {
            overlay: {
                font_family: 'Inter',
                font_size: 48,
                text: sanitizedText,
            },
            color: 'white',
            background: 'rgba:0,0,0,0.5',
            gravity: 'south',
            y: 50,
            start_offset: startOffset,
            end_offset: endOffset,
        };
    });

    // Generate the URL with the transformation layers
    const transformedVideoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: subtitleOverlays,
        format: 'mp4',
        secure: true, // Force HTTPS URL
    });
    

    if (!transformedVideoUrl) {
      throw new Error('The video processing flow did not return a URL.');
    }

    // Fetch the video from the Cloudinary URL
    const videoResponse = await fetch(transformedVideoUrl);

    if (!videoResponse.ok || !videoResponse.body) {
      throw new Error(
        `Failed to fetch processed video from Cloudinary: ${videoResponse.statusText}`
      );
    }

    const processedFilename = `${videoName.split('.')[0]}-with-subtitles.mp4`;

    // Stream the video back to the client
    return new NextResponse(videoResponse.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${processedFilename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to burn in subtitles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
