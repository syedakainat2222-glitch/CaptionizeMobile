import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

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
    return { color: rgba, opacity: 100 };
  }
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 100 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const opacity = Math.round(parseFloat(a) * 100);
  return { color, opacity };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      videoPublicId, subtitles, videoName, subtitleFont,
      subtitleFontSize, subtitleColor, subtitleBackgroundColor,
      subtitleOutlineColor, isBold, isItalic, isUnderline,
      playbackSpeed, cloud_name, api_key, api_secret
    } = body;

    // --- CLOUDINARY CONFIG ---
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles || !Array.isArray(subtitles)) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // --- SYNC SUBTITLES WITH SPEED ---
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${vttBase64}`, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
    });

    // --- FONT MAPPING ---
    let primaryFont = subtitleFont ? subtitleFont.split(',')[0].trim() : 'Arial';
    if (primaryFont === 'Serif') primaryFont = 'Times';
    if (primaryFont === 'SansSerif') primaryFont = 'Arial';
    if (primaryFont === 'Monospace') primaryFont = 'Courier';
    if (primaryFont === 'Noto Urdu') primaryFont = 'Noto Nastaliq Urdu';

    const textDecoration = isUnderline ? 'underline' : 'none';
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);

    // --- SIZE MISMATCH FIX ---
    // Scale reduced to 1.5 to perfectly match the editor's look
    const scaledSize = Math.round(subtitleFontSize * 1.5);
    const scaledY = Math.round(45 * 1.5);

    const transformations: any[] = [];

    // 1. Only apply speed if changed (fixes the broken video error)
    if (speedMultiplier !== 1.0) {
      const speedValue = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedValue}` });
    }

    // 2. Build the Subtitle Layer
    const subLayer: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttUpload.public_id,
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: textDecoration,
      },
      color: subtitleColor,
      background: bgColor,
      opacity: bgOpacity,
      gravity: 'south',
      y: scaledY,
      flags: 'layer_apply'
    };

    // 3. Apply Thick Outline (6px)
    if (subtitleOutlineColor && subtitleOutlineColor !== 'transparent') {
      const { color: outlineColor } = parseRgba(subtitleOutlineColor);
      subLayer.border = `6px_solid_${outlineColor.replace('#', 'rgb:')}`;
    }

    transformations.push(subLayer);

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true, 
      attachment: `${videoName || 'video'}_processed.mp4`, 
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error) {
    console.error('=== VIDEO PROCESSING FAILED ===', error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
