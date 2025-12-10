import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (file: string, resource_type: 'video' | 'image' | 'raw') => {
  try {
    const result = await cloudinary.uploader.upload(file, { resource_type });
    return result;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    return null;
  }
};
