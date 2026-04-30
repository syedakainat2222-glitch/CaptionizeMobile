import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

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
    const adjustedSubtitles = subtitles.map((sub: any) => ({
      ...sub,
      startTime: msToTime(timeToMs(sub.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(sub.endTime) / speedMultiplier),
    }));

    const vttContent = formatVtt(adjustedSubtitles);
    const vttBase64 = Buffer.from(vttContent, 'utf-8').toString('base64');
    const vttDataUri = `data:text/vtt;charset=utf-8;base64,${vttBase64}`;

    const vttPublicId = `subtitles-${Date.now()}`;
    await cloudinary.uploader.upload(vttDataUri, {
      resource_type: 'raw',
      public_id: vttPublicId,
      format: 'vtt',
      overwrite: true,
    });

    // Font mapping - use native fonts without spaces
    let primaryFont = 'Cairo';
    const requestedFont = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    if (requestedFont === 'Changa') primaryFont = 'Changa';
    else if (requestedFont === 'Noto Urdu') primaryFont = 'NotoKufiArabic'; // no spaces
    else if (requestedFont === 'Pacifico') primaryFont = 'Pacifico';
    else if (requestedFont === 'Dancing Script') primaryFont = 'DancingScript';
    else if (requestedFont === 'Roboto') primaryFont = 'Roboto';
    else primaryFont = 'Cairo';

    // Color: remove # and use plain hex (Cloudinary subtitles overlay accepts 'color: FFFFFF')
    const cleanColor = subtitleColor ? subtitleColor.replace('#', '') : 'FFFFFF';

    const scaledSize = Math.round((subtitleFontSize || 24) * 2.0);
    const yPosition = 180;

    const overlayParams = {
      overlay: {
        resource_type: 'subtitles',
        public_id: `${vttPublicId}.vtt`,
        font_family: primaryFont,
        font_size: scaledSize,
        font_weight: isBold ? 'bold' : 'normal',
        font_style: isItalic ? 'italic' : 'normal',
        text_decoration: isUnderline ? 'underline' : 'none',
      },
      color: cleanColor, // no 'rgb:' prefix
      flags: 'layer_apply',
      gravity: 'south',
      y: yPosition,
    };

    const transformations: any[] = [];
    if (speedMultiplier !== 1.0) {
      const speedPercent = Math.round((speedMultiplier - 1) * 100);
      transformations.push({ effect: `accelerate:${speedPercent}` });
    }
    transformations.push(overlayParams);

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

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
