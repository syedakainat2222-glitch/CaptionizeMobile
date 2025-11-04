import { config } from 'dotenv';
config();

import '@/ai/flows/automatic-subtitle-generation.ts';
import '@/ai/flows/ai-suggested-corrections.ts';
import '@/ai/flows/speaker-diarization-for-subtitles.ts';