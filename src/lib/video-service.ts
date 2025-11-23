
'use client';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, app } from "@/lib/firebase";
import type { Video } from "./types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const db = getFirestore(app);

// Use a hardcoded user ID for development since auth is paused.
const DEV_USER_ID = "dev-user";

/**
 * Fetch all videos for the current user
 */
export async function fetchVideoLibrary(): Promise<Video[]> {
    const userId = DEV_USER_ID;
    if (!userId) {
        console.warn("fetchVideoLibrary: No user ID provided, returning empty array.");
        return [];
    }
  
    try {
        const videosRef = collection(db, `videos`);
        const q = query(videosRef, where("userId", "==", userId), orderBy("updatedAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name ?? "Untitled",
                videoUrl: data.videoUrl ?? "",
                publicId: data.publicId ?? "",
                subtitles: data.subtitles ?? [],
                userId: data.userId,
                createdAt: data.createdAt ?? Timestamp.now(),
                updatedAt: data.updatedAt ?? Timestamp.now(),
                subtitleFont: data.subtitleFont || 'Arial, sans-serif',
                subtitleFontSize: data.subtitleFontSize || 48,
                subtitleColor: data.subtitleColor || '#FFFFFF',
                subtitleBackgroundColor: data.subtitleBackgroundColor || 'rgba(0,0,0,0.5)',
                subtitleOutlineColor: data.subtitleOutlineColor || 'transparent',
                isBold: data.isBold || false,
                isItalic: data.isItalic || false,
                isUnderline: data.isUnderline || false,
            } as Video;
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const error = new FirestorePermissionError({
                path: `/videos`,
                operation: 'list'
            });
            errorEmitter.emit('permission-error', error);
            throw error;
        }
        throw e;
    }
}

/**
 * Add a new video
 */
export async function addVideo(videoData: Omit<Video, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const userId = DEV_USER_ID;

  const dataToSave = {
    ...videoData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: videoData.updatedAt || Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, "videos"), dataToSave);
    return docRef.id;
  } catch(e: any) {
     if (e.code === 'permission-denied') {
        const error = new FirestorePermissionError({
            path: `/videos`,
            operation: 'create',
            requestResourceData: dataToSave
        });
        errorEmitter.emit('permission-error', error);
        throw error;
    }
    throw e;
  }
}

/**
 * Update existing video
 */
export async function updateVideo(videoId: string, updateData: Partial<Omit<Video, 'id'>>) {
  const videoRef = doc(db, "videos", videoId);
  const dataToUpdate = { ...updateData, updatedAt: Timestamp.now() };

  try {
    await updateDoc(videoRef, dataToUpdate);
  } catch(e: any) {
      if (e.code === 'permission-denied') {
        const error = new FirestorePermissionError({
            path: `/videos/${videoId}`,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', error);
        throw error;
    }
    throw e;
  }
}

/**
 * Delete video
 */
export async function deleteVideo(videoId: string) {
    const videoRef = doc(db, "videos", videoId);
    try {
        await deleteDoc(videoRef);
    } catch(e: any) {
        if (e.code === 'permission-denied') {
            const error = new FirestorePermissionError({
                path: `/videos/${videoId}`,
                operation: 'delete'
            });
            errorEmitter.emit('permission-error', error);
            throw error;
        }
        throw e;
    }
}
