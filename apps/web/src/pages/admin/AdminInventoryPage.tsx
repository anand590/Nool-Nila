import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { InventoryMovementDto, ProductDto, formatInr } from '@nool-and-nila/shared';
import { Boxes, AlertTriangle, Plus, Minus, X, History, Check } from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityChange, setQuantityChange] = useState('1');
  const [reason, setReason] = useState('New loom shipment received from weaver');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const res = await fetchApi<{
        products: Array<{
          id: string;
          name: string;
          sku: string;
          fabric: string;
          stockQuantity: number;
          pricePaise: number;
        }>;
        recentMovements: Array<any>;
        lowStockThreshold: number;
      }>('/admin/inventory');
      return res.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const change = parseInt(quantityChange, 10);
      return await fetchApi('/admin/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductId,
          quantityChange: change,
          reason,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setIsAdjustModalOpen(false);
      alert('Stock successfully adjusted and logged in audit history.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to adjust stock');
    },
  });

  const openModalWithProduct = (productId: string) => {
    setSelectedProductId(productId);
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor handloom stock levels, prevent overselling, and record verified stock adjustments.
          </p>
        </div>

        <button
          onClick={() => {
            if (data?.products && data.products.length > 0) {
              setSelectedProductId(data.products[0].id);
            }
            setIsAdjustModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold shadow transition-colors"
        >
          <Boxes className="w-4 h-4" />
          <span>Manual Stock Adjustment</span>
        </button>
      </div>

      {/* Stock Overview Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-serif text-lg font-bold text-brand-charcoal">Current Saree Stock Levels</h2>
          <span className="text-xs text-gray-500">
            Low stock threshold: <strong>3 pieces</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Saree Name</th>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-6 py-3.5">Fabric</th>
                <th className="px-6 py-3.5">Current Stock</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Adjust Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading inventory...</td>
                </tr>
              ) : !data?.products || data.products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No products found.</td>
                </tr>
              ) : (
                data.products.map((p) => {
                  const isLow = p.stockQuantity <= (data.lowStockThreshold || 3);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-brand-charcoal">{p.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{p.sku}</td>
                      <td className="px-6 py-4 text-gray-600">{p.fabric}</td>
                      <td className="px-6 py-4 font-bold text-base">
                        <span className={isLow ? 'text-red-600' : 'text-emerald-700'}>
                          {p.stockQuantity} pcs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock Alert</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            Adequate Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openModalWithProduct(p.id)}
                          className="px-3 py-1 bg-gray-100 hover:bg-brand-maroon hover:text-white rounded text-xs font-semibold text-brand-charcoal transition-colors"
                        >
                          ± Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Movements Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          <History className="w-5 h-5 text-brand-maroon" />
          <h2 className="font-serif text-lg font-bold text-brand-charcoal">
            Inventory Movement & Stock Adjustment Audit Log
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Change</th>
                <th className="px-6 py-3.5">Previous → New</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!data?.recentMovements || data.recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                data.recentMovements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-gray-500">
                      {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-brand-charcoal">
                      {m.product?.name || 'Saree'}
                    </td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={m.quantityChange > 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {m.previousStock} → <strong>{m.newStock}</strong>
                    </td>
                    <td className="px-6 py-3.5 text-gray-700 font-medium">
                      {m.reason}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {m.createdByName || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsAdjustModalOpen(false)} />

          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 z-10 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-serif font-bold text-base text-brand-charcoal">
                Manual Stock Adjustment
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                adjustMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Select Saree *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  {data?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.stockQuantity} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Quantity Change (+ for addition, - for deduction) *
                </label>
                <input
                  type="number"
                  required
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  placeholder="e.g. +3 or -1"
                  className="w-full px-3 py-2 border rounded font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Received shipment of 3 sarees from Kanchipuram loom"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-4 py-2 bg-brand-maroon text-white font-semibold rounded hover:bg-brand-maroon-dark transition-colors disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
