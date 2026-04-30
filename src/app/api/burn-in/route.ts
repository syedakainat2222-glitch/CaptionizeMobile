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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize,
      subtitleColor, playbackSpeed, cloud_name, api_key, api_secret,
      isBold, isItalic
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

    // Upload VTT as a RAW file
    const vttContent = formatVtt(adjustedSubtitles);
    const vttUpload = await cloudinary.uploader.upload(`data:text/vtt;base64,${Buffer.from(vttContent).toString('base64')}`, {
      resource_type: 'raw',
      overwrite: true,
      public_id: `subtitles-${Date.now()}`
    });

    // --- FONT MAPPING (Fixes Missing Words & Boxes) ---
    // We use the "google:" prefix to get the full character set
    let primaryFont = 'google:Cairo'; 
    const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    
    if (requested === 'Cairo') primaryFont = 'google:Cairo';
    else if (requested === 'Changa') primaryFont = 'google:Changa';
    else if (requested === 'Noto Urdu') primaryFont = 'google:Noto%20Sans%20Arabic';
    else primaryFont = 'Arial';

    // --- COLOR FIX (Fixes Broken Video) ---
    // We MUST remove the '#' and use 'rgb:' format for subtitles
    const cleanColor = (subtitleColor || "#FFFFFF").replace("#", "rgb:");

    const transformationParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttUpload.public_id}.vtt`, // CRITICAL: must add .vtt here
        font_family: primaryFont,
        font_size: Math.round((subtitleFontSize || 18) * 3.5),
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
      },
      color: cleanColor,
      flags: 'layer_apply',
      gravity: 'south',
      y: Math.round(40 * 3.5),
    };

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        { effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` },
        transformationParams
      ],
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
