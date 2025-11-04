'use client';
import { getAuth, signInAnonymously } from "firebase/auth";
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

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Ensures Firebase Authentication (anonymous if needed)
 */
async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser!;
}

/**
 * Fetch all videos for the current user
 */
export async function fetchVideoLibrary(): Promise<Video[]> {
  const user = await ensureAuth();
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
    } as Video;
  });
}

/**
 * Fetch a single video
 */
export async function fetchVideo(videoId: string): Promise<Video> {
  const user = await ensureAuth();
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
  const user = await ensureAuth();
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
  const user = await ensureAuth();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  // Always include updatedAt on any update
  await updateDoc(videoRef, { ...updateData, updatedAt: Timestamp.now() });
}

/**
 * Delete video
 */
export async function deleteVideo(videoId: string) {
  const user = await ensureAuth();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  await deleteDoc(videoRef);
}
