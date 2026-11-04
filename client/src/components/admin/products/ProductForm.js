"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FaUpload,
  FaTrash,
  FaStar,
  FaRegStar,
  FaLock,
  FaLockOpen,
  FaSpinner,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPlus,
  FaPalette,
  FaLayerGroup,
  FaCheck,
  FaTimes,
  FaSyncAlt,
  FaBolt,
} from "react-icons/fa";

function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function ProductForm({
  initialProduct = null,
  brands = [],
  categories = [],
  collections = [],
  onSubmit,
  isSubmitting = false,
  serverError = null,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const isEditMode = Boolean(initialProduct);

  // Form Fields State
  const [name, setName] = useState(initialProduct?.name || "");
  const [slug, setSlug] = useState(initialProduct?.slug || "");
  const [isSlugCustomized, setIsSlugCustomized] = useState(isEditMode);
  const [brandId, setBrandId] = useState(initialProduct?.brand?.id || initialProduct?.brandId || "");
  const [categoryId, setCategoryId] = useState(initialProduct?.category?.id || initialProduct?.categoryId || "");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(
    initialProduct?.collections?.map((c) => c.id) || []
  );
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [isFeatured, setIsFeatured] = useState(initialProduct?.isFeatured ?? false);

  // Pricing
  const [price, setPrice] = useState(initialProduct?.price !== undefined ? initialProduct.price.toString() : "");
  const [salePrice, setSalePrice] = useState(
    initialProduct?.salePrice !== undefined && initialProduct?.salePrice !== null
      ? initialProduct.salePrice.toString()
      : ""
  );
  const [costPrice, setCostPrice] = useState(
    initialProduct?.costPrice !== undefined && initialProduct?.costPrice !== null
      ? initialProduct.costPrice.toString()
      : ""
  );

  // Inventory (Reserved for future)
  const [sku, setSku] = useState(initialProduct?.sku || "");
  const [barcode, setBarcode] = useState(initialProduct?.barcode || "");
  const [stockQuantity, setStockQuantity] = useState(
    initialProduct?.stockQuantity !== undefined ? initialProduct.stockQuantity.toString() : "10"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialProduct?.lowStockThreshold !== undefined ? initialProduct.lowStockThreshold.toString() : "5"
  );
  const [trackInventory, setTrackInventory] = useState(Boolean(initialProduct?.trackInventory ?? false));

  // Skincare & Cosmetic Details
  const [volume, setVolume] = useState(initialProduct?.volume || "");
  const [skinType, setSkinType] = useState(initialProduct?.skinType || "");
  const [skinConcerns, setSkinConcerns] = useState(initialProduct?.skinConcerns || "");
  const [ingredients, setIngredients] = useState(initialProduct?.ingredients || "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialProduct?.countryOfOrigin || "South Korea");
  const [howToUse, setHowToUse] = useState(initialProduct?.howToUse || "");
  const [expiryInfo, setExpiryInfo] = useState(initialProduct?.expiryInfo || "12M PAO");

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialProduct?.seoDescription || "");

  // Media
  // existingImages: [{ id, imageUrl, imagePublicId, isPrimary }]
  const [existingImages, setExistingImages] = useState(initialProduct?.images || []);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  // newlyAddedFiles: [{ file, previewUrl, isPrimary }]
  const [newlyAddedFiles, setNewlyAddedFiles] = useState([]);

  // Product Variants & Options
  const [hasVariants, setHasVariants] = useState(
    Boolean(
      initialProduct?.hasVariants ||
        (initialProduct?.variants && initialProduct.variants.some((v) => v.optionsKey !== "default"))
    )
  );

  // Option Type Selector & Direct Variants
  const [variantTypeName, setVariantTypeName] = useState(() => {
    return initialProduct?.options?.[0]?.name || "Shade";
  });
  const [variantTypeDisplay, setVariantTypeDisplay] = useState(() => {
    return initialProduct?.options?.[0]?.type || "swatch";
  });

  const VARIANT_TYPE_PRESETS = [
    { label: "Shade / Color", name: "Shade", display: "swatch", icon: "🎨" },
    { label: "Size / Volume", name: "Size", display: "button", icon: "📏" },
    { label: "Finish / Formula", name: "Finish", display: "dropdown", icon: "✨" },
    { label: "Custom", name: "Custom", display: "button", icon: "⚙️" },
  ];

  const COLOR_NAME_PRESETS = {
    black: "#000000",
    white: "#FFFFFF",
    red: "#E74C3C",
    crimson: "#C0392B",
    nude: "#D39E82",
    rose: "#D9534F",
    pink: "#FF69B4",
    coral: "#FF6F61",
    brown: "#795548",
    plum: "#8E44AD",
    berry: "#880E4F",
    peach: "#FFBE76",
    orange: "#E67E22",
    gold: "#F1C40F",
    bronze: "#CD7F32",
    beige: "#F5F5DC",
  };

  const [variants, setVariants] = useState(() => {
    if (
      initialProduct?.variants &&
      initialProduct.variants.length > 0 &&
      initialProduct.variants.some((v) => v.optionsKey !== "default")
    ) {
      return initialProduct.variants.map((v) => {
        const regularPrice =
          v.regularPrice !== undefined && v.regularPrice !== null
            ? v.regularPrice.toString()
            : v.compareAtPrice !== null && v.compareAtPrice !== undefined
            ? v.compareAtPrice.toString()
            : v.price !== undefined && v.price !== null
            ? v.price.toString()
            : "";
        const salePrice =
          v.salePrice !== undefined && v.salePrice !== null
            ? v.salePrice.toString()
            : v.compareAtPrice && v.price && Number(v.compareAtPrice) > Number(v.price)
            ? v.price.toString()
            : "";
        const costPrice =
          v.costPrice !== undefined && v.costPrice !== null
            ? v.costPrice.toString()
            : v.cost_price !== undefined && v.cost_price !== null
            ? v.cost_price.toString()
            : "";
        const val = v.selectedOptions?.[0]?.value || v.optionsKey || "";
        const swatchHex =
          v.selectedOptions?.[0]?.swatchHex ||
          initialProduct.options?.[0]?.values?.find((valItem) => valItem.value === val)?.swatchHex ||
          "#D9534F";

        return {
          id: v.id,
          value: val,
          optionsKey: val,
          swatchHex,
          regularPrice,
          salePrice,
          costPrice,
          price: v.price !== undefined && v.price !== null ? v.price.toString() : "",
          compareAtPrice: v.compareAtPrice !== null && v.compareAtPrice !== undefined ? v.compareAtPrice.toString() : "",
          sizeValue: v.sizeValue !== null && v.sizeValue !== undefined ? v.sizeValue.toString() : "",
          sizeUnit: v.sizeUnit || "ml",
          imageUrl: v.imageUrl || "",
          isAvailable: v.isAvailable ?? true,
          isActive: v.isActive ?? true,
        };
      });
    }
    return [
      {
        value: "01 Rose",
        optionsKey: "01 Rose",
        swatchHex: "#D9534F",
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        price: "",
        compareAtPrice: "",
        sizeValue: "",
        sizeUnit: "ml",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
      },
      {
        value: "02 Nude",
        optionsKey: "02 Nude",
        swatchHex: "#C98A7D",
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        price: "",
        compareAtPrice: "",
        sizeValue: "",
        sizeUnit: "ml",
        imageUrl: "",
        isAvailable: true,
        isActive: true,
      },
    ];
  });

  const [bulkRegularPrice, setBulkRegularPrice] = useState("");
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");

  const handleToggleHasVariants = (e) => {
    const checked = e.target.checked;
    setHasVariants(checked);
    setIsDirty(true);
    if (checked && variants.length === 0) {
      setVariants([
        {
          value: variantTypeName === "Size" ? "50 ml" : "01 Rose",
          optionsKey: variantTypeName === "Size" ? "50 ml" : "01 Rose",
          swatchHex: variantTypeDisplay === "swatch" ? "#D9534F" : null,
          regularPrice: price || "",
          salePrice: salePrice || "",
          costPrice: costPrice || "",
          price: salePrice && Number(salePrice) < Number(price) ? salePrice : (price || ""),
          compareAtPrice: salePrice && Number(salePrice) < Number(price) ? price : "",
          sizeValue: variantTypeName === "Size" ? "50" : "",
          sizeUnit: "ml",
          imageUrl: "",
          isAvailable: true,
          isActive: true,
        },
      ]);
    }
  };

  const handleSelectPresetType = (preset) => {
    setVariantTypeName(preset.name === "Custom" ? "Option" : preset.name);
    setVariantTypeDisplay(preset.display);
    if (preset.display === "swatch") {
      setVariants((prev) =>
        prev.map((v, idx) => ({
          ...v,
          swatchHex: v.swatchHex || (idx === 0 ? "#D9534F" : idx === 1 ? "#C98A7D" : "#E74C3C"),
        }))
      );
    }
    setIsDirty(true);
  };

  const handleVariantTypeDisplayChange = (newDisplay) => {
    setVariantTypeDisplay(newDisplay);
    if (newDisplay === "swatch") {
      setVariants((prev) =>
        prev.map((v, idx) => ({
          ...v,
          swatchHex: v.swatchHex || (idx === 0 ? "#D9534F" : idx === 1 ? "#C98A7D" : "#E74C3C"),
        }))
      );
    }
    setIsDirty(true);
  };

  const handleAddVariant = () => {
    const nextIdx = variants.length + 1;
    const isShade = variantTypeName.toLowerCase().includes("shade") || variantTypeDisplay === "swatch";
    const isSize = variantTypeName.toLowerCase().includes("size");
    const defaultValue = isShade
      ? `Shade 0${nextIdx}`
      : isSize
      ? `${nextIdx * 30} ml`
      : `Variant ${nextIdx}`;

    const newVar = {
      value: defaultValue,
      optionsKey: defaultValue,
      swatchHex: isShade ? "#D9534F" : null,
      regularPrice: price || "",
      salePrice: salePrice || "",
      costPrice: costPrice || "",
      price: salePrice && Number(salePrice) < Number(price) ? salePrice : (price || ""),
      compareAtPrice: salePrice && Number(salePrice) < Number(price) ? price : "",
      sizeValue: isSize ? `${nextIdx * 30}` : "",
      sizeUnit: "ml",
      imageUrl: "",
      isAvailable: true,
      isActive: true,
    };
    setVariants([...variants, newVar]);
    setIsDirty(true);
  };

  const handleRemoveVariant = (vIndex) => {
    if (variants.length <= 1) return;
    const updated = variants.filter((_, idx) => idx !== vIndex);
    setVariants(updated);
    setIsDirty(true);
  };

  const handleVariantChange = (vIndex, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      const target = { ...copy[vIndex], [field]: value };

      if (field === "value") {
        target.optionsKey = value;
        if (variantTypeDisplay === "swatch") {
          const matched = COLOR_NAME_PRESETS[value.trim().toLowerCase()];
          if (matched && (!target.swatchHex || target.swatchHex === "#D9534F" || target.swatchHex === "#000000")) {
            target.swatchHex = matched;
          }
        }
      }

      if (field === "regularPrice" || field === "salePrice") {
        const reg = field === "regularPrice" ? parseFloat(value) : parseFloat(target.regularPrice);
        const sale =
          field === "salePrice"
            ? value !== ""
              ? parseFloat(value)
              : null
            : target.salePrice !== ""
            ? parseFloat(target.salePrice)
            : null;

        if (sale !== null && !isNaN(sale) && !isNaN(reg) && sale < reg) {
          target.price = sale.toString();
          target.compareAtPrice = reg.toString();
        } else if (!isNaN(reg)) {
          target.price = reg.toString();
          target.compareAtPrice = "";
        }
      }

      copy[vIndex] = target;
      return copy;
    });
    setIsDirty(true);

    if (field === "regularPrice" && (clientErrors[`variant_${vIndex}_price`] || clientErrors.variants || clientErrors.form)) {
      setClientErrors((p) => ({ ...p, [`variant_${vIndex}_price`]: null, variants: null, form: null }));
    }
    if (field === "value" && (clientErrors[`variant_${vIndex}_name`] || clientErrors.variants || clientErrors.form)) {
      setClientErrors((p) => ({ ...p, [`variant_${vIndex}_name`]: null, variants: null, form: null }));
    }
  };

  const handleApplyBulkRegularPrice = () => {
    if (!bulkRegularPrice) return;
    setVariants((prev) =>
      prev.map((v) => {
        const reg = parseFloat(bulkRegularPrice);
        const sale = v.salePrice !== "" ? parseFloat(v.salePrice) : null;
        const price =
          sale !== null && !isNaN(sale) && !isNaN(reg) && sale < reg ? sale.toString() : bulkRegularPrice;
        const compareAtPrice =
          sale !== null && !isNaN(sale) && !isNaN(reg) && sale < reg ? bulkRegularPrice : "";
        return {
          ...v,
          regularPrice: bulkRegularPrice,
          price,
          compareAtPrice,
        };
      })
    );
    setIsDirty(true);
  };

  const handleApplyBulkSalePrice = () => {
    setVariants((prev) =>
      prev.map((v) => {
        const reg = parseFloat(v.regularPrice || 0);
        const sale = bulkSalePrice !== "" ? parseFloat(bulkSalePrice) : null;
        const price =
          sale !== null && !isNaN(sale) && !isNaN(reg) && sale < reg
            ? bulkSalePrice
            : v.regularPrice || "";
        const compareAtPrice =
          sale !== null && !isNaN(sale) && !isNaN(reg) && sale < reg ? v.regularPrice || "" : "";
        return {
          ...v,
          salePrice: bulkSalePrice,
          price,
          compareAtPrice,
        };
      })
    );
    setIsDirty(true);
  };

  const handleApplyBulkCostPrice = () => {
    if (!bulkCostPrice) return;
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        costPrice: bulkCostPrice,
      }))
    );
    setIsDirty(true);
  };

  const handleBulkToggleAvailability = (isAvail) => {
    setVariants((prev) => prev.map((v) => ({ ...v, isAvailable: isAvail })));
    setIsDirty(true);
  };

  // Form Status / Meta
  const status = initialProduct?.status || "ACTIVE";
  const [clientErrors, setClientErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Combine client and server errors (supporting string or structured server errors)
  const errors = {
    ...clientErrors,
    ...(typeof serverError === "string" ? { form: serverError } : {}),
    ...(serverError && typeof serverError === "object"
      ? {
          ...(serverError.field ? { [serverError.field]: serverError.message } : {}),
          form: serverError.message || serverError.error || "An error occurred on the server.",
        }
      : {}),
  };

  // Auto-slug sync
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setIsDirty(true);
    if (clientErrors.name) setClientErrors((p) => ({ ...p, name: null }));

    if (!isSlugCustomized) {
      setSlug(slugify(val));
      if (clientErrors.slug) setClientErrors((p) => ({ ...p, slug: null }));
    }
  };

  const handleSlugChange = (e) => {
    setIsSlugCustomized(true);
    setIsDirty(true);
    setSlug(slugify(e.target.value));
    if (clientErrors.slug) setClientErrors((p) => ({ ...p, slug: null }));
  };

  // Image upload handling
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: existingImages.length === 0 && newlyAddedFiles.length === 0 && idx === 0,
    }));

    setNewlyAddedFiles((prev) => [...prev, ...newItems]);
    setIsDirty(true);
  };

  const handleRemoveExistingImage = (imgId) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imgId));
    setRemovedImageIds((prev) => [...prev, imgId]);
    setIsDirty(true);
  };

  const handleRemoveNewFile = (index) => {
    setNewlyAddedFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
    setIsDirty(true);
  };

  const handleSetPrimaryImage = (type, targetIdOrIdx) => {
    if (type === "existing") {
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.id === targetIdOrIdx,
        }))
      );
      setNewlyAddedFiles((prev) =>
        prev.map((f) => ({
          ...f,
          isPrimary: false,
        }))
      );
    } else {
      setNewlyAddedFiles((prev) =>
        prev.map((f, idx) => ({
          ...f,
          isPrimary: idx === targetIdOrIdx,
        }))
      );
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: false,
        }))
      );
    }
    setIsDirty(true);
  };

  const handleToggleCollection = (colId) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
    setIsDirty(true);
  };

  // Client-side validation before submission
  const validateForm = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Product name is required.";
    if (!slug.trim()) errs.slug = "Product slug is required.";

    if (hasVariants) {
      if (!variantTypeName.trim()) {
        errs.variantType = "Option name (e.g. Shade or Size) is required.";
      }
      if (variants.length === 0) {
        errs.variants = "Please add at least one variant.";
      } else {
        const activeVariants = variants.filter((v) => v.isActive);
        if (activeVariants.length === 0) {
          errs.variants = "At least one variant must be active.";
        }
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v.isActive) continue;
          const valName = (v.value || v.optionsKey || "").trim();
          if (!valName) {
            errs[`variant_${i}_name`] = `Variant #${i + 1} name is required.`;
            errs.variants = "Every active variant must have a name.";
          }
          const regNum = parseFloat(v.regularPrice || v.price);
          if (isNaN(regNum) || regNum < 0 || (!v.regularPrice && !v.price)) {
            errs[`variant_${i}_price`] = `Regular price for "${valName || `Variant ${i + 1}`}" is required.`;
            errs.variants = "Every active variant must have a valid non-negative Regular Price.";
          }
          if (v.salePrice && v.salePrice.trim() !== "") {
            const sNum = parseFloat(v.salePrice);
            if (isNaN(sNum) || sNum < 0) {
              errs.variants = `Sale price for "${valName || `Variant ${i + 1}`}" must be a valid positive number.`;
            } else if (sNum > regNum) {
              errs.variants = `Sale price for "${valName || `Variant ${i + 1}`}" cannot be higher than its Regular Price.`;
            }
          }
        }
      }
    } else {
      const priceNum = parseFloat(price);
      if (!price || isNaN(priceNum) || priceNum < 0) {
        errs.price = "A valid non-negative regular price is required in Section 2 (Pricing).";
      }

      if (salePrice && salePrice.trim() !== "") {
        const saleNum = parseFloat(salePrice);
        if (isNaN(saleNum) || saleNum < 0) {
          errs.salePrice = "Sale price must be a valid positive number.";
        } else if (saleNum > priceNum) {
          errs.salePrice = "Sale price cannot be higher than the regular price.";
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      const messages = Object.values(errs).filter((m) => typeof m === "string" && m.trim());
      const uniqueMessages = Array.from(new Set(messages));
      errs.form = `Please complete the required fields: ${uniqueMessages.join(" • ")}`;
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (targetStatus) => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("slug", slug.trim());
    formData.append("status", targetStatus);
    formData.append("brandId", brandId || "");
    formData.append("categoryId", categoryId || "");
    formData.append("sku", sku.trim());
    formData.append("barcode", barcode.trim());
    formData.append("shortDescription", shortDescription.trim());
    formData.append("description", description.trim());

    let effectivePrice = price;
    let effectiveSalePrice = "";
    if (!hasVariants) {
      const pNum = parseFloat(price);
      const sNum = parseFloat(salePrice);
      if (!isNaN(pNum) && !isNaN(sNum) && sNum > 0 && sNum < pNum) {
        effectiveSalePrice = sNum.toString();
      } else {
        effectiveSalePrice = ""; // If regular price == sale price, there is no discount price
      }
    }
    let effectiveCostPrice = costPrice;

    let formattedOptions = [];
    let formattedVariants = [];

    if (hasVariants && variants.length > 0) {
      const optName = variantTypeName.trim() || "Option";
      formattedOptions = [
        {
          name: optName,
          type: variantTypeDisplay,
          position: 0,
          values: variants.map((v, idx) => ({
            value: (v.value || v.optionsKey || `Option ${idx + 1}`).trim(),
            swatchHex: variantTypeDisplay === "swatch" ? (v.swatchHex || "#D9534F") : null,
            swatchImage: null,
            position: idx,
          })),
        },
      ];

      formattedVariants = variants.map((v, idx) => {
        const valTrimmed = (v.value || v.optionsKey || `Option ${idx + 1}`).trim();
        const regVal = parseFloat(v.regularPrice || v.price);
        const saleVal = parseFloat(v.salePrice);
        const costVal = parseFloat(v.costPrice);
        const isDiscounted = !isNaN(saleVal) && !isNaN(regVal) && saleVal > 0 && saleVal < regVal;
        const finalPrice = isDiscounted ? saleVal : (!isNaN(regVal) ? regVal : 0);
        const finalCompare = isDiscounted ? regVal : null;

        return {
          id: v.id,
          optionsKey: valTrimmed,
          price: finalPrice.toString(),
          compareAtPrice: finalCompare !== null ? finalCompare.toString() : "",
          regularPrice: !isNaN(regVal) ? regVal.toString() : "",
          salePrice: isDiscounted ? saleVal.toString() : "",
          costPrice: !isNaN(costVal) && costVal > 0 ? costVal.toString() : "",
          sizeValue: v.sizeValue || "",
          sizeUnit: v.sizeUnit || "ml",
          imageUrl: v.imageUrl || "",
          isAvailable: v.isAvailable ?? true,
          isActive: v.isActive ?? true,
          selectedOptions: [
            {
              optionName: optName,
              value: valTrimmed,
              swatchHex: variantTypeDisplay === "swatch" ? (v.swatchHex || "#D9534F") : null,
            },
          ],
        };
      });

      // Set effective product price to lowest active variant price
      const activeVars = formattedVariants.filter((v) => v.isActive);
      const minP = activeVars.reduce((min, v) => {
        const num = parseFloat(v.price);
        return !isNaN(num) && (min === null || num < min) ? num : min;
      }, null);
      if (minP !== null) {
        effectivePrice = minP.toString();
        effectiveSalePrice = "";
      }
      const minCost = activeVars.reduce((min, v) => {
        const num = parseFloat(v.costPrice);
        return !isNaN(num) && (min === null || num < min) ? num : min;
      }, null);
      if (minCost !== null) {
        effectiveCostPrice = minCost.toString();
      }
    }

    formData.append("price", parseFloat(effectivePrice || 0).toString());
    formData.append("salePrice", effectiveSalePrice ? parseFloat(effectiveSalePrice).toString() : "");
    formData.append("costPrice", effectiveCostPrice ? parseFloat(effectiveCostPrice).toString() : "");
    formData.append("hasVariants", hasVariants.toString());
    formData.append("options", JSON.stringify(formattedOptions));
    formData.append("variants", JSON.stringify(formattedVariants));
    formData.append("stockQuantity", stockQuantity ? parseInt(stockQuantity, 10).toString() : "0");
    formData.append("lowStockThreshold", lowStockThreshold ? parseInt(lowStockThreshold, 10).toString() : "5");
    formData.append("trackInventory", trackInventory.toString());
    formData.append("isFeatured", isFeatured.toString());
    formData.append("volume", volume.trim());
    formData.append("skinType", skinType.trim());
    formData.append("skinConcerns", skinConcerns.trim());
    formData.append("ingredients", ingredients.trim());
    formData.append("countryOfOrigin", countryOfOrigin.trim());
    formData.append("howToUse", howToUse.trim());
    formData.append("expiryInfo", expiryInfo.trim());
    formData.append("seoTitle", (seoTitle || name).trim());
    formData.append("seoDescription", (seoDescription || shortDescription).trim());

    // Collection IDs
    formData.append("collectionIds", JSON.stringify(selectedCollectionIds));

    // Handle primary image ID for existing images
    const primaryExisting = existingImages.find((img) => img.isPrimary);
    if (primaryExisting) {
      formData.append("primaryImageId", primaryExisting.id);
    }

    // Handle removed images
    if (removedImageIds.length > 0) {
      formData.append("removedImageIds", JSON.stringify(removedImageIds));
    }

    // Append newly attached image files
    newlyAddedFiles.forEach((item) => {
      formData.append("images", item.file);
    });

    await onSubmit(formData);
  };

  // Calculations for live indicators
  const regularNum = parseFloat(price) || 0;
  const saleNum = parseFloat(salePrice) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const discountPercent = regularNum > 0 && saleNum > 0 && saleNum < regularNum
    ? Math.round(((regularNum - saleNum) / regularNum) * 100)
    : 0;
  const grossProfitMargin = regularNum > 0 && costNum > 0
    ? Math.round((((saleNum || regularNum) - costNum) / (saleNum || regularNum)) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Bar with Back Link & Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isDirty) setShowDiscardConfirm(true);
              else router.push("/admin/products");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {isEditMode ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditMode
                ? `Updating: ${initialProduct?.name}`
                : "Fill in the details to publish a new cosmetics item to your store."}
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : status === "DRAFT"
                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            Status: {status}
          </span>
        </div>
      </div>

      {/* ── Global Form Error Banner ── */}
      {errors.form && (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-4 text-xs font-medium text-red-800 dark:text-red-200 flex items-start gap-3 shadow-xs animate-shake">
          <FaExclamationTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-sm text-red-900 dark:text-red-100">
              Cannot Save / Publish Product
            </p>
            <p className="leading-relaxed">{errors.form}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2 Cols): Core Info, Media, Pricing, Details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-3">
              1. Basic Information
            </h3>

            {/* Product Name */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">{name.length}/255</span>
              </div>
              <input
                type="text"
                value={name}
                maxLength={255}
                onChange={handleNameChange}
                placeholder="e.g. COSRX Advanced Snail 96 Mucin Power Essence"
                className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-hidden transition-all ${
                  errors.name
                    ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500 focus:ring-2 focus:ring-[#9B4F5E]/15"
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
            </div>

            {/* Auto-Slug */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSlugCustomized((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#9B4F5E] dark:text-pink-400 hover:underline cursor-pointer"
                >
                  {isSlugCustomized ? (
                    <>
                      <FaLockOpen className="h-2.5 w-2.5" /> Auto-sync with name
                    </>
                  ) : (
                    <>
                      <FaLock className="h-2.5 w-2.5" /> Customize manually
                    </>
                  )}
                </button>
              </div>
              <div className="relative mt-1.5 flex rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs overflow-hidden focus-within:border-[#9B4F5E] focus-within:ring-2 focus-within:ring-[#9B4F5E]/15">
                <span className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3.5 text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700 select-none">
                  rupkotha.com/products/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="cosrx-advanced-snail-96"
                  className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-hidden"
                />
              </div>
              {errors.slug && <p className="mt-1 text-xs text-red-600 font-medium">{errors.slug}</p>}
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Short Summary (1-2 Sentences)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Brief highlight shown in quick views and catalog cards..."
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* Full Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Full Formulation & Overview
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Detailed product benefits, clinical results, texture breakdown..."
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          {/* SECTION 2: Media & Product Images */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  2. Product Images
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Star an image to set it as the primary catalog thumbnail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-900/60 px-3.5 py-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-pink-300 hover:bg-pink-100 transition-colors cursor-pointer"
              >
                <FaUpload className="h-3 w-3" /> Upload Images
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Existing Images */}
              {existingImages.map((img) => (
                <div
                  key={img.id}
                  className={`group relative aspect-square rounded-2xl border-2 overflow-hidden bg-gray-50 dark:bg-gray-800 transition-all ${
                    img.isPrimary ? "border-[#9B4F5E] shadow-sm" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <Image
                    src={img.imageUrl}
                    alt="product image"
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  {/* Primary Badge */}
                  {img.isPrimary && (
                    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-[#9B4F5E] text-white px-2 py-0.5 text-[9px] font-bold shadow-xs">
                      <FaStar className="h-2 w-2" /> Primary
                    </span>
                  )}
                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage("existing", img.id)}
                        title="Make Primary"
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-[#9B4F5E] cursor-pointer shadow-xs"
                      >
                        <FaRegStar className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(img.id)}
                      title="Delete Image"
                      className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs"
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Newly Attached Files */}
              {newlyAddedFiles.map((item, idx) => (
                <div
                  key={idx}
                  className={`group relative aspect-square rounded-2xl border-2 overflow-hidden bg-gray-50 dark:bg-gray-800 transition-all ${
                    item.isPrimary ? "border-[#9B4F5E] shadow-sm" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <Image
                    src={item.previewUrl}
                    alt="new upload preview"
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  <span className="absolute top-2 right-2 z-10 rounded-full bg-blue-600 text-white px-1.5 py-0.2 text-[9px] font-bold">
                    New
                  </span>
                  {item.isPrimary && (
                    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-[#9B4F5E] text-white px-2 py-0.5 text-[9px] font-bold">
                      <FaStar className="h-2 w-2" /> Primary
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!item.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage("new", idx)}
                        title="Make Primary"
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-[#9B4F5E] cursor-pointer shadow-xs"
                      >
                        <FaRegStar className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(idx)}
                      title="Remove"
                      className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs"
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Dropzone button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#9B4F5E] hover:bg-pink-50/20 transition-all cursor-pointer text-gray-400 hover:text-[#9B4F5E]"
              >
                <FaUpload className="h-5 w-5 mb-1.5" />
                <span className="text-[11px] font-semibold">Add Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── TOP RIGHT (1 Col): Organization & Visibility ── */}
        <div className="space-y-6">
          {/* Organization & Taxonomies */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-3">
              Organization
            </h3>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Partner Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setIsDirty(true);
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Collections Multi-Select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Feature in Collections
              </label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 p-2 space-y-1">
                {collections.map((col) => {
                  const isChecked = selectedCollectionIds.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer text-xs text-gray-800 dark:text-gray-200 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCollection(col.id)}
                        className="rounded border-gray-300 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                      />
                      <span>{col.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Featured Product Toggle */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Featured Product
                </p>
                <p className="text-[11px] text-gray-400">
                  Feature in homepage showcases
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFeatured((p) => !p);
                  setIsDirty(true);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isFeatured ? "bg-[#9B4F5E]" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    isFeatured ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL WIDTH SECTIONS (3, 4, 5) ── */}
      {/* SECTION 3: Pricing & Variants Flow */}
          {!hasVariants ? (
            /* AS USUAL: Single Product Standard Pricing */
            <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    3. Pricing (BDT ৳)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Standard pricing for this single product item.
                  </p>
                </div>

                {/* Switch to multiple variants */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={handleToggleHasVariants}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9B4F5E]"></div>
                  <span className="ml-3 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Has Multiple Variants?
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Regular Price */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Regular Price <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`relative mt-1.5 flex rounded-xl border ${
                      errors.price
                        ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-gray-700 focus-within:border-[#9B4F5E]"
                    } overflow-hidden`}
                  >
                    <span
                      className={`inline-flex items-center px-3 text-sm font-bold select-none ${
                        errors.price
                          ? "bg-red-50 dark:bg-red-950/40 text-red-500 border-r border-red-200 dark:border-red-900/50"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      ৳
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        setIsDirty(true);
                        if (clientErrors.price || clientErrors.form) {
                          setClientErrors((p) => ({ ...p, price: null, form: null }));
                        }
                      }}
                      placeholder="1650.00"
                      className="w-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-hidden"
                    />
                  </div>
                  {errors.price && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.price}</p>}
                </div>

                {/* Sale Price */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Sale Price <span className="text-gray-400 font-normal lowercase">(optional)</span>
                    </label>
                    {discountPercent > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </span>
                    ) : regularNum > 0 && saleNum > 0 && regularNum === saleNum ? (
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                        No discount (same as regular)
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`relative mt-1.5 flex rounded-xl border ${
                      errors.salePrice
                        ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-gray-700 focus-within:border-[#9B4F5E]"
                    } overflow-hidden`}
                  >
                    <span
                      className={`inline-flex items-center px-3 text-sm font-bold select-none ${
                        errors.salePrice
                          ? "bg-red-50 dark:bg-red-950/40 text-red-500 border-r border-red-200 dark:border-red-900/50"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-500"
                      }`}
                    >
                      ৳
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => {
                        setSalePrice(e.target.value);
                        setIsDirty(true);
                        if (clientErrors.salePrice || clientErrors.form) {
                          setClientErrors((p) => ({ ...p, salePrice: null, form: null }));
                        }
                      }}
                      placeholder="1450.00"
                      className="w-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-hidden"
                    />
                  </div>
                  {errors.salePrice && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.salePrice}</p>}
                </div>

                {/* Cost Price */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Cost Price <span className="text-gray-400 font-normal lowercase">(internal)</span>
                    </label>
                    {grossProfitMargin > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full">
                        {grossProfitMargin}% Margin
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5 flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-[#9B4F5E]">
                    <span className="inline-flex items-center bg-gray-50 dark:bg-gray-800 px-3 text-sm font-bold text-gray-500 select-none">
                      ৳
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPrice}
                      onChange={(e) => {
                        setCostPrice(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="950.00"
                      className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* IF MORE THAN ONE VARIANT HAS: At first input the variant combined, then the combined variant Regular Price, Sale Price, Cost Price (internal) taken */
            <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400">
                    <FaLayerGroup className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      3. Product Variants & Pricing
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add variants directly with individual pricing, photos, and stock status (no combinations).
                    </p>
                  </div>
                </div>

                {/* Toggle to switch back to single product */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={handleToggleHasVariants}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9B4F5E]"></div>
                  <span className="ml-3 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Multiple Variants (Active)
                  </span>
                </label>
              </div>

              {errors.variants && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 font-medium">
                  {errors.variants}
                </div>
              )}

              <div className="space-y-6">
                {/* Option Type Selector Card */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 dark:border-gray-700/60 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        Option Type & Storefront Display
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Choose what kind of variants this product has (e.g. Shades, Sizes, or Formulas).
                      </p>
                    </div>

                    {/* Preset quick buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {VARIANT_TYPE_PRESETS.map((preset) => {
                        const isSelected =
                          variantTypeName.toLowerCase() === preset.name.toLowerCase() ||
                          (preset.name === "Custom" &&
                            !["shade", "size", "finish"].includes(variantTypeName.toLowerCase()));

                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => handleSelectPresetType(preset)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#9B4F5E] text-white shadow-xs"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Option Name <span className="text-[#9B4F5E]">*</span>
                      </label>
                      <input
                        type="text"
                        value={variantTypeName}
                        onChange={(e) => {
                          setVariantTypeName(e.target.value);
                          setIsDirty(true);
                          if (clientErrors.variantType || clientErrors.form) {
                            setClientErrors((p) => ({ ...p, variantType: null, form: null }));
                          }
                        }}
                        placeholder="e.g. Shade, Size, Volume, Scent"
                        className={`w-full rounded-xl border ${
                          errors.variantType
                            ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                            : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E]"
                        } bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:outline-hidden`}
                      />
                      {errors.variantType && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold">{errors.variantType}</p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        The label displayed above the choices on the product detail page.
                      </p>
                    </div>

                    {/* Storefront Display Style */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Storefront Display Style
                      </label>
                      <select
                        value={variantTypeDisplay}
                        onChange={(e) => handleVariantTypeDisplayChange(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
                      >
                        <option value="swatch">Color Swatches (Visual Circles with Hex Picker)</option>
                        <option value="button">Pill Buttons (Default for Sizes / Finishes)</option>
                        <option value="dropdown">Dropdown List</option>
                      </select>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        How shoppers interact with and select between these options.
                      </p>
                    </div>
                  </div>
                </div>

                  {/* Bulk Actions Bar */}
                  {variants.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-md bg-[#9B4F5E]/10 dark:bg-[#9B4F5E]/20 text-[#9B4F5E] dark:text-pink-400">
                          <FaBolt className="h-2 w-2" />
                        </span>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Quick Bulk Actions
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          — Apply values to all {variants.length} variants at once
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Set Bulk Regular Price */}
                        <div className="flex items-center">
                          <div className="flex items-center rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:border-[#9B4F5E]">
                            <span className="bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 select-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Regular Price"
                              value={bulkRegularPrice}
                              onChange={(e) => setBulkRegularPrice(e.target.value)}
                              className="w-28 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyBulkRegularPrice}
                            disabled={!bulkRegularPrice}
                            className="px-3 py-1.5 rounded-r-xl bg-[#9B4F5E] hover:bg-[#85404E] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Apply Regular
                          </button>
                        </div>

                        {/* Set Bulk Sale Price */}
                        <div className="flex items-center">
                          <div className="flex items-center rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:border-[#9B4F5E]">
                            <span className="bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 select-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Sale Price"
                              value={bulkSalePrice}
                              onChange={(e) => setBulkSalePrice(e.target.value)}
                              className="w-28 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyBulkSalePrice}
                            disabled={!bulkSalePrice}
                            className="px-3 py-1.5 rounded-r-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Apply Sale
                          </button>
                        </div>

                        {/* Set Bulk Cost Price */}
                        <div className="flex items-center">
                          <div className="flex items-center rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:border-[#9B4F5E]">
                            <span className="bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 select-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Cost Price"
                              value={bulkCostPrice}
                              onChange={(e) => setBulkCostPrice(e.target.value)}
                              className="w-28 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyBulkCostPrice}
                            disabled={!bulkCostPrice}
                            className="px-3 py-1.5 rounded-r-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Apply Cost
                          </button>
                        </div>

                        <div className="h-5 w-px bg-gray-200 dark:border-gray-700 hidden md:block" />

                        {/* Stock Quick Toggles */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBulkToggleAvailability(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer transition-all"
                          >
                            <FaCheck className="h-2.5 w-2.5" /> All In Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkToggleAvailability(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-all"
                          >
                            <FaTimes className="h-2.5 w-2.5" /> All Out of Stock
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Variants Matrix Table */}
                  {variants.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                      <table className="w-full min-w-[1240px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-3.5 min-w-[220px]">
                              {variantTypeName || "Variant"} Name *
                              <span className="block text-[9px] font-normal text-gray-400 normal-case">
                                {variantTypeDisplay === "swatch" ? "Color swatch & shade name" : "Option value name"}
                              </span>
                            </th>
                            <th className="py-3 px-3 min-w-[155px] w-40">
                              Regular Price (৳) *
                              <span className="block text-[9px] font-normal text-gray-400 normal-case">Standard price</span>
                            </th>
                            <th className="py-3 px-3 min-w-[155px] w-40">
                              Sale Price (৳)
                              <span className="block text-[9px] font-normal text-gray-400 normal-case">Discounted price</span>
                            </th>
                            <th className="py-3 px-3 min-w-[155px] w-40">
                              Cost Price (৳)
                              <span className="block text-[9px] font-normal text-gray-400 normal-case">Internal cost</span>
                            </th>
                            <th className="py-3 px-2 text-center min-w-[80px] w-20">Margin</th>
                            <th className="py-3 px-3 min-w-[165px] w-44">
                              Net Vol / Size
                              <span className="block text-[9px] font-normal text-gray-400 normal-case">Unit pricing</span>
                            </th>
                            <th className="py-3 px-3 min-w-[210px]">Variant Photo</th>
                            <th className="py-3 px-3 text-center min-w-[130px] w-32">Availability</th>
                            <th className="py-3 px-3 text-center min-w-[100px] w-28">Status</th>
                            <th className="py-3 px-2 text-center min-w-[50px] w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                          {variants.map((v, vIdx) => {
                            const resolvedThumb =
                              v.imageUrl ||
                              existingImages.find((img) => img.isPrimary)?.imageUrl ||
                              existingImages[0]?.imageUrl ||
                              newlyAddedFiles[0]?.previewUrl ||
                              null;

                            const regVal = parseFloat(v.regularPrice || v.price) || 0;
                            const saleVal = parseFloat(v.salePrice) || 0;
                            const costVal = parseFloat(v.costPrice) || 0;
                            const effectiveSell = saleVal > 0 && saleVal < regVal ? saleVal : regVal;
                            const rowMargin =
                              effectiveSell > 0 && costVal > 0
                                ? Math.round(((effectiveSell - costVal) / effectiveSell) * 100)
                                : null;

                            return (
                              <tr
                                key={v.id || vIdx}
                                className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                                  !v.isActive ? "opacity-50 bg-gray-50/30 dark:bg-gray-800/20" : ""
                                }`}
                              >
                                {/* Variant Name & Swatch */}
                                <td className="py-3 px-3.5 font-medium text-gray-900 dark:text-gray-100">
                                  {variantTypeDisplay === "swatch" ? (
                                    <div className="flex items-center gap-2">
                                      {/* Color Picker Swatch */}
                                      <label
                                        htmlFor={`variant-color-${vIdx}`}
                                        className="group relative h-7 w-7 rounded-full border border-gray-300 dark:border-gray-600 shadow-2xs flex items-center justify-center cursor-pointer transition-transform hover:scale-110 overflow-hidden shrink-0"
                                        style={{ backgroundColor: v.swatchHex || "#D9534F" }}
                                        title="Click to pick swatch color"
                                      >
                                        <input
                                          type="color"
                                          id={`variant-color-${vIdx}`}
                                          value={v.swatchHex || "#D9534F"}
                                          onChange={(e) => handleVariantChange(vIdx, "swatchHex", e.target.value)}
                                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        />
                                      </label>

                                      {/* Hex input */}
                                      <input
                                        type="text"
                                        value={v.swatchHex || ""}
                                        onChange={(e) => handleVariantChange(vIdx, "swatchHex", e.target.value)}
                                        placeholder="#HEX"
                                        className="w-18 text-[11px] uppercase font-mono text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 focus:outline-hidden focus:border-[#9B4F5E]"
                                        title="Color Hex code"
                                      />

                                      {/* Variant Name input */}
                                      <input
                                        type="text"
                                        value={v.value || ""}
                                        onChange={(e) => handleVariantChange(vIdx, "value", e.target.value)}
                                        placeholder="e.g. 01 Crimson Rose"
                                        className={`flex-1 min-w-[110px] rounded-xl border ${
                                          errors[`variant_${vIdx}_name`]
                                            ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                                            : "border-gray-200 dark:border-gray-700"
                                        } bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden shadow-2xs`}
                                      />
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={v.value || ""}
                                      onChange={(e) => handleVariantChange(vIdx, "value", e.target.value)}
                                      placeholder={
                                        variantTypeName.toLowerCase().includes("size")
                                          ? "e.g. 50 ml"
                                          : "e.g. Matte Velvet"
                                      }
                                      className={`w-full rounded-xl border ${
                                        errors[`variant_${vIdx}_name`]
                                          ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                                          : "border-gray-200 dark:border-gray-700"
                                      } bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden shadow-2xs`}
                                    />
                                  )}
                                  {errors[`variant_${vIdx}_name`] && (
                                    <p className="mt-0.5 text-[10px] text-red-500 font-medium">
                                      {errors[`variant_${vIdx}_name`]}
                                    </p>
                                  )}
                                </td>

                                {/* Regular Price */}
                                <td className="py-2.5 px-3">
                                  <div
                                    className={`flex items-center rounded-xl border ${
                                      errors[`variant_${vIdx}_price`]
                                        ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10"
                                        : "border-gray-200 dark:border-gray-700"
                                    } overflow-hidden bg-white dark:bg-gray-800 focus-within:border-[#9B4F5E] shadow-2xs`}
                                  >
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1.5 text-xs font-bold border-r select-none ${
                                        errors[`variant_${vIdx}_price`]
                                          ? "bg-red-50 dark:bg-red-950/40 text-red-500 border-red-200 dark:border-red-900/50"
                                          : "bg-gray-50 dark:bg-gray-900/60 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700"
                                      }`}
                                    >
                                      ৳
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.regularPrice !== undefined ? v.regularPrice : v.price || ""}
                                      onChange={(e) => handleVariantChange(vIdx, "regularPrice", e.target.value)}
                                      placeholder="1000.00"
                                      className="w-full px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  {errors[`variant_${vIdx}_price`] && (
                                    <p className="mt-0.5 text-[10px] text-red-500 font-medium">
                                      {errors[`variant_${vIdx}_price`]}
                                    </p>
                                  )}
                                </td>

                                {/* Sale Price */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 focus-within:border-[#9B4F5E] shadow-2xs">
                                    <span className="inline-flex items-center bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 select-none">
                                      ৳
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.salePrice || ""}
                                      onChange={(e) =>
                                        handleVariantChange(vIdx, "salePrice", e.target.value)
                                      }
                                      placeholder="850.00"
                                      className="w-full px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  {saleVal > 0 && regVal > 0 && saleVal === regVal && (
                                    <span className="block text-[9.5px] font-medium text-amber-600 dark:text-amber-400 mt-1 leading-tight">
                                      No discount (same as regular)
                                    </span>
                                  )}
                                  {saleVal > 0 && regVal > 0 && saleVal < regVal && (
                                    <span className="block text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
                                      {Math.round(((regVal - saleVal) / regVal) * 100)}% OFF discount
                                    </span>
                                  )}
                                </td>

                                {/* Cost Price */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 focus-within:border-[#9B4F5E] shadow-2xs">
                                    <span className="inline-flex items-center bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700 select-none">
                                      ৳
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={v.costPrice || ""}
                                      onChange={(e) =>
                                        handleVariantChange(vIdx, "costPrice", e.target.value)
                                      }
                                      placeholder="600.00"
                                      className="w-full px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                </td>

                                {/* Margin */}
                                <td className="py-2.5 px-2 text-center">
                                  {rowMargin !== null ? (
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        rowMargin >= 30
                                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                          : rowMargin >= 15
                                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                      }`}
                                    >
                                      {rowMargin}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                                  )}
                                </td>

                                {/* Size Value & Unit */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 focus-within:border-[#9B4F5E] shadow-2xs">
                                    <input
                                      type="number"
                                      step="any"
                                      value={v.sizeValue}
                                      onChange={(e) => handleVariantChange(vIdx, "sizeValue", e.target.value)}
                                      placeholder="50"
                                      className="w-20 px-2.5 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 bg-transparent focus:outline-hidden placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <select
                                      value={v.sizeUnit || "ml"}
                                      onChange={(e) => handleVariantChange(vIdx, "sizeUnit", e.target.value)}
                                      className="bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 focus:outline-hidden cursor-pointer"
                                    >
                                      <option value="ml">ml</option>
                                      <option value="g">g</option>
                                      <option value="oz">oz</option>
                                      <option value="pcs">pcs</option>
                                    </select>
                                  </div>
                                </td>

                                {/* Photo / Image Selection */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    {resolvedThumb ? (
                                      <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100 dark:bg-gray-800 shadow-2xs">
                                        <img
                                          src={resolvedThumb}
                                          alt="Variant preview"
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-7 w-7 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center shrink-0 text-gray-400 text-[10px]">
                                        —
                                      </div>
                                    )}
                                    <select
                                      value={v.imageUrl || ""}
                                      onChange={(e) => handleVariantChange(vIdx, "imageUrl", e.target.value)}
                                      className="flex-1 min-w-[140px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer truncate"
                                    >
                                      <option value="">Default (Main Photo)</option>
                                      {existingImages.map((img, iIdx) => (
                                        <option key={img.id || iIdx} value={img.imageUrl}>
                                          Gallery Photo #{iIdx + 1}
                                        </option>
                                      ))}
                                      {newlyAddedFiles.map((file, fIdx) => (
                                        <option key={fIdx} value={file.previewUrl}>
                                          New Upload #{fIdx + 1}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>

                                {/* Available (In Stock) Toggle */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleVariantChange(vIdx, "isAvailable", !v.isAvailable)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${
                                      v.isAvailable
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                    }`}
                                    title={v.isAvailable ? "Click to mark Out of Stock" : "Click to mark In Stock"}
                                  >
                                    {v.isAvailable ? (
                                      <>
                                        <FaCheck className="h-2.5 w-2.5" /> In Stock
                                      </>
                                    ) : (
                                      <>
                                        <FaTimes className="h-2.5 w-2.5" /> Out of Stock
                                      </>
                                    )}
                                  </button>
                                </td>

                                {/* Active (Visibility) Toggle */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleVariantChange(vIdx, "isActive", !v.isActive)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${
                                      v.isActive
                                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                    title={v.isActive ? "Variant is active and visible to buyers" : "Variant is hidden / discontinued"}
                                  >
                                    {v.isActive ? "Active" : "Hidden"}
                                  </button>
                                </td>

                                {/* Action: Delete variant */}
                                <td className="py-2.5 px-2 text-center">
                                  {variants.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariant(vIdx)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                                      title={`Delete this ${variantTypeName || "variant"}`}
                                    >
                                      <FaTrash className="h-3.5 w-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No variants added yet. Click the button below to add your first variant.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#9B4F5E] hover:bg-[#85404E] text-white shadow-xs cursor-pointer transition-all"
                      >
                        <FaPlus className="h-3 w-3" /> Add {variantTypeName || "Variant"}
                      </button>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#9B4F5E] dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border border-[#9B4F5E]/30 hover:bg-[#9B4F5E]/15 hover:border-[#9B4F5E]/50 cursor-pointer transition-all shadow-2xs self-start"
                    >
                      <FaPlus className="h-3.5 w-3.5" />
                      <span>Add {variantTypeName || "Variant"}</span>
                    </button>

                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {variants.length} {variants.length === 1 ? "variant" : "variants"} configured
                    </div>
                  </div>

                  {/* Summary Helper */}
                  {variants.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100/60 dark:border-pink-900/30 text-[11px] text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#9B4F5E]" />
                        The lowest active variant price (
                        <strong className="text-[#9B4F5E] dark:text-pink-400 font-bold">
                          ৳
                          {variants
                            .filter((v) => v.isActive && (v.salePrice || v.price || v.regularPrice))
                            .reduce((min, v) => {
                              const num = parseFloat(v.salePrice || v.price || v.regularPrice);
                              return !isNaN(num) && (min === null || num < min) ? num : min;
                            }, null) ?? 0}
                        </strong>
                        ) will be displayed as the starting price across the store.
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Inactive variants remain preserved for historical orders but hidden from shoppers.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: Skincare & Cosmetics Specifications */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-3">
              4. Skincare & Cosmetic Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Country of Origin */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Country of Origin
                </label>
                <select
                  value={countryOfOrigin}
                  onChange={(e) => {
                    setCountryOfOrigin(e.target.value);
                    setIsDirty(true);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
                >
                  <option value="South Korea">South Korea (K-Beauty)</option>
                  <option value="Japan">Japan (J-Beauty)</option>
                  <option value="USA">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="France">France</option>
                  <option value="India">India</option>
                  <option value="Bangladesh">Bangladesh</option>
                </select>
              </div>

              {/* Skin Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Skin Type
                </label>
                <input
                  type="text"
                  value={skinType}
                  onChange={(e) => {
                    setSkinType(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. All Skin Types, Sensitive, Oily, Dry"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>

              {/* Skin Concerns */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Skin Concerns
                </label>
                <input
                  type="text"
                  value={skinConcerns}
                  onChange={(e) => {
                    setSkinConcerns(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Acne, Dullness, Pigmentation, Aging"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>

              {/* Expiry / PAO */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Expiry / PAO (Period After Opening)
                </label>
                <input
                  type="text"
                  value={expiryInfo}
                  onChange={(e) => {
                    setExpiryInfo(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. 12M PAO / Exp: 2027-12"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>

              {/* How to use */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Application & Usage Instructions
                </label>
                <textarea
                  rows={2}
                  value={howToUse}
                  onChange={(e) => {
                    setHowToUse(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Apply 2-3 drops to face after toner. Pat gently until absorbed..."
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>

              {/* Ingredients */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Key Ingredients / Full Formulation
                </label>
                <textarea
                  rows={3}
                  value={ingredients}
                  onChange={(e) => {
                    setIngredients(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Snail Secretion Filtrate, Niacinamide, Hyaluronic Acid, Centella Asiatica..."
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: SEO & Search Snippet Preview */}
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-3">
              5. Search Engine Optimization (SEO)
            </h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => {
                  setSeoTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder={name ? `${name} | RupKotha Bangladesh` : "Page Title in Search Results"}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                SEO Meta Description
              </label>
              <textarea
                rows={2}
                value={seoDescription}
                onChange={(e) => {
                  setSeoDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="150-160 characters summary displayed under Google search links..."
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
              />
            </div>

            {/* Google SERP Preview Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800 p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Google Search Result Preview
              </span>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 truncate">
                https://rupkotha.com/products/{slug || "product-slug"}
              </p>
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {seoTitle || name || "Product Name | RupKotha Bangladesh"}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                {seoDescription ||
                  shortDescription ||
                  "Buy genuine cosmetics in Bangladesh at RupKotha. Authentic skincare with cash on delivery and fast express shipping nationwide."}
              </p>
            </div>
          </div>

      {/* ── PINNED BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (isDirty) setShowDiscardConfirm(true);
            else router.push("/admin/products");
          }}
          disabled={isSubmitting}
          className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("DRAFT")}
            className="rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("ACTIVE")}
            className="flex items-center gap-2 rounded-full bg-[#9B4F5E] px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#843f4e] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting && <FaSpinner className="h-3 w-3 animate-spin" />}
            {isSubmitting
              ? isEditMode
                ? "Updating..."
                : "Publishing..."
              : isEditMode
              ? "Update Product"
              : "Publish Product"}
          </button>
        </div>
      </div>

      {/* ── Discard Unsaved Changes Modal ── */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-2xl text-center">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Discard unsaved changes?
            </h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              You have unsaved product edits. Leaving now will cause all changes to be lost.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  router.push("/admin/products");
                }}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
