import type { Timestamp } from "firebase/firestore";
import type { Subtitle } from "./srt";

export type Video = {
    id: string;
    name: string;
    videoUrl: string;
    subtitles: Subtitle[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
};
