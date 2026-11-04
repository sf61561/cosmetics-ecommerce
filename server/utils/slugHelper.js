/**
 * Generate a clean URL-friendly slug from a string
 */
function generateSlug(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .toString()
    .trim()
    .toLowerCase()
    // Replace accented characters
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace non-alphanumeric chars (preserving basic letters & numbers) with hyphen
    .replace(/[^a-z0-9]+/g, "-")
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Collapse consecutive hyphens
    .replace(/-{2,}/g, "-");
}

/**
 * Validate that a slug matches kebab-case format
 */
function isValidSlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());
}

module.exports = {
  generateSlug,
  slugify: generateSlug,
  isValidSlug,
};

