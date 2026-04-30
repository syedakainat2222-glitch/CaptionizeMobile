import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ========== HELPERS ==========
const timeToMs = (timeStr: string) => {
  const [h, m, s_ms] = timeStr.split(':');
  const [s, ms] = s_ms.split(',');
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
};

const msToTime = (totalMs: number) => {
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const parseRgba = (rgba: string) => {
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba, opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
};

// ========== MAIN EXPORT ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize,
      subtitleColor, subtitleBackgroundColor, subtitleOutlineColor,
      isBold, isItalic, isUnderline, playbackSpeed,
      cloud_name, api_key, api_secret
    } = body;

    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles) return NextResponse.json({ success: false }, { status: 400 });

    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent).toString('base64');
    
    // Upload VTT with format: 'vtt' to ensure extension is handled correctly
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${vttBase64}`, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`,
      format: 'vtt'
    });

    // --- FONT MAPPING (Fixes the Boxes) ---
    // Using google: prefix forces Cloudinary to use the version with full character support
    let primaryFont = 'google:Cairo'; 
    const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    
    if (requested === 'Cairo') primaryFont = 'google:Cairo';
    else if (requested === 'Changa') primaryFont = 'google:Changa';
    else if (requested === 'Noto Urdu') primaryFont = 'google:Noto%20Sans%20Arabic';
    else if (requested === 'Arial') primaryFont = 'Arial';
    else primaryFont = 'Arial';

    // Fix color crash: Convert #FFFFFF to rgb:FFFFFF
    const cleanColor = (subtitleColor || "#FFFFFF").replace("#", "rgb:");
    
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    const scaledSize = Math.round((subtitleFontSize || 18) * 3.5);

    const transformationParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttUpload.public_id}.vtt`, // Include extension for stability
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: cleanColor,
      background: bgColor.replace("#", "rgb:"),
      opacity: bgOpacity,
      flags: 'layer_apply',
      gravity: 'south',
      y: Math.round(40 * 3.5),
    };

    // NOTE: Removed the 'border' logic as it is the #1 cause of "Broken Video" errors
    // when using Google Fonts. The co_rgb color will work perfectly.
    
    const speedEffectValue = Math.round((speedMultiplier - 1) * 100);
    const transformations = speedMultiplier !== 1.0 
        ? [{ effect: `accelerate:${speedEffectValue}` }, transformationParams]
        : [transformationParams];

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true, 
      attachment: `${videoName || 'video'}_with_subtitles.mp4`,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
