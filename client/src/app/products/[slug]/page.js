import { productService } from "@/services/productService";
import ProductDetailsView from "@/components/product/ProductDetailsView";
import ProductNotFoundState from "@/components/product/ProductNotFoundState";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  if (!slug) return { title: "Product | Eloura" };

  try {
    const res = await productService.getProductBySlug(slug);
    if (!res?.success || !res?.data) {
      return {
        title: "Product Not Found | Eloura",
        description: "The requested cosmetics and skincare formulation was not found.",
      };
    }
    const product = res.data;
    const title = product.seoTitle || `${product.name} | Eloura Bangladesh`;
    const description =
      product.seoDescription || product.shortDescription || product.description;
    const ogImage = product.images?.[0]?.imageUrl || product.thumbnailUrl;

    return {
      title,
      description,
      alternates: {
        canonical: `/products/${product.slug}`,
      },
      openGraph: {
        title,
        description,
        url: `/products/${product.slug}`,
        images: ogImage ? [{ url: ogImage, alt: product.name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch {
    return {
      title: "Product | Eloura",
    };
  }
}

export default async function ProductDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  let product = null;
  let fetchError = null;

  try {
    const res = await productService.getProductBySlug(slug);
    if (res?.success && res?.data) {
      product = res.data;
    } else {
      fetchError = res?.message || "Product not found or unavailable.";
    }
  } catch (err) {
    fetchError = err.message || "Failed to load product formulation.";
  }

  if (!product) {
    return <ProductNotFoundState error={fetchError} />;
  }

  // Schema.org Product structured data for Google Shopping and search engine rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image:
      product.images?.map((img) => img.imageUrl) ||
      (product.thumbnailUrl ? [product.thumbnailUrl] : []),
    description: product.shortDescription || product.description,
    sku: product.sku,
    mpn: product.barcode,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "Eloura",
    },
    offers: {
      "@type": "Offer",
      url: `https://eloura.com/products/${product.slug}`,
      priceCurrency: "BDT",
      price: product.salePrice || product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailsView initialProduct={product} slug={slug} />
    </>
  );
}
