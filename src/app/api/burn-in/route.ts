import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { formatVtt } from '@/lib/srt';

// ... (Keep your reshapeArabic, timeToMs, and msToTime functions here) ...

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
        videoPublicId, 
        subtitles, 
        subtitleFontSize, 
        subtitleColor, // This comes as #FFFF00 from Android
        playbackSpeed, 
        cloud_name, 
        api_key, 
        api_secret 
    } = body;

    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

    const speedMultiplier = playbackSpeed || 1.0;
    const processedSubs = subtitles.map((s: any) => ({
      ...s,
      text: reshapeArabic(s.text), // Fixes joining/boxes
      startTime: msToTime(timeToMs(s.startTime) / speedMultiplier),
      endTime: msToTime(timeToMs(s.endTime) / speedMultiplier),
    }));

    const vttUpload = await cloudinary.uploader.upload(
      `data:text/vtt;base64,${Buffer.from(formatVtt(processedSubs)).toString('base64')}`, 
      { resource_type: 'raw', overwrite: true, public_id: `subtitles-${Date.now()}` }
    );

    // --- STEP 1: THE COLOR FIX ---
    // We remove the '#' and add 'rgb:' manually to ensure Cloudinary doesn't ignore it.
    const finalColor = subtitleColor ? `rgb:${subtitleColor.replace('#', '')}` : 'rgb:FFFFFF';

    const finalUrl = cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        { effect: `accelerate:${Math.round((speedMultiplier - 1) * 100)}` },
        {
          overlay: { 
            resource_type: 'subtitles', 
            public_id: vttUpload.public_id, 
            font_family: 'Arial', 
            font_size: Math.round(subtitleFontSize * 2.2) 
          },
          color: finalColor, // Use the clean rgb:XXXXXX format here
          gravity: 'south',
          y: 120, // Lifted slightly to clear the logo
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
