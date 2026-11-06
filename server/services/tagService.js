const tagRepository = require("../repositories/tagRepository");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const tagService = {
  /**
   * Create a new tag
   */
  async createTag({ name, slug, description = null }) {
    if (!name || typeof name !== "string" || !name.trim()) {
      const error = new Error("Tag name is required.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      const error = new Error("Tag name must be between 2 and 100 characters.");
      error.statusCode = 400;
      error.field = "name";
      throw error;
    }

    // Check name uniqueness
    const existingName = await tagRepository.findByName(trimmedName);
    if (existingName) {
      const error = new Error(`A tag with the name "${trimmedName}" already exists.`);
      error.statusCode = 409;
      error.field = "name";
      throw error;
    }

    // Generate or clean slug
    let finalSlug = slug && typeof slug === "string" && slug.trim() ? slugify(slug) : slugify(trimmedName);
    if (!finalSlug) {
      finalSlug = `tag-${Date.now()}`;
    }

    // Check slug uniqueness
    const existingSlug = await tagRepository.findBySlug(finalSlug);
    if (existingSlug) {
      const error = new Error(`A tag with the slug "${finalSlug}" already exists. Please choose a different slug.`);
      error.statusCode = 409;
      error.field = "slug";
      throw error;
    }

    return await tagRepository.create({
      name: trimmedName,
      slug: finalSlug,
      description,
    });
  },

  /**
   * List paginated tags
   */
  async listTags(params = {}) {
    return await tagRepository.findAll(params);
  },

  /**
   * Get single tag by ID
   */
  async getTagById(id) {
    if (!id) {
      const error = new Error("Tag ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const tag = await tagRepository.findById(id);
    if (!tag) {
      const error = new Error("Tag not found.");
      error.statusCode = 404;
      throw error;
    }
    return tag;
  },

  /**
   * Update tag
   */
  async updateTag(id, { name, slug, description }) {
    if (!id) {
      const error = new Error("Tag ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const existing = await tagRepository.findById(id);
    if (!existing) {
      const error = new Error("Tag not found.");
      error.statusCode = 404;
      throw error;
    }

    let trimmedName = existing.name;
    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        const error = new Error("Tag name cannot be empty.");
        error.statusCode = 400;
        error.field = "name";
        throw error;
      }
      trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        const error = new Error("Tag name must be between 2 and 100 characters.");
        error.statusCode = 400;
        error.field = "name";
        throw error;
      }

      // Check name uniqueness excluding self
      const existingName = await tagRepository.findByName(trimmedName, id);
      if (existingName) {
        const error = new Error(`A tag with the name "${trimmedName}" already exists.`);
        error.statusCode = 409;
        error.field = "name";
        throw error;
      }
    }

    let finalSlug = existing.slug;
    if (slug !== undefined) {
      finalSlug = slug && typeof slug === "string" && slug.trim() ? slugify(slug) : slugify(trimmedName);
      if (!finalSlug) {
        finalSlug = `tag-${Date.now()}`;
      }

      // Check slug uniqueness excluding self
      const existingSlug = await tagRepository.findBySlug(finalSlug, id);
      if (existingSlug) {
        const error = new Error(`A tag with the slug "${finalSlug}" already exists.`);
        error.statusCode = 409;
        error.field = "slug";
        throw error;
      }
    }

    return await tagRepository.update(id, {
      name: trimmedName,
      slug: finalSlug,
      description,
    });
  },

  /**
   * Delete tag
   */
  async deleteTag(id) {
    if (!id) {
      const error = new Error("Tag ID is required.");
      error.statusCode = 400;
      throw error;
    }
    const deleted = await tagRepository.delete(id);
    if (!deleted) {
      const error = new Error("Tag not found or already deleted.");
      error.statusCode = 404;
      throw error;
    }
    return { success: true, message: "Tag deleted successfully." };
  },
};

module.exports = tagService;

