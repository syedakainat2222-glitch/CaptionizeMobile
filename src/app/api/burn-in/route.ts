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
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba, opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize,
      subtitleColor, subtitleBackgroundColor, subtitleOutlineColor,
      isBold, isItalic, isUnderline, playbackSpeed,
      cloud_name, api_key, api_secret
    } = body;

    // --- CLOUDINARY CONFIG ---
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

    // --- UPLOAD VTT ---
    // We add the .vtt extension to the public_id to prevent "Broken Video" errors
    const vttFileName = `subtitles-${Date.now()}.vtt`;
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(formatVtt(adjustedSubtitles)).toString('base64')}`, {
      resource_type: 'raw', 
      overwrite: true, 
      public_id: vttFileName,
    });

    // --- FONT SYNC (Matches Editor exactly) ---
    let primaryFont = 'Arial';
    const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    
    // Use "google:" prefix to load the beautiful fonts from your editor
    if (requested === 'Cairo') primaryFont = 'google:Cairo';
    else if (requested === 'Changa') primaryFont = 'google:Changa';
    else if (requested === 'Noto Urdu') primaryFont = 'google:Noto Sans Arabic';
    else if (requested === 'Pacifico') primaryFont = 'google:Pacifico';
    else if (requested === 'Dancing Script') primaryFont = 'google:Dancing Script';
    else if (requested === 'Serif') primaryFont = 'Times';
    else if (requested === 'Monospace') primaryFont = 'Courier';
    else primaryFont = 'Arial'; 

    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor);
    // 2.0 scale is the "sweet spot" for mobile vs video resolution
    const scaledSize = Math.round((subtitleFontSize || 18) * 2.0);

    const transformationParams: any = {
      overlay: {
        resource_type: 'subtitles', 
        public_id: vttFileName, // Must include the .vtt extension here
        font_family: primaryFont, 
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal', 
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: subtitleColor, 
      background: bgColor, 
      opacity: bgOpacity,
      flags: 'layer_apply', 
      gravity: 'south', 
      y: 80, // Lifted up so it's not hidden by the play bar
    };
    
    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
        transformations.push({ effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` });
    }
    transformations.push(transformationParams);

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video', 
      transformation: transformations,
      format: 'mp4', 
      quality: 'auto', 
      sign_url: true, 
      attachment: `${videoName || 'video'}_with_subtitles.mp4`,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
