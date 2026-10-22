import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, MessageCircle } from 'lucide-react';
import { ProductDto, formatInr, buildProductEnquiryMessage, buildWhatsAppLink, STORE_DEFAULTS } from '@nool-and-nila/shared';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useStoreSettings } from '../../hooks/useStoreSettings';

interface ProductCardProps {
  product: ProductDto;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { whatsappNumber } = useStoreSettings();

  const isFavorited = isInWishlist(product.id);
  const mainImage = product.images[0]?.url || '/images/sarees/default.jpg';
  const hasSavings = product.mrpPaise && product.mrpPaise > product.pricePaise;

  const handleWhatsAppEnquiry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const message = buildProductEnquiryMessage({
      name: product.name,
      sku: product.sku,
      productUrl: `${window.location.origin}/products/${product.slug}`,
    });
    const link = buildWhatsAppLink(whatsappNumber, message);
    window.open(link, '_blank');
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  return (
    <div className="group flex flex-col bg-white rounded-lg overflow-hidden border border-brand-beige transition-all duration-300 hover:shadow-luxury hover:border-brand-gold/40">
      {/* Image Container with Badges */}
      <Link to={`/products/${product.slug}`} className="relative aspect-[3/4] overflow-hidden bg-brand-ivory">
        <img
          src={mainImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />

        {/* Wishlist Heart */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
            isFavorited
              ? 'bg-brand-maroon text-white shadow-sm'
              : 'bg-white/80 text-gray-600 hover:text-brand-maroon hover:bg-white'
          }`}
          aria-label="Save to wishlist"
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1">
          {product.isNewArrival && (
            <span className="px-2 py-0.5 bg-brand-maroon text-white text-[10px] font-bold uppercase tracking-wider rounded">
              New
            </span>
          )}
          {product.isFeatured && (
            <span className="px-2 py-0.5 bg-brand-gold text-brand-charcoal text-[10px] font-bold uppercase tracking-wider rounded">
              Featured
            </span>
          )}
          {product.stockQuantity <= STORE_DEFAULTS.LOW_STOCK_THRESHOLD && product.stockQuantity > 0 && (
            <span className="px-2 py-0.5 bg-amber-700 text-white text-[10px] font-semibold rounded">
              Only {product.stockQuantity} left
            </span>
          )}
          {product.stockQuantity === 0 && (
            <span className="px-2 py-0.5 bg-gray-800 text-white text-[10px] font-semibold rounded">
              Made to Order
            </span>
          )}
        </div>

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
          <button
            onClick={handleQuickAdd}
            disabled={product.stockQuantity === 0}
            className="flex-1 py-2 px-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white text-xs font-semibold rounded shadow flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stockQuantity === 0 ? 'Unavailable' : 'Add to Bag'}</span>
          </button>
          <button
            onClick={handleWhatsAppEnquiry}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow transition-colors"
            title="Enquire on WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </Link>

      {/* Saree Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-brand-gold font-medium uppercase tracking-wider mb-1">
            <span>{product.fabric}</span>
            {product.color && (
              <span className="flex items-center space-x-1 text-gray-500 capitalize">
                {product.colorHex && (
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"
                    style={{ backgroundColor: product.colorHex }}
                  />
                )}
                <span>{product.color}</span>
              </span>
            )}
          </div>

          <Link to={`/products/${product.slug}`} className="block group-hover:text-brand-maroon transition-colors">
            <h3 className="font-serif text-sm font-semibold text-brand-charcoal line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          <p className="text-[11px] text-gray-400 mt-0.5">
            SKU: {product.sku}
          </p>
        </div>

        {/* Pricing */}
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold text-brand-charcoal">
              {formatInr(product.pricePaise)}
            </span>
            {hasSavings && (
              <span className="text-xs text-gray-400 line-through">
                {formatInr(product.mrpPaise!)}
              </span>
            )}
          </div>
          {hasSavings && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {Math.round(((product.mrpPaise! - product.pricePaise) / product.mrpPaise!) * 100)}% OFF
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
