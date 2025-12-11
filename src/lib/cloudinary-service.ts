
// src/lib/cloudinary-service.ts
import { v2 as cloudinary } from 'cloudinary';
import { Subtitle } from '@/lib/srt';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Font mapping for Cloudinary - only use fonts that actually work in Cloudinary video
const CLOUDINARY_FONTS: { [key: string]: string } = {
  // Cloudinary's built-in fonts that work with video
  'Arial, sans-serif': 'Arial',
  'Helvetica, sans-serif': 'Arial',
  'Verdana, sans-serif': 'Arial',
  'Georgia, serif': 'Georgia',
  'Times New Roman, serif': 'Times New Roman',
  'Courier New, monospace': 'Courier New',
  
  // Map web fonts to closest Cloudinary equivalent
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
  'Lucida Console, monospace': 'Courier New',
  'Comic Sans MS, cursive': 'Arial'
};

const srtTimeToSeconds = (time: string): number => {
  const parts = time.split(':');
  const secondsAndMs = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsAndMs[0], 10);
  const milliseconds = parseInt(secondsAndMs[1], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// Sanitize text for Cloudinary
const sanitizeTextForCloudinary = (text: string): string => {
  const cleanText = text
    .replace(/[^\x00-\x7F]/g, char => {
      const safeSymbols = ['❤', '♥', '→', '←', '↑', '↓', '•', '·', '…'];
      return safeSymbols.includes(char) ? char : '';
    });

  return encodeURIComponent(cleanText)
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
};

export async function generateSubtitledVideoUrl(
  videoPublicId: string,
  subtitles: Subtitle[],
  subtitleFont: string = 'Arial, sans-serif',
  subtitleFontSize: number = 48
): Promise<string> {
  try {
    console.log('=== GENERATING SUBTITLED VIDEO URL ===');
    console.log('Video Public ID:', videoPublicId);
    console.log('Subtitles count:', subtitles.length);
    console.log('Selected font:', subtitleFont);
    console.log('Font size:', subtitleFontSize);

    // Map the selected font to Cloudinary-compatible font
    const cloudinaryFont = CLOUDINARY_FONTS[subtitleFont] || 'Arial';
    console.log('Mapped to Cloudinary font:', cloudinaryFont);

    // METHOD 1: Use VTT file overlay with proper font styling
    try {
      console.log('=== METHOD 1: VTT FILE OVERLAY WITH FONT STYLING ===');
      
      // Take the first 10 subtitles to keep it manageable
      const subtitlesToUse = subtitles.slice(0, 10);
      console.log(`Using first ${subtitlesToUse.length} subtitles`);
      
      // Create VTT format subtitle content
      let vttContent = "WEBVTT\n\n";
      
      subtitlesToUse.forEach((subtitle, index) => {
        const startTime = subtitle.startTime.replace(',', '.');
        const endTime = subtitle.endTime.replace(',', '.');
        
        vttContent += `${index + 1}\n`;
        vttContent += `${startTime} --> ${endTime}\n`;
        vttContent += `${subtitle.text}\n\n`;
      });

      console.log('Created VTT content with', subtitlesToUse.length, 'subtitles');
      
      // Upload the subtitle file to Cloudinary
      const subtitleUpload = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            public_id: `subtitles/subtitle-${Date.now()}`,
            format: 'vtt'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(Buffer.from(vttContent));
      });

      const subtitlePublicId = (subtitleUpload as any).public_id;
      console.log('Subtitle file uploaded:', subtitlePublicId);

      // Generate video URL with subtitle overlay and font styling
      const videoUrl = cloudinary.url(videoPublicId, {
        resource_type: 'video',
        transformation: [
          {
            overlay: {
              resource_type: 'subtitles',
              public_id: subtitlePublicId
            },
            font_family: cloudinaryFont, // Use the mapped font
            font_size: subtitleFontSize, // Use the selected font size
            color: 'white',
            background: 'black'
          },
          { flags: 'layer_apply', gravity: 'south', y: 20 }
        ],
        format: 'mp4',
      });

      console.log('Generated video URL with font:', cloudinaryFont, 'and size:', subtitleFontSize);
      return videoUrl;

    } catch (vttError) {
      console.error('VTT method failed:', vttError);
      
      // METHOD 2: Fallback to timed text overlays with font
      try {
        console.log('=== METHOD 2: TIMED TEXT OVERLAYS WITH FONT ===');
        
        // Process first 3 subtitles
        const subtitlesToProcess = subtitles.slice(0, 3);
        
        const transformations = subtitlesToProcess.flatMap((subtitle, index) => {
          const startOffset = Math.floor(srtTimeToSeconds(subtitle.startTime));
          const duration = Math.max(1, Math.floor(srtTimeToSeconds(subtitle.endTime)) - startOffset);
          
          const sanitizedText = sanitizeTextForCloudinary(subtitle.text);

          console.log(`Subtitle ${index + 1} with font: ${cloudinaryFont}`);

          return [
            {
              overlay: {
                font_family: cloudinaryFont, // Use the mapped font
                font_size: subtitleFontSize, // Use the selected font size
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
        });

        const videoUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: transformations,
          format: 'mp4',
          quality: 'auto',
        });

        console.log('Generated timed overlay URL with font:', cloudinaryFont);
        return videoUrl;

      } catch (timedError) {
        console.error('Timed overlay method failed:', timedError);
        
        // METHOD 3: Simple watermark with selected font
        console.log('=== METHOD 3: SIMPLE WATERMARK WITH FONT ===');
        
        const watermarkUrl = cloudinary.url(videoPublicId, {
          resource_type: 'video',
          transformation: [
            {
              overlay: {
                font_family: cloudinaryFont, // Use the mapped font
                font_size: Math.min(subtitleFontSize, 24),
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

        console.log('Watermark URL with font:', cloudinaryFont);
        return watermarkUrl;
      }
    }
  } catch (error) {
    console.error('Error generating subtitled video URL:', error);
    throw new Error(`Failed to generate subtitled video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
