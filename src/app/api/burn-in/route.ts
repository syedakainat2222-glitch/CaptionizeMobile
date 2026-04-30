import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ... (Keep your reshapeArabic, timeToMs, and msToTime functions here) ...

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
        videoPublicId, subtitles, subtitleFont, subtitleFontSize, 
        subtitleColor, playbackSpeed, cloud_name, api_key, api_secret 
    } = body;

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

    const speedMultiplier = playbackSpeed || 1.0;
    const processedSubs = subtitles.map((s: any) => ({
      ...s,
      text: reshapeArabic(s.text),
      startTime: msToTime(timeToMs(s.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(s.endTime) / speedMultiplier),
    }));

    const vttUpload = await cloudinary.uploader.upload(
      `data:text/vtt;base64,${Buffer.from(formatVtt(processedSubs)).toString('base64')}`, 
      { resource_type: 'raw', overwrite: true, public_id: `subtitles-${Date.now()}` }
    );

    // --- FIX: FONT SYNC (Cairo) ---
    let primaryFont = 'google:Cairo'; 
    const requested = subtitleFont ? subtitleFont.split(',')[0].trim() : '';
    if (requested === 'Changa') primaryFont = 'google:Changa';
    else if (requested === 'Noto Urdu') primaryFont = 'google:Noto%20Sans%20Arabic';
    else if (requested === 'Cairo') primaryFont = 'google:Cairo';

    // --- FIX: COLOR SYNC ---
    const cleanColor = (subtitleColor || "#FFFFFF").replace("#", "rgb:");

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        { effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` },
        {
          overlay: { 
            resource_type: 'subtitles', 
            public_id: `${vttUpload.public_id}.vtt`, // Must add .vtt for stability
            font_family: primaryFont, // Now uses Google Cairo
            font_size: Math.round(subtitleFontSize * 2.2) 
          },
          color: cleanColor,
          gravity: 'south',
          y: 150, // Lifted high to clear logo
          flags: 'layer_apply'
        }
      ],
      format: 'mp4',
      sign_url: true, 
    });

    return NextResponse.json({ success: true, downloadUrl: finalUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
