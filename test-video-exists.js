require('dotenv').config({ path: '.env.local' });
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const testVideoId = "captionize-video-1763368774081";

console.log('Testing if video exists in Cloudinary:', testVideoId);

cloudinary.api.resource(testVideoId, { resource_type: 'video' })
  .then(result => {
    console.log('✅ Video exists:', result.public_id);
    console.log('Format:', result.format);
    console.log('Size:', result.bytes, 'bytes');
  })
  .catch(error => {
    console.log('❌ Video not found or error:', error.message);
    
    // List all videos to see what's available
    console.log('\nListing available videos...');
    cloudinary.api.resources({ 
      type: 'upload', 
      resource_type: 'video',
      max_results: 10 
    })
    .then(result => {
      console.log('Available videos:', result.resources.map(r => r.public_id));
    })
    .catch(err => {
      console.log('Error listing videos:', err.message);
    });
  });
