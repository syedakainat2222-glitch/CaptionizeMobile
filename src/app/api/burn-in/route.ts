import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Helper to convert SRT time string (00:00:00,000) to milliseconds
const timeToMs = (timeStr: string) => {
  const [h, m, s_ms] = timeStr.split(':');
  const [s, ms] = s_ms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};

// Helper to convert milliseconds back to SRT time string
const msToTime = (totalMs: number) => {
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) {
    return { color: rgba || '#FFFFFF', opacity: 100 };
  }
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const opacity = Math.round(parseFloat(a) * 100);
  return { color, opacity };
};

// Simple VTT formatter (no external dependency)
const formatVttSimple = (subtitles: any[]): string => {
  let vtt = 'WEBVTT\n\n';
  for (const sub of subtitles) {
    vtt += `${sub.startTime} --> ${sub.endTime}\n`;
    vtt += `${sub.text}\n\n`;
  }
  return vtt;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      videoPublicId,
      subtitles,
      videoName,
      subtitleFont,
      subtitleFontSize,
      subtitleColor,
      subtitleBackgroundColor,
      isBold,
      isItalic,
      playbackSpeed,
      cloud_name,
      api_key,
      api_secret
    } = body;

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Apply playback speed adjustment
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      text: sub.text,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate and upload VTT file with .vtt extension
    const vttContent = formatVttSimple(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    const vttUpload = await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}.vtt`, // ✅ Explicit .vtt extension
      content_type: 'text/vtt; charset=utf-8',
    });

    // ========== CRITICAL FIX: PROPER FONT MAPPING ==========
    // Map Android font names to Cloudinary Google Fonts
    let cloudinaryFont = 'Arial'; // fallback
    const requestedFont = subtitleFont || 'Arial';
    
    // Exact mapping as requested
    switch (requestedFont) {
      case 'Cairo':
        cloudinaryFont = 'google:Cairo';
        break;
      case 'Changa':
        cloudinaryFont = 'google:Changa';
        break;
      case 'Noto Urdu':
        cloudinaryFont = 'google:Noto Sans Arabic'; // Best for Arabic/Urdu joining
        break;
      case 'Pacifico':
        cloudinaryFont = 'google:Pacifico';
        break;
      default:
        // For any other font, still try to use it if it's a Google Font
        cloudinaryFont = requestedFont.includes('google:') ? requestedFont : `google:${requestedFont}`;
        break;
    }

    console.log(`Font mapping: ${requestedFont} -> ${cloudinaryFont}`);

    // Parse background color
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');
    
    // Scale font size (using exact 2.0 multiplier as requested)
    const baseFontSize = subtitleFontSize || 24;
    const scaledSize = Math.round(baseFontSize * 2.0);
    
    // Set vertical position higher (y: 100 instead of 50)
    const verticalPosition = 100;

    // Build the overlay WITHOUT any border property
    const overlayConfig = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: cloudinaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
      },
      color: subtitleColor || '#FFFFFF',
      background: bgColor,
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: verticalPosition,
    };

    // Build transformation array
    const transformations: any[] = [];
    
    // Add speed effect if needed
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    
    // Add subtitle overlay
    transformations.push(overlayConfig);

    // Generate safe filename
    const safeFilename = videoName 
      ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] 
      : 'video';
    const filename = `${safeFilename}_with_subtitles.mp4`;

    // Generate the final Cloudinary URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    console.log('Generated URL:', finalUrl);
    console.log('Using font:', cloudinaryFont, 'Size:', scaledSize, 'Position Y:', verticalPosition);

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error: any) {
    console.error('=== VIDEO PROCESSING FAILED ===', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Error',
      details: error.toString()
    }, { status: 500 });
  }
}
