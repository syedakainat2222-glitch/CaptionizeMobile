
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // Get the service account key from environment variables
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    // Parse the service account key JSON string without a custom interface
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      // The 'cert' function will correctly interpret the parsed object
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check the service account key.');
  }
}

// Export the initialized admin SDK and its firestore instance
const adminDb = admin.firestore();
export { admin, adminDb };
