interface TranslateSubtitlesInput {
  subtitles: Array<{ text: string; [key: string]: any }>;
  targetLanguage: string;
}

export const translateSubtitles = (input: TranslateSubtitlesInput) => ({ translatedSubtitles: input.subtitles.map(s => ({ ...s, text: `[${input.targetLanguage}] ${s.text}` })) });