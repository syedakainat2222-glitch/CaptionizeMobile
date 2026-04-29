import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ========== HELPER FUNCTIONS ==========
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
      subtitleColor, subtitleBackgroundColor,
      isBold, isItalic, isUnderline, playbackSpeed,
      cloud_name, api_key, api_secret
    } = body;

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!videoPublicId || !subtitles) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Adjust subtitles for playback speed
    const speedMultiplier = playbackSpeed || 1.0;
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate VTT content using your existing formatter
    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    // ✅ Upload VTT: public_id WITHOUT extension, but set format to 'vtt'
    const vttPublicId = `subtitles-${Date.now()}`;
    await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      public_id: vttPublicId,
      format: 'vtt',
      overwrite: true,
    });

    // ========== FONT SELECTION (NATIVE CLOUDINARY FONTS ONLY) ==========
    // Use 'Noto Sans Arabic' – it supports Arabic joining and works without google: prefix.
    let primaryFont = 'Noto Sans Arabic';
    const requestedFont = subtitleFont ? subtitleFont.split(',')[0].trim() : '';

    switch (requestedFont) {
      case 'Cairo':
      case 'Changa':
      case 'Noto Urdu':
        primaryFont = 'Noto Sans Arabic'; // best native Arabic font for shaping
        break;
      case 'Pacifico':
      case 'Dancing Script':
      case 'Roboto':
        primaryFont = 'Arial'; // fallback for Latin fonts
        break;
      case 'Serif':
        primaryFont = 'Times';
        break;
      case 'Monospace':
        primaryFont = 'Courier';
        break;
      default:
        primaryFont = 'Noto Sans Arabic';
    }

    // Parse background color (if used)
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');

    // Size multiplier 2.0, position y=120 (above BBC logo)
    const scaledSize = Math.round((subtitleFontSize || 24) * 2.0);
    const yPosition = 120;

    // ✅ Build overlay WITHOUT any border/outline (they cause 400 errors)
    const overlayParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttPublicId}.vtt`,   // Append .vtt here – crucial for subtitle engine
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: subtitleColor || '#FFFFFF',   // Apply user's chosen color
      flags: 'layer_apply',
      gravity: 'south',
      y: yPosition,
    };

    // Add background only if it's not transparent
    if (bgColor && bgColor !== 'transparent' && bgOpacity > 0) {
      overlayParams.background = bgColor;
      overlayParams.opacity = bgOpacity;
    }

    // Build full transformation array (speed effect + subtitles)
    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    transformations.push(overlayParams);

    // Generate download filename
    const safeFileName = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFileName}_with_subtitles.mp4`;

    // Create Cloudinary URL
    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error: any) {
    console.error('Subtitle burn-in error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
