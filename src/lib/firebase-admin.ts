
import * as admin from 'firebase-admin';

// This is the shape of the service account key JSON file
interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // Get the service account key from environment variables
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
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
