
      import { googleAI } from '@genkit-ai/google-ai';
      import { configureGenkit } from '@genkit-ai/core';
      
      export default configureGenkit({
        plugins: [
          googleAI({ apiKey: process.env.GEMINI_API_KEY }),
        ],
        logLevel: 'debug',
        enableTracingAndMetrics: true,
      });
