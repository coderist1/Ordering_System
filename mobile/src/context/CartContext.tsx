import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

export type CartLine = Product & { quantity: number };

interface CartContextType {
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product) => void;
  updateQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'mobile_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((item) => item && item.id != null && item.price != null));
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (cart.length === 0) {
      AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)).catch(() => {});
    }
  }, [cart, hydrated]);

  const addToCart = (product: Product) => {
    const id = Number(product.id);
    setCart((prev) => {
      const existing = prev.find((item) => Number(item.id) === id);
      if (existing) {
        return prev.map((item) =>
          Number(item.id) === id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, id, quantity: 1 }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    const numericId = Number(id);
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => Number(item.id) !== numericId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (Number(item.id) === numericId ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (id: number) => updateQty(id, 0);

  const clearCart = () => setCart([]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{ cart, cartCount, cartTotal, addToCart, updateQty, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
