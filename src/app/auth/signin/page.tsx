'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '../../../lib/firebase/auth';
import { useAuth } from '../../../hooks/use-auth';

export default function SignInPage() {
  // Correctly get BOTH the user and the loading state.
  const { user, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Only redirect once loading is false AND a user object exists.
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = () => {
    setIsSigningIn(true);
    setError(null);
    signInWithGoogle()
      .catch((error: any) => {
        if (error.code !== 'auth/popup-closed-by-user') {
          setError(error.message);
          console.error(error);
        } else {
            console.log('Sign-in popup closed by user.');
        }
      })
      .finally(() => {
        setIsSigningIn(false);
      });
  };

  // Show a loading spinner while the auth state is being determined,
  // or if the user is already logged in and we are about to redirect.
  // This prevents the sign-in button from flashing on the screen.
  if (loading || user) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  // Only show the sign-in page if we are done loading and there is no user.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">Sign in to your account</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <button 
          onClick={handleSignIn} 
          disabled={isSigningIn}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
        >
          {isSigningIn ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
