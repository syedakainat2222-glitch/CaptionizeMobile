import { googleAI } from '@genkit-ai/googleai';

console.log('Google AI plugin type:', typeof googleAI);
const plugin = googleAI();
console.log('Plugin created:', !!plugin);
console.log('Plugin keys:', Object.keys(plugin));
