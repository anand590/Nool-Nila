import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatInr, STORE_DEFAULTS } from '@nool-and-nila/shared';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, closeCart, updateQuantity, removeFromCart, getWhatsAppEnquiryUrl } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleWhatsAppEnquiry = async () => {
    try {
      const enquiry = await getWhatsAppEnquiryUrl();
      if (enquiry.url) {
        window.open(enquiry.url, '_blank');
      } else {
        alert('WhatsApp number is not configured in settings.');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to generate WhatsApp enquiry');
    }
  };

  const handleProceedToCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const freeThreshold = STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE;
  const currentSubtotal = cart?.subtotalPaise || 0;
  const freeShippingProgress = Math.min(100, Math.round((currentSubtotal / freeThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-brand-beige">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-brand-maroon" />
              <h2 className="text-lg font-serif font-bold text-brand-charcoal">
                Your Shopping Bag ({cart?.itemCount || 0})
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-gray-400 hover:text-brand-charcoal rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {cart && cart.items.length > 0 && (
            <div className="bg-brand-ivory px-6 py-3 border-b border-brand-beige-dark">
              <div className="flex items-center space-x-2 text-xs font-medium text-brand-charcoal">
                <Truck className="w-4 h-4 text-brand-maroon" />
                {cart.freeShippingQualified ? (
                  <span className="text-emerald-700 font-semibold">
                    Congratulations! You qualify for Free Pan-India Insured Delivery.
                  </span>
                ) : (
                  <span>
                    Add <strong className="text-brand-maroon">{formatInr(cart.freeShippingRemainingPaise)}</strong> more to unlock Free Insured Delivery.
                  </span>
                )}
              </div>
              <div className="w-full bg-brand-beige-dark h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-brand-maroon h-full transition-all duration-500 rounded-full"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-gray-100">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="font-serif text-lg font-bold text-brand-charcoal">
                  Your shopping bag is empty
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Explore our curated collection of authentic silk and handloom sarees woven by master artisans.
                </p>
                <button
                  onClick={() => {
                    closeCart();
                    navigate('/shop');
                  }}
                  className="inline-block px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded hover:bg-brand-maroon-dark transition-colors"
                >
                  Explore Sarees
                </button>
              </div>
            ) : (
              cart.items.map((item) => {
                const mainImage = item.product.images[0]?.url || '/images/sarees/default.jpg';
                const unitPrice = item.variant?.pricePaise ?? item.product.pricePaise;

                return (
                  <div key={item.id} className="py-4 flex space-x-4">
                    <img
                      src={mainImage}
                      alt={item.product.name}
                      className="w-20 h-24 object-cover rounded bg-brand-ivory border border-brand-beige"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-semibold text-brand-charcoal leading-snug line-clamp-1">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                            title="Remove saree"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          SKU: {item.product.sku} • {item.product.fabric}
                        </p>
                        <p className="text-sm font-semibold text-brand-maroon mt-1">
                          {formatInr(unitPrice)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantity(item.id, item.quantity - 1);
                              } else {
                                removeFromCart(item.id);
                              }
                            }}
                            className="p-1 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-medium text-brand-charcoal">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (item.quantity < item.product.stockQuantity) {
                                updateQuantity(item.id, item.quantity + 1);
                              } else {
                                alert(`Only ${item.product.stockQuantity} piece(s) available in stock.`);
                              }
                            }}
                            className="p-1 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-brand-charcoal">
                          Line Total: {formatInr(unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Checkout Actions */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-brand-beige px-6 py-5 bg-brand-ivory-light space-y-4">
              {/* Totals Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Bag Subtotal</span>
                  <span className="font-medium text-brand-charcoal">{formatInr(cart.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Pan-India Shipping</span>
                  <span className="font-medium text-brand-charcoal">
                    {cart.shippingEstimatePaise === 0 ? (
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    ) : (
                      formatInr(cart.shippingEstimatePaise)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-brand-charcoal pt-2 border-t border-gray-200">
                  <span>Estimated Total</span>
                  <span className="text-brand-maroon">
                    {formatInr(cart.subtotalPaise + cart.shippingEstimatePaise)}
                  </span>
                </div>
              </div>

              {/* Order Pathways */}
              <div className="space-y-2 pt-2">
                {/* Pathway B: Website Order Request */}
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-sm font-semibold shadow transition-colors"
                >
                  <span>Proceed to Order Request</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Pathway A: WhatsApp Direct Enquiry */}
                <button
                  onClick={handleWhatsAppEnquiry}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  <span>Enquire & Reserve via WhatsApp</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-gray-500">
                🔒 No online payment required right now. Our team reviews your order and confirms weave availability before sharing payment details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
