import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartDto } from '@nool-and-nila/shared';
import { fetchApi } from '../lib/api';

interface CartContextType {
  cart: CartDto | null;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getWhatsAppEnquiryUrl: () => Promise<{ url: string | null; message: string; isConfigured: boolean }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const refreshCart = async () => {
    try {
      const res = await fetchApi<CartDto>('/cart');
      if (res.success && res.data) {
        setCart(res.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = async (productId: string, quantity = 1, variantId: string | null = null) => {
    const res = await fetchApi<CartDto>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, variantId }),
    });
    if (res.success && res.data) {
      setCart(res.data);
      setIsCartOpen(true); // Automatically open cart drawer for immediate luxury feedback
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const res = await fetchApi<CartDto>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    if (res.success && res.data) {
      setCart(res.data);
    }
  };

  const removeFromCart = async (itemId: string) => {
    const res = await fetchApi<CartDto>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
    if (res.success && res.data) {
      setCart(res.data);
    }
  };

  const clearCart = async () => {
    const res = await fetchApi<CartDto>('/cart', {
      method: 'DELETE',
    });
    if (res.success && res.data) {
      setCart(res.data);
    }
  };

  const getWhatsAppEnquiryUrl = async () => {
    const res = await fetchApi<{ url: string | null; message: string; isConfigured: boolean }>('/cart/whatsapp-enquiry');
    return res.data;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        getWhatsAppEnquiryUrl,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
