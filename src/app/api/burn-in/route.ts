import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';
import arabicReshaper from 'arabic-reshaper';
import rtlDetect from 'rtl-detect';

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

// Function to reshape Arabic/Urdu text for proper joining
function reshapeArabicText(text: string): string {
  // Check if the text contains Arabic Unicode range
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (!arabicRegex.test(text)) return text;
  
  try {
    // Reshape the Arabic characters to joined presentation forms
    let reshaped = arabicReshaper.convertArabic(text);
    // Detect if the text is RTL and add appropriate Unicode marks for correct ordering
    if (rtlDetect.isRtl(text)) {
      reshaped = '\u202B' + reshaped + '\u202C'; // RLE + PDF
    }
    return reshaped;
  } catch (e) {
    console.warn('Arabic reshaping failed, using original text', e);
    return text;
  }
}

// Convert hex color (e.g., "#FFFF00") to Cloudinary format "rgb:FFFF00"
function toCloudinaryColor(hex: string): string {
  if (!hex) return 'rgb:FFFFFF';
  const clean = hex.replace('#', '');
  return `rgb:${clean}`;
}

// Parse RGBA (not heavily used, but kept for potential background)
function parseRgba(rgba: string) {
  if (!rgba || !rgba.startsWith('rgba')) return { color: rgba, opacity: 100 };
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return { color: '#000000', opacity: 50 };
  const [, r, g, b, a] = match;
  const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
  return { color: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(parseFloat(a) * 100) };
}

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

    const speedMultiplier = playbackSpeed || 1.0;

    // 1. Adjust timings and reshape Arabic text
    const adjustedSubtitles = subtitles.map((sub: any) => {
      const reshapedText = reshapeArabicText(sub.text);
      return {
        ...sub,
        text: reshapedText,
        startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
        endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
      };
    });

    // 2. Generate VTT content using your existing formatVtt helper
    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    // 3. Upload VTT – public_id WITHOUT extension
    const vttPublicId = `subtitles-${Date.now()}`;
    await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      public_id: vttPublicId,
      overwrite: true,
    });

    // 4. Determine font – we use Arial because Arabic reshaping ensures joined letters
    //    (You can still map other Latin fonts if needed, but for Arabic/Urdu we force Arial)
    let primaryFont = 'Arial';
    const requestedFont = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    // Only change font for non-Arabic scripts (like Pacifico, Dancing Script)
    if (requestedFont === 'Pacifico') primaryFont = 'Pacifico';
    else if (requestedFont === 'Dancing Script') primaryFont = 'Dancing Script';
    else if (requestedFont === 'Roboto') primaryFont = 'Roboto';
    else if (requestedFont === 'Serif') primaryFont = 'Times';
    else if (requestedFont === 'Monospace') primaryFont = 'Courier';
    else primaryFont = 'Arial'; // Arial is safe after reshaping

    // 5. Colors: convert hex to Cloudinary rgb: format
    const textColor = toCloudinaryColor(subtitleColor || '#FFFFFF');
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');
    const bgCloudinary = bgColor && bgColor !== 'transparent' ? toCloudinaryColor(bgColor) : undefined;

    // 6. Transformation parameters (NO border, NO outline)
    const scaledSize = Math.round((subtitleFontSize || 24) * 2.0);
    const yPosition = 100; // lifted above bottom ticker

    const overlayParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: vttPublicId,   // exact match – no extension appended
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: textColor,
      flags: 'layer_apply',
      gravity: 'south',
      y: yPosition,
    };

    // Optional background
    if (bgCloudinary && bgOpacity > 0 && bgOpacity < 100) {
      overlayParams.background = bgCloudinary;
      overlayParams.opacity = bgOpacity;
    } else if (bgCloudinary) {
      overlayParams.background = bgCloudinary;
    }

    // 7. Speed effect
    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    transformations.push(overlayParams);

    // 8. Generate final URL
    const safeFileName = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFileName}_with_subtitles.mp4`;

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
      quality: 'auto',
      sign_url: true,
      attachment: filename,
    });

    console.log('Download URL generated:', finalUrl);
    return NextResponse.json({ success: true, downloadUrl: finalUrl });

  } catch (error: any) {
    console.error('Subtitle burn-in error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
