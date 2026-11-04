const heroSliderRepository = require("../repositories/heroSliderRepository");
const cloudinaryService = require("./cloudinaryService");
const { getClient } = require("../config/db");
const auditService = require("./auditService");

const VALID_ALIGNMENTS = ["left", "center", "right"];
const VALID_COLORS = ["light", "dark"];
const VALID_POSITIONS = ["top", "center", "bottom"];

function fail(message, field = null, status = 400) {
  const error = new Error(message);
  error.status = status;
  if (field) error.field = field;
  throw error;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Enter a valid ${field}.`, field);
  return date.toISOString();
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true";
}

function validateLink(value) {
  if (!value) return null;
  const trimmed = value.trim();
  // Strictly allow relative paths (/...) or secure HTTP(S) URLs; block javascript: and data:
  if (!/^\/|^https?:\/\//i.test(trimmed)) {
    fail("Destination must be a relative site path (e.g. /shop) or valid HTTP(S) URL.", "buttonLink");
  }
  return trimmed;
}

function validateImage(file, field) {
  if (!file) return;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    fail("Only JPEG, PNG, and WebP images are supported.", field);
  }
  const maxBytes = 5 * 1024 * 1024; // 5 MB limit
  if (file.size > maxBytes) {
    fail("Image file size exceeds the 5MB maximum limit.", field);
  }
}

function deleteManagedImage(publicId) {
  return publicId && publicId.startsWith("rupkotha/hero-sliders/")
    ? cloudinaryService.deleteImage(publicId)
    : Promise.resolve();
}

function normalize(data, files, existing = null) {
  const desktop = files?.desktopImage?.[0];
  const mobile = files?.mobileImage?.[0];
  validateImage(desktop, "desktopImage");
  validateImage(mobile, "mobileImage");

  const internalName = String(data.internalName || data.title || "").trim();
  const headline = String(data.headline || data.title || internalName).trim();
  if (!internalName) fail("Slide title / internal name is required.", "internalName");
  if (!headline) fail("Slide headline is required.", "headline");
  if (!existing && !desktop) fail("Desktop banner image is required.", "desktopImage");

  const buttonText = optionalText(data.buttonText);
  const buttonLink = validateLink(data.buttonLink || data.linkUrl);
  if (buttonText && !buttonLink) fail("Destination link is required when button text is provided.", "buttonLink");
  if (buttonLink && !buttonText) fail("CTA button text is required when destination link is provided.", "buttonText");

  const startsAt = parseDate(data.startsAt, "start date");
  const endsAt = parseDate(data.endsAt, "end date");
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    fail("End date must be after the start date.", "endsAt");
  }

  const overlayOpacity = Number(data.overlayOpacity ?? 0.4);
  if (!Number.isFinite(overlayOpacity) || overlayOpacity < 0 || overlayOpacity > 1) {
    fail("Overlay opacity must be between 0 and 1.", "overlayOpacity");
  }

  const displayOrder = Number(data.displayOrder ?? data.position ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    fail("Display order must be a non-negative integer.", "displayOrder");
  }

  const textAlignment = data.textAlignment || "left";
  const textColor = data.textColor || "light";
  const textPosition = data.textPosition || "center";
  if (!VALID_ALIGNMENTS.includes(textAlignment)) fail("Invalid text alignment.", "textAlignment");
  if (!VALID_COLORS.includes(textColor)) fail("Invalid text color.", "textColor");
  if (!VALID_POSITIONS.includes(textPosition)) fail("Invalid text position.", "textPosition");

  const altText = String(data.altText || headline || internalName).trim();
  const openInNewTab = parseBoolean(data.openInNewTab, false);
  const placement = String(data.placement || "home_hero").trim();

  return {
    internalName,
    headline,
    subtitle: optionalText(data.subtitle),
    badgeText: optionalText(data.badgeText),
    buttonText,
    buttonLink,
    desktop,
    mobile,
    displayOrder,
    isActive: parseBoolean(data.isActive),
    startsAt,
    endsAt,
    textAlignment,
    textColor,
    overlayOpacity,
    textPosition,
    altText,
    openInNewTab,
    placement,
    desktopImageUrl: existing?.desktopImageUrl || null,
    desktopImagePublicId: existing?.desktopImagePublicId || null,
    mobileImageUrl: existing?.mobileImageUrl || null,
    mobileImagePublicId: existing?.mobileImagePublicId || null,
  };
}

class HeroSliderService {
  async list(params = {}) {
    const slides = await heroSliderRepository.list(params);
    const now = Date.now();
    const summary = {
      total: slides.length,
      active: slides.filter((slide) => slide.isActive && (!slide.endsAt || new Date(slide.endsAt).getTime() > now)).length,
      scheduled: slides.filter((slide) => slide.startsAt && new Date(slide.startsAt).getTime() > now).length,
      expired: slides.filter((slide) => slide.endsAt && new Date(slide.endsAt).getTime() <= now).length,
      displayed: slides.filter((slide) =>
        slide.isActive &&
        (!slide.startsAt || new Date(slide.startsAt).getTime() <= now) &&
        (!slide.endsAt || new Date(slide.endsAt).getTime() > now)
      ).length,
    };
    return { slides, summary };
  }

  async getPublic(options = {}) {
    const placement = options.placement || "home_hero";
    return heroSliderRepository.listPublic({ placement });
  }

  async getById(id) {
    const slide = await heroSliderRepository.getById(id);
    if (!slide) fail("Hero slide not found.", null, 404);
    return slide;
  }

  async save(data, files, id = null, actor = null, request = null) {
    const existing = id ? await this.getById(id) : null;
    const normalized = normalize(data, files, existing);
    const uploaded = [];
    try {
      if (normalized.desktop) {
        const result = await cloudinaryService.uploadImage(normalized.desktop.buffer, "rupkotha/hero-sliders");
        normalized.desktopImageUrl = result.url;
        normalized.desktopImagePublicId = result.publicId;
        uploaded.push(result.publicId);
      }
      if (normalized.mobile) {
        const result = await cloudinaryService.uploadImage(normalized.mobile.buffer, "rupkotha/hero-sliders");
        normalized.mobileImageUrl = result.url;
        normalized.mobileImagePublicId = result.publicId;
        uploaded.push(result.publicId);
      }
      const client = await getClient();
      let saved;
      try {
        await client.query("BEGIN");
        saved = id
          ? await heroSliderRepository.update(id, normalized, client)
          : await heroSliderRepository.create(normalized, client);

        const fields = (s) => ({
          internalName: s.internalName,
          headline: s.headline,
          buttonLink: s.buttonLink,
          displayOrder: s.displayOrder,
          isActive: s.isActive,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          altText: s.altText,
          openInNewTab: s.openInNewTab,
          placement: s.placement,
        });

        await auditService.record({
          actor,
          action: id ? "HERO_SLIDER_UPDATED" : "HERO_SLIDER_CREATED",
          entityType: "HERO_SLIDER",
          entityId: saved.id,
          ...(existing ? { previousValues: fields(existing) } : {}),
          newValues: { ...fields(saved), imagesChanged: Boolean(normalized.desktop || normalized.mobile) },
          metadata: { desktopImageChanged: Boolean(normalized.desktop), mobileImageChanged: Boolean(normalized.mobile) },
        }, { client, request });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const oldIds = [];
      if (existing && normalized.desktop && existing.desktopImagePublicId !== saved.desktopImagePublicId) {
        oldIds.push(existing.desktopImagePublicId);
      }
      if (existing && normalized.mobile && existing.mobileImagePublicId !== saved.mobileImagePublicId) {
        oldIds.push(existing.mobileImagePublicId);
      }
      await Promise.all(oldIds.filter(Boolean).map(deleteManagedImage));
      return saved;
    } catch (error) {
      await Promise.all(uploaded.map(deleteManagedImage));
      throw error;
    }
  }

  async updateStatus(id, isActive, actor = null, request = null) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const previous = await client.query("SELECT is_active, internal_name FROM hero_sliders WHERE id = $1 FOR UPDATE", [id]);
      if (!previous.rows[0]) fail("Hero slide not found.", null, 404);
      const updated = await heroSliderRepository.updateStatus(id, Boolean(isActive), client);
      if (Boolean(previous.rows[0].is_active) !== Boolean(isActive)) {
        await auditService.record({
          actor,
          action: "HERO_SLIDER_STATUS_CHANGED",
          entityType: "HERO_SLIDER",
          entityId: id,
          previousValues: { isActive: Boolean(previous.rows[0].is_active) },
          newValues: { isActive: Boolean(isActive) },
        }, { client, request });
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reorder(rawItems, actor = null, request = null) {
    const items = Array.isArray(rawItems) ? rawItems : (rawItems?.order || rawItems?.items || []);
    if (!Array.isArray(items) || items.length === 0) fail("At least one slide order is required.");

    const normalized = items.map((item) => {
      const displayOrder = Number(item.position !== undefined ? item.position : item.displayOrder);
      if (!item.id || !Number.isInteger(displayOrder) || displayOrder < 0) {
        fail("Invalid slide ordering parameters.");
      }
      return { id: item.id, displayOrder, position: displayOrder };
    });

    const client = await getClient();
    try {
      await client.query("BEGIN");
      await heroSliderRepository.reorder(normalized, client);
      await auditService.record({
        actor,
        action: "HERO_SLIDER_REORDERED",
        entityType: "HERO_SLIDER",
        newValues: { slideCount: normalized.length },
        metadata: { slides: normalized },
      }, { client, request });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.list();
  }

  async duplicate(id, actor = null, request = null) {
    const client = await getClient();
    let duplicated;
    try {
      await client.query("BEGIN");
      duplicated = await heroSliderRepository.duplicate(id, client);
      if (!duplicated) fail("Hero slide not found to duplicate.", null, 404);

      await auditService.record({
        actor,
        action: "HERO_SLIDER_CREATED",
        entityType: "HERO_SLIDER",
        entityId: duplicated.id,
        newValues: {
          originalId: id,
          internalName: duplicated.internalName,
          displayOrder: duplicated.displayOrder,
          isActive: duplicated.isActive,
        },
        metadata: { method: "DUPLICATE", sourceId: id },
      }, { client, request });

      await client.query("COMMIT");
      return duplicated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id, actor = null, request = null) {
    const slide = await this.getById(id);
    const client = await getClient();
    let removed;
    try {
      await client.query("BEGIN");
      removed = await heroSliderRepository.remove(id, client);
      if (removed) {
        await auditService.record({
          actor,
          action: "HERO_SLIDER_DELETED",
          entityType: "HERO_SLIDER",
          entityId: id,
          previousValues: {
            internalName: slide.internalName,
            headline: slide.headline,
            isActive: slide.isActive,
            displayOrder: slide.displayOrder,
          },
        }, { client, request });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (removed) {
      await Promise.all([
        deleteManagedImage(slide.desktopImagePublicId),
        deleteManagedImage(slide.mobileImagePublicId),
      ]);
    }
    return removed;
  }
}

module.exports = new HeroSliderService();
