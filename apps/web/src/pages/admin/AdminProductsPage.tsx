import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchApi, getAuthToken } from '../../lib/api';
import {
  ProductDto,
  CategoryDto,
  formatInr,
  SAREE_FABRICS,
  OCCASIONS,
} from '@nool-and-nila/shared';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  UploadCloud,
  Check,
  Package,
} from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    searchParams.get('action') === 'new'
  );
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fabric, setFabric] = useState(SAREE_FABRICS[0]);
  const [weave, setWeave] = useState('Korvai Handloom Weave');
  const [zariType, setZariType] = useState('Tested Gold Zari');
  const [color, setColor] = useState('Crimson Maroon');
  const [colorHex, setColorHex] = useState('#702C3B');
  const [priceInr, setPriceInr] = useState('18500');
  const [mrpInr, setMrpInr] = useState('22000');
  const [stockQuantity, setStockQuantity] = useState('3');
  const [description, setDescription] = useState('');
  const [washCare, setWashCare] = useState('Dry clean only. Wrap in soft cotton muslin.');
  const [imageUrl, setImageUrl] = useState('/images/sarees/kanjivaram-crimson-gold.jpg');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '50');
      const res = await fetchApi<{ items: ProductDto[]; total: number }>(`/admin/products?${params.toString()}`);
      return res.data;
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetchApi<CategoryDto[]>('/admin/categories');
      return res.data;
    },
  });

  // Initialize categoryId when categories load
  React.useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setSku('');
    if (categories && categories.length > 0) setCategoryId(categories[0].id);
    setPriceInr('18500');
    setMrpInr('22000');
    setStockQuantity('3');
    setDescription('');
    setImageUrl('/images/sarees/kanjivaram-crimson-gold.jpg');
    setEditingProduct(null);
    setFormError(null);
    setIsAddModalOpen(false);
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!editingProduct) {
      setSlug(
        newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleOpenEdit = (p: ProductDto) => {
    setEditingProduct(p);
    setName(p.name);
    setSlug(p.slug);
    setSku(p.sku);
    setCategoryId(p.categoryId);
    setFabric(p.fabric as any);
    setWeave(p.weave);
    setZariType(p.zariType);
    setColor(p.color);
    setColorHex(p.colorHex || '#702C3B');
    setPriceInr((p.pricePaise / 100).toString());
    setMrpInr(p.mrpPaise ? (p.mrpPaise / 100).toString() : '');
    setStockQuantity(p.stockQuantity.toString());
    setDescription(p.description);
    setWashCare(p.washCare);
    setImageUrl(p.images[0]?.url || '/images/sarees/default.jpg');
    setIsFeatured(p.isFeatured);
    setIsNewArrival(p.isNewArrival);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const token = getAuthToken();
      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setImageUrl(data.data.url);
      } else {
        alert(data.message || 'Image upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  // Mutation to save or update product
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku,
        categoryId: categoryId || (categories && categories[0]?.id),
        fabric,
        weave,
        zariType,
        lengthMeters: 5.5,
        blouseIncluded: true,
        blouseDetails: 'Matching unstitched blouse piece (80cm) included.',
        washCare,
        color,
        colorHex,
        occasion: 'Festive & Celebrations',
        pricePaise: Math.round(parseFloat(priceInr) * 100),
        mrpPaise: mrpInr ? Math.round(parseFloat(mrpInr) * 100) : null,
        stockQuantity: parseInt(stockQuantity, 10),
        description: description || `${name} woven in ${fabric} with ${zariType}.`,
        isFeatured,
        isNewArrival,
        isActive: true,
        images: [{ url: imageUrl, altText: name, displayOrder: 0 }],
      };

      if (editingProduct) {
        return await fetchApi(`/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        return await fetchApi('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      const wasEdit = !!editingProduct;
      resetForm();
      setToastMessage(wasEdit ? 'Saree details updated successfully!' : 'New saree added to catalogue successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save product specification.');
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this saree from the active catalogue?')) return;
    try {
      await fetchApi(`/admin/products/${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setToastMessage('Saree archived successfully');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center space-x-2 text-xs font-semibold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
            Saree Catalogue Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Add new weaves, modify pricing in INR, update stock, and manage photography.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            if (categories && categories.length > 0) setCategoryId(categories[0].id);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Saree</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by saree title, SKU, or fabric..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Saree</th>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-6 py-3.5">Fabric & Weave</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Stock</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 animate-pulse">
                    Loading products...
                  </td>
                </tr>
              ) : !productsData || productsData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No sarees found. Click "Add New Saree" to create one.
                  </td>
                </tr>
              ) : (
                productsData.items.map((p) => {
                  const img = p.images[0]?.url || '/images/sarees/default.jpg';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={img} alt={p.name} className="w-12 h-14 object-cover rounded border bg-brand-ivory" />
                          <div>
                            <p className="font-semibold text-brand-charcoal">{p.name}</p>
                            <p className="text-[11px] text-gray-400">{p.color}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-600">{p.sku}</td>
                      <td className="px-6 py-4 text-gray-700">{p.fabric}</td>
                      <td className="px-6 py-4 font-bold text-brand-maroon">{formatInr(p.pricePaise)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${
                            p.stockQuantity <= 3 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {p.stockQuantity} pcs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-gray-500 hover:text-brand-maroon transition-colors"
                          title="Edit Saree"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Archive"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Saree Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={resetForm} />

          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto z-10">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <h2 className="font-serif text-xl font-bold text-brand-charcoal">
                {editingProduct ? 'Edit Saree Specification' : 'Add New Handloom Saree'}
              </h2>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProductMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Saree Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Swarna Temple Crimson Kanjivaram Pure Silk"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {/* SKU & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="NN-KAN-09"
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated-if-blank"
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
              </div>

              {/* Category & Fabric */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Collection Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white"
                  >
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fabric Type *</label>
                  <select
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded bg-white"
                  >
                    {SAREE_FABRICS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weave & Zari */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Weave Technique *</label>
                  <input
                    type="text"
                    required
                    value={weave}
                    onChange={(e) => setWeave(e.target.value)}
                    placeholder="Korvai Handloom Weave"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Zari Detail *</label>
                  <input
                    type="text"
                    required
                    value={zariType}
                    onChange={(e) => setZariType(e.target.value)}
                    placeholder="Tested Gold Zari"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Color & Color Hex */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Color Name *</label>
                  <input
                    type="text"
                    required
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Crimson Maroon"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Color Hex (e.g. #702C3B)</label>
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    placeholder="#702C3B"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">MRP (₹ INR Optional)</label>
                  <input
                    type="number"
                    value={mrpInr}
                    onChange={(e) => setMrpInr(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Image URL & Upload */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Product Photograph *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/images/sarees/kanjivaram-crimson-gold.jpg"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <label className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border rounded cursor-pointer flex items-center space-x-1 font-semibold text-gray-700">
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                {imageUrl && (
                  <div className="mt-2 flex items-center space-x-3 p-2 bg-gray-50 border rounded-lg">
                    <img
                      src={imageUrl}
                      alt="Saree preview"
                      className="w-12 h-14 object-cover rounded border bg-brand-ivory shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/sarees/default.jpg';
                      }}
                    />
                    <div className="text-[11px] text-gray-500 truncate">
                      <p className="font-semibold text-gray-700">Photograph Preview</p>
                      <p className="truncate text-gray-400 max-w-xs">{imageUrl}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed weaving and drape description..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {/* Toggles */}
              <div className="flex space-x-6 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-brand-maroon"
                  />
                  <span>Featured Saree</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="rounded text-brand-maroon"
                  />
                  <span>New Arrival Badge</span>
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveProductMutation.isPending}
                  className="px-6 py-2 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded font-semibold transition-colors disabled:opacity-50"
                >
                  {saveProductMutation.isPending ? 'Saving Saree...' : 'Save Saree'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
