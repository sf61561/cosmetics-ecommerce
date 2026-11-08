const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

function formatCloudinaryDeliveryUrl(secureUrl) {
  if (!secureUrl || typeof secureUrl !== "string") return secureUrl;
  if (secureUrl.includes("/image/upload/") && !secureUrl.includes("/image/upload/f_auto,q_auto")) {
    return secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }
  return secureUrl;
}

// POST /api/upload
router.post(
  "/",
  (req, res, next) => {
    // Accept either "image", "avatar", or "file" field name
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "avatar", maxCount: 1 },
      { name: "file", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the 5 MB limit.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to process uploaded file.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file =
        req.files?.image?.[0] ||
        req.files?.avatar?.[0] ||
        req.files?.file?.[0] ||
        req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided. Please select an image.",
        });
      }

      // Stream the memory buffer directly to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "eloura/avatars",
            resource_type: "image",
            transformation: [
              { width: 1000, height: 1000, crop: "limit" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        Readable.from(file.buffer).pipe(stream);
      });

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully.",
        imageUrl: formatCloudinaryDeliveryUrl(uploadResult.secure_url),
        publicId: uploadResult.public_id,
      });
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image to Cloudinary.",
      });
    }
  }
);

module.exports = router;

