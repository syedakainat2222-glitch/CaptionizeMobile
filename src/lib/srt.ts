export interface Subtitle {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

const srtRegex =
  /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\r?\n([\s\S]*?(?=\r?\n\r?\n|$))/g;

export const parseSrt = (srt: string): Subtitle[] => {
  const subtitles: Subtitle[] = [];
  // Normalize line endings
  const normalizedSrt = srt.replace(/\r\n/g, '\n');
  let match;
  while ((match = srtRegex.exec(normalizedSrt)) !== null) {
    subtitles.push({
      id: parseInt(match[1]),
      startTime: match[2],
      endTime: match[3],
      text: match[4].trim(),
    });
  }
  return subtitles;
};

export const formatSrt = (subtitles: Subtitle[]): string => {
  return subtitles
    .map((sub) => `${sub.id}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}`)
    .join('\n\n');
};

export const formatVtt = (subtitles: Subtitle[]): string => {
  const vttContent = subtitles
    .map(
      (sub) =>
        `${sub.startTime.replace(',', '.')} --> ${sub.endTime.replace(
          ',',
          '.'
        )}\n${sub.text}`
    )
    .join('\n\n');
  return `WEBVTT\n\n${vttContent}`;
};
