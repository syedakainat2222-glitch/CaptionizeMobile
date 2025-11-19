'use server';

import { z } from 'zod';

export async function aiSuggestedCorrections(input: { subtitleText: string; context: string }) {
    const prompt = `You are a subtitle correction expert. Given the following subtitle text and its surrounding context, please suggest a correction for the main subtitle text. Provide a brief explanation for your suggestion. Focus on grammatical errors, typos, and clarity. The context may include the previous and next subtitles. Only correct the main text, not the context.

Context:
${input.context}

Main Subtitle to Correct:
${input.subtitleText}

Your response should be in JSON format with two keys: 'suggestedCorrection' and 'explanation'.`;

    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Parse the JSON response
        return JSON.parse(responseText);
    } catch (error) {
        console.error('AI suggestion error:', error);
        // Fallback to mock response
        return {
            suggestedCorrection: input.subtitleText,
            explanation: "AI service temporarily unavailable. Please try again."
        };
    }
}