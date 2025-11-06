import type { Timestamp } from "firebase/firestore";
import type { Subtitle } from "./srt";

export type Video = {
    id: string;
    name: string;
    videoUrl: string;
    publicId: string; // Cloudinary public ID
    subtitles: Subtitle[];
    subtitleFont?: string;
    subtitleFontSize?: number;
    subtitleColor?: string;
    subtitleBackgroundColor?: string;
    subtitleOutlineColor?: string;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    userId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type User = {
    uid: string;
    email: string | null;
    displayName: string | null;
};
