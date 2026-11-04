const { query, getClient } = require("../config/db");

function mapSlide(row) {
  if (!row) return null;
  return {
    id: row.id,
    internalName: row.internal_name,
    headline: row.headline,
    subtitle: row.subtitle,
    badgeText: row.badge_text,
    buttonText: row.button_text,
    buttonLink: row.button_link,
    desktopImageUrl: row.desktop_image_url,
    desktopImagePublicId: row.desktop_image_public_id,
    mobileImageUrl: row.mobile_image_url,
    mobileImagePublicId: row.mobile_image_public_id,
    displayOrder: row.display_order,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    textAlignment: row.text_alignment,
    textColor: row.text_color,
    overlayOpacity: Number(row.overlay_opacity),
    textPosition: row.text_position,
    altText: row.alt_text || row.headline || "",
    openInNewTab: Boolean(row.open_in_new_tab),
    placement: row.placement || "home_hero",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Aliases matching user prompt spec
    title: row.internal_name,
    linkUrl: row.button_link,
    imageDesktop: row.desktop_image_url,
    imageMobile: row.mobile_image_url,
    position: row.display_order,
  };
}

const heroSliderRepository = {
  async list({ search = "", status = "all", placement = "all" } = {}) {
    const values = [];
    const conditions = [];

    if (search.trim()) {
      values.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(internal_name) LIKE $${values.length} OR LOWER(headline) LIKE $${values.length})`);
    }

    if (status === "active") {
      conditions.push("is_active = true AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at > NOW())");
    } else if (status === "scheduled") {
      conditions.push("is_active = true AND starts_at > NOW()");
    } else if (status === "expired") {
      conditions.push("ends_at <= NOW()");
    } else if (status === "inactive") {
      conditions.push("is_active = false");
    }

    if (placement && placement !== "all") {
      values.push(placement);
      conditions.push(`placement = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await query(
      `SELECT * FROM hero_sliders ${where} ORDER BY display_order ASC, created_at DESC`,
      values
    );

    return result.rows.map(mapSlide);
  },

  async getById(id) {
    const result = await query("SELECT * FROM hero_sliders WHERE id = $1", [id]);
    return mapSlide(result.rows[0]);
  },

  async listPublic({ placement = "home_hero" } = {}) {
    const result = await query(
      `SELECT id, headline, subtitle, badge_text, button_text, button_link,
              desktop_image_url, mobile_image_url, display_order, text_alignment,
              text_color, overlay_opacity, text_position, alt_text, open_in_new_tab,
              placement, internal_name
       FROM hero_sliders
       WHERE placement = $1
         AND is_active = true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY display_order ASC, created_at ASC`,
      [placement]
    );
    return result.rows.map(mapSlide);
  },

  async create(data, dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query(
      `INSERT INTO hero_sliders
       (internal_name, headline, subtitle, badge_text, button_text, button_link,
        desktop_image_url, desktop_image_public_id, mobile_image_url, mobile_image_public_id,
        display_order, is_active, starts_at, ends_at, text_alignment, text_color,
        overlay_opacity, text_position, alt_text, open_in_new_tab, placement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        data.internalName, data.headline, data.subtitle, data.badgeText, data.buttonText,
        data.buttonLink, data.desktopImageUrl, data.desktopImagePublicId, data.mobileImageUrl,
        data.mobileImagePublicId, data.displayOrder, data.isActive, data.startsAt, data.endsAt,
        data.textAlignment, data.textColor, data.overlayOpacity, data.textPosition,
        data.altText || data.headline, data.openInNewTab || false, data.placement || "home_hero",
      ]
    );
    return mapSlide(result.rows[0]);
  },

  async update(id, data, dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query(
      `UPDATE hero_sliders SET
       internal_name=$1, headline=$2, subtitle=$3, badge_text=$4, button_text=$5, button_link=$6,
       desktop_image_url=$7, desktop_image_public_id=$8, mobile_image_url=$9,
       mobile_image_public_id=$10, display_order=$11, is_active=$12, starts_at=$13, ends_at=$14,
       text_alignment=$15, text_color=$16, overlay_opacity=$17, text_position=$18,
       alt_text=$19, open_in_new_tab=$20, placement=$21, updated_at=NOW()
       WHERE id=$22 RETURNING *`,
      [
        data.internalName, data.headline, data.subtitle, data.badgeText, data.buttonText,
        data.buttonLink, data.desktopImageUrl, data.desktopImagePublicId, data.mobileImageUrl,
        data.mobileImagePublicId, data.displayOrder, data.isActive, data.startsAt, data.endsAt,
        data.textAlignment, data.textColor, data.overlayOpacity, data.textPosition,
        data.altText || data.headline, data.openInNewTab || false, data.placement || "home_hero",
        id,
      ]
    );
    return mapSlide(result.rows[0]);
  },

  async updateStatus(id, isActive, dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query(
      "UPDATE hero_sliders SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [isActive, id]
    );
    return mapSlide(result.rows[0]);
  },

  async reorder(items, dbClient = null) {
    const client = dbClient || await getClient();
    const ownsTransaction = !dbClient;
    try {
      if (ownsTransaction) await client.query("BEGIN");
      for (const item of items) {
        const order = item.position !== undefined ? item.position : item.displayOrder;
        await client.query(
          "UPDATE hero_sliders SET display_order = $1, updated_at = NOW() WHERE id = $2",
          [order, item.id]
        );
      }
      if (ownsTransaction) await client.query("COMMIT");
    } catch (error) {
      if (ownsTransaction) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (ownsTransaction) client.release();
    }
  },

  async duplicate(id, dbClient = null) {
    const client = dbClient || await getClient();
    const ownsTransaction = !dbClient;
    try {
      if (ownsTransaction) await client.query("BEGIN");

      // 1. Get original slide
      const originalRes = await client.query("SELECT * FROM hero_sliders WHERE id = $1", [id]);
      const orig = originalRes.rows[0];
      if (!orig) return null;

      // 2. Compute next display order
      const maxOrderRes = await client.query("SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM hero_sliders");
      const nextOrder = parseInt(maxOrderRes.rows[0]?.next_order, 10) || 0;

      // 3. Clone record with ' (Copy)' suffix and is_active = false
      const result = await client.query(
        `INSERT INTO hero_sliders
         (internal_name, headline, subtitle, badge_text, button_text, button_link,
          desktop_image_url, desktop_image_public_id, mobile_image_url, mobile_image_public_id,
          display_order, is_active, starts_at, ends_at, text_alignment, text_color,
          overlay_opacity, text_position, alt_text, open_in_new_tab, placement)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING *`,
        [
          `${orig.internal_name} (Copy)`,
          orig.headline,
          orig.subtitle,
          orig.badge_text,
          orig.button_text,
          orig.button_link,
          orig.desktop_image_url,
          orig.desktop_image_public_id,
          orig.mobile_image_url,
          orig.mobile_image_public_id,
          nextOrder,
          false, // Default off for new/duplicated slides until reviewed
          orig.starts_at,
          orig.ends_at,
          orig.text_alignment,
          orig.text_color,
          orig.overlay_opacity,
          orig.text_position,
          orig.alt_text || orig.headline,
          orig.open_in_new_tab,
          orig.placement || "home_hero",
        ]
      );

      if (ownsTransaction) await client.query("COMMIT");
      return mapSlide(result.rows[0]);
    } catch (error) {
      if (ownsTransaction) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (ownsTransaction) client.release();
    }
  },

  async remove(id, dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query("DELETE FROM hero_sliders WHERE id = $1 RETURNING *", [id]);
    return mapSlide(result.rows[0]);
  },
};

module.exports = heroSliderRepository;
