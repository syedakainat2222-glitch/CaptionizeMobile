import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Convert SRT time (00:00:00,000) to milliseconds
const timeToMs = (timeStr: string) => {
  const [h, m, s_ms] = timeStr.split(':');
  const [s, ms] = s_ms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};

// Convert milliseconds to SRT time format
const msToTime = (totalMs: number) => {
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

// Parse RGBA string to Cloudinary color + opacity
const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba || '#000000', opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
};

// Generate proper WebVTT from subtitles array
function generateVtt(subtitles: any[]): string {
  let vtt = 'WEBVTT\n\n';
  for (const sub of subtitles) {
    vtt += `${sub.startTime} --> ${sub.endTime}\n`;
    vtt += `${sub.text}\n\n`;
  }
  return vtt;
}

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
      // subtitleOutlineColor is intentionally ignored (causes errors)
      isBold,
      isItalic,
      isUnderline,
      playbackSpeed,
      cloud_name,
      api_key,
      api_secret,
    } = body;

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    if (!videoPublicId || !subtitles) {
      return NextResponse.json({ success: false, error: 'Missing videoPublicId or subtitles' }, { status: 400 });
    }

    // Adjust timestamps for playback speed (if needed)
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate VTT content
    const vttContent = generateVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    const dataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    // Upload VTT file as raw resource with explicit .vtt extension
    const uploadedFile = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      public_id: `subtitles-${Date.now()}.vtt`,
      content_type: 'text/vtt',
      overwrite: true,
    });

    console.log('VTT uploaded:', uploadedFile.public_id);

    // Font mapping (Cloudinary Google Fonts)
    let primaryFont = 'Arial';
    const requestedFont = subtitleFont?.split(',')[0].trim() || '';
    switch (requestedFont) {
      case 'Cairo':
        primaryFont = 'google:Cairo';
        break;
      case 'Changa':
        primaryFont = 'google:Changa';
        break;
      case 'Noto Urdu':
        primaryFont = 'google:Noto Sans Arabic';
        break;
      case 'Pacifico':
        primaryFont = 'google:Pacifico';
        break;
      default:
        primaryFont = 'Arial';
    }

    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    const fontSize = subtitleFontSize || 18;
    const scaledSize = Math.round(fontSize * 2.0); // as requested

    // Build overlay object
    const overlay = {
      resource_type: 'subtitles',
      public_id: uploadedFile.public_id,
      font_family: primaryFont,
      font_size: scaledSize,
      font_weight: isBold ? 'bold' : 'normal',
      font_style: isItalic ? 'italic' : 'normal',
      text_decoration: isUnderline ? 'underline' : 'none',
    };

    // Prepare transformation array
    const transformations: any[] = [];

    // Add speed effect if needed
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }

    // Add subtitle overlay
    transformations.push({
      overlay,
      color: subtitleColor || '#FFFFFF',
      background: bgColor,
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: 100, // lifted from 50
    });

    // Generate final download URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: `${videoName || 'video'}_with_subtitles.mp4`,
    });

    console.log('Generated URL:', finalUrl);

    // Optional: test the URL quickly (commented to avoid extra cost)
    // const testResponse = await fetch(finalUrl, { method: 'HEAD' });
    // if (!testResponse.ok) {
    //   throw new Error(`Cloudinary returned ${testResponse.status}`);
    // }

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error: any) {
    console.error('Subtitle burn-in error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
