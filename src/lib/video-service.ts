'use client';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { Subtitle } from './srt';
import type { Video } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { db } from './firebase';

export const saveVideo = async (
  userId: string,
  videoData: {
    videoUrl: string;
    subtitles: Subtitle[];
    name: string;
  }
) => {
  const newDoc = {
    ...videoData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDoc(collection(db, 'videos'), newDoc)
    .then(docRef => {
      return docRef.id;
    })
    .catch(async (serverError: Error) => {
      const permissionError = new FirestorePermissionError({
        path: 'videos',
        operation: 'create',
        requestResourceData: newDoc,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      // Return null or re-throw a different error to be caught by the caller
      return null;
    });
};

export const getVideos = async (userId: string): Promise<Video[]> => {
  if (!userId) return [];
  const q = query(collection(db, 'videos'), where('userId', '==', userId));

  return getDocs(q)
    .then(querySnapshot => {
      const videos: Video[] = [];
      querySnapshot.forEach(doc => {
        videos.push({ id: doc.id, ...doc.data() } as Video);
      });
      return videos.sort(
        (a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()
      );
    })
    .catch(async (serverError: Error) => {
      const permissionError = new FirestorePermissionError({
        path: 'videos',
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      return [];
    });
};

export const updateVideoSubtitles = async (
  userId: string,
  videoId: string,
  subtitles: Subtitle[]
) => {
  const videoRef = doc(db, 'videos', videoId);
  const updatedData = {
    subtitles: subtitles,
    updatedAt: serverTimestamp(),
  };

  return updateDoc(videoRef, updatedData)
    .then(() => true)
    .catch(async (serverError: Error) => {
      const permissionError = new FirestorePermissionError({
        path: videoRef.path,
        operation: 'update',
        requestResourceData: updatedData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      return false;
    });
};
