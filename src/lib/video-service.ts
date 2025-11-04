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
export async function fetchVideoLibrary() {
  const user = await ensureAuth();
  const userId = user.uid;

  const videosRef = collection(db, `users/${userId}/videos`);
  const q = query(videosRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Fetch a single video
 */
export async function fetchVideo(videoId: string) {
  const user = await ensureAuth();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  const snapshot = await getDoc(videoRef);

  if (!snapshot.exists()) {
    throw new Error("Video not found");
  }

  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Add a new video
 */
export async function addVideo(videoData: any) {
  const user = await ensureAuth();
  const userId = user.uid;

  const videosRef = collection(db, `users/${userId}/videos`);
  const docRef = await addDoc(videosRef, {
    ...videoData,
    userId,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Update existing video
 */
export async function updateVideo(videoId: string, updateData: any) {
  const user = await ensureAuth();
  const userId = user.uid;

  const videoRef = doc(db, `users/${userId}/videos/${videoId}`);
  await updateDoc(videoRef, updateData);
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
