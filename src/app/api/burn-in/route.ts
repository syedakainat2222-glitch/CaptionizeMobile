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

// ========== ROBUST ARABIC RESHAPING (NO EXTERNAL LIBS) ==========
// Maps Arabic characters to their isolated, final, initial, medial forms.
// Also handles the lam-alef ligature.

const arabicCharMap: Record<string, [string, string, string, string]> = {
  // Basic letters (isolated, final, initial, medial)
  '\u0621': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'], // Hamza
  '\u0622': ['\uFE81', '\uFE82', '\uFE81', '\uFE82'], // Alef with madda
  '\u0623': ['\uFE83', '\uFE84', '\uFE83', '\uFE84'], // Alef with hamza above
  '\u0624': ['\uFE85', '\uFE86', '\uFE85', '\uFE86'], // Waw with hamza
  '\u0625': ['\uFE87', '\uFE88', '\uFE87', '\uFE88'], // Alef with hamza below
  '\u0626': ['\uFE89', '\uFE8B', '\uFE8C', '\uFE8A'], // Yeh with hamza
  '\u0627': ['\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'], // Alef
  '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'], // Ba
  '\u0629': ['\uFE93', '\uFE94', '\uFE93', '\uFE94'], // Ta marbuta
  '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'], // Ta
  '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'], // Tha
  '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'], // Jeem
  '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'], // Ha
  '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'], // Kha
  '\u062F': ['\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'], // Dal
  '\u0630': ['\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'], // Thal
  '\u0631': ['\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'], // Ra
  '\u0632': ['\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'], // Zay
  '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'], // Seen
  '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'], // Sheen
  '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'], // Sad
  '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'], // Dad
  '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'], // Ta
  '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'], // Za
  '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'], // Ain
  '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'], // Ghain
  '\u0640': ['\u0640', '\u0640', '\u0640', '\u0640'], // Tatweel
  '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'], // Fe
  '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'], // Qaf
  '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'], // Kaf
  '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'], // Lam
  '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'], // Meem
  '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'], // Noon
  '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'], // Heh
  '\u0648': ['\uFEED', '\uFEEE', '\uFEED', '\uFEEE'], // Waw
  '\u0649': ['\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'], // Alef maqsura
  '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'], // Yeh
  // Add Persian/Urdu specific letters
  '\u067E': ['\uFB56', '\uFB58', '\uFB59', '\uFB57'], // Pe
  '\u0686': ['\uFB7A', '\uFB7C', '\uFB7D', '\uFB7B'], // Che
  '\u0698': ['\uFB8A', '\uFB8B', '\uFB8A', '\uFB8B'], // Zhe
  '\u06AF': ['\uFB92', '\uFB94', '\uFB95', '\uFB93'], // Gaf
};

// Lam‑alef ligatures (two‑character sequence)
const lamAlefMap: Record<string, string> = {
  '\u0644\u0627': '\uFEF5', // Lam + Alef
  '\u0644\u0623': '\uFEF7', // Lam + Alef with hamza above
  '\u0644\u0625': '\uFEF9', // Lam + Alef with hamza below
  '\u0644\u0622': '\uFEFB', // Lam + Alef with madda
};

function reshapeArabic(text: string): string {
  if (!text) return text;
  // Return early if no Arabic characters (to save time)
  if (!/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF]/.test(text)) return text;

  // 1. Replace lam‑alef ligatures first
  let result = text;
  for (const [seq, lig] of Object.entries(lamAlefMap)) {
    result = result.replace(new RegExp(seq, 'g'), lig);
  }

  // 2. Process remaining characters
  const chars = [...result];
  const output: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const mapping = arabicCharMap[ch];
    if (!mapping) {
      output.push(ch);
      continue;
    }

    // Determine position: previous char (i-1) and next char (i+1) are Arabic?
    const prevChar = i > 0 ? chars[i - 1] : null;
    const nextChar = i < chars.length - 1 ? chars[i + 1] : null;

    const prevIsArabic = prevChar && arabicCharMap[prevChar];
    const nextIsArabic = nextChar && arabicCharMap[nextChar];

    let formIndex: number;
    if (!prevIsArabic && !nextIsArabic) formIndex = 0;      // isolated
    else if (prevIsArabic && !nextIsArabic) formIndex = 1; // final
    else if (!prevIsArabic && nextIsArabic) formIndex = 2; // initial
    else formIndex = 3;                                    // medial

    output.push(mapping[formIndex]);
  }

  // Wrap with RTL embedding to ensure proper direction
  return '\u202B' + output.join('') + '\u202C';
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

    // Apply reshaping and timing adjustment to each subtitle
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      text: reshapeArabic(sub.text),
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    // Generate VTT content
    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    // Upload VTT – public_id WITHOUT extension, format set to 'vtt'
    const vttPublicId = `subtitles-${Date.now()}`;
    await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      public_id: vttPublicId,
      format: 'vtt',
      overwrite: true,
    });

    // Font selection – after reshaping, any font works.
    // Map user's font choice to a native Cloudinary font.
    let primaryFont = 'Arial';
    const requestedFont = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    switch (requestedFont) {
      case 'Cairo':
      case 'Changa':
      case 'Noto Urdu':
        primaryFont = 'Arial'; // Reshaped Arabic looks perfect even with Arial
        break;
      case 'Pacifico':
        primaryFont = 'Pacifico';
        break;
      case 'Dancing Script':
        primaryFont = 'Dancing Script';
        break;
      case 'Roboto':
        primaryFont = 'Roboto';
        break;
      case 'Serif':
        primaryFont = 'Times';
        break;
      case 'Monospace':
        primaryFont = 'Courier';
        break;
      default:
        primaryFont = 'Arial';
    }

    // Parse background (if any)
    const { color: bgColor, opacity: bgOpacity } = parseRgba(subtitleBackgroundColor || 'transparent');

    // Size and position
    const scaledSize = Math.round((subtitleFontSize || 24) * 2.0);
    const yPosition = 120;

    // Build overlay – NO BORDER, NO OUTLINE
    const overlayParams: any = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttPublicId}.vtt`, // Append .vtt here – crucial
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      // Fix color format: #FFFF00 -> rgb:FFFF00
      color: (subtitleColor || '#FFFFFF').replace('#', 'rgb:'),
      flags: 'layer_apply',
      gravity: 'south',
      y: yPosition,
    };

    // Optional background (if not transparent)
    if (bgColor && bgColor !== 'transparent' && bgOpacity > 0) {
      overlayParams.background = bgColor.replace('#', 'rgb:');
      overlayParams.opacity = bgOpacity;
    }

    // Transformations array (speed + subtitles)
    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    transformations.push(overlayParams);

    // Filename sanitization
    const safeFileName = videoName ? videoName.replace(/[^a-z0-9_.-]/gi, '_').split('.')[0] : 'video';
    const filename = `${safeFileName}_with_subtitles.mp4`;

    // Generate final Cloudinary URL
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
