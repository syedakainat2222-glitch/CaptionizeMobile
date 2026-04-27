export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoPublicId,
      subtitles,
      cloud_name, // Received from phone
      api_key,    // Received from phone
      api_secret, // Received from phone
      // ... rest of your fields
    } = body;

    // CRITICAL: Re-configure Cloudinary using the keys sent from the phone
    cloudinary.config({
      cloud_name: cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: api_secret || process.env.CLOUDINARY_API_SECRET,
    });

    if (!videoPublicId || !subtitles) {
       // ... error handling
    }

    // ... rest of your code remains the same
