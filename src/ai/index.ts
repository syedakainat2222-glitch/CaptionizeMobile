export const translateSubtitles = (input) => ({ translatedSubtitles: input.subtitles.map(s => ({ ...s, text: '[' + input.targetLanguage + '] ' + s.text })) });
