const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const cloudinaryService = {
  /**
   * Upload an image buffer directly to Cloudinary
   */
  async uploadImage(buffer, folder = "rupkotha/collections") {
    if (!buffer) {
      throw new Error("No image buffer provided for upload.");
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          fetch_format: "auto",
          quality: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload failed:", error);
            return reject(new Error(error.message || "Cloudinary upload failed"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  },

  /**
   * Safely delete an asset from Cloudinary by its public ID
   */
  async deleteImage(publicId) {
    if (!publicId) return null;
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (err) {
      console.warn(`Failed to destroy Cloudinary asset (${publicId}):`, err.message || err);
      return null;
    }
  },
};

module.exports = cloudinaryService;

