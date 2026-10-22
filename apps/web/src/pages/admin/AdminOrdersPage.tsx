import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../lib/api';
import { OrderDto, formatInr, ORDER_STATUS_LABELS, OrderStatus, ORDER_STATUS } from '@nool-and-nila/shared';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  Eye,
  X,
  MessageCircle,
} from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const selectedStatus = searchParams.get('status') || 'ALL';
  const selectedOrderId = searchParams.get('orderId');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<OrderDto | null>(null);
  const [carrier, setCarrier] = useState('Blue Dart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Fetch orders list
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', selectedStatus, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetchApi<OrderDto[]>(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  // Automatically open order modal if orderId in query
  React.useEffect(() => {
    if (selectedOrderId && orders) {
      const match = orders.find((o) => o.id === selectedOrderId);
      if (match) setActiveOrder(match);
    }
  }, [selectedOrderId, orders]);

  // Mutation to update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      carrierName,
      trackingNo,
    }: {
      id: string;
      status: OrderStatus;
      notes?: string;
      carrierName?: string;
      trackingNo?: string;
    }) => {
      return await fetchApi(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          notes,
          trackingCarrier: carrierName,
          trackingNumber: trackingNo,
        }),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      if (res.data) setActiveOrder(res.data);
      alert('Order status successfully updated!');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update order status');
    },
  });

  const handleStatusChange = (status: OrderStatus) => {
    if (!activeOrder) return;
    if (status === ORDER_STATUS.SHIPPED && !trackingNumber.trim()) {
      alert('Please enter a tracking number before marking the order as shipped.');
      return;
    }

    updateStatusMutation.mutate({
      id: activeOrder.id,
      status,
      notes: statusNotes || undefined,
      carrierName: status === ORDER_STATUS.SHIPPED ? carrier : undefined,
      trackingNo: status === ORDER_STATUS.SHIPPED ? trackingNumber : undefined,
    });
  };

  const getStatusBadge = (status: OrderStatus) => {
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

  const statusTabs = [
    { label: 'All Orders', value: 'ALL' },
    { label: 'Pending Confirmation', value: 'PENDING_CONFIRMATION' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled / Declined', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
          Order Requests Management
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Review, confirm loom availability, record tracking, and manage customer order lifecycles.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto space-x-6 text-xs font-semibold">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('status', tab.value);
              setSearchParams(next);
            }}
            className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
              selectedStatus === tab.value
                ? 'border-brand-maroon text-brand-maroon font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order reference (NN-...), customer name or phone..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Order Ref</th>
                <th className="px-6 py-3.5">Customer & Phone</th>
                <th className="px-6 py-3.5">Destination</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 animate-pulse">
                    Loading orders...
                  </td>
                </tr>
              ) : !orders || orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-brand-charcoal">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-brand-charcoal">{order.customerName}</p>
                      <p className="text-[11px] text-gray-500">{order.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.shippingCity}, {order.shippingState}
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-maroon">
                      {formatInr(order.totalPaise)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setActiveOrder(order)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-brand-maroon/10 hover:bg-brand-maroon/20 text-brand-maroon font-semibold rounded transition-colors text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Processing Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setActiveOrder(null)} />

          <div className="relative bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto z-10">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs uppercase font-bold text-gray-400">Order Inspection</span>
                <h2 className="font-serif text-2xl font-bold text-brand-charcoal">
                  {activeOrder.orderNumber}
                </h2>
                <p className="text-xs text-gray-500">
                  Received on {new Date(activeOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Banner */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-xs text-gray-500">Current Status:</span>
                <p className="font-serif text-base font-bold text-brand-charcoal">
                  {ORDER_STATUS_LABELS[activeOrder.status] || activeOrder.status}
                </p>
              </div>
              <a
                href={`https://wa.me/${activeOrder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hello ${activeOrder.customerName}! We are contacting you from Nool & Nila regarding your saree order request ${activeOrder.orderNumber}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message Customer on WhatsApp</span>
              </a>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-brand-ivory p-4 rounded-xl border border-brand-beige">
              <div>
                <h4 className="font-bold text-brand-charcoal mb-1">Customer Information</h4>
                <p className="text-gray-700 font-semibold">{activeOrder.customerName}</p>
                <p className="text-gray-600">Phone: {activeOrder.customerPhone}</p>
                {activeOrder.customerEmail && <p className="text-gray-600">Email: {activeOrder.customerEmail}</p>}
              </div>

              <div>
                <h4 className="font-bold text-brand-charcoal mb-1">Delivery Address</h4>
                <p className="text-gray-700">{activeOrder.shippingStreet}</p>
                {activeOrder.shippingLandmark && <p className="text-gray-500">Landmark: {activeOrder.shippingLandmark}</p>}
                <p className="text-gray-700">
                  {activeOrder.shippingCity}, {activeOrder.shippingState} - {activeOrder.shippingPostalCode}
                </p>
              </div>

              {activeOrder.customerNotes && (
                <div className="sm:col-span-2 pt-2 border-t border-brand-beige-dark">
                  <span className="font-bold text-brand-maroon">Customer Notes: </span>
                  <span className="text-gray-700 italic">"{activeOrder.customerNotes}"</span>
                </div>
              )}
            </div>

            {/* Ordered Sarees List */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-brand-charcoal">
                Requested Items
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {activeOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-3">
                      <img src={item.imageUrl} alt={item.productName} className="w-12 h-14 object-cover rounded border" />
                      <div>
                        <p className="font-semibold text-brand-charcoal">{item.productName}</p>
                        <p className="text-[11px] text-gray-500">SKU: {item.productSku} • Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-brand-charcoal">{formatInr(item.totalPaise)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-brand-charcoal px-2">
                <span>Total Amount:</span>
                <span className="text-brand-maroon">{formatInr(activeOrder.totalPaise)}</span>
              </div>
            </div>

            {/* Status Transition Action Controls */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <h4 className="font-serif font-bold text-sm text-brand-charcoal">
                Update Order Request Status
              </h4>

              {/* Status Note input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Status Change Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Weaving verified in Kanchipuram loom. Awaiting NEFT payment."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-maroon"
                />
              </div>

              {/* Shipping Inputs if moving to Shipped */}
              {activeOrder.status === ORDER_STATUS.PROCESSING && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                  <div>
                    <label className="block font-semibold text-indigo-950 mb-1">Courier Carrier</label>
                    <input
                      type="text"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="e.g. Blue Dart"
                      className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-indigo-950 mb-1">Tracking Number *</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. BD78912345"
                      className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Transition Buttons depending on current state */}
              <div className="flex flex-wrap gap-2 pt-2">
                {activeOrder.status === ORDER_STATUS.PENDING_CONFIRMATION && (
                  <>
                    <button
                      onClick={() => handleStatusChange(ORDER_STATUS.CONFIRMED)}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow transition-colors"
                    >
                      ✓ Confirm & Accept Order
                    </button>
                    <button
                      onClick={() => handleStatusChange(ORDER_STATUS.REJECTED)}
                      disabled={updateStatusMutation.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                    >
                      ✕ Decline / Reject Request
                    </button>
                  </>
                )}

                {activeOrder.status === ORDER_STATUS.CONFIRMED && (
                  <button
                    onClick={() => handleStatusChange(ORDER_STATUS.PROCESSING)}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow transition-colors"
                  >
                    Move to Handloom Finishing & Processing
                  </button>
                )}

                {activeOrder.status === ORDER_STATUS.PROCESSING && (
                  <button
                    onClick={() => handleStatusChange(ORDER_STATUS.SHIPPED)}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Dispatch & Mark as Shipped</span>
                  </button>
                )}

                {activeOrder.status === ORDER_STATUS.SHIPPED && (
                  <button
                    onClick={() => handleStatusChange(ORDER_STATUS.DELIVERED)}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow transition-colors"
                  >
                    ✓ Mark as Successfully Delivered
                  </button>
                )}

                {activeOrder.status !== ORDER_STATUS.DELIVERED &&
                  activeOrder.status !== ORDER_STATUS.CANCELLED &&
                  activeOrder.status !== ORDER_STATUS.REJECTED && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this order and replenish inventory?')) {
                          handleStatusChange(ORDER_STATUS.CANCELLED);
                        }
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors ml-auto"
                    >
                      Cancel Order & Restock
                    </button>
                  )}
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-gray-500 mb-3">
                Order Activity & Status Audit History
              </h4>
              <div className="space-y-3">
                {activeOrder.statusHistory?.map((h) => (
                  <div key={h.id} className="text-xs flex items-start space-x-3 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-brand-maroon mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-brand-charcoal">
                        {ORDER_STATUS_LABELS[h.status] || h.status}
                        {h.createdByName && <span className="font-normal text-gray-400"> by {h.createdByName}</span>}
                      </p>
                      {h.notes && <p className="text-[11px] text-gray-500 mt-0.5">{h.notes}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(h.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
