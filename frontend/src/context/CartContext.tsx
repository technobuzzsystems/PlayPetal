"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

export interface ProductItem {
  id: string | number;
  name: string;
  price: number;
  originalPrice?: number;
  basePrice?: number;
  salePrice?: number | null;
  img?: string;
  image?: string;
  category?: string;
  brand?: string;
  ageGroup?: string;
  vendorId?: string;
  vendorName?: string;
  vendorRating?: number;
  sku?: string;
}

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  originalPrice?: number;
  img: string;
  category?: string;
  brand?: string;
  ageGroup?: string;
  vendorId?: string;
  vendorName?: string;
  sku?: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  wishlist: Array<string | number>;
  addToCart: (product: ProductItem) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, delta: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string | number) => void;
  isInWishlist: (id: string | number) => boolean;
  cartCount: number;
  wishlistCount: number;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  grandTotal: number;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  isMounted: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getCartStorageKey = (userId?: string | null) => {
  return userId ? `playpetal_cart_user_${userId}` : "playpetal_cart_guest";
};

const getWishlistStorageKey = (userId?: string | null) => {
  return userId ? `playpetal_wishlist_user_${userId}` : "playpetal_wishlist_guest";
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Array<string | number>>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // Load / Merge cart & wishlist on mount or user change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    // First mount initialization
    if (prevUserId === undefined) {
      try {
        const activeCartKey = getCartStorageKey(currentUserId);
        const activeWishlistKey = getWishlistStorageKey(currentUserId);

        const savedCart = localStorage.getItem(activeCartKey) || localStorage.getItem("playpetal_cart");
        const savedWishlist = localStorage.getItem(activeWishlistKey) || localStorage.getItem("playpetal_wishlist");

        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) setCart(parsed);
        }
        if (savedWishlist) {
          const parsed = JSON.parse(savedWishlist);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .map((item) => {
                if (item === null || item === undefined) return null;
                if (typeof item === "object") return String(item.id ?? item._id ?? "");
                const str = String(item);
                return str === "[object Object]" || str === "undefined" ? null : str;
              })
              .filter(Boolean) as string[];
            setWishlist(Array.from(new Set(cleaned)));
          }
        }
      } catch (e) {
        console.error("Error reading initial storage:", e);
      } finally {
        setIsMounted(true);
        prevUserIdRef.current = currentUserId;
      }
      return;
    }

    // User session change (login or logout)
    if (prevUserId !== currentUserId) {
      try {
        // Case A: User logged out (prevUserId existed -> currentUserId is null)
        if (prevUserId && !currentUserId) {
          // Save prev user's cart
          localStorage.setItem(getCartStorageKey(prevUserId), JSON.stringify(cart));
          localStorage.setItem(getWishlistStorageKey(prevUserId), JSON.stringify(wishlist));

          // Load guest cart
          const guestCartRaw = localStorage.getItem(getCartStorageKey(null));
          const guestWishlistRaw = localStorage.getItem(getWishlistStorageKey(null));

          setCart(guestCartRaw ? JSON.parse(guestCartRaw) : []);
          setWishlist(guestWishlistRaw ? JSON.parse(guestWishlistRaw) : []);
        }
        // Case B: User logged in from guest (prevUserId was null -> currentUserId exists)
        else if (!prevUserId && currentUserId) {
          const guestCartRaw = localStorage.getItem(getCartStorageKey(null));
          const userCartRaw = localStorage.getItem(getCartStorageKey(currentUserId));

          const guestItems: CartItem[] = guestCartRaw ? JSON.parse(guestCartRaw) : [];
          const userItems: CartItem[] = userCartRaw ? JSON.parse(userCartRaw) : [];

          // Merge guest items into user items deterministically
          const mergedCart = [...userItems];
          for (const gItem of guestItems) {
            const existing = mergedCart.find((it) => String(it.id) === String(gItem.id));
            if (existing) {
              existing.quantity += gItem.quantity;
            } else {
              mergedCart.push(gItem);
            }
          }

          setCart(mergedCart);
          localStorage.setItem(getCartStorageKey(currentUserId), JSON.stringify(mergedCart));
          localStorage.removeItem(getCartStorageKey(null)); // Clear guest cart after merge

          const userWishlistRaw = localStorage.getItem(getWishlistStorageKey(currentUserId));
          setWishlist(userWishlistRaw ? JSON.parse(userWishlistRaw) : []);
        }
        // Case C: Switched directly between two authenticated users (prevUserId -> currentUserId)
        else if (prevUserId && currentUserId && prevUserId !== currentUserId) {
          localStorage.setItem(getCartStorageKey(prevUserId), JSON.stringify(cart));
          localStorage.setItem(getWishlistStorageKey(prevUserId), JSON.stringify(wishlist));

          const newUserCartRaw = localStorage.getItem(getCartStorageKey(currentUserId));
          const newUserWishlistRaw = localStorage.getItem(getWishlistStorageKey(currentUserId));

          setCart(newUserCartRaw ? JSON.parse(newUserCartRaw) : []);
          setWishlist(newUserWishlistRaw ? JSON.parse(newUserWishlistRaw) : []);
        }
      } catch (err) {
        console.error("Error managing cart user transition:", err);
      } finally {
        prevUserIdRef.current = currentUserId;
      }
    }
  }, [user]);

  // Persist current cart to active storage key on change
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const activeKey = getCartStorageKey(user?.id || null);
      localStorage.setItem(activeKey, JSON.stringify(cart));
    }
  }, [cart, user, isMounted]);

  // Persist current wishlist to active storage key on change
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const activeKey = getWishlistStorageKey(user?.id || null);
      localStorage.setItem(activeKey, JSON.stringify(wishlist));
    }
  }, [wishlist, user, isMounted]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product: ProductItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return prevCart.map((item) =>
          String(item.id) === String(product.id) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice || product.basePrice,
        img: product.img || product.image || "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80",
        category: typeof product.category === "string" ? product.category : undefined,
        brand: product.brand,
        ageGroup: product.ageGroup,
        vendorId: product.vendorId || "vendor-1",
        vendorName: product.vendorName || "ABC Toys Wonderland",
        sku: product.sku || `SKU-${product.id}`,
        quantity: 1,
      };
      return [...prevCart, newItem];
    });

    showToast(`Added "${product.name}" to cart! 🛍️`);
  };

  const removeFromCart = (id: string | number) => {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const updateQuantity = (id: string | number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (String(item.id) === String(id)) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    if (typeof window !== "undefined") {
      const activeKey = getCartStorageKey(user?.id || null);
      localStorage.removeItem(activeKey);
      localStorage.removeItem("playpetal_cart");
      localStorage.removeItem("toyjoy_cart");
    }
  };

  const getCleanWishlistId = (item: any): string => {
    if (item === null || item === undefined) return "";
    if (typeof item === "object") {
      return String(item.id ?? item._id ?? "");
    }
    const str = String(item);
    return str === "[object Object]" || str === "undefined" ? "" : str;
  };

  const toggleWishlist = (id: string | number | any) => {
    const targetId = getCleanWishlistId(id);
    if (!targetId) return;

    setWishlist((prev) => {
      const exists = prev.some((item) => getCleanWishlistId(item) === targetId);
      if (exists) {
        showToast("Removed item from Wishlist");
        return prev.filter((item) => getCleanWishlistId(item) !== targetId);
      } else {
        showToast("Added item to Wishlist ❤️");
        return [...prev.filter((item) => getCleanWishlistId(item) !== targetId), targetId];
      }
    });
  };

  const isInWishlist = (id: string | number | any) => {
    const targetId = getCleanWishlistId(id);
    if (!targetId) return false;
    return wishlist.some((item) => getCleanWishlistId(item) === targetId);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlist.length;
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 999 || subtotal === 0 ? 0 : 99;
  const discountAmount = subtotal > 2000 ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = subtotal - discountAmount + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        cartCount,
        wishlistCount,
        subtotal,
        deliveryFee,
        discountAmount,
        grandTotal,
        toastMessage,
        setToastMessage,
        isMounted,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

