import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Subtitle } from './srt';
import type { Video } from './types';


export const saveVideo = async (videoData: {
    videoUrl: string;
    subtitles: Subtitle[];
    name: string;
}) => {
    try {
        const docRef = await addDoc(collection(db, 'videos'), {
            ...videoData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        return null;
    }
}

export const getVideos = async (): Promise<Video[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'videos'));
        const videos: Video[] = [];
        querySnapshot.forEach((doc) => {
            videos.push({ id: doc.id, ...doc.data() } as Video);
        });
        return videos.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (e) {
        console.error("Error getting documents: ", e);
        return [];
    }
}

export const updateVideoSubtitles = async (videoId: string, subtitles: Subtitle[]) => {
    try {
        const videoRef = doc(db, 'videos', videoId);
        await updateDoc(videoRef, {
            subtitles: subtitles,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error updating document: ", e);
        return false;
    }
}
