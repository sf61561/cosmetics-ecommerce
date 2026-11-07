"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { productService } from "@/services/productService";
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
  FaImages,
  FaRulerCombined,
  FaChevronDown,
  FaSearch,
} from "react-icons/fa";

const SIZE_UNITS = ["ml", "g", "oz", "fl oz", "pcs", "kg", "l"];

const BEAUTY_SHADES = [
  { name: "Fair Ivory", hex: "#FDF4EC" },
  { name: "Warm Porcelain", hex: "#F7E6D7" },
  { name: "Natural Beige", hex: "#E9CDAE" },
  { name: "Warm Honey", hex: "#D6A575" },
  { name: "Golden Tan", hex: "#BA8759" },
  { name: "Caramel", hex: "#9C6239" },
  { name: "Mocha", hex: "#704225" },
  { name: "Espresso", hex: "#432818" },
  { name: "Soft Nude", hex: "#E2B5A5" },
  { name: "Warm Nude", hex: "#D39E82" },
  { name: "Rose Pink", hex: "#E8A0B4" },
  { name: "Blush Pink", hex: "#F4C2C2" },
  { name: "Coral Rose", hex: "#FF6F61" },
  { name: "Peach Glow", hex: "#FFBE76" },
  { name: "Ruby Red", hex: "#E74C3C" },
  { name: "Crimson Red", hex: "#C0392B" },
  { name: "Deep Berry", hex: "#880E4F" },
  { name: "Plum Wine", hex: "#8E44AD" },
  { name: "Burgundy", hex: "#6B1D2F" },
  { name: "Mauve", hex: "#B784A7" },
  { name: "Cherry Bomb", hex: "#990033" },
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "True Black", hex: "#000000" },
];

function hexToRgb(hex) {
  let c = (hex || "#000000").replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((ch) => ch + ch).join("");
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getClosestShadeName(hex) {
  if (!hex) return "Rose Pink";
  const target = hexToRgb(hex);
  let closest = BEAUTY_SHADES[0];
  let minDistance = Infinity;

  for (const shade of BEAUTY_SHADES) {
    const sRgb = hexToRgb(shade.hex);
    const d = Math.sqrt(
      Math.pow(target.r - sRgb.r, 2) +
      Math.pow(target.g - sRgb.g, 2) +
      Math.pow(target.b - sRgb.b, 2)
    );
    if (d < minDistance) {
      minDistance = d;
      closest = shade;
    }
  }
  return closest.name;
}

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
  tags = [],
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
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(() => {
    if (Array.isArray(initialProduct?.collections)) {
      return initialProduct.collections.map((c) => c.id).filter(Boolean);
    }
    if (initialProduct?.collectionId) {
      return [initialProduct.collectionId];
    }
    return [];
  });
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const collectionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        collectionDropdownRef.current &&
        !collectionDropdownRef.current.contains(event.target)
      ) {
        setIsCollectionDropdownOpen(false);
      }
    };
    if (isCollectionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCollectionDropdownOpen]);

  const [selectedTagIds, setSelectedTagIds] = useState(
    initialProduct?.tags?.map((t) => t.id) || []
  );
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target)
      ) {
        setIsTagDropdownOpen(false);
      }
    };
    if (isTagDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTagDropdownOpen]);

  const [internalTags, setInternalTags] = useState([]);

  useEffect(() => {
    if (tags && tags.length > 0) return;
    let isSubscribed = true;
    productService
      .getTags()
      .then((res) => {
        if (!isSubscribed) return;
        if (res?.tags) setInternalTags(res.tags);
        else if (res?.data) setInternalTags(res.data);
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [tags]);

  const availableTags = tags && tags.length > 0 ? tags : internalTags;
  const filteredCollections = (collections || []).filter((col) =>
    (col.name || "").toLowerCase().includes(collectionSearch.toLowerCase().trim())
  );
  const filteredTags = (availableTags || []).filter((tag) =>
    (tag.name || "").toLowerCase().includes(tagSearch.toLowerCase().trim())
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

  // Product Variants State
  // variantType: "shade_only" | "size_only" | "size_shade" | null
  const [variantType, setVariantType] = useState(() => {
    if (!initialProduct) return null;
    const opts = initialProduct.options || [];
    if (opts.length >= 2) return "size_shade";
    if (opts.length === 1) {
      const oName = (opts[0].name || "").toLowerCase();
      if (oName.includes("shade") || opts[0].type === "swatch") return "shade_only";
      if (oName.includes("size")) return "size_only";
    }
    if (initialProduct.hasVariants) return "shade_only";
    return null;
  });

  // Mode 1: Shade only state
  const [shades, setShades] = useState(() => {
    if (initialProduct?.options) {
      const shadeOpt = initialProduct.options.find(
        (o) => (o.name || "").toLowerCase().includes("shade") || o.type === "swatch"
      );
      if (shadeOpt && initialProduct.variants?.length > 0) {
        return initialProduct.variants
          .filter((v) => v.optionsKey !== "default")
          .map((v, idx) => {
            const val = v.selectedOptions?.[0]?.value || v.optionsKey || "";
            const swatchHex =
              v.selectedOptions?.[0]?.swatchHex ||
              shadeOpt.values?.find((valItem) => valItem.value === val)?.swatchHex ||
              "#E8A0B4";
            const reg =
              v.regularPrice !== undefined && v.regularPrice !== null
                ? v.regularPrice.toString()
                : v.price !== undefined && v.price !== null
                ? v.price.toString()
                : "";
            const sale =
              v.salePrice !== undefined && v.salePrice !== null
                ? v.salePrice.toString()
                : v.sale_price !== undefined && v.sale_price !== null
                ? v.sale_price.toString()
                : "";
            const cost =
              v.costPrice !== undefined && v.costPrice !== null
                ? v.costPrice.toString()
                : v.cost_price !== undefined && v.cost_price !== null
                ? v.cost_price.toString()
                : "";
            const imgs = Array.isArray(v.imageUrls)
              ? v.imageUrls
              : v.imageUrl
              ? [v.imageUrl]
              : [];
            return {
              id: v.id || `shade_${idx + 1}`,
              shadeColor: swatchHex,
              shadeName: val || getClosestShadeName(swatchHex),
              regularPrice: reg,
              salePrice: sale,
              costPrice: cost,
              isDefault: Boolean(v.isDefault ?? v.is_default ?? (idx === 0)),
              imageUrls: imgs,
            };
          });
      }
    }
    return [
      {
        id: "shade_1",
        shadeColor: "#E8A0B4",
        shadeName: "Rose Pink",
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        isDefault: true,
        imageUrls: [],
      },
    ];
  });

  // Mode 2: Size only state
  const [sizes, setSizes] = useState(() => {
    if (initialProduct?.options) {
      const sizeOpt = initialProduct.options.find(
        (o) => (o.name || "").toLowerCase().includes("size") || o.type === "button"
      );
      if (sizeOpt && initialProduct.variants?.length > 0) {
        return initialProduct.variants
          .filter((v) => v.optionsKey !== "default")
          .map((v, idx) => {
            const val = v.selectedOptions?.[0]?.value || v.optionsKey || "";
            const match = String(val).match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
            const sizeVal =
              v.sizeValue !== null && v.sizeValue !== undefined
                ? v.sizeValue.toString()
                : match
                ? match[1]
                : val;
            const sizeU = v.sizeUnit || (match ? match[2] : "ml");
            const reg =
              v.regularPrice !== undefined && v.regularPrice !== null
                ? v.regularPrice.toString()
                : v.price !== undefined && v.price !== null
                ? v.price.toString()
                : "";
            const sale =
              v.salePrice !== undefined && v.salePrice !== null
                ? v.salePrice.toString()
                : v.sale_price !== undefined && v.sale_price !== null
                ? v.sale_price.toString()
                : "";
            const cost =
              v.costPrice !== undefined && v.costPrice !== null
                ? v.costPrice.toString()
                : v.cost_price !== undefined && v.cost_price !== null
                ? v.cost_price.toString()
                : "";
            const imgs = Array.isArray(v.imageUrls)
              ? v.imageUrls
              : v.imageUrl
              ? [v.imageUrl]
              : [];
            return {
              id: v.id || `size_${idx + 1}`,
              sizeValue: sizeVal,
              sizeUnit: sizeU,
              regularPrice: reg,
              salePrice: sale,
              costPrice: cost,
              isDefault: Boolean(v.isDefault ?? v.is_default ?? (idx === 0)),
              imageUrls: imgs,
            };
          });
      }
    }
    return [
      {
        id: "size_1",
        sizeValue: "50",
        sizeUnit: "ml",
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        isDefault: true,
        imageUrls: [],
      },
    ];
  });

  // Mode 3: Size + Shade state
  const [comboSizes, setComboSizes] = useState(() => {
    if (initialProduct?.options?.length >= 2) {
      const sizeOpt = initialProduct.options.find(
        (o) => (o.name || "").toLowerCase().includes("size")
      );
      if (sizeOpt?.values?.length > 0) {
        return sizeOpt.values.map((valObj, idx) => {
          const val = valObj.value;
          const match = val.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
          return {
            id: `cs_${idx + 1}`,
            sizeValue: match ? match[1] : val,
            sizeUnit: match ? match[2] : "ml",
          };
        });
      }
    }
    return [{ id: "cs_1", sizeValue: "50", sizeUnit: "ml" }];
  });
  const [newSizeValue, setNewSizeValue] = useState("");
  const [newSizeUnit, setNewSizeUnit] = useState("ml");

  const [comboShades, setComboShades] = useState(() => {
    if (initialProduct?.options?.length >= 2) {
      const shadeOpt = initialProduct.options.find(
        (o) => (o.name || "").toLowerCase().includes("shade") || o.type === "swatch"
      );
      if (shadeOpt?.values?.length > 0) {
        return shadeOpt.values.map((valObj, idx) => ({
          id: `csh_${idx + 1}`,
          shadeColor: valObj.swatchHex || "#E8A0B4",
          shadeName: valObj.value || getClosestShadeName(valObj.swatchHex),
        }));
      }
    }
    return [{ id: "csh_1", shadeColor: "#E8A0B4", shadeName: "Rose Pink" }];
  });
  const [newShadeColor, setNewShadeColor] = useState("#E8A0B4");
  const [newShadeName, setNewShadeName] = useState("Rose Pink");

  const [combinations, setCombinations] = useState(() => {
    if (initialProduct?.options?.length >= 2 && initialProduct.variants?.length > 0) {
      return initialProduct.variants
        .filter((v) => v.optionsKey !== "default")
        .map((v, idx) => {
          const sizeOptVal =
            v.selectedOptions?.find((so) =>
              (so.optionName || "").toLowerCase().includes("size")
            )?.value || "";
          const shadeOptObj = v.selectedOptions?.find((so) =>
            (so.optionName || "").toLowerCase().includes("shade")
          );
          const match = sizeOptVal.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
          const sizeVal =
            v.sizeValue !== null && v.sizeValue !== undefined
              ? v.sizeValue.toString()
              : match
              ? match[1]
              : sizeOptVal;
          const sizeU = v.sizeUnit || (match ? match[2] : "ml");
          const shadeName = shadeOptObj?.value || "Rose Pink";
          const shadeColor = shadeOptObj?.swatchHex || "#E8A0B4";
          const reg =
            v.regularPrice !== undefined && v.regularPrice !== null
              ? v.regularPrice.toString()
              : v.price !== undefined && v.price !== null
              ? v.price.toString()
              : "";
          const sale =
            v.salePrice !== undefined && v.salePrice !== null
              ? v.salePrice.toString()
              : v.sale_price !== undefined && v.sale_price !== null
              ? v.sale_price.toString()
              : "";
          const cost =
            v.costPrice !== undefined && v.costPrice !== null
              ? v.costPrice.toString()
              : v.cost_price !== undefined && v.cost_price !== null
              ? v.cost_price.toString()
              : "";
          const imgs = Array.isArray(v.imageUrls)
            ? v.imageUrls
            : v.imageUrl
            ? [v.imageUrl]
            : [];
          return {
            id: v.id || `combo_${idx + 1}`,
            sizeValue: sizeVal,
            sizeUnit: sizeU,
            shadeColor,
            shadeName,
            regularPrice: reg,
            salePrice: sale,
            costPrice: cost,
            isDefault: Boolean(v.isDefault ?? v.is_default ?? (idx === 0)),
            imageUrls: imgs,
          };
        });
    }
    return [];
  });

  const [bulkRegularPrice, setBulkRegularPrice] = useState("");
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");

  // Modals & Confirmation States
  const [switchConfirmModalOpen, setSwitchConfirmModalOpen] = useState(false);
  const [pendingVariantType, setPendingVariantType] = useState(null);
  const [imageModalTarget, setImageModalTarget] = useState(null);
  // target: { type: "shade_only" | "size_only" | "size_shade", index: number }
  const [deleteComboConfirmIndex, setDeleteComboConfirmIndex] = useState(null);

  // Check if current variant type has entered data before switching
  const hasEnteredVariantData = (type) => {
    if (type === "shade_only") {
      return shades.some(
        (s) =>
          (s.shadeName && s.shadeName.trim() !== "Rose Pink") ||
          (s.regularPrice && s.regularPrice.trim() !== "") ||
          (s.costPrice && s.costPrice.trim() !== "") ||
          (s.imageUrls && s.imageUrls.length > 0)
      );
    }
    if (type === "size_only") {
      return sizes.some(
        (s) =>
          (s.sizeValue && s.sizeValue.trim() !== "50") ||
          (s.regularPrice && s.regularPrice.trim() !== "") ||
          (s.costPrice && s.costPrice.trim() !== "") ||
          (s.imageUrls && s.imageUrls.length > 0)
      );
    }
    if (type === "size_shade") {
      return (
        combinations.some(
          (c) =>
            (c.regularPrice && c.regularPrice.trim() !== "") ||
            (c.costPrice && c.costPrice.trim() !== "") ||
            (c.imageUrls && c.imageUrls.length > 0)
        ) ||
        comboSizes.length > 1 ||
        comboShades.length > 1
      );
    }
    return false;
  };

  const handleSelectVariantType = (nextType) => {
    if (nextType === variantType) return;
    if (variantType && hasEnteredVariantData(variantType)) {
      setPendingVariantType(nextType);
      setSwitchConfirmModalOpen(true);
    } else {
      setVariantType(nextType);
      setIsDirty(true);
      if (clientErrors.variantType) {
        setClientErrors((p) => ({ ...p, variantType: null, form: null }));
      }
    }
  };

  const handleConfirmSwitchType = () => {
    if (pendingVariantType) {
      setVariantType(pendingVariantType);
      setShades([
        {
          id: "shade_1",
          shadeColor: "#E8A0B4",
          shadeName: "Rose Pink",
          regularPrice: "",
          costPrice: "",
          imageUrls: [],
        },
      ]);
      setSizes([
        {
          id: "size_1",
          sizeValue: "50",
          sizeUnit: "ml",
          regularPrice: "",
          costPrice: "",
          imageUrls: [],
        },
      ]);
      setComboSizes([{ id: "cs_1", sizeValue: "50", sizeUnit: "ml" }]);
      setComboShades([{ id: "csh_1", shadeColor: "#E8A0B4", shadeName: "Rose Pink" }]);
      setCombinations([]);
      setPendingVariantType(null);
      setIsDirty(true);
      setClientErrors({});
    }
    setSwitchConfirmModalOpen(false);
  };

  // Available Images gathered strictly from Section 2
  const availableProductImages = [
    ...existingImages.map((img) => ({
      id: `existing_${img.id}`,
      url: img.imageUrl,
      isPrimary: Boolean(img.isPrimary),
    })),
    ...newlyAddedFiles.map((item, idx) => ({
      id: `new_${idx}`,
      url: item.previewUrl,
      isPrimary: Boolean(item.isPrimary),
    })),
  ];

  // Helper to toggle image selection for targeted variant
  const handleToggleImageForTarget = (url) => {
    if (!imageModalTarget) return;
    const { type, index } = imageModalTarget;

    const updater = (prevList) => {
      const copy = [...prevList];
      const row = { ...copy[index] };
      const curr = row.imageUrls || [];
      if (curr.includes(url)) {
        row.imageUrls = curr.filter((u) => u !== url);
      } else {
        row.imageUrls = [...curr, url];
      }
      copy[index] = row;
      return copy;
    };

    if (type === "shade_only") setShades(updater);
    else if (type === "size_only") setSizes(updater);
    else if (type === "size_shade") setCombinations(updater);
    setIsDirty(true);
  };

  const handleRemoveImageFromRow = (type, rowIndex, urlToRemove) => {
    const updater = (prevList) => {
      const copy = [...prevList];
      const row = { ...copy[rowIndex] };
      row.imageUrls = (row.imageUrls || []).filter((u) => u !== urlToRemove);
      copy[rowIndex] = row;
      return copy;
    };
    if (type === "shade_only") setShades(updater);
    else if (type === "size_only") setSizes(updater);
    else if (type === "size_shade") setCombinations(updater);
    setIsDirty(true);
  };

  // ── Handlers for Type 1: Shade only ──
  const handleAddShade = () => {
    const nextIdx = shades.length + 1;
    const defaultColor = "#E8A0B4";
    const defaultName = getClosestShadeName(defaultColor);
    setShades((prev) => [
      ...prev,
      {
        id: `shade_${Date.now()}_${nextIdx}`,
        shadeColor: defaultColor,
        shadeName: defaultName,
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        isDefault: prev.length === 0,
        imageUrls: [],
      },
    ]);
    setIsDirty(true);
  };

  const handleRemoveShade = (idx) => {
    if (shades.length <= 1) return;
    setShades((prev) => {
      const remaining = prev.filter((_, i) => i !== idx);
      if (!remaining.some((s) => s.isDefault) && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
    setIsDirty(true);
  };

  const handleSetDefaultShade = (targetIdx) => {
    setShades((prev) =>
      prev.map((s, i) => ({
        ...s,
        isDefault: i === targetIdx,
      }))
    );
    setIsDirty(true);
  };

  const handleShadeChange = (idx, field, value) => {
    setShades((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      if (field === "shadeColor") {
        target.shadeColor = value;
        target.shadeName = getClosestShadeName(value);
      } else {
        target[field] = value;
      }
      copy[idx] = target;
      return copy;
    });
    setIsDirty(true);
    if (clientErrors[`shade_${idx}_${field}`] || clientErrors.variants || clientErrors.form) {
      setClientErrors((p) => ({
        ...p,
        [`shade_${idx}_${field}`]: null,
        variants: null,
        form: null,
      }));
    }
  };

  // ── Handlers for Type 2: Size only ──
  const handleAddSize = () => {
    const nextIdx = sizes.length + 1;
    setSizes((prev) => [
      ...prev,
      {
        id: `size_${Date.now()}_${nextIdx}`,
        sizeValue: `${nextIdx * 30}`,
        sizeUnit: "ml",
        regularPrice: "",
        salePrice: "",
        costPrice: "",
        isDefault: prev.length === 0,
        imageUrls: [],
      },
    ]);
    setIsDirty(true);
  };

  const handleRemoveSize = (idx) => {
    if (sizes.length <= 1) return;
    setSizes((prev) => {
      const remaining = prev.filter((_, i) => i !== idx);
      if (!remaining.some((s) => s.isDefault) && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
    setIsDirty(true);
  };

  const handleSetDefaultSize = (targetIdx) => {
    setSizes((prev) =>
      prev.map((s, i) => ({
        ...s,
        isDefault: i === targetIdx,
      }))
    );
    setIsDirty(true);
  };

  const handleSizeChange = (idx, field, value) => {
    setSizes((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setIsDirty(true);
    if (clientErrors[`size_${idx}_${field}`] || clientErrors.variants || clientErrors.form) {
      setClientErrors((p) => ({
        ...p,
        [`size_${idx}_${field}`]: null,
        variants: null,
        form: null,
      }));
    }
  };

  // ── Handlers for Type 3: Size + Shade ──
  const handleAddComboSize = () => {
    const val = newSizeValue.trim();
    if (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0) return;
    const exists = comboSizes.some(
      (s) => s.sizeValue.trim() === val && s.sizeUnit === newSizeUnit
    );
    if (exists) return;

    setComboSizes((prev) => [
      ...prev,
      { id: `cs_${Date.now()}`, sizeValue: val, sizeUnit: newSizeUnit },
    ]);
    setNewSizeValue("");
    setIsDirty(true);
    if (clientErrors.comboSizes) {
      setClientErrors((p) => ({ ...p, comboSizes: null, form: null }));
    }
  };

  const handleRemoveComboSize = (id) => {
    setComboSizes((prev) => prev.filter((s) => s.id !== id));
    setIsDirty(true);
  };

  const handleAddComboShade = () => {
    const name = newShadeName.trim();
    if (!name) return;
    const exists = comboShades.some(
      (s) => s.shadeName.trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) return;

    setComboShades((prev) => [
      ...prev,
      { id: `csh_${Date.now()}`, shadeColor: newShadeColor, shadeName: name },
    ]);
    setNewShadeName(getClosestShadeName(newShadeColor));
    setIsDirty(true);
    if (clientErrors.comboShades) {
      setClientErrors((p) => ({ ...p, comboShades: null, form: null }));
    }
  };

  const handleRemoveComboShade = (id) => {
    setComboShades((prev) => prev.filter((s) => s.id !== id));
    setIsDirty(true);
  };

  const handleGenerateCombinations = () => {
    if (comboSizes.length === 0 || comboShades.length === 0) return;

    setCombinations((prev) => {
      const existingMap = new Map();
      prev.forEach((c) => {
        const key = `${c.sizeValue}${c.sizeUnit}__${c.shadeName.toLowerCase()}`;
        existingMap.set(key, c);
      });

      const nextCombos = [];
      comboSizes.forEach((sz) => {
        comboShades.forEach((sh) => {
          const key = `${sz.sizeValue}${sz.sizeUnit}__${sh.shadeName.toLowerCase()}`;
          const existing = existingMap.get(key);
          if (existing) {
            nextCombos.push({
              ...existing,
              sizeValue: sz.sizeValue,
              sizeUnit: sz.sizeUnit,
              shadeColor: sh.shadeColor,
              shadeName: sh.shadeName,
            });
          } else {
            nextCombos.push({
              id: `combo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              sizeValue: sz.sizeValue,
              sizeUnit: sz.sizeUnit,
              shadeColor: sh.shadeColor,
              shadeName: sh.shadeName,
              regularPrice: bulkRegularPrice || "",
              salePrice: bulkSalePrice || "",
              costPrice: bulkCostPrice || "",
              isDefault: nextCombos.length === 0,
              imageUrls: [],
            });
          }
        });
      });

      if (!nextCombos.some((c) => c.isDefault) && nextCombos.length > 0) {
        nextCombos[0].isDefault = true;
      }

      return nextCombos;
    });
    setIsDirty(true);
    if (clientErrors.combinations) {
      setClientErrors((p) => ({ ...p, combinations: null, form: null }));
    }
  };

  const handleSetDefaultCombination = (targetIdx) => {
    setCombinations((prev) =>
      prev.map((c, i) => ({
        ...c,
        isDefault: i === targetIdx,
      }))
    );
    setIsDirty(true);
  };

  const handleCombinationChange = (idx, field, value) => {
    setCombinations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setIsDirty(true);
    if (clientErrors[`combo_${idx}_${field}`] || clientErrors.variants || clientErrors.form) {
      setClientErrors((p) => ({
        ...p,
        [`combo_${idx}_${field}`]: null,
        variants: null,
        form: null,
      }));
    }
  };

  const handleApplyBulkRegularToCombinations = () => {
    if (!bulkRegularPrice) return;
    setCombinations((prev) =>
      prev.map((c) => ({
        ...c,
        regularPrice: bulkRegularPrice,
      }))
    );
    setIsDirty(true);
  };

  const handleApplyBulkSaleToCombinations = () => {
    if (!bulkSalePrice) return;
    setCombinations((prev) =>
      prev.map((c) => ({
        ...c,
        salePrice: bulkSalePrice,
      }))
    );
    setIsDirty(true);
  };

  const handleApplyBulkCostToCombinations = () => {
    if (!bulkCostPrice) return;
    setCombinations((prev) =>
      prev.map((c) => ({
        ...c,
        costPrice: bulkCostPrice,
      }))
    );
    setIsDirty(true);
  };

  const handleDeleteCombinationRow = (index) => {
    const row = combinations[index];
    if (!row) return;
    if (row.regularPrice || row.salePrice || row.costPrice || (row.imageUrls && row.imageUrls.length > 0)) {
      setDeleteComboConfirmIndex(index);
    } else {
      setCombinations((prev) => {
        const remaining = prev.filter((_, idx) => idx !== index);
        if (!remaining.some((c) => c.isDefault) && remaining.length > 0) {
          remaining[0].isDefault = true;
        }
        return remaining;
      });
      setIsDirty(true);
    }
  };

  const handleConfirmDeleteCombination = () => {
    if (deleteComboConfirmIndex !== null) {
      setCombinations((prev) => {
        const remaining = prev.filter((_, idx) => idx !== deleteComboConfirmIndex);
        if (!remaining.some((c) => c.isDefault) && remaining.length > 0) {
          remaining[0].isDefault = true;
        }
        return remaining;
      });
      setDeleteComboConfirmIndex(null);
      setIsDirty(true);
    }
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

  const handleToggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
    setIsDirty(true);
  };

  // Margin calculation helper
  const getMarginInfo = (regPrice, costPrice) => {
    const reg = parseFloat(regPrice);
    const cost = parseFloat(costPrice);
    if (isNaN(reg) || reg <= 0 || isNaN(cost) || cost <= 0) return null;
    const margin = Math.round(((reg - cost) / reg) * 100);
    const isLoss = cost > reg;
    return { margin, isLoss };
  };

  // Client-side validation before submission
  const validateForm = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Product name is required.";
    if (!slug.trim()) errs.slug = "Product slug is required.";

    if (!variantType) {
      errs.variantType = "Please select a variant type (Shade only, Size only, or Size + Shade).";
    } else if (variantType === "shade_only") {
      if (shades.length === 0) {
        errs.variants = "Please add at least one shade.";
      } else {
        const seenNames = new Set();
        for (let i = 0; i < shades.length; i++) {
          const s = shades[i];
          const sName = (s.shadeName || "").trim();
          if (!sName) {
            errs[`shade_${i}_name`] = "Shade name is required.";
          } else if (seenNames.has(sName.toLowerCase())) {
            errs[`shade_${i}_name`] = "Duplicate shade name.";
          } else {
            seenNames.add(sName.toLowerCase());
          }

          const reg = parseFloat(s.regularPrice);
          if (isNaN(reg) || reg <= 0) {
            errs[`shade_${i}_regularPrice`] = "Regular price must be greater than 0.";
          }

          if (s.salePrice && s.salePrice.trim() !== "") {
            const sale = parseFloat(s.salePrice);
            if (isNaN(sale) || sale < 0) {
              errs[`shade_${i}_salePrice`] = "Discount price must be a positive number.";
            } else if (!isNaN(reg) && sale >= reg) {
              errs[`shade_${i}_salePrice`] = "Discount price must be lower than regular price.";
            }
          }
        }
      }
    } else if (variantType === "size_only") {
      if (sizes.length === 0) {
        errs.variants = "Please add at least one size.";
      } else {
        const seenSizes = new Set();
        for (let i = 0; i < sizes.length; i++) {
          const sz = sizes[i];
          const sVal = (sz.sizeValue || "").trim();
          const sKey = `${sVal}${sz.sizeUnit || "ml"}`.toLowerCase();
          if (!sVal || isNaN(parseFloat(sVal)) || parseFloat(sVal) <= 0) {
            errs[`size_${i}_value`] = "Valid size number is required.";
          } else if (seenSizes.has(sKey)) {
            errs[`size_${i}_value`] = "Duplicate size.";
          } else {
            seenSizes.add(sKey);
          }

          const reg = parseFloat(sz.regularPrice);
          if (isNaN(reg) || reg <= 0) {
            errs[`size_${i}_regularPrice`] = "Regular price must be greater than 0.";
          }

          if (sz.salePrice && sz.salePrice.trim() !== "") {
            const sale = parseFloat(sz.salePrice);
            if (isNaN(sale) || sale < 0) {
              errs[`size_${i}_salePrice`] = "Discount price must be a positive number.";
            } else if (!isNaN(reg) && sale >= reg) {
              errs[`size_${i}_salePrice`] = "Discount price must be lower than regular price.";
            }
          }
        }
      }
    } else if (variantType === "size_shade") {
      if (comboSizes.length === 0) {
        errs.comboSizes = "Please add at least one size in the Size section.";
      }
      if (comboShades.length === 0) {
        errs.comboShades = "Please add at least one shade in the Shade section.";
      }
      if (combinations.length === 0) {
        errs.combinations = "Please click 'Generate Combination' to create the variants matrix.";
      } else {
        for (let i = 0; i < combinations.length; i++) {
          const c = combinations[i];
          const reg = parseFloat(c.regularPrice);
          if (isNaN(reg) || reg <= 0) {
            errs[`combo_${i}_regularPrice`] = "Regular price must be greater than 0.";
          }

          if (c.salePrice && c.salePrice.trim() !== "") {
            const sale = parseFloat(c.salePrice);
            if (isNaN(sale) || sale < 0) {
              errs[`combo_${i}_salePrice`] = "Discount price must be a positive number.";
            } else if (!isNaN(reg) && sale >= reg) {
              errs[`combo_${i}_salePrice`] = "Discount price must be lower than regular price.";
            }
          }
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

    let formattedOptions = [];
    let formattedVariants = [];
    const variantPayload = {
      variant_type: variantType,
      variants: [],
    };

    if (variantType === "shade_only") {
      formattedOptions = [
        {
          name: "Shade",
          type: "swatch",
          position: 0,
          values: shades.map((s, idx) => ({
            value: s.shadeName.trim(),
            swatchHex: s.shadeColor || "#E8A0B4",
            swatchImage: null,
            position: idx,
          })),
        },
      ];

      formattedVariants = shades.map((s, idx) => {
        const valTrimmed = s.shadeName.trim();
        const regVal = parseFloat(s.regularPrice);
        const saleVal = s.salePrice ? parseFloat(s.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        const costVal = parseFloat(s.costPrice);
        const primImg = s.imageUrls?.[0] || "";

        return {
          id: s.id?.startsWith("shade_") ? undefined : s.id,
          optionsKey: valTrimmed,
          price: (hasDiscount ? saleVal : regVal).toString(),
          compareAtPrice: hasDiscount ? regVal.toString() : "",
          regularPrice: regVal.toString(),
          salePrice: hasDiscount ? saleVal.toString() : "",
          costPrice: !isNaN(costVal) && costVal > 0 ? costVal.toString() : "",
          isDefault: Boolean(s.isDefault),
          sizeValue: null,
          sizeUnit: null,
          imageUrl: primImg,
          imageUrls: s.imageUrls || [],
          isAvailable: true,
          isActive: true,
          selectedOptions: [
            {
              optionName: "Shade",
              value: valTrimmed,
              swatchHex: s.shadeColor || "#E8A0B4",
            },
          ],
        };
      });

      variantPayload.variants = shades.map((s) => {
        const regVal = parseFloat(s.regularPrice) || 0;
        const saleVal = s.salePrice ? parseFloat(s.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        return {
          size: null,
          size_value: null,
          size_unit: null,
          shade_name: s.shadeName.trim(),
          shade_color: s.shadeColor || "#E8A0B4",
          image_urls: s.imageUrls || [],
          regular_price: regVal,
          sale_price: hasDiscount ? saleVal : null,
          cost_price: s.costPrice ? parseFloat(s.costPrice) : null,
          is_default: Boolean(s.isDefault),
        };
      });
    } else if (variantType === "size_only") {
      formattedOptions = [
        {
          name: "Size",
          type: "button",
          position: 0,
          values: sizes.map((s, idx) => ({
            value: `${s.sizeValue.trim()}${s.sizeUnit}`,
            swatchHex: null,
            swatchImage: null,
            position: idx,
          })),
        },
      ];

      formattedVariants = sizes.map((s, idx) => {
        const valTrimmed = `${s.sizeValue.trim()}${s.sizeUnit}`;
        const regVal = parseFloat(s.regularPrice);
        const saleVal = s.salePrice ? parseFloat(s.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        const costVal = parseFloat(s.costPrice);
        const primImg = s.imageUrls?.[0] || "";

        return {
          id: s.id?.startsWith("size_") ? undefined : s.id,
          optionsKey: valTrimmed,
          price: (hasDiscount ? saleVal : regVal).toString(),
          compareAtPrice: hasDiscount ? regVal.toString() : "",
          regularPrice: regVal.toString(),
          salePrice: hasDiscount ? saleVal.toString() : "",
          costPrice: !isNaN(costVal) && costVal > 0 ? costVal.toString() : "",
          isDefault: Boolean(s.isDefault),
          sizeValue: s.sizeValue.trim(),
          sizeUnit: s.sizeUnit,
          imageUrl: primImg,
          imageUrls: s.imageUrls || [],
          isAvailable: true,
          isActive: true,
          selectedOptions: [
            {
              optionName: "Size",
              value: valTrimmed,
            },
          ],
        };
      });

      variantPayload.variants = sizes.map((s) => {
        const regVal = parseFloat(s.regularPrice) || 0;
        const saleVal = s.salePrice ? parseFloat(s.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        return {
          size: `${s.sizeValue.trim()}${s.sizeUnit}`,
          size_value: parseFloat(s.sizeValue) || null,
          size_unit: s.sizeUnit,
          shade_name: null,
          shade_color: null,
          image_urls: s.imageUrls || [],
          regular_price: regVal,
          sale_price: hasDiscount ? saleVal : null,
          cost_price: s.costPrice ? parseFloat(s.costPrice) : null,
          is_default: Boolean(s.isDefault),
        };
      });
    } else if (variantType === "size_shade") {
      const uniqueSizes = Array.from(
        new Set(combinations.map((c) => `${c.sizeValue}${c.sizeUnit}`))
      );
      const uniqueShades = [];
      const shadeSeen = new Set();
      combinations.forEach((c) => {
        if (!shadeSeen.has(c.shadeName)) {
          shadeSeen.add(c.shadeName);
          uniqueShades.push({ name: c.shadeName, color: c.shadeColor });
        }
      });

      formattedOptions = [
        {
          name: "Size",
          type: "button",
          position: 0,
          values: uniqueSizes.map((val, idx) => ({
            value: val,
            swatchHex: null,
            swatchImage: null,
            position: idx,
          })),
        },
        {
          name: "Shade",
          type: "swatch",
          position: 1,
          values: uniqueShades.map((sh, idx) => ({
            value: sh.name,
            swatchHex: sh.color || "#E8A0B4",
            swatchImage: null,
            position: idx,
          })),
        },
      ];

      formattedVariants = combinations.map((c) => {
        const sizeStr = `${c.sizeValue}${c.sizeUnit}`;
        const comboKey = `${sizeStr} / ${c.shadeName}`;
        const regVal = parseFloat(c.regularPrice);
        const saleVal = c.salePrice ? parseFloat(c.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        const costVal = parseFloat(c.costPrice);
        const primImg = c.imageUrls?.[0] || "";

        return {
          id: c.id?.startsWith("combo_") ? undefined : c.id,
          optionsKey: comboKey,
          price: (hasDiscount ? saleVal : regVal).toString(),
          compareAtPrice: hasDiscount ? regVal.toString() : "",
          regularPrice: regVal.toString(),
          salePrice: hasDiscount ? saleVal.toString() : "",
          costPrice: !isNaN(costVal) && costVal > 0 ? costVal.toString() : "",
          isDefault: Boolean(c.isDefault),
          sizeValue: c.sizeValue,
          sizeUnit: c.sizeUnit,
          imageUrl: primImg,
          imageUrls: c.imageUrls || [],
          isAvailable: true,
          isActive: true,
          selectedOptions: [
            {
              optionName: "Size",
              value: sizeStr,
            },
            {
              optionName: "Shade",
              value: c.shadeName,
              swatchHex: c.shadeColor || "#E8A0B4",
            },
          ],
        };
      });

      variantPayload.variants = combinations.map((c) => {
        const regVal = parseFloat(c.regularPrice) || 0;
        const saleVal = c.salePrice ? parseFloat(c.salePrice) : null;
        const hasDiscount = saleVal !== null && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
        return {
          size: `${c.sizeValue}${c.sizeUnit}`,
          size_value: parseFloat(c.sizeValue) || null,
          size_unit: c.sizeUnit,
          shade_name: c.shadeName,
          shade_color: c.shadeColor || "#E8A0B4",
          image_urls: c.imageUrls || [],
          regular_price: regVal,
          sale_price: hasDiscount ? saleVal : null,
          cost_price: c.costPrice ? parseFloat(c.costPrice) : null,
          is_default: Boolean(c.isDefault),
        };
      });
    }

    // Set effective product price based on default variant (or lowest variant price)
    const minP = formattedVariants.reduce((min, v) => {
      const num = parseFloat(v.price);
      return !isNaN(num) && (min === null || num < min) ? num : min;
    }, null);
    const effectivePrice = minP !== null ? minP.toString() : "0";

    const minCost = formattedVariants.reduce((min, v) => {
      const num = parseFloat(v.costPrice);
      return !isNaN(num) && (min === null || num < min) ? num : min;
    }, null);
    const effectiveCostPrice = minCost !== null ? minCost.toString() : "";

    const defaultVariant = formattedVariants.find((v) => v.isDefault) || formattedVariants[0];
    const defaultRegularPrice = defaultVariant ? defaultVariant.regularPrice : effectivePrice;
    const defaultSalePrice = defaultVariant ? defaultVariant.salePrice : "";
    const defaultCostPrice = defaultVariant ? defaultVariant.costPrice : effectiveCostPrice;

    formData.append("price", parseFloat(defaultRegularPrice || 0).toString());
    formData.append("salePrice", defaultSalePrice ? parseFloat(defaultSalePrice).toString() : "");
    formData.append("costPrice", defaultCostPrice ? parseFloat(defaultCostPrice).toString() : "");
    formData.append("hasVariants", "true");
    formData.append("options", JSON.stringify(formattedOptions));
    formData.append("variants", JSON.stringify(formattedVariants));
    formData.append("variantPayload", JSON.stringify(variantPayload));
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

    // Collection & Tag IDs
    formData.append("collectionIds", JSON.stringify(selectedCollectionIds));
    formData.append("tagIds", JSON.stringify(selectedTagIds));

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

  // Live price indicator for summary
  const lowestVariantPrice = (() => {
    let list = [];
    if (variantType === "shade_only") list = shades.map((s) => parseFloat(s.regularPrice));
    else if (variantType === "size_only") list = sizes.map((s) => parseFloat(s.regularPrice));
    else if (variantType === "size_shade") list = combinations.map((c) => parseFloat(c.regularPrice));
    const valid = list.filter((n) => !isNaN(n) && n > 0);
    return valid.length > 0 ? Math.min(...valid) : 0;
  })();

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
                  eloura.com/products/
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

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setIsDirty(true);
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden cursor-pointer"
              >
                <option value="">-- Select Category --</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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
                {(brands || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection Multi-Select Dropdown */}
            <div className="relative" ref={collectionDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Collections
                </label>
                {selectedCollectionIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollectionIds([]);
                      setIsDirty(true);
                    }}
                    className="text-[10px] text-[#9B4F5E] dark:text-pink-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear ({selectedCollectionIds.length})
                  </button>
                )}
              </div>

              {/* Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsCollectionDropdownOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 flex items-center justify-between focus:border-[#9B4F5E] focus:outline-hidden transition-colors cursor-pointer text-left shadow-2xs"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  {selectedCollectionIds.length === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">
                      -- Select Collections --
                    </span>
                  ) : (
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedCollectionIds.length === 1
                        ? collections.find((c) => c.id === selectedCollectionIds[0])?.name || "1 selected"
                        : `${selectedCollectionIds.length} collections selected`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {selectedCollectionIds.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/60 px-2 py-0.5 text-[10px] font-bold text-[#9B4F5E] dark:text-pink-300">
                      {selectedCollectionIds.length}
                    </span>
                  )}
                  <FaChevronDown
                    className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                      isCollectionDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Selected Collection Chips */}
              {selectedCollectionIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedCollectionIds.map((id) => {
                    const col = collections.find((c) => c.id === id);
                    if (!col) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/40 text-[11px] font-medium text-[#9B4F5E] dark:text-pink-300 border border-pink-100 dark:border-pink-900/40"
                      >
                        {col.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCollection(id);
                          }}
                          className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                          aria-label={`Remove ${col.name}`}
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Menu Popover */}
              {isCollectionDropdownOpen && (
                <div className="absolute left-0 right-0 z-30 mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-xl space-y-2">
                  {/* Search inside collections */}
                  {collections.length > 3 && (
                    <div className="relative">
                      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <input
                        type="text"
                        value={collectionSearch}
                        onChange={(e) => setCollectionSearch(e.target.value)}
                        placeholder="Search collections..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {filteredCollections.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic p-2 text-center">
                        {collectionSearch ? "No matching collections" : "No collections available"}
                      </p>
                    ) : (
                      filteredCollections.map((col) => {
                        const isChecked = selectedCollectionIds.includes(col.id);
                        return (
                          <label
                            key={col.id}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                              isChecked
                                ? "bg-pink-50/70 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300 font-medium"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCollection(col.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                              />
                              <span className="truncate">{col.name}</span>
                            </div>
                            {isChecked && (
                              <FaCheck className="h-3 w-3 text-[#9B4F5E] dark:text-pink-400 shrink-0" />
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tags Multi-Select Dropdown */}
            <div className="relative" ref={tagDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                {selectedTagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTagIds([]);
                      setIsDirty(true);
                    }}
                    className="text-[10px] text-[#9B4F5E] dark:text-pink-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear ({selectedTagIds.length})
                  </button>
                )}
              </div>

              {/* Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 flex items-center justify-between focus:border-[#9B4F5E] focus:outline-hidden transition-colors cursor-pointer text-left shadow-2xs"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  {selectedTagIds.length === 0 ? (
                    <span className="text-gray-400 dark:text-gray-500">
                      -- Select Tags --
                    </span>
                  ) : (
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedTagIds.length === 1
                        ? availableTags.find((t) => t.id === selectedTagIds[0])?.name || "1 selected"
                        : `${selectedTagIds.length} tags selected`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {selectedTagIds.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/60 px-2 py-0.5 text-[10px] font-bold text-[#9B4F5E] dark:text-pink-300">
                      {selectedTagIds.length}
                    </span>
                  )}
                  <FaChevronDown
                    className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                      isTagDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Selected Tag Chips */}
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTagIds.map((id) => {
                    const tag = availableTags.find((t) => t.id === id);
                    if (!tag) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/40 text-[11px] font-medium text-[#9B4F5E] dark:text-pink-300 border border-pink-100 dark:border-pink-900/40"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTag(id);
                          }}
                          className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                          aria-label={`Remove ${tag.name}`}
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Menu Popover */}
              {isTagDropdownOpen && (
                <div className="absolute left-0 right-0 z-30 mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-xl space-y-2">
                  {/* Search inside tags */}
                  {availableTags.length > 3 && (
                    <div className="relative">
                      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <input
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="Search tags..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-[#9B4F5E] focus:outline-hidden"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {filteredTags.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic p-2 text-center">
                        {tagSearch ? "No matching tags" : "No tags available"}
                      </p>
                    ) : (
                      filteredTags.map((tag) => {
                        const isChecked = selectedTagIds.includes(tag.id);
                        return (
                          <label
                            key={tag.id}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                              isChecked
                                ? "bg-pink-50/70 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-300 font-medium"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleTag(tag.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-[#9B4F5E] focus:ring-[#9B4F5E]"
                              />
                              <span className="truncate">{tag.name}</span>
                            </div>
                            {isChecked && (
                              <FaCheck className="h-3 w-3 text-[#9B4F5E] dark:text-pink-400 shrink-0" />
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL WIDTH SECTIONS (3, 4, 5) ── */}
      {/* SECTION 3: Product Variants & Pricing */}
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400">
              <FaLayerGroup className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                3. Product Variants & Pricing
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-[#9B4F5E] dark:bg-pink-950/40 dark:text-pink-400">
                  Required
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose variation structure: Shade only, Size only, or Size + Shade. Select photos from Section 2.
              </p>
            </div>
          </div>
          {lowestVariantPrice > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Starting at <strong>৳{lowestVariantPrice}</strong> across storefront</span>
            </div>
          )}
        </div>

        {/* VARIANT TYPE SELECTION (Radio Buttons) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2.5">
            Select Variant Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Shade only */}
            <div
              onClick={() => handleSelectVariantType("shade_only")}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                variantType === "shade_only"
                  ? "border-[#9B4F5E] bg-pink-50/40 dark:bg-pink-950/20 ring-2 ring-[#9B4F5E]/20 dark:ring-pink-500/20 shadow-xs"
                  : "border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
              }`}
            >
              <input
                type="radio"
                name="variant_type_selection"
                value="shade_only"
                checked={variantType === "shade_only"}
                onChange={() => handleSelectVariantType("shade_only")}
                className="mt-1 h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FaPalette className={`h-3.5 w-3.5 ${variantType === "shade_only" ? "text-[#9B4F5E] dark:text-pink-400" : "text-gray-400"}`} />
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    1. Shade only
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Lipsticks, foundations, and color cosmetics with color swatches & shade names.
                </p>
              </div>
            </div>

            {/* 2. Size only */}
            <div
              onClick={() => handleSelectVariantType("size_only")}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                variantType === "size_only"
                  ? "border-[#9B4F5E] bg-pink-50/40 dark:bg-pink-950/20 ring-2 ring-[#9B4F5E]/20 dark:ring-pink-500/20 shadow-xs"
                  : "border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
              }`}
            >
              <input
                type="radio"
                name="variant_type_selection"
                value="size_only"
                checked={variantType === "size_only"}
                onChange={() => handleSelectVariantType("size_only")}
                className="mt-1 h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FaRulerCombined className={`h-3.5 w-3.5 ${variantType === "size_only" ? "text-[#9B4F5E] dark:text-pink-400" : "text-gray-400"}`} />
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    2. Size only
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Serums, creams, cleansers, and bottles with volume / weight variations.
                </p>
              </div>
            </div>

            {/* 3. Size + Shade */}
            <div
              onClick={() => handleSelectVariantType("size_shade")}
              className={`relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                variantType === "size_shade"
                  ? "border-[#9B4F5E] bg-pink-50/40 dark:bg-pink-950/20 ring-2 ring-[#9B4F5E]/20 dark:ring-pink-500/20 shadow-xs"
                  : "border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
              }`}
            >
              <input
                type="radio"
                name="variant_type_selection"
                value="size_shade"
                checked={variantType === "size_shade"}
                onChange={() => handleSelectVariantType("size_shade")}
                className="mt-1 h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FaLayerGroup className={`h-3.5 w-3.5 ${variantType === "size_shade" ? "text-[#9B4F5E] dark:text-pink-400" : "text-gray-400"}`} />
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    3. Size + Shade
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Combined variations where each size is offered across multiple shade tones.
                </p>
              </div>
            </div>
          </div>
          {clientErrors.variantType && (
            <p className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1.5">
              <FaExclamationTriangle className="w-3.5 h-3.5 shrink-0" />
              {clientErrors.variantType}
            </p>
          )}
        </div>

        {/* NOTHING ELSE IS SHOWN UNTIL ONE IS SELECTED */}
        {!variantType && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400 flex items-center justify-center mb-3">
              <FaLayerGroup className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              No Variant Type Selected
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Please choose either <strong>Shade only</strong>, <strong>Size only</strong>, or <strong>Size + Shade</strong> above to configure prices and variations.
            </p>
          </div>
        )}

        {/* ── TYPE 1: SHADE ONLY ── */}
        {variantType === "shade_only" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Shade Variants & Pricing
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Select a color to auto-generate the shade name (editable), set regular and cost prices, and assign photos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddShade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-xs font-bold transition-colors self-start sm:self-auto"
              >
                <FaPlus className="w-3 h-3" />
                Add Shade
              </button>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/90 dark:bg-gray-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 w-28 text-center">Default (PDP)</th>
                    <th className="py-3 px-3 min-w-[150px]">Images</th>
                    <th className="py-3 px-3 min-w-[140px]">Shade Color</th>
                    <th className="py-3 px-3 min-w-[180px]">Shade Name <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3 min-w-[130px]">Regular Price (৳) <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3 min-w-[140px]">Discount Price (৳)</th>
                    <th className="py-3 px-3 min-w-[140px]">Cost Price (৳)</th>
                    <th className="py-3 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {shades.map((shade, idx) => {
                    const marginInfo = getMarginInfo(shade.regularPrice, shade.costPrice);
                    const regVal = parseFloat(shade.regularPrice);
                    const saleVal = parseFloat(shade.salePrice);
                    const hasValidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
                    const discountPercent = hasValidDiscount ? Math.round(((regVal - saleVal) / regVal) * 100) : null;
                    const isInvalidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal >= regVal;

                    return (
                      <tr key={shade.id || idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${shade.isDefault ? "bg-pink-50/20 dark:bg-pink-950/10" : ""}`}>
                        <td className="py-3 px-3 text-center text-xs font-semibold text-gray-400">
                          {idx + 1}
                        </td>

                        {/* Default Radio */}
                        <td className="py-3 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="default_shade_selection"
                              checked={Boolean(shade.isDefault)}
                              onChange={() => handleSetDefaultShade(idx)}
                              className="h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
                            />
                            {shade.isDefault && (
                              <span className="text-[10px] font-bold text-[#9B4F5E] dark:text-pink-400 bg-pink-100 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-md">
                                ⭐ Default
                              </span>
                            )}
                          </label>
                        </td>

                        {/* Images */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(shade.imageUrls || []).map((url, uIdx) => (
                              <div
                                key={uIdx}
                                className="relative group w-9 h-9 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0"
                              >
                                <img src={url} alt="Variant" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImageFromRow("shade_only", idx, url)}
                                  className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove image"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setImageModalTarget({ type: "shade_only", index: idx })}
                              className="h-9 px-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#9B4F5E] dark:hover:border-pink-400 text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 flex items-center gap-1 text-[11px] font-semibold transition-colors shrink-0"
                            >
                              <FaImages className="w-3 h-3" />
                              <span>{(shade.imageUrls || []).length > 0 ? `${shade.imageUrls.length} selected` : "+ Photos"}</span>
                            </button>
                          </div>
                        </td>

                        {/* Shade Color Picker */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <label className="relative w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 shadow-xs cursor-pointer overflow-hidden shrink-0">
                              <input
                                type="color"
                                value={shade.shadeColor || "#E8A0B4"}
                                onChange={(e) => handleShadeChange(idx, "shadeColor", e.target.value)}
                                className="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
                              />
                              <div
                                className="w-full h-full rounded-full"
                                style={{ backgroundColor: shade.shadeColor || "#E8A0B4" }}
                              />
                            </label>
                            <span className="font-mono text-xs uppercase text-gray-700 dark:text-gray-300">
                              {shade.shadeColor || "#E8A0B4"}
                            </span>
                          </div>
                        </td>

                        {/* Shade Name (Auto-filled + Editable) */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={shade.shadeName || ""}
                            onChange={(e) => handleShadeChange(idx, "shadeName", e.target.value)}
                            placeholder="e.g. Rose Pink"
                            className={`w-full rounded-xl border px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                              clientErrors[`shade_${idx}_name`]
                                ? "border-red-500 ring-1 ring-red-500"
                                : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                            }`}
                          />
                          {clientErrors[`shade_${idx}_name`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`shade_${idx}_name`]}
                            </p>
                          )}
                        </td>

                        {/* Regular Price */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={shade.regularPrice || ""}
                              onChange={(e) => handleShadeChange(idx, "regularPrice", e.target.value)}
                              placeholder="0.00"
                              className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                clientErrors[`shade_${idx}_regularPrice`]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                              }`}
                            />
                          </div>
                          {clientErrors[`shade_${idx}_regularPrice`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`shade_${idx}_regularPrice`]}
                            </p>
                          )}
                        </td>

                        {/* Discount / Sale Price */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={shade.salePrice || ""}
                              onChange={(e) => handleShadeChange(idx, "salePrice", e.target.value)}
                              placeholder="0.00"
                              className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                clientErrors[`shade_${idx}_salePrice`] || isInvalidDiscount
                                  ? "border-amber-500 ring-1 ring-amber-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                              }`}
                            />
                          </div>
                          {hasValidDiscount && (
                            <div className="mt-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                {discountPercent}% OFF
                              </span>
                            </div>
                          )}
                          {isInvalidDiscount && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                              ⚠️ Must be &lt; regular price
                            </p>
                          )}
                          {clientErrors[`shade_${idx}_salePrice`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`shade_${idx}_salePrice`]}
                            </p>
                          )}
                        </td>

                        {/* Cost Price + Margin */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={shade.costPrice || ""}
                              onChange={(e) => handleShadeChange(idx, "costPrice", e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 pl-6 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                            />
                          </div>
                          {marginInfo && (
                            <div className="mt-1">
                              {marginInfo.warning ? (
                                <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  ⚠️ Cost exceeds regular price
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  {marginInfo.margin}% Margin
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Delete Row */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveShade(idx)}
                            disabled={shades.length <= 1}
                            className={`p-1.5 rounded-lg transition-colors ${
                              shades.length <= 1
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            }`}
                            title={shades.length <= 1 ? "At least one shade is required" : "Remove shade"}
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddShade}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#9B4F5E] dark:hover:border-pink-500/50 text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              Add Another Shade
            </button>
          </div>
        )}

        {/* ── TYPE 2: SIZE ONLY ── */}
        {variantType === "size_only" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Size Variants & Pricing
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Enter size volume, select unit, set pricing, and optionally assign images from Section 2.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSize}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-xs font-bold transition-colors self-start sm:self-auto"
              >
                <FaPlus className="w-3 h-3" />
                Add Size
              </button>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/90 dark:bg-gray-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 w-28 text-center">Default (PDP)</th>
                    <th className="py-3 px-3 min-w-[150px]">Images</th>
                    <th className="py-3 px-3 min-w-[200px]">Size / Volume <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3 min-w-[130px]">Regular Price (৳) <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3 min-w-[140px]">Discount Price (৳)</th>
                    <th className="py-3 px-3 min-w-[140px]">Cost Price (৳)</th>
                    <th className="py-3 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {sizes.map((size, idx) => {
                    const marginInfo = getMarginInfo(size.regularPrice, size.costPrice);
                    const regVal = parseFloat(size.regularPrice);
                    const saleVal = parseFloat(size.salePrice);
                    const hasValidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
                    const discountPercent = hasValidDiscount ? Math.round(((regVal - saleVal) / regVal) * 100) : null;
                    const isInvalidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal >= regVal;

                    return (
                      <tr key={size.id || idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${size.isDefault ? "bg-pink-50/20 dark:bg-pink-950/10" : ""}`}>
                        <td className="py-3 px-3 text-center text-xs font-semibold text-gray-400">
                          {idx + 1}
                        </td>

                        {/* Default Radio */}
                        <td className="py-3 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="default_size_selection"
                              checked={Boolean(size.isDefault)}
                              onChange={() => handleSetDefaultSize(idx)}
                              className="h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
                            />
                            {size.isDefault && (
                              <span className="text-[10px] font-bold text-[#9B4F5E] dark:text-pink-400 bg-pink-100 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-md">
                                ⭐ Default
                              </span>
                            )}
                          </label>
                        </td>

                        {/* Images */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(size.imageUrls || []).map((url, uIdx) => (
                              <div
                                key={uIdx}
                                className="relative group w-9 h-9 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0"
                              >
                                <img src={url} alt="Variant" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImageFromRow("size_only", idx, url)}
                                  className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove image"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setImageModalTarget({ type: "size_only", index: idx })}
                              className="h-9 px-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#9B4F5E] dark:hover:border-pink-400 text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 flex items-center gap-1 text-[11px] font-semibold transition-colors shrink-0"
                            >
                              <FaImages className="w-3 h-3" />
                              <span>{(size.imageUrls || []).length > 0 ? `${size.imageUrls.length} selected` : "+ Photos"}</span>
                            </button>
                          </div>
                        </td>

                        {/* Size Amount (Editable Number) + Unit (Dropdown) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={size.sizeValue || ""}
                              onChange={(e) => handleSizeChange(idx, "sizeValue", e.target.value)}
                              placeholder="e.g. 50"
                              className={`w-28 rounded-xl border px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                clientErrors[`size_${idx}_value`]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                              }`}
                            />
                            <select
                              value={size.sizeUnit || "ml"}
                              onChange={(e) => handleSizeChange(idx, "sizeUnit", e.target.value)}
                              className="rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                            >
                              {SIZE_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 pl-1">
                              ({size.sizeValue || "?"}{size.sizeUnit})
                            </span>
                          </div>
                          {clientErrors[`size_${idx}_value`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`size_${idx}_value`]}
                            </p>
                          )}
                        </td>

                        {/* Regular Price */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={size.regularPrice || ""}
                              onChange={(e) => handleSizeChange(idx, "regularPrice", e.target.value)}
                              placeholder="0.00"
                              className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                clientErrors[`size_${idx}_regularPrice`]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                              }`}
                            />
                          </div>
                          {clientErrors[`size_${idx}_regularPrice`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`size_${idx}_regularPrice`]}
                            </p>
                          )}
                        </td>

                        {/* Discount / Sale Price */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={size.salePrice || ""}
                              onChange={(e) => handleSizeChange(idx, "salePrice", e.target.value)}
                              placeholder="0.00"
                              className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                clientErrors[`size_${idx}_salePrice`] || isInvalidDiscount
                                  ? "border-amber-500 ring-1 ring-amber-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                              }`}
                            />
                          </div>
                          {hasValidDiscount && (
                            <div className="mt-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                {discountPercent}% OFF
                              </span>
                            </div>
                          )}
                          {isInvalidDiscount && (
                            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                              ⚠️ Must be &lt; regular price
                            </p>
                          )}
                          {clientErrors[`size_${idx}_salePrice`] && (
                            <p className="mt-1 text-[10px] text-red-500">
                              {clientErrors[`size_${idx}_salePrice`]}
                            </p>
                          )}
                        </td>

                        {/* Cost Price + Margin */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={size.costPrice || ""}
                              onChange={(e) => handleSizeChange(idx, "costPrice", e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 pl-6 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                            />
                          </div>
                          {marginInfo && (
                            <div className="mt-1">
                              {marginInfo.warning ? (
                                <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  ⚠️ Cost exceeds regular price
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  {marginInfo.margin}% Margin
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Delete Row */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(idx)}
                            disabled={sizes.length <= 1}
                            className={`p-1.5 rounded-lg transition-colors ${
                              sizes.length <= 1
                                ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            }`}
                            title={sizes.length <= 1 ? "At least one size is required" : "Remove size"}
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddSize}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#9B4F5E] dark:hover:border-pink-500/50 text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              Add Another Size
            </button>
          </div>
        )}

        {/* ── TYPE 3: SIZE + SHADE ── */}
        {variantType === "size_shade" && (
          <div className="space-y-6">
            {/* Split Definition Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SIZE DEFINITIONS */}
              <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-gray-700 pb-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <FaRulerCombined className="text-[#9B4F5E] dark:text-pink-400" />
                    1. Define Sizes ({comboSizes.length})
                  </span>
                  <span className="text-[11px] text-gray-400">No prices here</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newSizeValue}
                    onChange={(e) => setNewSizeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddComboSize();
                      }
                    }}
                    placeholder="Value (e.g. 50)"
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E]"
                  />
                  <select
                    value={newSizeUnit}
                    onChange={(e) => setNewSizeUnit(e.target.value)}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  >
                    {SIZE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddComboSize}
                    className="px-3 py-1.5 rounded-xl bg-[#9B4F5E] text-white hover:bg-[#85414f] text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Size
                  </button>
                </div>

                {/* List of Added Sizes */}
                <div className="flex flex-wrap gap-2 min-h-[38px] p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 items-center">
                  {comboSizes.length === 0 ? (
                    <span className="text-[11px] text-gray-400 italic">No sizes added yet. Add at least one size.</span>
                  ) : (
                    comboSizes.map((sz) => (
                      <span
                        key={sz.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-xs font-bold text-[#9B4F5E] dark:text-pink-300 border border-pink-200/60 dark:border-pink-900/40"
                      >
                        {sz.sizeValue}{sz.sizeUnit}
                        <button
                          type="button"
                          onClick={() => handleRemoveComboSize(sz.id)}
                          className="hover:text-red-600 transition-colors"
                          title="Remove size"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* SHADE DEFINITIONS */}
              <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-gray-700 pb-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <FaPalette className="text-[#9B4F5E] dark:text-pink-400" />
                    2. Define Shades ({comboShades.length})
                  </span>
                  <span className="text-[11px] text-gray-400">Color auto-names</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 shadow-xs cursor-pointer overflow-hidden shrink-0">
                    <input
                      type="color"
                      value={newShadeColor}
                      onChange={(e) => {
                        setNewShadeColor(e.target.value);
                        setNewShadeName(getClosestShadeName(e.target.value));
                      }}
                      className="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: newShadeColor }} />
                  </label>
                  <input
                    type="text"
                    value={newShadeName}
                    onChange={(e) => setNewShadeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddComboShade();
                      }
                    }}
                    placeholder="Shade Name"
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E]"
                  />
                  <button
                    type="button"
                    onClick={handleAddComboShade}
                    className="px-3 py-1.5 rounded-xl bg-[#9B4F5E] text-white hover:bg-[#85414f] text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Shade
                  </button>
                </div>

                {/* List of Added Shades */}
                <div className="flex flex-wrap gap-2 min-h-[38px] p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 items-center">
                  {comboShades.length === 0 ? (
                    <span className="text-[11px] text-gray-400 italic">No shades added yet. Add at least one shade.</span>
                  ) : (
                    comboShades.map((sh) => (
                      <span
                        key={sh.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-xs font-bold text-gray-800 dark:text-gray-200 border border-pink-200/60 dark:border-pink-900/40"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: sh.shadeColor }}
                        />
                        {sh.shadeName}
                        <button
                          type="button"
                          onClick={() => handleRemoveComboShade(sh.id)}
                          className="hover:text-red-600 transition-colors ml-0.5"
                          title="Remove shade"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* GENERATE COMBINATIONS ACTION ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/40">
              <div>
                <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <FaBolt className="text-[#9B4F5E] dark:text-pink-400" />
                  Generate Matrix ({comboSizes.length} sizes × {comboShades.length} shades = {comboSizes.length * comboShades.length} combinations)
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Clicking Generate builds combination rows. Re-generating retains any already-entered prices and images.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateCombinations}
                disabled={comboSizes.length === 0 || comboShades.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  comboSizes.length === 0 || comboShades.length === 0
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    : "bg-[#9B4F5E] text-white hover:bg-[#85414f] shadow-sm hover:shadow"
                }`}
              >
                <FaBolt className="w-3.5 h-3.5" />
                Generate Combination
              </button>
            </div>

            {/* COMBINATIONS TABLE & BULK TOOLBAR */}
            {combinations.length > 0 && (
              <div className="space-y-3">
                {/* Bulk Price Application Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Bulk Fill Prices
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={bulkRegularPrice}
                          onChange={(e) => setBulkRegularPrice(e.target.value)}
                          placeholder="Regular Price"
                          className="w-28 rounded-xl border border-gray-200 dark:border-gray-700 pl-6 pr-2.5 py-1 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyBulkRegularToCombinations}
                        className="px-2.5 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-semibold text-gray-800 dark:text-gray-200"
                      >
                        Apply
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={bulkSalePrice}
                          onChange={(e) => setBulkSalePrice(e.target.value)}
                          placeholder="Discount Price"
                          className="w-28 rounded-xl border border-gray-200 dark:border-gray-700 pl-6 pr-2.5 py-1 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyBulkSaleToCombinations}
                        className="px-2.5 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-semibold text-gray-800 dark:text-gray-200"
                      >
                        Apply
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={bulkCostPrice}
                          onChange={(e) => setBulkCostPrice(e.target.value)}
                          placeholder="Cost Price"
                          className="w-28 rounded-xl border border-gray-200 dark:border-gray-700 pl-6 pr-2.5 py-1 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyBulkCostToCombinations}
                        className="px-2.5 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-semibold text-gray-800 dark:text-gray-200"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Combinations Matrix Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/90 dark:bg-gray-800/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 w-28 text-center">Default (PDP)</th>
                        <th className="py-3 px-3 min-w-[100px]">Size</th>
                        <th className="py-3 px-3 min-w-[160px]">Shade</th>
                        <th className="py-3 px-3 min-w-[150px]">Images</th>
                        <th className="py-3 px-3 min-w-[130px]">Regular Price (৳) <span className="text-red-500">*</span></th>
                        <th className="py-3 px-3 min-w-[140px]">Discount Price (৳)</th>
                        <th className="py-3 px-3 min-w-[140px]">Cost Price (৳)</th>
                        <th className="py-3 px-3 w-12 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {combinations.map((combo, idx) => {
                        const marginInfo = getMarginInfo(combo.regularPrice, combo.costPrice);
                        const regVal = parseFloat(combo.regularPrice);
                        const saleVal = parseFloat(combo.salePrice);
                        const hasValidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal < regVal;
                        const discountPercent = hasValidDiscount ? Math.round(((regVal - saleVal) / regVal) * 100) : null;
                        const isInvalidDiscount = !isNaN(regVal) && regVal > 0 && !isNaN(saleVal) && saleVal > 0 && saleVal >= regVal;

                        return (
                          <tr key={combo.id || idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${combo.isDefault ? "bg-pink-50/20 dark:bg-pink-950/10" : ""}`}>
                            <td className="py-3 px-3 text-center text-xs font-semibold text-gray-400">
                              {idx + 1}
                            </td>

                            {/* Default Radio */}
                            <td className="py-3 px-3 text-center">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="default_combo_selection"
                                  checked={Boolean(combo.isDefault)}
                                  onChange={() => handleSetDefaultCombination(idx)}
                                  className="h-4 w-4 text-[#9B4F5E] border-gray-300 focus:ring-[#9B4F5E] cursor-pointer"
                                />
                                {combo.isDefault && (
                                  <span className="text-[10px] font-bold text-[#9B4F5E] dark:text-pink-400 bg-pink-100 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-md">
                                    ⭐ Default
                                  </span>
                                )}
                              </label>
                            </td>

                            {/* Size (Read-only) */}
                            <td className="py-3 px-3">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-bold text-gray-800 dark:text-gray-200 text-xs">
                                {combo.sizeValue}{combo.sizeUnit}
                              </span>
                            </td>

                            {/* Shade Color + Name (Read-only) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: combo.shadeColor || "#E8A0B4" }}
                                />
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {combo.shadeName}
                                </span>
                              </div>
                            </td>

                            {/* Images */}
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(combo.imageUrls || []).map((url, uIdx) => (
                                  <div
                                    key={uIdx}
                                    className="relative group w-9 h-9 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0"
                                  >
                                    <img src={url} alt="Variant" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImageFromRow("size_shade", idx, url)}
                                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Remove image"
                                    >
                                      <FaTimes className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setImageModalTarget({ type: "size_shade", index: idx })}
                                  className="h-9 px-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#9B4F5E] dark:hover:border-pink-400 text-gray-500 hover:text-[#9B4F5E] dark:hover:text-pink-400 flex items-center gap-1 text-[11px] font-semibold transition-colors shrink-0"
                                >
                                  <FaImages className="w-3 h-3" />
                                  <span>{(combo.imageUrls || []).length > 0 ? `${combo.imageUrls.length} selected` : "+ Photos"}</span>
                                </button>
                              </div>
                            </td>

                            {/* Regular Price (Editable) */}
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                  ৳
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={combo.regularPrice || ""}
                                  onChange={(e) => handleCombinationChange(idx, "regularPrice", e.target.value)}
                                  placeholder="0.00"
                                  className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                    clientErrors[`combo_${idx}_regularPrice`]
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                                  }`}
                                />
                              </div>
                              {clientErrors[`combo_${idx}_regularPrice`] && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  {clientErrors[`combo_${idx}_regularPrice`]}
                                </p>
                              )}
                            </td>

                            {/* Discount / Sale Price (Editable) */}
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                  ৳
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={combo.salePrice || ""}
                                  onChange={(e) => handleCombinationChange(idx, "salePrice", e.target.value)}
                                  placeholder="0.00"
                                  className={`w-full rounded-xl border pl-6 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                                    clientErrors[`combo_${idx}_salePrice`] || isInvalidDiscount
                                      ? "border-amber-500 ring-1 ring-amber-500"
                                      : "border-gray-200 dark:border-gray-700 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                                  }`}
                                />
                              </div>
                              {hasValidDiscount && (
                                <div className="mt-1">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    {discountPercent}% OFF
                                  </span>
                                </div>
                              )}
                              {isInvalidDiscount && (
                                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                                  ⚠️ Must be &lt; regular price
                                </p>
                              )}
                              {clientErrors[`combo_${idx}_salePrice`] && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  {clientErrors[`combo_${idx}_salePrice`]}
                                </p>
                              )}
                            </td>

                            {/* Cost Price (Editable) */}
                            <td className="py-3 px-3">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                  ৳
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={combo.costPrice || ""}
                                  onChange={(e) => handleCombinationChange(idx, "costPrice", e.target.value)}
                                  placeholder="0.00"
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 pl-6 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-[#9B4F5E] dark:focus:border-pink-500"
                                />
                              </div>
                              {marginInfo && (
                                <div className="mt-1">
                                  {marginInfo.warning ? (
                                    <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                      ⚠️ Cost exceeds regular price
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                      {marginInfo.margin}% Margin
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Delete Combination */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCombinationRow(idx)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="Delete combination row"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                placeholder={name ? `${name} | Elourá Bangladesh` : "Page Title in Search Results"}
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
                https://eloura.com/products/{slug || "product-slug"}
              </p>
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {seoTitle || name || "Product Name | Elourá Bangladesh"}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                {seoDescription ||
                  shortDescription ||
                  "Buy genuine cosmetics in Bangladesh at Elourá. Authentic skincare with cash on delivery and fast express shipping nationwide."}
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
      )}      {/* ── Switch Variant Type Confirmation Modal ── */}
      {switchConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-2xl text-center max-h-[85vh] flex flex-col">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 shrink-0">
              <FaExclamationTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Change Variant Type?
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Switching variant types will clear your current variant inputs and combinations. Do you want to proceed?
              </p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2.5 shrink-0 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setSwitchConfirmModalOpen(false);
                  setPendingVariantType(null);
                }}
                className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchType}
                className="rounded-full bg-[#9B4F5E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#85414f]"
              >
                Switch & Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Variant Image Selection Modal (from Section 2) ── */}
      {imageModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-[#9B4F5E] dark:text-pink-400">
                  <FaImages className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Select Images for Variant
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose one or more photos uploaded in Section 2.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImageModalTarget(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {availableProductImages.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    No product images uploaded in Section 2 yet.
                  </p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Please upload photos under &quot;2. Product Images&quot; above first. You can then assign them to specific variants here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableProductImages.map((img, i) => {
                    let currentSelected = [];
                    if (imageModalTarget.type === "shade_only") {
                      currentSelected = shades[imageModalTarget.index]?.imageUrls || [];
                    } else if (imageModalTarget.type === "size_only") {
                      currentSelected = sizes[imageModalTarget.index]?.imageUrls || [];
                    } else if (imageModalTarget.type === "size_shade") {
                      currentSelected = combinations[imageModalTarget.index]?.imageUrls || [];
                    }
                    const isSelected = currentSelected.includes(img.url);

                    return (
                      <div
                        key={img.id || i}
                        onClick={() => handleToggleImageForTarget(img.url)}
                        className={`relative group aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#9B4F5E] ring-2 ring-[#9B4F5E]/30"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt="Product"
                          className="w-full h-full object-cover"
                        />
                        <div
                          className={`absolute inset-0 transition-opacity ${
                            isSelected
                              ? "bg-[#9B4F5E]/20"
                              : "bg-black/0 group-hover:bg-black/10"
                          }`}
                        />
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-[#9B4F5E] text-white shadow"
                              : "bg-white/80 dark:bg-gray-800/80 text-transparent border border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          <FaCheck className="w-3 h-3" />
                        </div>
                        {img.isPrimary && (
                          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 shrink-0">
              <span className="text-xs text-gray-500">
                {(() => {
                  let count = 0;
                  if (imageModalTarget.type === "shade_only") {
                    count = (shades[imageModalTarget.index]?.imageUrls || []).length;
                  } else if (imageModalTarget.type === "size_only") {
                    count = (sizes[imageModalTarget.index]?.imageUrls || []).length;
                  } else if (imageModalTarget.type === "size_shade") {
                    count = (combinations[imageModalTarget.index]?.imageUrls || []).length;
                  }
                  return `${count} image${count === 1 ? "" : "s"} selected for this variant`;
                })()}
              </span>
              <button
                type="button"
                onClick={() => setImageModalTarget(null)}
                className="rounded-full bg-[#9B4F5E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#85414f]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Combination Row Confirmation Modal ── */}
      {deleteComboConfirmIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-2xl text-center max-h-[85vh] flex flex-col">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-3 shrink-0">
              <FaTrash className="w-6 h-6" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Remove Combination?
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                This combination has entered prices or images. Are you sure you want to delete this row?
              </p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2.5 shrink-0 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setDeleteComboConfirmIndex(null)}
                className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCombination}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Remove Row
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
