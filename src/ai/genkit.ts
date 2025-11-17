import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';
import { geminiPro, geminiProVision, vertexImageGeneration } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [
    googleAI(),
    vertexAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { geminiPro, geminiProVision, vertexImageGeneration };
