// Use shared cloudinary config (reads CLOUDINARY_* env vars once on startup)
const cloudinary = require('../config/cloudinary.config');
const streamifier = require('streamifier');

/**
 * Upload file buffer to Cloudinary.
 * Image transformations are ONLY applied when resource_type is explicitly 'image'
 * to avoid Cloudinary rejecting non-image files (PDFs, audio, video, etc.)
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Upload options (folder, resource_type, public_id, etc.)
 * @returns {Promise<Object>} - Full Cloudinary upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const resourceType = options.resource_type || 'auto';

    const uploadOptions = {
      folder: options.folder || 'uploads',
      resource_type: resourceType,
      ...options, // caller options take precedence
    };

    // Apply image optimisation ONLY for explicitly image uploads
    // (not for 'auto' which also handles raw, video, audio, documents)
    if (resourceType === 'image') {
      uploadOptions.transformation = uploadOptions.transformation || [
        { width: 1920, height: 1920, crop: 'limit' },
        { quality: 'auto' },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload success:', result.public_id);
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId - The public_id of the resource to delete
 * @param {Object} options - Extra options e.g. { resource_type: 'raw' }
 * @returns {Promise<Object>}
 */
const deleteFromCloudinary = (publicId, options = {}) => {
  return cloudinary.uploader.destroy(publicId, options);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };