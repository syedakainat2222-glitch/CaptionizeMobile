import { configure } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = configure({
  plugins: [googleAI()],
  models: {
    'gemini-1.5-flash': 'googleai/gemini-1.5-flash-latest',
  },
});
