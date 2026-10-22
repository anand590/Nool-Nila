import React, { createContext, useContext, useState, useEffect } from 'react';
import { WishlistItemDto } from '@nool-and-nila/shared';
import { fetchApi } from '../lib/api';

interface WishlistContextType {
  items: WishlistItemDto[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<WishlistItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWishlist = async () => {
    try {
      const res = await fetchApi<WishlistItemDto[]>('/wishlist');
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, []);

  const isInWishlist = (productId: string) => {
    return items.some((item) => item.productId === productId);
  };

  const toggleWishlist = async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      const res = await fetchApi<WishlistItemDto[]>('/wishlist/items', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (res.success && res.data) {
        setItems(res.data);
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    const res = await fetchApi<WishlistItemDto[]>(`/wishlist/items/${productId}`, {
      method: 'DELETE',
    });
    if (res.success && res.data) {
      setItems(res.data);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        isLoading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
