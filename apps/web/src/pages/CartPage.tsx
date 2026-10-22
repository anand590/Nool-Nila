import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatInr, STORE_DEFAULTS } from '@nool-and-nila/shared';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, MessageCircle, Truck } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, getWhatsAppEnquiryUrl } = useCart();
  const navigate = useNavigate();

  const handleWhatsAppEnquiry = async () => {
    try {
      const enquiry = await getWhatsAppEnquiryUrl();
      if (enquiry.url) {
        window.open(enquiry.url, '_blank');
      } else {
        alert('WhatsApp number not configured.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
          <ShoppingBag className="w-10 h-10 opacity-70" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Your Shopping Bag is Empty</h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
          Explore our collection of pure silk and handloom sarees woven by master artisans.
        </p>
        <div className="pt-2">
          <Link
            to="/shop"
            className="inline-block px-8 py-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold tracking-wide transition-colors"
          >
            Explore Sarees
          </Link>
        </div>
      </div>
    );
  }

  const freeThreshold = STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE;
  const currentSubtotal = cart.subtotalPaise;
  const freeShippingProgress = Math.min(100, Math.round((currentSubtotal / freeThreshold) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-2">
        Shopping Bag ({cart.itemCount})
      </h1>
      <p className="text-xs text-gray-500 mb-8">
        Review your selected handloom sarees before proceeding with your order request.
      </p>

      {/* Free Shipping Alert */}
      <div className="bg-brand-ivory p-4 rounded-xl border border-brand-beige mb-8">
        <div className="flex items-center space-x-2 text-xs font-medium text-brand-charcoal">
          <Truck className="w-4 h-4 text-brand-maroon" />
          {cart.freeShippingQualified ? (
            <span className="text-emerald-700 font-semibold">
              You qualify for Free Insured Pan-India Express Delivery!
            </span>
          ) : (
            <span>
              Add <strong className="text-brand-maroon">{formatInr(cart.freeShippingRemainingPaise)}</strong> more to qualify for Free Insured Pan-India Delivery.
            </span>
          )}
        </div>
        <div className="w-full bg-brand-beige-dark h-1.5 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-brand-maroon h-full transition-all duration-500 rounded-full"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Items List */}
        <div className="lg:col-span-8 divide-y divide-brand-beige bg-white rounded-xl border border-brand-beige p-6">
          {cart.items.map((item) => {
            const mainImage = item.product.images[0]?.url || '/images/sarees/default.jpg';
            const unitPrice = item.variant?.pricePaise ?? item.product.pricePaise;

            return (
              <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5">
                <img
                  src={mainImage}
                  alt={item.product.name}
                  className="w-24 h-32 object-cover rounded-lg bg-brand-ivory border border-brand-beige"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-serif text-base font-semibold text-brand-charcoal hover:text-brand-maroon transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      SKU: {item.product.sku} • Fabric: {item.product.fabric}
                    </p>
                    <p className="text-sm font-bold text-brand-charcoal mt-1">
                      {formatInr(unitPrice)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-gray-200 rounded">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeFromCart(item.id);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-100 text-gray-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 text-xs font-bold text-brand-charcoal">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.quantity < item.product.stockQuantity) {
                            updateQuantity(item.id, item.quantity + 1);
                          } else {
                            alert(`Only ${item.product.stockQuantity} piece(s) available.`);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-100 text-gray-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-brand-maroon">
                      Total: {formatInr(unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-brand-beige p-6 space-y-4 shadow-sm">
            <h3 className="font-serif font-bold text-base text-brand-charcoal border-b border-brand-beige pb-3">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.itemCount} items)</span>
                <span className="font-bold text-brand-charcoal">{formatInr(cart.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Pan-India Shipping</span>
                <span className="font-bold text-brand-charcoal">
                  {cart.shippingEstimatePaise === 0 ? (
                    <span className="text-emerald-700 font-semibold">FREE</span>
                  ) : (
                    formatInr(cart.shippingEstimatePaise)
                  )}
                </span>
              </div>
              <div className="pt-3 border-t border-brand-beige flex justify-between text-base font-bold text-brand-charcoal">
                <span>Estimated Total</span>
                <span className="text-brand-maroon">
                  {formatInr(cart.subtotalPaise + cart.shippingEstimatePaise)}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              {/* Pathway B Button */}
              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-3.5 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-sm font-semibold shadow-luxury flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Proceed to Order Request</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Pathway A Button */}
              <button
                onClick={handleWhatsAppEnquiry}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>Enquire & Reserve on WhatsApp</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-500 leading-relaxed pt-2">
              <p className="font-medium text-brand-charcoal mb-1">Manual Order Workflow Notice:</p>
              No online card or UPI payment is collected at this stage. Once you submit your order request, our team confirms loom availability and directly shares payment instructions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
