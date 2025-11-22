#!/bin/bash
echo "=== ENVIRONMENT VARIABLES CHECK ==="
echo "Firebase API Key: ${NEXT_PUBLIC_FIREBASE_API_KEY:0:10}..."
echo "Firebase Auth Domain: $NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "Firebase Project ID: $NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "Cloudinary Cloud Name: $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
echo "Gemini API Key: ${GEMINI_API_KEY:0:10}..."
echo "AssemblyAI API Key: ${ASSEMBLYAI_API_KEY:0:10}..."
