import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { ProductDto, CategoryDto, SAREE_FABRICS } from '@nool-and-nila/shared';
import { ProductCard } from '../components/product/ProductCard';
import { Filter, X, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state from URL query parameters
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const fabric = searchParams.get('fabric') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch categories for sidebar filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetchApi<CategoryDto[]>('/categories');
      return res.data;
    },
  });

  // Fetch filtered sarees
  const { data: queryResult, isLoading, isError } = useQuery({
    queryKey: ['products', { search, category, fabric, minPrice, maxPrice, inStock, sort, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (fabric) params.set('fabric', fabric);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (inStock) params.set('inStock', inStock);
      if (sort) params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', '12');

      const res = await fetchApi<{
        items: ProductDto[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/products?${params.toString()}`);
      return res.data;
    },
  });

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [search, category, fabric, minPrice, maxPrice, inStock].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title & Page Header */}
      <div className="pb-8 border-b border-brand-beige">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
          Handcrafted Sarees
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
          Authentic pure silks, bridal Kanjivarams, and handloom cottons woven on traditional looms across India.
        </p>

        {/* Filter Bar & Sort dropdown */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center space-x-2 px-4 py-2 bg-white border border-brand-beige rounded text-xs font-semibold text-brand-charcoal shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-maroon" />
              <span>Filters ({activeFilterCount})</span>
            </button>

            <span className="text-xs text-gray-500">
              Showing <strong>{queryResult?.items.length || 0}</strong> of <strong>{queryResult?.total || 0}</strong> sarees
            </span>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-select" className="text-xs font-medium text-gray-500 flex items-center space-x-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort by:</span>
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-3 py-1.5 bg-white border border-brand-beige rounded text-xs font-medium text-brand-charcoal focus:ring-1 focus:ring-brand-maroon focus:outline-none"
            >
              <option value="newest">Newest Additions</option>
              <option value="featured">Featured Curations</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-brand-beige-dark/50">
            <span className="text-xs font-semibold text-gray-500">Active filters:</span>
            {search && (
              <span className="inline-flex items-center text-xs bg-brand-ivory-dark border border-brand-beige px-2.5 py-1 rounded-full text-brand-charcoal">
                Search: "{search}"
                <button onClick={() => updateFilter('search', null)} className="ml-1.5 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center text-xs bg-brand-ivory-dark border border-brand-beige px-2.5 py-1 rounded-full text-brand-charcoal">
                Collection: {category}
                <button onClick={() => updateFilter('category', null)} className="ml-1.5 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {fabric && (
              <span className="inline-flex items-center text-xs bg-brand-ivory-dark border border-brand-beige px-2.5 py-1 rounded-full text-brand-charcoal">
                Fabric: {fabric}
                <button onClick={() => updateFilter('fabric', null)} className="ml-1.5 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {inStock && (
              <span className="inline-flex items-center text-xs bg-brand-ivory-dark border border-brand-beige px-2.5 py-1 rounded-full text-brand-charcoal">
                In Stock Only
                <button onClick={() => updateFilter('inStock', null)} className="ml-1.5 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-brand-maroon hover:underline font-semibold ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Grid & Desktop Filters Sidebar */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 pr-6 border-r border-brand-beige">
          {/* Categories */}
          <div>
            <h3 className="font-serif font-bold text-sm text-brand-charcoal mb-3 uppercase tracking-wider">
              Collections
            </h3>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => updateFilter('category', null)}
                className={`block w-full text-left py-1 hover:text-brand-maroon transition-colors ${
                  !category ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                All Collections
              </button>
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateFilter('category', c.slug)}
                  className={`block w-full text-left py-1 hover:text-brand-maroon transition-colors ${
                    category === c.slug ? 'font-bold text-brand-maroon' : 'text-gray-600'
                  }`}
                >
                  {c.name} {c.productCount ? `(${c.productCount})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Fabric Type */}
          <div className="pt-6 border-t border-brand-beige">
            <h3 className="font-serif font-bold text-sm text-brand-charcoal mb-3 uppercase tracking-wider">
              Weave & Fabric
            </h3>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => updateFilter('fabric', null)}
                className={`block w-full text-left py-1 hover:text-brand-maroon transition-colors ${
                  !fabric ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                All Fabrics
              </button>
              {SAREE_FABRICS.map((f) => (
                <button
                  key={f}
                  onClick={() => updateFilter('fabric', f)}
                  className={`block w-full text-left py-1 hover:text-brand-maroon transition-colors ${
                    fabric === f ? 'font-bold text-brand-maroon' : 'text-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="pt-6 border-t border-brand-beige">
            <h3 className="font-serif font-bold text-sm text-brand-charcoal mb-3 uppercase tracking-wider">
              Price Range
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  updateFilter('minPrice', null);
                  updateFilter('maxPrice', '10000');
                }}
                className={`block w-full text-left py-1 hover:text-brand-maroon ${
                  maxPrice === '10000' && !minPrice ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                Under ₹10,000
              </button>
              <button
                onClick={() => {
                  updateFilter('minPrice', '10000');
                  updateFilter('maxPrice', '20000');
                }}
                className={`block w-full text-left py-1 hover:text-brand-maroon ${
                  minPrice === '10000' && maxPrice === '20000' ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                ₹10,000 - ₹20,000
              </button>
              <button
                onClick={() => {
                  updateFilter('minPrice', '20000');
                  updateFilter('maxPrice', '30000');
                }}
                className={`block w-full text-left py-1 hover:text-brand-maroon ${
                  minPrice === '20000' && maxPrice === '30000' ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                ₹20,000 - ₹30,000
              </button>
              <button
                onClick={() => {
                  updateFilter('minPrice', '30000');
                  updateFilter('maxPrice', null);
                }}
                className={`block w-full text-left py-1 hover:text-brand-maroon ${
                  minPrice === '30000' && !maxPrice ? 'font-bold text-brand-maroon' : 'text-gray-600'
                }`}
              >
                ₹30,000 & Above
              </button>
            </div>
          </div>

          {/* Availability */}
          <div className="pt-6 border-t border-brand-beige">
            <label className="flex items-center space-x-2 text-xs text-brand-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={inStock === 'true'}
                onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : null)}
                className="rounded text-brand-maroon focus:ring-brand-maroon"
              />
              <span className="font-medium">In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse border border-brand-beige" />
              ))}
            </div>
          ) : isError || !queryResult || queryResult.items.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-brand-beige space-y-4 my-8">
              <p className="font-serif text-xl font-bold text-brand-charcoal">
                No matching sarees found
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try adjusting your search criteria, clearing specific filters, or consulting directly with our stylist on WhatsApp.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded hover:bg-brand-maroon-dark transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {queryResult.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {queryResult.totalPages > 1 && (
                <div className="mt-12 pt-6 border-t border-brand-beige flex items-center justify-between">
                  <button
                    disabled={page <= 1}
                    onClick={() => updateFilter('page', (page - 1).toString())}
                    className="flex items-center space-x-1 px-4 py-2 border border-brand-beige rounded text-xs font-medium text-brand-charcoal hover:bg-brand-ivory disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-gray-500">
                    Page {queryResult.page} of {queryResult.totalPages}
                  </span>

                  <button
                    disabled={page >= queryResult.totalPages}
                    onClick={() => updateFilter('page', (page + 1).toString())}
                    className="flex items-center space-x-1 px-4 py-2 border border-brand-beige rounded text-xs font-medium text-brand-charcoal hover:bg-brand-ivory disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 overflow-y-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="font-serif font-bold text-base">Filter Sarees</h3>
              <button onClick={() => setIsMobileFilterOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Mobile Categories */}
            <div>
              <p className="font-bold text-xs uppercase text-gray-400 mb-2">Collections</p>
              <div className="space-y-1 text-xs">
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      updateFilter('category', c.slug);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`block w-full text-left py-1 ${category === c.slug ? 'font-bold text-brand-maroon' : ''}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Fabrics */}
            <div>
              <p className="font-bold text-xs uppercase text-gray-400 mb-2">Fabrics</p>
              <div className="space-y-1 text-xs">
                {SAREE_FABRICS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      updateFilter('fabric', f);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`block w-full text-left py-1 ${fabric === f ? 'font-bold text-brand-maroon' : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                clearAllFilters();
                setIsMobileFilterOpen(false);
              }}
              className="w-full py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
