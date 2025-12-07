import { NextResponse } from 'next/server';
import { formatSrt, parseSrt } from '@/lib/srt';

export async function POST(req: Request) {
  try {
    const { subtitles, targetLanguage } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const srtContent = formatSrt(subtitles);
    const prompt = `Translate to ${targetLanguage}. Keep SRT format:\n\n${srtContent}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      throw new Error('No translated text returned from Gemini');
    }

    const translatedSubtitles = parseSrt(translatedText);

    return NextResponse.json({
      success: true,
      subtitles: translatedSubtitles
    });

  } catch (error: any) {
    console.error('Translation Error:', error);
    return NextResponse.json(
      { error: `Translation failed: ${error.message}` },
      { status: 500 }
    );
  }
}
