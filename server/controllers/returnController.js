const crypto = require("crypto");
const service = require("../services/returnService");
const cloudinary = require("../config/cloudinary");

function formatCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/image/upload/") && !url.includes("/image/upload/f_auto,q_auto")) {
    return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }
  return url;
}

const returnController = {
  async uploadEvidence(req, res, next) {
    try {
      const file = req.file || req.files?.image?.[0] || req.files?.file?.[0];
      if (!file) {
        return res.status(400).json({ success: false, message: "No image file provided." });
      }

      const fileHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "eloura/returns/evidence",
            resource_type: "image",
            allowed_formats: ["jpg", "png", "webp", "jpeg"],
          },
          (error, uploaded) => {
            if (error) return reject(error);
            resolve(uploaded);
          }
        );
        stream.end(file.buffer);
      });

      res.json({
        success: true,
        data: {
          imageUrl: formatCloudinaryUrl(result.secure_url),
          publicId: result.public_id,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileHash,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getOrderEligibility(req, res, next) {
    try {
      const data = await service.getOrderEligibility(req.params.orderId, req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createReturn(req, res, next) {
    try {
      const data = await service.createReturn(req.body, req.user, req.auditRequest);
      res.status(201).json({
        success: true,
        message: "Return request submitted successfully.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const data = await service.listByCustomer(req.user.id, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await service.getByIdForCustomer(req.params.id, req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addPhotos(req, res, next) {
    try {
      const { images } = req.body;
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, message: "Please provide at least one photo." });
      }
      await service.addCustomerPhotos(req.params.id, req.user.id, images, req.user, req.auditRequest);
      res.json({ success: true, message: "Additional photos uploaded successfully." });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = returnController;
