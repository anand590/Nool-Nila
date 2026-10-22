import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/product/ProductCard';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { items, isLoading } = useWishlist();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
          <Heart className="w-8 h-8 opacity-60" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Your Wishlist is Empty</h1>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Save your favorite pure silks and handlooms here to revisit anytime or discuss with our stylist.
        </p>
        <div className="pt-2">
          <Link
            to="/shop"
            className="inline-block px-6 py-2.5 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold tracking-wide transition-colors"
          >
            Explore Saree Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">
          My Saved Sarees ({items.length})
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Heirloom weaves and handlooms saved for your upcoming celebrations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <ProductCard key={item.id} product={item.product} />
        ))}
      </div>
    </div>
  );
};
