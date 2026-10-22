import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Clock, Package, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatInr, buildOrderEnquiryMessage, buildWhatsAppLink, STORE_DEFAULTS } from '@nool-and-nila/shared';
import { useStoreSettings } from '../hooks/useStoreSettings';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { whatsappNumber } = useStoreSettings();
  const order = location.state?.order;

  const orderNumber = order?.orderNumber || `NN-REQ-${id?.substring(0, 6).toUpperCase()}`;
  const customerName = order?.customerName || 'Valued Patron';

  const whatsappMessage = buildOrderEnquiryMessage(orderNumber, customerName);
  const whatsappUrl = location.state?.whatsAppUrl || buildWhatsAppLink(whatsappNumber, whatsappMessage);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      {/* Success Card */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-brand-beige shadow-sm text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-full">
          Status: Pending Boutique Confirmation
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
          Order Request Received
        </h1>

        <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
          Thank you, <strong className="text-brand-charcoal">{customerName}</strong>. Your order request reference is{' '}
          <strong className="text-brand-maroon font-mono text-base">{orderNumber}</strong>.
        </p>

        {/* WhatsApp Fast Confirmation CTA */}
        <div className="pt-4 max-w-md mx-auto space-y-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center space-x-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-200" />
            <span>Confirm Faster on WhatsApp</span>
          </a>
          <p className="text-[11px] text-gray-400">
            Click to send your reference number to our team on WhatsApp for priority verification.
          </p>
        </div>
      </div>

      {/* Next Steps Timeline */}
      <div className="bg-brand-ivory p-6 sm:p-8 rounded-xl border border-brand-beige space-y-4">
        <h3 className="font-serif font-bold text-base text-brand-charcoal flex items-center space-x-2">
          <Clock className="w-4 h-4 text-brand-maroon" />
          <span>What happens next?</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-white rounded-lg border border-brand-beige space-y-1">
            <span className="font-bold text-brand-maroon">1. Weave Inspection</span>
            <p className="text-gray-500">Our loom master verifies silk mark authenticity and fall/pico finish.</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-brand-beige space-y-1">
            <span className="font-bold text-brand-maroon">2. WhatsApp Message</span>
            <p className="text-gray-500">You will receive confirmation and offline payment instructions (UPI/NEFT).</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-brand-beige space-y-1">
            <span className="font-bold text-brand-maroon">3. Luxury Packaging</span>
            <p className="text-gray-500">The saree is wrapped in handloom muslin cloth and signature gift box.</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-brand-beige space-y-1">
            <span className="font-bold text-brand-maroon">4. Insured Delivery</span>
            <p className="text-gray-500">Dispatched via premium express courier with live tracking number.</p>
          </div>
        </div>
      </div>

      {/* Order Summary Snapshot */}
      {order && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-brand-beige space-y-4">
          <h3 className="font-serif font-bold text-base text-brand-charcoal pb-2 border-b border-gray-100 flex items-center space-x-2">
            <Package className="w-4 h-4 text-brand-maroon" />
            <span>Requested Sarees</span>
          </h3>

          <div className="divide-y divide-gray-100">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                <div className="flex items-center space-x-3">
                  <img src={item.imageUrl} alt={item.productName} className="w-12 h-14 object-cover rounded border" />
                  <div>
                    <p className="font-semibold text-brand-charcoal">{item.productName}</p>
                    <p className="text-[11px] text-gray-400">SKU: {item.productSku} • Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-brand-charcoal">{formatInr(item.totalPaise)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-brand-beige flex justify-between text-sm font-bold text-brand-charcoal">
            <span>Estimated Total Due:</span>
            <span className="text-brand-maroon">{formatInr(order.totalPaise)}</span>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="text-center pt-4">
        <Link
          to="/shop"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-brand-maroon hover:underline"
        >
          <span>Continue Browsing Sarees</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
