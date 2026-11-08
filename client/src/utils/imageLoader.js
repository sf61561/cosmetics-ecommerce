/**
 * Custom Image Loader for Next.js (<Image /> component).
 * Offloads 100% of format conversion (WebP/AVIF), perceptual compression,
 * and responsive width resizing to Cloudinary's global Akamai CDN.
 * Bypasses Node.js server Sharp CPU bottlenecks completely.
 */
export default function imageLoader({ src, width, quality }) {
  if (!src || typeof src !== "string") return "";

  // 1. Cloudinary on-the-fly CDN optimization
  if (src.includes("res.cloudinary.com") && src.includes("/image/upload/")) {
    const parts = src.split("/image/upload/");
    if (parts.length === 2) {
      const prefix = parts[0] + "/image/upload";
      let rest = parts[1];

      // Build desired transformation: auto-format (WebP/AVIF), auto-quality, responsive width, limit crop
      const q = quality || "auto";
      const transforms = ["f_auto", `q_${q}`];
      if (width) {
        transforms.push(`w_${width}`);
        transforms.push("c_limit");
      }
      const transformStr = transforms.join(",");

      // If the URL already contains existing transformation segments, strip them to avoid duplication
      const existingTransformRegex = /^([a-z]_[a-z0-9_.-]+,?)+\//i;
      if (existingTransformRegex.test(rest)) {
        rest = rest.replace(existingTransformRegex, "");
      }

      return `${prefix}/${transformStr}/${rest}`;
    }
  }

  // 2. Unsplash on-the-fly resizing
  if (src.includes("images.unsplash.com")) {
    try {
      const u = new URL(src);
      if (width) u.searchParams.set("w", width.toString());
      u.searchParams.set("auto", "format");
      u.searchParams.set("q", quality ? quality.toString() : "80");
      return u.toString();
    } catch {
      return src;
    }
  }

  // 3. Fallback: local static assets or third-party avatars
  return src;
}

/**
 * Helper to optimize any Cloudinary URL directly (for CSS background-image, raw img tags, or meta tags)
 */
export function optimizeCloudinaryUrl(url, { width = 800, quality = "auto" } = {}) {
  return imageLoader({ src: url, width, quality });
}
