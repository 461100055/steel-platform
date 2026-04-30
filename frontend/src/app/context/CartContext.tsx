import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product } from '../lib/api';
import { API_BASE_URL } from '../lib/api';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

function normalizeImageUrl(value: unknown) {
  return String(value || '').trim();
}

function buildProductImageUrl(value: unknown) {
  const image = normalizeImageUrl(value);

  if (!image) return '';

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('/media/')) {
    return `${BACKEND_BASE_URL}${image}`;
  }

  if (image.startsWith('media/')) {
    return `${BACKEND_BASE_URL}/${image}`;
  }

  if (image.startsWith('/products/')) {
    return `${BACKEND_BASE_URL}/media${image}`;
  }

  if (image.startsWith('products/')) {
    return `${BACKEND_BASE_URL}/media/${image}`;
  }

  if (image.startsWith('/suppliers/')) {
    return `${BACKEND_BASE_URL}/media${image}`;
  }

  if (image.startsWith('suppliers/')) {
    return `${BACKEND_BASE_URL}/media/${image}`;
  }

  return image;
}

function uniqueImages(images: string[]) {
  return Array.from(
    new Set(
      images
        .map((image) => buildProductImageUrl(image))
        .filter(Boolean)
    )
  );
}

function normalizeProductForCart(product: Product): Product {
  const imageUrl = normalizeImageUrl((product as any).image_url);
  const mainImage = normalizeImageUrl(product.image);

  const apiImages = Array.isArray(product.images)
    ? product.images.map((image) => normalizeImageUrl(image))
    : [];

  const specifications =
    product.specifications &&
    typeof product.specifications === 'object' &&
    !Array.isArray(product.specifications)
      ? product.specifications
      : {};

  const specImages = Array.isArray((specifications as Record<string, unknown>).product_images)
    ? ((specifications as Record<string, unknown>).product_images as unknown[]).map((image) =>
        normalizeImageUrl(image)
      )
    : [];

  const images = uniqueImages([imageUrl, mainImage, ...apiImages, ...specImages]);
  const finalMainImage = images[0] || '';

  return {
    ...product,
    image: finalMainImage,
    image_url: finalMainImage,
    images,
  } as Product;
}

function normalizeCartItems(items: CartItem[]): CartItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.product && item.product.id)
    .map((item) => ({
      ...item,
      product: normalizeProductForCart(item.product),
      quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1,
    }));
}

function getProductPrice(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('steel_platform_cart');
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      return normalizeCartItems(parsedCart);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('steel_platform_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number) => {
    const normalizedProduct = normalizeProductForCart(product);
    const normalizedQuantity = Number.isFinite(Number(quantity)) && Number(quantity) > 0
      ? Number(quantity)
      : 1;

    setItems((prev) => {
      const existing = prev.find(
        (item) => String(item.product.id) === String(normalizedProduct.id)
      );

      if (existing) {
        return prev.map((item) =>
          String(item.product.id) === String(normalizedProduct.id)
            ? {
                ...item,
                product: normalizeProductForCart({
                  ...item.product,
                  ...normalizedProduct,
                }),
                quantity: item.quantity + normalizedQuantity,
              }
            : item
        );
      }

      return [...prev, { product: normalizedProduct, quantity: normalizedQuantity }];
    });
  };

  const removeFromCart = (productId: string | number) => {
    setItems((prev) =>
      prev.filter((item) => String(item.product.id) !== String(productId))
    );
  };

  const updateQuantity = (productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        String(item.product.id) === String(productId)
          ? {
              ...item,
              product: normalizeProductForCart(item.product),
              quantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce(
    (sum, item) => sum + getProductPrice(item.product) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}