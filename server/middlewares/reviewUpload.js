const multer = require("multer");

// Store in memory as Buffer for direct streaming to Cloudinary
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format. Only JPG, PNG, and WebP images are allowed."), false);
  }
};

const reviewUpload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB per image
    files: 5,                  // Maximum 5 images
  },
  fileFilter,
});

module.exports = reviewUpload;
