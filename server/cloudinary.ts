import { v2 as cloudinary } from 'cloudinary';
import { log } from './vite';

// Check if Cloudinary URL is provided
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

if (!CLOUDINARY_URL) {
  log('Warning: No Cloudinary URL provided. Media uploads will not work properly.', 'cloudinary');
} else {
  // Cloudinary is configured using the CLOUDINARY_URL environment variable
  // Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  cloudinary.config({
    secure: true
  });
  
  log('Cloudinary configured successfully', 'cloudinary');
}

/**
 * Upload media to Cloudinary
 * @param buffer - The file buffer to upload
 * @param folder - The folder to upload to
 * @param resourceType - The type of resource (image, video, raw)
 * @param fileName - Optional filename for the upload
 * @returns The Cloudinary upload result
 */
export const uploadMedia = async (
  buffer: Buffer,
  folder: string = 'telechat',
  resourceType: string = 'auto',
  fileName?: string
): Promise<any> => {
  if (!CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    // Convert buffer to base64 string
    const b64 = buffer.toString('base64');
    const dataURI = `data:image/png;base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: resourceType,
      public_id: fileName ? `${fileName}-${Date.now()}` : undefined
    });
    
    return result;
  } catch (error) {
    log(`Error uploading to Cloudinary: ${error}`, 'cloudinary');
    throw error;
  }
};

/**
 * Delete media from Cloudinary
 * @param publicId - The public ID of the resource to delete
 * @returns The Cloudinary deletion result
 */
export const deleteMedia = async (publicId: string): Promise<any> => {
  if (!CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    log(`Error deleting from Cloudinary: ${error}`, 'cloudinary');
    throw error;
  }
};