import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Readable } from "stream";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatTime = (seconds: number): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const secs = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const timeString = date.toISOString().substr(11, 12);
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`.slice(0, -4);
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`.slice(0, -4);
  }
};

export const timeStringToSeconds = (timeString: string): number => {
    const [hours, minutes, seconds] = timeString.split(':');
    const [sec, ms] = seconds.split(',');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(sec) + parseInt(ms) / 1000;
}

export async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export async function streamToArray<T>(stream: Readable): Promise<T[]> {
  const chunks: T[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(chunks));
  });
}