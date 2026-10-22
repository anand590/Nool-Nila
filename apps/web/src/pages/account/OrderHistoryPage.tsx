import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { OrderDto, formatInr, ORDER_STATUS_LABELS, OrderStatus, buildWhatsAppLink } from '@nool-and-nila/shared';
import { Package, Clock, ChevronRight, Truck, MessageCircle } from 'lucide-react';
import { useStoreSettings } from '../../hooks/useStoreSettings';

export const OrderHistoryPage: React.FC = () => {
  const { whatsappNumber } = useStoreSettings();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await fetchApi<OrderDto[]>('/orders');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_CONFIRMATION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">
          My Order Requests
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Review the status of your manual saree requests, weaving updates, and tracking details.
        </p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-brand-beige space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
            <Package className="w-8 h-8 opacity-60" />
          </div>
          <h2 className="font-serif text-lg font-bold text-brand-charcoal">No Order Requests Yet</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            You haven't submitted any saree requests yet. Explore our handcrafted collection to get started.
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded hover:bg-brand-maroon-dark transition-colors"
          >
            Explore Sarees
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-brand-beige p-6 space-y-4 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-brand-charcoal">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Requested on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-brand-maroon">
                    {formatInr(order.totalPaise)}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {order.paymentStatus === 'NOT_APPLICABLE' ? 'Offline Payment' : order.paymentStatus}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center space-x-3">
                      <img src={item.imageUrl} alt={item.productName} className="w-12 h-14 object-cover rounded border" />
                      <div>
                        <p className="font-semibold text-brand-charcoal">{item.productName}</p>
                        <p className="text-[11px] text-gray-400">Qty: {item.quantity} • {item.fabric}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-700">{formatInr(item.totalPaise)}</span>
                  </div>
                ))}
              </div>

              {/* Tracking Info if available */}
              {order.trackingNumber && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-indigo-700" />
                  <span>
                    Dispatched via <strong>{order.trackingCarrier || 'Express Courier'}</strong>. Tracking No:{' '}
                    <strong className="font-mono">{order.trackingNumber}</strong>
                  </span>
                </div>
              )}

              {/* Shipping Address Summary */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-gray-500 gap-2">
                <span>
                  Delivery to: <strong>{order.shippingCity}, {order.shippingState} ({order.shippingPostalCode})</strong>
                </span>

                <a
                  href={buildWhatsAppLink(
                    whatsappNumber,
                    `Hello Nool & Nila! I would like to check the status of my order request ${order.orderNumber}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
