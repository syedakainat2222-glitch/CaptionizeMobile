import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// ========== TIME HELPERS ==========
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

// ========== SAFELY ENCODE TEXT FOR URL (base64url) ==========
function encodeTextForUrl(text: string): string {
  const base64 = Buffer.from(text, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ========== MAIN EXPORT ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId, subtitles, videoName, subtitleFont, subtitleFontSize,
      subtitleColor, 
      isBold, isItalic, isUnderline, playbackSpeed,
      cloud_name, api_key, api_secret
    } = body;

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    if (!videoPublicId || !subtitles) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const speedMultiplier = playbackSpeed || 1.0;
    const baseFontSize = subtitleFontSize || 24;
    const scaledSize = Math.round(baseFontSize * 2.0);   // 2.0 as you requested
    const yPosition = 180;                               // high above logos

    // Color: convert #RRGGBB to rgb:RRGGBB (Cloudinary format)
    const cleanColor = (subtitleColor || '#FFFFFF').replace('#', 'rgb:');

    // --- Map Android font names to Cloudinary Google Fonts (URL-encoded) ---
    let googleFont = 'google:Cairo'; // default, matches your editor
    const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    switch (requested) {
      case 'Cairo':
        googleFont = 'google:Cairo';
        break;
      case 'Changa':
        googleFont = 'google:Changa';
        break;
      case 'Noto Urdu':
        googleFont = 'google:Noto%20Sans%20Arabic';
        break;
      case 'Pacifico':
        googleFont = 'google:Pacifico';
        break;
      case 'Dancing Script':
        googleFont = 'google:Dancing%20Script';
        break;
      case 'Roboto':
        googleFont = 'google:Roboto';
        break;
      default:
        googleFont = 'google:Cairo';
    }

    // --- Build individual text overlays for each subtitle cue ---
    const overlays: string[] = [];

    for (const sub of subtitles) {
      // Calculate start time (seconds) and duration
      const startSec = timeToMs(sub.startTime) / speedMultiplier / 1000;
      const endSec = timeToMs(sub.endTime) / speedMultiplier / 1000;
      const durationSec = endSec - startSec;
      if (durationSec <= 0) continue;

      const encodedText = encodeTextForUrl(sub.text);
      
      // Base overlay: l_text:googleFont_size:text,co_color,g_south,y,so_start,du_duration
      let overlay = `l_text:${googleFont}_${scaledSize}:${encodedText},co_${cleanColor},g_south,y_${yPosition},so_${startSec},du_${durationSec}`;
      
      // Add styling flags (supported by l_text)
      if (isBold) overlay += ',bo_1';
      if (isItalic) overlay += ',it_1';
      if (isUnderline) overlay += ',ul_1';
      
      overlays.push(overlay);
    }

    if (overlays.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid subtitles' }, { status: 400 });
    }

    // Combine all overlays with slashes
    let transformation = overlays.join('/');

    // Add speed effect if playback speed is not 1.0
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformation = `e_accelerate:${speedPercent}/${transformation}`;
    }

    // Sanitize filename
    const safeFileName = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFileName}_with_subtitles.mp4`;

    // Generate final Cloudinary URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformation,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error: any) {
    console.error('Text overlay error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Error' }, { status: 500 });
  }
}
