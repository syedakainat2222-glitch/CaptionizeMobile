
'use client';
import { getAuth } from "firebase/auth";
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
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import type { Video } from "./types";
import { useUser } from "@/hooks/use-user";

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Ensures Firebase Authentication and returns the current user.
 * Throws an error if the user is not authenticated.
 */
async function getCurrentUser() {
  await auth.authStateReady(); // Wait for auth state to be loaded
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please sign in.");
  }
  return user;
}


/**
 * Fetch all videos for the current user
 */
export async function fetchVideoLibrary(): Promise<Video[]> {
  const user = await getCurrentUser();
  const userId = user.uid;

  const videosRef = collection(db, `users/${userId}/videos`);
  const q = query(videosRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    // Explicitly map fields to ensure type safety and prevent missing properties.
    return {
      id: doc.id,
      name: data.name ?? "Untitled",
      videoUrl: data.videoUrl ?? "",
      publicId: data.publicId ?? "",
      subtitles: data.subtitles ?? [],
      userId: data.userId ?? userId,
      createdAt: data.createdAt ?? Timestamp.now(),
      updatedAt: data.updatedAt ?? Timestamp.now(),
      // Include style properties with defaults
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
}

/**
 * Fetch a single video
 */
export async function fetchVideo(videoId: string): Promise<Video> {
  const user = await getCurrentUser();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  const snapshot = await getDoc(videoRef);

  if (!snapshot.exists()) {
    throw new Error("Video not found");
  }

  const data = snapshot.data();
  return { id: snapshot.id, ...data } as Video;
}

/**
 * Add a new video
 */
export async function addVideo(videoData: Omit<Video, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const user = await getCurrentUser();
  const userId = user.uid;

  const videosRef = collection(db, `users/${userId}/videos`);
  const docRef = await addDoc(videosRef, {
    ...videoData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: videoData.updatedAt || Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Update existing video
 */
export async function updateVideo(videoId: string, updateData: Partial<Omit<Video, 'id'>>) {
  const user = await getCurrentUser();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  // Always include updatedAt on any update
  await updateDoc(videoRef, { ...updateData, updatedAt: Timestamp.now() });
}

/**
 * Delete video
 */
export async function deleteVideo(videoId: string) {
  const user = await getCurrentUser();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  await deleteDoc(videoRef);
}
