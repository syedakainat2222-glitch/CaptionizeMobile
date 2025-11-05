import type { Timestamp } from "firebase/firestore";
import type { Subtitle } from "./srt";

export type Video = {
    id: string;
    name: string;
    videoUrl: string;
    publicId: string; // Cloudinary public ID
    subtitles: Subtitle[];
    subtitleFont?: string; // Add optional font property
    subtitleFontSize?: number; // Add optional font size
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type User = {
    uid: string;
    email: string | null;
    displayName: string | null;
};
