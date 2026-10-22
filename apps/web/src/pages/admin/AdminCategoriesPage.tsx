import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { CategoryDto } from '@nool-and-nila/shared';
import { Layers, Plus, X } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/sarees/kanjivaram-crimson-gold.jpg');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetchApi<CategoryDto[]>('/admin/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await fetchApi('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          imageUrl,
          displayOrder: (categories?.length || 0) + 1,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setName('');
      setSlug('');
      setDescription('');
      setIsModalOpen(false);
      alert('Category added successfully!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-charcoal">Collections Management</h1>
          <p className="text-xs text-gray-500">Organize sarees into seasonal and bridal collections.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-1 px-4 py-2 bg-brand-maroon text-white rounded text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : (
          categories?.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="p-5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-brand-gold font-mono">
                  Slug: {cat.slug}
                </span>
                <h3 className="font-serif font-bold text-lg text-brand-charcoal">{cat.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{cat.description}</p>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t text-xs font-semibold text-brand-maroon flex justify-between items-center">
                <span>{cat.productCount ?? 0} Sarees</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Active</span>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 z-10 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-serif font-bold text-base">Create Collection</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Collection Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. Royal Organza Silks" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Slug *</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 border rounded font-mono" placeholder="royal-organza-silks" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-brand-maroon text-white font-semibold rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
