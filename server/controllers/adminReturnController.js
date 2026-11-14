const service = require("../services/adminReturnService");
const cloudinary = require("../config/cloudinary");

function formatCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("/image/upload/") && !url.includes("/image/upload/f_auto,q_auto")) {
    return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
  }
  return url;
}

const adminReturnController = {
  async list(req, res, next) {
    try {
      res.json({ success: true, data: await service.list(req.query) });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await service.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, note, rejectionReason, adminNote } = req.body;
      const data = await service.updateStatus(
        req.params.id,
        status,
        { note, rejectionReason, adminNote },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: `Return status updated to ${status}.`, data });
    } catch (err) {
      next(err);
    }
  },

  async requestPhotos(req, res, next) {
    try {
      const { prompt } = req.body;
      const data = await service.requestPhotos(req.params.id, prompt, req.user, req.auditRequest);
      res.json({ success: true, message: "Additional photos requested from customer.", data });
    } catch (err) {
      next(err);
    }
  },

  async saveInspection(req, res, next) {
    try {
      const { itemConditions, adminNote, inspectionImages } = req.body;
      const data = await service.saveInspection(
        req.params.id,
        { itemConditions, adminNote, inspectionImages },
        req.user,
        req.auditRequest
      );
      res.json({ success: true, message: "Warehouse inspection saved successfully.", data });
    } catch (err) {
      next(err);
    }
  },

  async uploadInspectionPhoto(req, res, next) {
    try {
      const file = req.file || req.files?.image?.[0] || req.files?.file?.[0];
      if (!file) {
        return res.status(400).json({ success: false, message: "No image file provided." });
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "eloura/returns/inspections",
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
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async processRefund(req, res, next) {
    try {
      const {
        refundMethod,
        refundAccountDetails,
        returnShippingFee,
        returnShippingPayer,
        adminNote,
      } = req.body;

      const data = await service.processRefund(
        req.params.id,
        {
          refundMethod,
          refundAccountDetails,
          returnShippingFee,
          returnShippingPayer,
          adminNote,
        },
        req.user,
        req.auditRequest
      );

      res.json({ success: true, message: "Refund processed and return completed successfully.", data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminReturnController;
