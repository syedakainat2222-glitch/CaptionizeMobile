#!/bin/bash

echo "=== ENVIRONMENT VARIABLES CHECK (from .env file) ==="

# Function to extract value from .env file
get_env_value() {
    grep "^$1=" .env | cut -d'=' -f2 | tr -d '"'
}

api_key=$(get_env_value NEXT_PUBLIC_FIREBASE_API_KEY)
auth_domain=$(get_env_value NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
project_id=$(get_env_value NEXT_PUBLIC_FIREBASE_PROJECT_ID)
cloudinary_name=$(get_env_value NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
gemini_key=$(get_env_value GEMINI_API_KEY)
assembly_key=$(get_env_value ASSEMBLYAI_API_KEY)

echo "Firebase API Key: ${api_key:0:10}..."
echo "Firebase Auth Domain: $auth_domain"
echo "Firebase Project ID: $project_id"
echo "Cloudinary Cloud Name: $cloudinary_name"
echo "Gemini API Key: ${gemini_key:0:10}..."
echo "AssemblyAI API Key: ${assembly_key:0:10}..."
