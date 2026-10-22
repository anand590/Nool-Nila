import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrderRequestSchema, OrderRequestInput, INDIAN_STATES, formatInr } from '@nool-and-nila/shared';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { ShieldCheck, Truck, Lock, ArrowRight, MessageCircle } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderRequestInput>({
    resolver: zodResolver(OrderRequestSchema),
    defaultValues: {
      customerName: user?.name || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || '',
      state: 'Tamil Nadu',
      streetAddress: '',
      city: '',
      postalCode: '',
      landmark: '',
      customerNotes: '',
    },
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold">Your Bag is Empty</h1>
        <p className="text-xs text-gray-500">Please add sarees to your bag before checking out.</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded"
        >
          Explore Sarees
        </button>
      </div>
    );
  }

  const onSubmit = async (data: OrderRequestInput) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetchApi<{ order: any; whatsapp: any }>('/orders/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (res.success && res.data?.order) {
        await refreshCart();
        navigate(`/orders/confirmation/${res.data.order.id}`, {
          state: { order: res.data.order, whatsapp: res.data.whatsapp },
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit order request. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 pb-4 border-b border-brand-beige">
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">
          Order Request & Delivery Details
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Step 1: Provide shipping details • Step 2: Boutique verification & manual confirmation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Shipping & Customer Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Important Workflow Notice Banner */}
          <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg space-y-1">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>No Online Payment Required Now</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-normal">
              This is a manual order request. Our boutique team personally checks the loom inventory, verifies
              weft finishing, and contacts you via WhatsApp or Phone with offline payment instructions (NEFT/UPI/Bank Transfer).
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white p-6 sm:p-8 rounded-xl border border-brand-beige shadow-sm">
            <h2 className="font-serif text-lg font-bold text-brand-charcoal pb-2 border-b border-gray-100">
              Customer & Delivery Address
            </h2>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                {...register('customerName')}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
              />
              {errors.customerName && (
                <p className="text-[11px] text-red-600 mt-1">{errors.customerName.message}</p>
              )}
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number (10 digits) *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-gray-100 border border-r-0 border-gray-300 rounded-l text-gray-600">
                    +91
                  </span>
                  <input
                    type="tel"
                    {...register('customerPhone')}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-r text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.customerPhone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  {...register('customerEmail')}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
                />
                {errors.customerEmail && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.customerEmail.message}</p>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Street Address, Flat / House Number *
              </label>
              <textarea
                rows={2}
                {...register('streetAddress')}
                placeholder="e.g. 42, 3rd Avenue, Besant Nagar"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
              />
              {errors.streetAddress && (
                <p className="text-[11px] text-red-600 mt-1">{errors.streetAddress.message}</p>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Landmark (Optional)
              </label>
              <input
                type="text"
                {...register('landmark')}
                placeholder="e.g. Near Temple or Park"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
              />
            </div>

            {/* City, State, PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  {...register('city')}
                  placeholder="e.g. Chennai"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
                />
                {errors.city && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  State *
                </label>
                <select
                  {...register('state')}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-brand-maroon focus:outline-none"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  PIN Code (6 digits) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  {...register('postalCode')}
                  placeholder="e.g. 600090"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
                />
                {errors.postalCode && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.postalCode.message}</p>
                )}
              </div>
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Order Notes / Gift Message (Optional)
              </label>
              <textarea
                rows={2}
                {...register('customerNotes')}
                placeholder="e.g. Please confirm saree fall and pico finishing, or add a birthday gift note."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-sm font-semibold tracking-wide shadow-luxury flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Placing Order Request...' : 'Submit Order Request (No Payment Now)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Right: Order Summary Snapshot */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-brand-beige shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-brand-charcoal border-b border-brand-beige pb-3">
              Order Items ({cart.itemCount})
            </h3>

            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
              {cart.items.map((item) => {
                const img = item.product.images[0]?.url || '/images/sarees/default.jpg';
                const unitPrice = item.variant?.pricePaise ?? item.product.pricePaise;

                return (
                  <div key={item.id} className="py-3 flex space-x-3 text-xs">
                    <img src={img} alt={item.product.name} className="w-14 h-16 object-cover rounded bg-brand-ivory border" />
                    <div className="flex-1">
                      <p className="font-semibold text-brand-charcoal line-clamp-1">{item.product.name}</p>
                      <p className="text-[11px] text-gray-400">SKU: {item.product.sku}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-500">Qty: {item.quantity}</span>
                        <span className="font-bold text-brand-charcoal">{formatInr(unitPrice * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-brand-beige space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
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
              <div className="flex justify-between text-sm font-bold text-brand-charcoal pt-2 border-t border-gray-200">
                <span>Total Amount Due on Confirmation</span>
                <span className="text-brand-maroon">
                  {formatInr(cart.subtotalPaise + cart.shippingEstimatePaise)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-brand-ivory rounded-xl border border-brand-beige text-xs text-gray-600 space-y-2">
            <div className="flex items-center space-x-2 text-brand-maroon font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Next Steps After Request</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>We check handloom weaving inventory.</li>
              <li>A stylist confirms order details with you on WhatsApp.</li>
              <li>You pay securely via direct bank transfer or UPI.</li>
              <li>Saree is dispatched with live tracking details.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
