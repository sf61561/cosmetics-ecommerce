const promotionRepository = require("../repositories/promotionRepository");
const { getClient } = require("../config/db");
const auditService = require("./auditService");
const cartRepository = require("../repositories/cartRepository");

const VALID_ZONES = ["INSIDE_DHAKA", "OUTSIDE_DHAKA"];

function fail(message, code = "PROMOTION_INVALID", status = 400) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

function normalizeCode(code) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function validateDeliveryInput(data) {
  if (!VALID_ZONES.includes(data.zone)) fail("Select a supported delivery zone (INSIDE_DHAKA or OUTSIDE_DHAKA).");
  if (!Number.isFinite(Number(data.deliveryCharge)) || Number(data.deliveryCharge) < 0) {
    fail("Delivery charge must be zero or greater.");
  }
}

function validateCouponInput(data) {
  const discountType = String(data.discountType || "").toUpperCase();
  if (!/^[A-Z0-9_-]{3,80}$/.test(data.code || "")) {
    fail("Coupon code must contain 3-80 letters, numbers, underscores, or hyphens.", "INVALID_CODE");
  }
  if (!["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"].includes(discountType)) {
    fail("Select a valid coupon discount type.");
  }
  const value = Number(data.discountValue);
  if (!Number.isFinite(value) || value < 0) fail("Discount value must be zero or greater.");
  if (discountType === "PERCENTAGE" && (value <= 0 || value > 100)) {
    fail("Percentage discount must be between 0 and 100.");
  }
  if (discountType === "FREE_DELIVERY" && value !== 0) {
    fail("Free-delivery coupons cannot have a discount value.");
  }
  if (data.startsAt && data.expiresAt && new Date(data.expiresAt) <= new Date(data.startsAt)) {
    fail("Expiry date must be after the start date.");
  }
}

function calculateCouponDiscount(coupon, subtotal, deliveryCharge) {
  if (coupon.discount_type === "FREE_DELIVERY") {
    return { productDiscount: 0, deliveryDiscount: deliveryCharge };
  }
  if (subtotal < Number(coupon.min_order_amount)) {
    fail(
      `This coupon requires a minimum eligible subtotal of ৳${Number(coupon.min_order_amount).toLocaleString()}.`,
      "MINIMUM_ORDER_NOT_MET"
    );
  }
  let discount =
    coupon.discount_type === "PERCENTAGE"
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);
  if (coupon.max_discount_amount !== null) {
    discount = Math.min(discount, Number(coupon.max_discount_amount));
  }
  return { productDiscount: Math.min(Math.round(discount), subtotal), deliveryDiscount: 0 };
}

class PromotionService {
  async listDeliveryRules() {
    return promotionRepository.listDeliveryRules();
  }

  async saveDeliveryRule(data, id = null, actor = null, request = null) {
    validateDeliveryInput(data);
    const normalized = {
      ...data,
      name: data.zone === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka",
      zone: data.zone,
      deliveryCharge: Number(data.deliveryCharge),
      estimatedDeliveryTime: data.estimatedDeliveryTime || (data.zone === "INSIDE_DHAKA" ? "2-3 business days" : "3-5 business days"),
      isActive: data.isActive !== false,
    };
    const existing = id ? await promotionRepository.getDeliveryRule(id) : null;
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const saved = await promotionRepository.saveDeliveryRule(normalized, id, client);
      const pick = (rule) => ({
        name: rule.name,
        zone: rule.zone,
        deliveryCharge: rule.deliveryCharge,
        estimatedDeliveryTime: rule.estimatedDeliveryTime,
        isActive: rule.isActive,
      });
      await auditService.record({
        actor,
        action: id ? "DELIVERY_CHARGE_UPDATED" : "DELIVERY_CHARGE_SAVED",
        entityType: "DELIVERY_RULE",
        entityId: saved.id,
        ...(existing ? { previousValues: pick(existing) } : {}),
        newValues: pick(saved),
      }, { client, request });
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDeliverySettings({ insideDhaka, outsideDhaka }, actor = null, request = null) {
    if (insideDhaka && insideDhaka.deliveryCharge !== undefined) {
      if (!Number.isFinite(Number(insideDhaka.deliveryCharge)) || Number(insideDhaka.deliveryCharge) < 0) {
        fail("Inside Dhaka delivery charge must be zero or greater.");
      }
    }
    if (outsideDhaka && outsideDhaka.deliveryCharge !== undefined) {
      if (!Number.isFinite(Number(outsideDhaka.deliveryCharge)) || Number(outsideDhaka.deliveryCharge) < 0) {
        fail("Outside Dhaka delivery charge must be zero or greater.");
      }
    }
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const updated = await promotionRepository.updateDeliverySettings({ insideDhaka, outsideDhaka }, client);
      await auditService.record({
        actor,
        action: "DELIVERY_CHARGES_UPDATED",
        entityType: "DELIVERY_SETTINGS",
        entityId: "delivery_settings",
        newValues: { insideDhaka, outsideDhaka },
      }, { client, request });
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listCoupons(params) {
    return promotionRepository.listCoupons(params);
  }

  async getCoupon(id) {
    return promotionRepository.getCoupon(id);
  }

  async saveCoupon(data, id = null, actor = null, request = null) {
    validateCouponInput(data);
    const normalized = {
      ...data,
      code: normalizeCode(data.code),
      discountType: String(data.discountType).toUpperCase(),
      discountValue: Number(data.discountValue || 0),
      maxDiscountAmount:
        data.maxDiscountAmount === "" || data.maxDiscountAmount === null
          ? null
          : Number(data.maxDiscountAmount),
      minOrderAmount: Number(data.minOrderAmount || 0),
      usageLimit: data.usageLimit === "" || data.usageLimit === null ? null : Number(data.usageLimit),
      perCustomerLimit:
        data.perCustomerLimit === "" || data.perCustomerLimit === null
          ? null
          : Number(data.perCustomerLimit),
      isActive: data.isActive !== false,
    };
    const existing = id ? await promotionRepository.getCoupon(id) : null;
    if (id && !existing) fail("Coupon not found.", "COUPON_NOT_FOUND", 404);
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const saved = await promotionRepository.saveCoupon(normalized, id, client);
      const pick = (coupon) => ({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        perCustomerLimit: coupon.perCustomerLimit,
        isActive: coupon.isActive,
      });
      await auditService.record({
        actor,
        action: id ? "COUPON_UPDATED" : "COUPON_CREATED",
        entityType: "COUPON",
        entityId: saved.id,
        ...(existing ? { previousValues: pick(existing) } : {}),
        newValues: pick(saved),
      }, { client, request });
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCouponStatus(id, isActive, actor = null, request = null) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const previous = await client.query("SELECT is_active FROM coupons WHERE id = $1 FOR UPDATE", [id]);
      if (!previous.rows[0]) fail("Coupon not found.", "COUPON_NOT_FOUND", 404);
      const saved = await promotionRepository.updateCouponStatus(id, Boolean(isActive), client);
      if (Boolean(previous.rows[0].is_active) !== Boolean(isActive)) {
        await auditService.record({
          actor,
          action: "COUPON_STATUS_CHANGED",
          entityType: "COUPON",
          entityId: id,
          previousValues: { isActive: Boolean(previous.rows[0].is_active) },
          newValues: { isActive: Boolean(isActive) },
        }, { client, request });
      }
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async calculateCartTotal({ userId = null, sessionId = null, zone = "INSIDE_DHAKA", code = "" }) {
    if (!VALID_ZONES.includes(zone)) fail("Unsupported delivery zone.", "UNSUPPORTED_DELIVERY_ZONE");
    const rawItems = await cartRepository.findCartItems({ userId, sessionId });
    const availableItems = rawItems.filter((item) => {
      const published =
        item.product_status === "ACTIVE" &&
        (!item.published_at || new Date(item.published_at) <= new Date());
      const stockAvailable = !item.track_inventory || Number(item.stock_quantity) >= Number(item.quantity);
      return published && stockAvailable;
    });
    if (availableItems.length !== rawItems.length) {
      fail("Remove unavailable or over-stocked items before continuing.", "CART_REQUIRES_ATTENTION");
    }

    const productSubtotal = availableItems.reduce((sum, item) => {
      const unit =
        item.sale_price !== null && Number(item.sale_price) < Number(item.regular_price)
          ? Number(item.sale_price)
          : Number(item.regular_price);
      return sum + unit * Number(item.quantity);
    }, 0);
    const productDiscount = availableItems.reduce((sum, item) => {
      const regular = Number(item.regular_price) * Number(item.quantity);
      const actual =
        (item.sale_price !== null && Number(item.sale_price) < Number(item.regular_price)
          ? Number(item.sale_price)
          : Number(item.regular_price)) * Number(item.quantity);
      return sum + regular - actual;
    }, 0);

    const rules = await promotionRepository.listDeliveryRules();
    const rule = rules.find((candidate) => candidate.isActive && candidate.zone === zone);
    if (!rule) fail("Selected delivery zone is currently unavailable.", "DELIVERY_ZONE_UNAVAILABLE");
    const deliveryChargeBeforePromotion = rule.deliveryCharge;

    let coupon = null;
    let couponDiscount = 0;
    let deliveryDiscount = 0;
    const normalizedCode = normalizeCode(code);
    if (normalizedCode) {
      const rawCoupon = await promotionRepository.findUsableCoupon(normalizedCode);
      if (!rawCoupon || !rawCoupon.is_active) fail("This coupon is invalid or inactive.", "COUPON_INVALID");
      const now = new Date();
      if (rawCoupon.starts_at && now < new Date(rawCoupon.starts_at)) fail("This coupon is not active yet.", "COUPON_NOT_STARTED");
      if (rawCoupon.expires_at && now >= new Date(rawCoupon.expires_at)) fail("This coupon has expired.", "COUPON_EXPIRED");
      if (rawCoupon.usage_limit !== null && rawCoupon.usage_count >= rawCoupon.usage_limit) {
        fail("This coupon has reached its redemption limit.", "COUPON_USAGE_LIMIT_REACHED");
      }
      if (userId && rawCoupon.per_customer_limit !== null) {
        const count = await promotionRepository.countCustomerRedemptions(rawCoupon.id, userId);
        if (count >= rawCoupon.per_customer_limit) {
          fail("You have reached this coupon's usage limit.", "CUSTOMER_USAGE_LIMIT_REACHED");
        }
      }
      const calculated = calculateCouponDiscount(rawCoupon, productSubtotal, deliveryChargeBeforePromotion);
      coupon = {
        id: rawCoupon.id,
        code: rawCoupon.code,
        discountType: rawCoupon.discount_type,
      };
      couponDiscount = calculated.productDiscount;
      deliveryDiscount += calculated.deliveryDiscount;
    }

    const finalDeliveryCharge = Math.max(0, deliveryChargeBeforePromotion - (coupon?.discountType === "FREE_DELIVERY" ? deliveryDiscount : 0));
    const finalTotal = Math.max(0, productSubtotal - couponDiscount + finalDeliveryCharge);
    return {
      productSubtotal,
      productDiscount,
      eligibleCouponSubtotal: productSubtotal,
      coupon: coupon ? { ...coupon, discountAmount: couponDiscount } : null,
      couponDiscount,
      deliveryZone: zone,
      deliveryChargeBeforePromotion: rule.deliveryCharge,
      deliveryDiscount: Math.max(0, rule.deliveryCharge - finalDeliveryCharge),
      deliveryCharge: finalDeliveryCharge,
      finalTotal,
      estimatedDeliveryTime: rule.estimatedDeliveryTime,
    };
  }
}

module.exports = new PromotionService();
