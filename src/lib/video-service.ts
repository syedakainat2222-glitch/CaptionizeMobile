import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Subtitle } from './srt';
import type { Video } from './types';

export const saveVideo = async (
  userId: string,
  videoData: {
    videoUrl: string;
    subtitles: Subtitle[];
    name: string;
  }
) => {
  try {
    const docRef = await addDoc(collection(db, 'videos'), {
      ...videoData,
      userId, // Add the user ID to the document
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    return null;
  }
};

export const getVideos = async (userId: string): Promise<Video[]> => {
  if (!userId) return [];
  try {
    // Create a query against the collection.
    const q = query(collection(db, 'videos'), where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const videos: Video[] = [];
    querySnapshot.forEach((doc) => {
      videos.push({ id: doc.id, ...doc.data() } as Video);
    });
    // Sort by most recently updated
    return videos.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  } catch (e) {
    console.error('Error getting documents: ', e);
    return [];
  }
};

export const updateVideoSubtitles = async (
  userId: string,
  videoId: string,
  subtitles: Subtitle[]
) => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    // In a real app, you'd use security rules to ensure ownership,
    // but a client-side check is a good first step.
    // The security rules now enforce this on the backend.
    await updateDoc(videoRef, {
      subtitles: subtitles,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('Error updating document: ', e);
    return false;
  }
};
