const reviewRepository = require("../repositories/reviewRepository");
const cloudinaryService = require("./cloudinaryService");
const notificationService = require("./notificationService");
const { getClient } = require("../config/db");

const REVIEW_ELIGIBILITY_DAYS = parseInt(process.env.REVIEW_ELIGIBILITY_DAYS || "90", 10);

class ReviewService {
  createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  /**
   * Escape HTML entities to prevent XSS
   */
  sanitizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .trim();
  }

  /**
   * Check eligibility for a user to review a product
   */
  async checkEligibility(userId, productId) {
    if (!userId || !productId) {
      return { eligible: false, reason: "User ID and Product ID are required." };
    }

    // 1. Check if user already reviewed this product
    const existingReview = await reviewRepository.findByUserAndProduct(userId, productId);
    if (existingReview) {
      return {
        eligible: false,
        alreadyReviewed: true,
        existingReview,
        reason: "You have already reviewed this product.",
      };
    }

    // 2. Check for delivered, un-refunded order within eligibility window
    const eligibleItem = await reviewRepository.findEligibleOrderItem(
      userId,
      productId,
      REVIEW_ELIGIBILITY_DAYS
    );

    if (!eligibleItem) {
      return {
        eligible: false,
        reason: `You can only review products from orders that have been successfully delivered within the last ${REVIEW_ELIGIBILITY_DAYS} days.`,
      };
    }

    // 3. Resolve variant details
    const variantSnapshot = await reviewRepository.getVariantSnapshot(eligibleItem.variant_id);

    return {
      eligible: true,
      eligibleItem: {
        ...eligibleItem,
        variantSnapshot,
      },
    };
  }

  /**
   * Customer submits a new product review
   */
  async submitReview(userId, { productId, rating, comment, orderItemId }, files = []) {
    // 1. Validate rating
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw this.createError("Rating is required and must be an integer between 1 and 5 stars.", 400);
    }

    // 2. Validate comment length
    let sanitizedComment = null;
    if (comment && comment.trim().length > 0) {
      const trimmed = comment.trim();
      if (trimmed.length < 10) {
        throw this.createError("Review comment must be at least 10 characters long.", 400);
      }
      if (trimmed.length > 1000) {
        throw this.createError("Review comment cannot exceed 1000 characters.", 400);
      }
      sanitizedComment = this.sanitizeText(trimmed);
    }

    // 3. Verify eligibility on the server
    const eligibility = await this.checkEligibility(userId, productId);
    if (!eligibility.eligible) {
      throw this.createError(eligibility.reason || "You are not eligible to review this product.", 400);
    }

    const { eligibleItem } = eligibility;

    // 4. Upload images to Cloudinary (if provided)
    const uploadedImages = [];
    if (files && files.length > 0) {
      if (files.length > 5) {
        throw this.createError("Maximum of 5 images allowed per review.", 400);
      }

      for (const file of files) {
        try {
          const result = await cloudinaryService.uploadImage(file.buffer, "eloura/reviews");
          uploadedImages.push({
            imagePath: result.url,
            publicId: result.publicId,
          });
        } catch (uploadErr) {
          console.error("Failed to upload review image to Cloudinary:", uploadErr);
          throw this.createError("Failed to upload review images. Please try again.", 500);
        }
      }
    }

    // 5. Build review record
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const createdReview = await reviewRepository.createReview(
        {
          userId,
          productId,
          orderId: eligibleItem.order_id,
          orderItemId: orderItemId || eligibleItem.order_item_id,
          variantInfo: eligibleItem.variantSnapshot || null,
          rating: parsedRating,
          comment: sanitizedComment,
          status: "pending",
        },
        uploadedImages,
        client
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: "Your review has been submitted and is awaiting approval.",
        review: createdReview,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      // Clean up uploaded Cloudinary images if database insertion fails
      for (const img of uploadedImages) {
        if (img.publicId) await cloudinaryService.deleteImage(img.publicId);
      }
      if (err.code === "23505") {
        throw this.createError("You can submit only one review per product.", 409);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Customer edits and resubmits a rejected review
   */
  async resubmitReview(userId, reviewId, { rating, comment }, files = []) {
    // 1. Verify review existence and ownership
    const existing = await reviewRepository.findById(reviewId);
    if (!existing) {
      throw this.createError("Review not found.", 404);
    }
    if (existing.user_id !== userId) {
      throw this.createError("You are not authorized to edit this review.", 403);
    }
    if (existing.status !== "rejected") {
      throw this.createError("Only rejected reviews can be edited and resubmitted.", 400);
    }

    // 2. Validate rating
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw this.createError("Rating is required and must be an integer between 1 and 5 stars.", 400);
    }

    // 3. Validate comment length
    let sanitizedComment = null;
    if (comment && comment.trim().length > 0) {
      const trimmed = comment.trim();
      if (trimmed.length < 10) {
        throw this.createError("Review comment must be at least 10 characters long.", 400);
      }
      if (trimmed.length > 1000) {
        throw this.createError("Review comment cannot exceed 1000 characters.", 400);
      }
      sanitizedComment = this.sanitizeText(trimmed);
    }

    // 4. Handle new images if provided
    let newUploadedImages = null;
    if (files && files.length > 0) {
      if (files.length > 5) {
        throw this.createError("Maximum of 5 images allowed per review.", 400);
      }
      newUploadedImages = [];
      for (const file of files) {
        const result = await cloudinaryService.uploadImage(file.buffer, "eloura/reviews");
        newUploadedImages.push({
          imagePath: result.url,
          publicId: result.publicId,
        });
      }
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const updated = await reviewRepository.updateRejectedReview(
        reviewId,
        {
          userId,
          rating: parsedRating,
          comment: sanitizedComment,
          variantInfo: existing.variant_info,
        },
        newUploadedImages,
        client
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: "Your review has been resubmitted and is awaiting approval.",
        review: updated,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      if (newUploadedImages) {
        for (const img of newUploadedImages) {
          if (img.publicId) await cloudinaryService.deleteImage(img.publicId);
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get public reviews for Product Details Page
   */
  async getPublicProductReviews(productId, query = {}) {
    return reviewRepository.getPublicProductReviews(productId, query);
  }

  /**
   * Get customer's submitted reviews
   */
  async getMyReviews(userId, query = {}) {
    return reviewRepository.getMyReviews(userId, query);
  }

  /**
   * Get review status mapping for all items in an order
   */
  async getOrderItemsReviewStatus(userId, orderItemIds = []) {
    return reviewRepository.findByOrderItems(orderItemIds);
  }

  /**
   * Admin: Get all reviews with filters
   */
  async getAdminReviews(query = {}) {
    return reviewRepository.getAdminReviews(query);
  }

  /**
   * Admin: Get single review details
   */
  async getAdminReviewById(reviewId) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw this.createError("Review not found.", 404);
    return review;
  }

  /**
   * Admin: Get review metrics (KPIs)
   */
  async getAdminMetrics() {
    return reviewRepository.getAdminMetrics();
  }

  /**
   * Admin: Get pending reviews count for sidebar badge
   */
  async getPendingCount() {
    return reviewRepository.getPendingCount();
  }

  /**
   * Admin: Approve a review
   */
  async approveReview(reviewId) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw this.createError("Review not found.", 404);

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const updated = await reviewRepository.approveReview(reviewId, client);
      await reviewRepository.recalculateProductRating(review.product_id, client);

      await client.query("COMMIT");

      // Notify customer (in-app and email)
      try {
        await notificationService.notify("review.approved", {
          userId: review.user_id,
          data: {
            productName: review.product_name,
            productSlug: review.product_slug,
          },
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch review approval notification:", notifErr);
      }

      return {
        success: true,
        message: "Review approved successfully.",
        review: updated,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Reject a review with required reason
   */
  async rejectReview(reviewId, reason) {
    if (!reason || !reason.trim()) {
      throw this.createError("Rejection reason is required.", 400);
    }

    const review = await reviewRepository.findById(reviewId);
    if (!review) throw this.createError("Review not found.", 404);

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const updated = await reviewRepository.rejectReview(reviewId, reason.trim(), client);
      await reviewRepository.recalculateProductRating(review.product_id, client);

      await client.query("COMMIT");

      // Notify customer (in-app and email)
      try {
        await notificationService.notify("review.rejected", {
          userId: review.user_id,
          data: {
            productName: review.product_name,
            reason: reason.trim(),
            orderId: review.order_id,
          },
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch review rejection notification:", notifErr);
      }

      return {
        success: true,
        message: "Review rejected.",
        review: updated,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Delete a review
   */
  async deleteReview(reviewId) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw this.createError("Review not found.", 404);

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const { deleted, productId, publicIds } = await reviewRepository.deleteReview(reviewId, client);
      if (deleted && productId) {
        await reviewRepository.recalculateProductRating(productId, client);
      }

      await client.query("COMMIT");

      // Delete Cloudinary assets asynchronously
      for (const pid of publicIds) {
        cloudinaryService.deleteImage(pid).catch(() => {});
      }

      return {
        success: true,
        message: "Review deleted successfully.",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Admin: Bulk approve selected reviews
   */
  async bulkApprove(reviewIds = []) {
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      throw this.createError("At least one review ID must be provided.", 400);
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const approvedRows = await reviewRepository.bulkApprove(reviewIds, client);

      // Unique product IDs to recalculate
      const productIds = [...new Set(approvedRows.map((r) => r.product_id))];
      for (const pid of productIds) {
        await reviewRepository.recalculateProductRating(pid, client);
      }

      await client.query("COMMIT");

      return {
        success: true,
        message: `${approvedRows.length} reviews approved successfully.`,
        approvedCount: approvedRows.length,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new ReviewService();

