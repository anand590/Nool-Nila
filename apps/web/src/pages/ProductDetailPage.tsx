import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import {
  ProductDto,
  formatInr,
  buildProductEnquiryMessage,
  buildWhatsAppLink,
  STORE_DEFAULTS,
} from '@nool-and-nila/shared';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { ProductCard } from '../components/product/ProductCard';
import {
  Heart,
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { whatsappNumber } = useStoreSettings();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<string | null>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await fetchApi<{ product: ProductDto; relatedProducts: ProductDto[] }>(`/products/${slug}`);
      return res.data;
    },
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Saree Not Found</h1>
        <p className="text-xs text-gray-500">The requested saree could not be located in our collection.</p>
        <Link to="/shop" className="inline-block px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded">
          Browse All Sarees
        </Link>
      </div>
    );
  }

  const { product, relatedProducts } = data;
  const isFavorited = isInWishlist(product.id);
  const images = product.images.length > 0 ? product.images : [{ id: '1', url: '/images/sarees/default.jpg', displayOrder: 0 }];
  const currentImage = images[selectedImageIndex] || images[0];
  const hasSavings = product.mrpPaise && product.mrpPaise > product.pricePaise;

  const handleAddToCart = async () => {
    try {
      setIsAdding(true);
      await addToCart(product.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch (e: any) {
      alert(e.message || 'Failed to add item to bag');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWhatsAppEnquiry = () => {
    const message = buildProductEnquiryMessage({
      name: product.name,
      sku: product.sku,
      productUrl: window.location.href,
    });
    const link = buildWhatsAppLink(whatsappNumber, message);
    window.open(link, '_blank');
  };

  const toggleSection = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-brand-maroon">Home</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <Link to="/shop" className="hover:text-brand-maroon">Sarees</Link>
        {product.category && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <Link to={`/collections/${product.category.slug}`} className="hover:text-brand-maroon">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="font-semibold text-brand-charcoal truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Gallery Area */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails list */}
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:w-24 flex-shrink-0">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`aspect-[3/4] w-20 rounded-md overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? 'border-brand-maroon shadow-md' : 'border-brand-beige opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main Selected Image */}
          <div className="flex-1 relative aspect-[3/4] rounded-2xl overflow-hidden bg-brand-ivory border border-brand-beige shadow-sm">
            <img
              src={currentImage.url}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105 cursor-zoom-in"
            />
            {/* Wishlist Button */}
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all ${
                isFavorited
                  ? 'bg-brand-maroon text-white shadow-lg'
                  : 'bg-white/80 text-gray-600 hover:text-brand-maroon hover:bg-white shadow'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right: Product Buy Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2 border-b border-brand-beige pb-6">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-gold">
              <span>{product.fabric}</span>
              <span>•</span>
              <span>{product.weave}</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal leading-snug">
              {product.name}
            </h1>

            <p className="text-xs text-gray-500 font-mono">
              SKU: {product.sku}
            </p>

            {/* Price */}
            <div className="pt-2 flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-brand-charcoal">
                {formatInr(product.pricePaise)}
              </span>
              {hasSavings && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatInr(product.mrpPaise!)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Save {Math.round(((product.mrpPaise! - product.pricePaise) / product.mrpPaise!) * 100)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Inclusive of all taxes • Insured Pan-India shipping complimentary above ₹5,000
            </p>
          </div>

          {/* Quick Specifications Highlights */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-brand-ivory p-4 rounded-xl border border-brand-beige">
            <div>
              <span className="text-gray-500 block">Zari Type:</span>
              <strong className="text-brand-charcoal">{product.zariType}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Color / Shade:</span>
              <strong className="text-brand-charcoal">{product.color}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Saree Length:</span>
              <strong className="text-brand-charcoal">{product.lengthMeters} Meters</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Blouse Piece:</span>
              <strong className="text-brand-charcoal">{product.blouseIncluded ? 'Included' : 'Not Included'}</strong>
            </div>
          </div>

          {/* Stock Availability */}
          <div>
            {product.stockQuantity > 0 ? (
              <div className="flex items-center space-x-2 text-xs text-emerald-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>
                  Ready for Dispatch • {product.stockQuantity <= STORE_DEFAULTS.LOW_STOCK_THRESHOLD ? (
                    <strong className="text-amber-800">Only {product.stockQuantity} piece(s) available</strong>
                  ) : (
                    'In Stock'
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Made to Order • Ships within 2 weeks</span>
              </div>
            )}
          </div>

          {/* Quantity Selector & Add To Bag */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-4">
              <span className="text-xs font-semibold text-brand-charcoal">Quantity:</span>
              <div className="flex items-center border border-brand-beige-dark rounded bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-brand-charcoal">{quantity}</span>
                <button
                  onClick={() => {
                    if (quantity < product.stockQuantity) {
                      setQuantity(quantity + 1);
                    } else {
                      alert(`Only ${product.stockQuantity} items in stock.`);
                    }
                  }}
                  className="p-2 hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={product.stockQuantity === 0 || isAdding}
                className="flex-1 py-3.5 px-6 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-sm font-semibold shadow-luxury flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Shopping Bag'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleWhatsAppEnquiry}
                className="py-3.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow flex items-center justify-center space-x-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>Enquire on WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Value Badges */}
          <div className="pt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600 border-t border-brand-beige">
            <div className="flex flex-col items-center space-y-1">
              <ShieldCheck className="w-4 h-4 text-brand-maroon" />
              <span>Silk Mark Verified</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <Truck className="w-4 h-4 text-brand-maroon" />
              <span>Insured Pan-India</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <RotateCcw className="w-4 h-4 text-brand-maroon" />
              <span>7-Day Authenticity</span>
            </div>
          </div>

          {/* Accordions */}
          <div className="border-t border-brand-beige divide-y divide-brand-beige pt-2">
            {/* Description */}
            <div className="py-3">
              <button
                onClick={() => toggleSection('desc')}
                className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Product Description</span>
                {openAccordion === 'desc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordion === 'desc' && (
                <div className="mt-2 text-xs text-gray-600 leading-relaxed font-normal">
                  <p>{product.description}</p>
                  <p className="mt-2 font-medium text-brand-charcoal">
                    Occasion recommendation: {product.occasion}
                  </p>
                </div>
              )}
            </div>

            {/* Blouse & Draping */}
            <div className="py-3">
              <button
                onClick={() => toggleSection('blouse')}
                className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Blouse Fabric & Dimensions</span>
                {openAccordion === 'blouse' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordion === 'blouse' && (
                <div className="mt-2 text-xs text-gray-600 leading-relaxed space-y-1">
                  <p>{product.blouseDetails || 'Unstitched matching blouse fabric included.'}</p>
                  <p>Standard saree length: {product.lengthMeters} meters approx.</p>
                </div>
              )}
            </div>

            {/* Care instructions */}
            <div className="py-3">
              <button
                onClick={() => toggleSection('care')}
                className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-wider text-brand-charcoal text-left"
              >
                <span>Wash & Heirloom Care</span>
                {openAccordion === 'care' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordion === 'care' && (
                <div className="mt-2 text-xs text-gray-600 leading-relaxed">
                  <p>{product.washCare}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Sarees Recommendations */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="pt-12 border-t border-brand-beige space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-gold">You May Also Admire</span>
            <h2 className="font-serif text-2xl font-bold text-brand-charcoal">Related Handloom Sarees</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
