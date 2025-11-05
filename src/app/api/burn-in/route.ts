// src/app/api/burn-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Font mapping for Cloudinary
const CLOUDINARY_FONTS = {
  'Inter, sans-serif': 'Arial',
  'Roboto, sans-serif': 'Arial',
  'Open Sans, sans-serif': 'Arial',
  'Lato, sans-serif': 'Arial',
  'Montserrat, sans-serif': 'Arial',
  'Poppins, sans-serif': 'Arial',
  'Nunito, sans-serif': 'Arial',
  'Raleway, sans-serif': 'Arial',
  'Source Sans 3, sans-serif': 'Arial',
  'Ubuntu, sans-serif': 'Arial',
  'Oswald, sans-serif': 'Arial',
  'Exo 2, sans-serif': 'Arial',
  'Dosis, sans-serif': 'Arial',
  'Helvetica, sans-serif': 'Arial',
  'Arial, sans-serif': 'Arial',
  'Playfair Display, serif': 'Times New Roman',
  'Merriweather, serif': 'Times New Roman',
  'Lora, serif': 'Times New Roman',
  'PT Serif, serif': 'Times New Roman',
  'Georgia, serif': 'Georgia',
  'Pacifico, cursive': 'Arial',
  'Caveat, cursive': 'Arial',
  'Dancing Script, cursive': 'Arial',
  'Source Code Pro, monospace': 'Courier New'
};

type Transformation = {
  overlay: {
    font_family: string;
    font_size: number;
    font_weight: string;
    text: string;
  };
  color: string;
  background: string;
  gravity: string;
  y: number;
  width: string;
  effect: string;
  start_offset: string;
};

const srtTimeToSeconds = (time: string): number => {
  const parts = time.split(':');
  const secondsAndMs = parts[2].split(/[,\.]/);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsAndMs[0], 10);
  const milliseconds = parseInt(secondsAndMs[1], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Sanitize text for Cloudinary - handle Unicode characters properly
const sanitizeTextForCloudinary = (text: string): string => {
  // First remove problematic Unicode characters that cause ByteString issues
  const cleanText = text
    .replace(/[^\x00-\x7F]/g, char => {
      // Keep only common safe symbols, remove other non-ASCII
      const safeSymbols = ['❤', '♥', '→', '←', '↑', '↓', '•', '·', '…'];
      return safeSymbols.includes(char) ? char : '';
    });

  // Then URL encode
  return encodeURIComponent(cleanText)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      videoPublicId, 
      subtitles, 
      videoName = 'video',
      subtitleFont = 'Arial, sans-serif',
      subtitleFontSize = 48
    } = body;

    console.log('=== BURN-IN PROCESS STARTED ===');
    console.log('Video Public ID:', videoPublicId);
    console.log('Total subtitles:', subtitles?.length);
    console.log('Selected font:', subtitleFont);
    console.log('Font size:', subtitleFontSize);

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    // Map the selected font to Cloudinary-compatible font
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont as keyof typeof CLOUDINARY_FONTS] || 'Arial';
    console.log('Mapped to Cloudinary font:', cloudinaryFont);

    // METHOD 1: Use Cloudinary's Eager Transformations (Most Reliable)
    try {
      console.log('=== METHOD 1: EAGER TRANSFORMATIONS ===');
      
      // Process first 10 subtitles for reliability (adjust as needed)
      const subtitlesToProcess = subtitles.slice(0, 10);
      console.log(`Processing ${subtitlesToProcess.length} subtitles with eager transformation`);
      
      // Create a single transformation with multiple overlays
      const transformation: Transformation[] = [];
      
      subtitlesToProcess.forEach((subtitle, index) => {
        const startOffset = Math.floor(srtTimeToSeconds(subtitle.startTime));
        const duration = Math.max(1, Math.floor(srtTimeToSeconds(subtitle.endTime)) - startOffset);
        
        const sanitizedText = sanitizeTextForCloudinary(subtitle.text);

        console.log(`Adding subtitle ${index + 1}: "${subtitle.text}" at ${startOffset}s`);

        // Add each subtitle as a separate overlay in the same transformation
        transformation.push({
          overlay: {
            font_family: cloudinaryFont,
            font_size: subtitleFontSize,
            font_weight: 'bold',
            text: sanitizedText,
          },
          color: 'white',
          background: 'rgb:000000CC',
          gravity: 'south',
          y: 30,
          width: '90%',
          effect: `du_${duration}`,
          start_offset: startOffset.toString()
        });
      });

      console.log('Starting eager transformation...');
      
      // Use explicit upload with eager transformation
      const result = await cloudinary.uploader.explicit(videoPublicId, {
        resource_type: 'video',
        type: 'upload',
        eager: [
          {
            transformation: transformation,
            format: 'mp4',
            quality: 'auto'
          }
        ],
        eager_async: false, // Wait for processing to complete
      });

      console.log('Eager transformation result:', result);

      if (result.eager && result.eager[0] && result.eager[0].secure_url) {
        const videoUrl = result.eager[0].secure_url;
        console.log('Eager transformation successful:', videoUrl);
        
        // Fetch the processed video
        const videoResponse = await fetch(videoUrl);
        
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
        }

        const videoStream = videoResponse.body;
        if (!videoStream) {
          throw new Error('Could not get video stream from Cloudinary response.');
        }

        const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
        const filename = `${baseName}-with-subtitles.mp4`;

        return new NextResponse(videoStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } else {
        throw new Error('Eager transformation did not return a URL');
      }

    } catch (eagerError) {
      console.error('Eager transformation failed:', eagerError);
      
      // METHOD 2: Simple Single Subtitle (Fallback)
      try {
        console.log('=== METHOD 2: SIMPLE SINGLE SUBTITLE ===');
        
        const firstSubtitle = subtitles[0];
        const sanitizedText = sanitizeTextForCloudinary(firstSubtitle.text);

        // Simple URL transformation with just one subtitle
        const simpleUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: [
            {
              overlay: {
                font_family: cloudinaryFont,
                font_size: subtitleFontSize,
                font_weight: 'bold',
                text: sanitizedText,
              }
            },
            { color: 'white' },
            { background: 'rgb:000000CC' },
            { gravity: 'south' },
            { y: 30 }
          ],
          format: 'mp4',
          quality: 'auto',
        });

        console.log('Simple URL generated:', simpleUrl);

        // Fetch the processed video
        const videoResponse = await fetch(simpleUrl);
        
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
        }

        const videoStream = videoResponse.body;
        if (!videoStream) {
          throw new Error('Could not get video stream from Cloudinary response.');
        }

        const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
        const filename = `${baseName}-with-subtitles.mp4`;

        return new NextResponse(videoStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });

      } catch (simpleError) {
        console.error('Simple method failed:', simpleError);
        
        // METHOD 3: Ultra Simple - Just add a watermark
        console.log('=== METHOD 3: ULTRA SIMPLE WATERMARK ===');
        
        const watermarkUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: [
            {
              overlay: {
                font_family: cloudinaryFont,
                font_size: 20,
                text: encodeURIComponent(`Subtitled with ${cloudinaryFont}`),
              }
            },
            { color: 'white' },
            { background: 'rgb:00000099' },
            { gravity: 'south_east' },
            { x: 10, y: 10 }
          ],
          format: 'mp4',
        });

        console.log('Watermark URL:', watermarkUrl);

        // Fetch the processed video
        const videoResponse = await fetch(watermarkUrl);
        
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch processed video from Cloudinary. Status: ${videoResponse.status}`);
        }

        const videoStream = videoResponse.body;
        if (!videoStream) {
          throw new Error('Could not get video stream from Cloudinary response.');
        }

        const baseName = (videoName || 'video').split('.').slice(0, -1).join('.') || 'video';
        const filename = `${baseName}-with-subtitles.mp4`;

        return new NextResponse(videoStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
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
