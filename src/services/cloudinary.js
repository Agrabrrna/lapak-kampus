const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure cloudinary with env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {String} folder - Folder name in Cloudinary (e.g. 'kampuslapak/products')
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadStream = (buffer, folder = 'kampuslapak') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Delete an image from Cloudinary by its public ID
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Cloudinary destroy result
 */
const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

/**
 * Extract public ID from a standard Cloudinary secure URL
 * Example: https://res.cloudinary.com/demo/image/upload/v123456/folder/file.jpg -> folder/file
 */
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/');
  const uploadIndex = parts.findIndex(p => p === 'upload');
  if (uploadIndex === -1) return null;
  
  // Skip 'upload' and the version string (e.g. v123456)
  const pathParts = parts.slice(uploadIndex + 2);
  const fileWithExt = pathParts.join('/');
  
  // Remove extension
  const lastDotIndex = fileWithExt.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileWithExt.substring(0, lastDotIndex) : fileWithExt;
};

module.exports = {
  cloudinary,
  uploadStream,
  deleteImage,
  getPublicIdFromUrl
};
