"use client";

import { createContext, useContext, useState, useCallback } from "react";
import ProductRequestModal from "@/components/modals/ProductRequestModal";

const ProductRequestContext = createContext(null);

export function ProductRequestProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState({});

  const openProductRequest = useCallback((data = {}) => {
    let resolvedProductName = data.productName || "";

    // If on a product page and no productName was explicitly passed, attempt to pre-fill from page
    if (!resolvedProductName && typeof window !== "undefined") {
      const pathname = window.location.pathname || "";
      if (pathname.startsWith("/products/")) {
        const pageH1 = document.querySelector("h1");
        if (pageH1 && pageH1.innerText) {
          resolvedProductName = pageH1.innerText.trim();
        }
      }
    }

    setInitialData({
      productName: resolvedProductName,
      variantText: data.variantText || "",
      notes: data.notes || "",
    });
    setIsOpen(true);
  }, []);

  const closeProductRequest = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ProductRequestContext.Provider
      value={{
        openProductRequest,
        closeProductRequest,
        isProductRequestOpen: isOpen,
      }}
    >
      {children}
      <ProductRequestModal
        isOpen={isOpen}
        onClose={closeProductRequest}
        initialData={initialData}
      />
    </ProductRequestContext.Provider>
  );
}

export function useProductRequest() {
  const ctx = useContext(ProductRequestContext);
  if (!ctx) {
    throw new Error("useProductRequest must be used within a ProductRequestProvider");
  }
  return ctx;
}

